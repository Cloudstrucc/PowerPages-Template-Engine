/**
 * Deploy Routes
 * Deployment wizard for Power Pages with existing site selection or blank site creation
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const { body, validationResult } = require('express-validator');
const { ensureAuthenticated, ensureSubscription } = require('../middleware/auth');
const Theme = require('../models/Theme');
const GalleryTheme = require('../models/GalleryTheme');
const Organization = require('../models/Organization');
const SiteConfig = require('../models/SiteConfig');
const powerPagesService = require('../services/powerPagesService');
const emailService = require('../services/emailService');
const logger = require('../config/logger');

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = process.env.UPLOAD_DIR || './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `theme-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE) || 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (path.extname(file.originalname).toLowerCase() === '.zip') {
            cb(null, true);
        } else {
            cb(new Error('Only .zip files are allowed'));
        }
    }
});

// Apply authentication to all routes
router.use(ensureAuthenticated);

// ===========================================
// Step 1: Choose Theme Source
// ===========================================

router.get('/', async (req, res) => {
    try {
        const { theme: galleryThemeId } = req.query;
        let selectedGalleryTheme = null;
        
        // If coming from gallery install link
        if (galleryThemeId) {
            selectedGalleryTheme = await GalleryTheme.findById(galleryThemeId);
        }
        
        // Get user's organizations
        const organizations = await Organization.find({
            $or: [
                { owner: req.user._id },
                { 'members.user': req.user._id }
            ]
        });
        
        // Get featured gallery themes
        const featuredThemes = await GalleryTheme.getFeatured(6);
        
        res.render('deploy/index', {
            title: 'Deploy Theme - PowerPages Template Engine',
            selectedGalleryTheme,
            organizations,
            featuredThemes,
            step: 1
        });
        
    } catch (error) {
        logger.error('Deploy index error:', error);
        req.flash('error_msg', 'Failed to load deployment wizard');
        res.redirect('/dashboard');
    }
});

// ===========================================
// Step 2: Select Organization & Branding
// ===========================================

router.post('/step2',
    [
        body('themeSource').isIn(['gallery', 'upload']).withMessage('Invalid theme source'),
        body('galleryThemeId').optional().isMongoId(),
        body('organizationId').optional().isMongoId()
    ],
    upload.single('themeFile'),
    async (req, res) => {
        const errors = validationResult(req);
        
        if (!errors.isEmpty()) {
            req.flash('error_msg', errors.array().map(e => e.msg).join(', '));
            return res.redirect('/deploy');
        }
        
        try {
            const { themeSource, galleryThemeId, organizationId, themeName } = req.body;
            
            // Store in session
            req.session.deployWizard = {
                themeSource,
                galleryThemeId,
                organizationId,
                themeName,
                uploadedFile: req.file ? req.file.filename : null
            };
            
            // Get organization if selected
            let organization = null;
            if (organizationId) {
                organization = await Organization.findById(organizationId);
            }
            
            // Get gallery theme if selected
            let galleryTheme = null;
            if (themeSource === 'gallery' && galleryThemeId) {
                galleryTheme = await GalleryTheme.findById(galleryThemeId);
            }
            
            // Get user's organizations for organization selection/creation
            const organizations = await Organization.find({
                $or: [
                    { owner: req.user._id },
                    { 'members.user': req.user._id }
                ]
            });
            
            res.render('deploy/step2-branding', {
                title: 'Configure Branding - Deploy',
                step: 2,
                themeSource,
                galleryTheme,
                organization,
                organizations,
                themeName: themeName || (galleryTheme ? galleryTheme.name : 'My Theme')
            });
            
        } catch (error) {
            logger.error('Deploy step2 error:', error);
            req.flash('error_msg', 'Failed to proceed');
            res.redirect('/deploy');
        }
    }
);

// ===========================================
// Step 3: Select Power Pages Target
// ===========================================

router.post('/step3',
    [
        body('organizationId').optional().isMongoId(),
        body('themeName').trim().notEmpty().withMessage('Theme name is required')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        
        if (!errors.isEmpty()) {
            req.flash('error_msg', errors.array().map(e => e.msg).join(', '));
            return res.redirect('/deploy');
        }
        
        try {
            const { organizationId, themeName, applyBranding } = req.body;
            
            // Update session
            req.session.deployWizard = {
                ...req.session.deployWizard,
                organizationId,
                themeName,
                applyBranding: applyBranding === 'true'
            };
            
            // Get organization with environments
            let organization = null;
            let environments = [];
            
            if (organizationId) {
                organization = await Organization.findById(organizationId);
                environments = organization?.powerPlatform?.environments || [];
            }
            
            // Get supported regions from config
            const supportedRegions = await SiteConfig.get(
                'integrations.powerPlatform.supportedRegions',
                ['unitedstates', 'canada', 'europe', 'asia', 'australia', 'unitedkingdom']
            );
            
            res.render('deploy/step3-target', {
                title: 'Select Target - Deploy',
                step: 3,
                organization,
                environments,
                supportedRegions,
                wizardData: req.session.deployWizard
            });
            
        } catch (error) {
            logger.error('Deploy step3 error:', error);
            req.flash('error_msg', 'Failed to proceed');
            res.redirect('/deploy');
        }
    }
);

// ===========================================
// Step 4: Confirm & Deploy
// ===========================================

router.post('/step4',
    [
        body('deploymentTarget').isIn(['existing', 'new']).withMessage('Select deployment target'),
        body('environmentUrl').optional().isURL().withMessage('Invalid environment URL'),
        body('websiteId').optional()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        
        if (!errors.isEmpty()) {
            req.flash('error_msg', errors.array().map(e => e.msg).join(', '));
            return res.redirect('/deploy');
        }
        
        try {
            const { deploymentTarget, environmentUrl, websiteId, newSiteName } = req.body;
            
            // Update session
            req.session.deployWizard = {
                ...req.session.deployWizard,
                deploymentTarget,
                environmentUrl,
                websiteId,
                newSiteName
            };
            
            const wizardData = req.session.deployWizard;
            
            // Get gallery theme if applicable
            let galleryTheme = null;
            if (wizardData.themeSource === 'gallery' && wizardData.galleryThemeId) {
                galleryTheme = await GalleryTheme.findById(wizardData.galleryThemeId);
            }
            
            // Get organization
            let organization = null;
            if (wizardData.organizationId) {
                organization = await Organization.findById(wizardData.organizationId);
            }
            
            // If creating new site, show instructions
            let newSiteInstructions = null;
            if (deploymentTarget === 'new') {
                newSiteInstructions = await powerPagesService.createBlankSite(environmentUrl, {
                    name: newSiteName || wizardData.themeName,
                    organizationId: wizardData.organizationId
                });
            }
            
            res.render('deploy/step4-confirm', {
                title: 'Confirm Deployment - Deploy',
                step: 4,
                wizardData,
                galleryTheme,
                organization,
                newSiteInstructions,
                deploymentTarget
            });
            
        } catch (error) {
            logger.error('Deploy step4 error:', error);
            req.flash('error_msg', 'Failed to proceed');
            res.redirect('/deploy');
        }
    }
);

// ===========================================
// Execute Deployment
// ===========================================

router.post('/execute', ensureSubscription, async (req, res) => {
    try {
        const { websiteId, environmentUrl } = req.body;
        const wizardData = req.session.deployWizard;
        
        if (!wizardData) {
            req.flash('error_msg', 'Session expired. Please start again.');
            return res.redirect('/deploy');
        }
        
        if (!websiteId || !environmentUrl) {
            req.flash('error_msg', 'Website ID and Environment URL are required');
            return res.redirect('/deploy');
        }
        
        // Get organization and branding
        let organization = null;
        let branding = null;
        
        if (wizardData.organizationId) {
            organization = await Organization.findById(wizardData.organizationId);
            if (organization && wizardData.applyBranding) {
                branding = {
                    organizationName: organization.name,
                    logo: organization.branding?.logo,
                    logoDark: organization.branding?.logoDark,
                    favicon: organization.branding?.favicon,
                    colors: organization.branding?.colors,
                    fonts: organization.branding?.fonts
                };
            }
        }
        
        // Create theme record
        const theme = await Theme.create({
            user: req.user._id,
            organization: wizardData.organizationId || undefined,
            name: wizardData.themeName,
            source: wizardData.themeSource,
            galleryTheme: wizardData.galleryThemeId || undefined,
            bootstrapVersion: '5', // Default, will be detected
            originalFileName: wizardData.uploadedFile || 'gallery-theme.zip',
            deployment: {
                status: 'pending',
                powerPagesEnvironmentUrl: environmentUrl,
                powerPagesWebsiteId: websiteId,
                deploymentLogs: [{
                    timestamp: new Date(),
                    level: 'info',
                    message: 'Deployment initiated'
                }]
            },
            branding: branding ? {
                applied: true,
                organizationId: organization._id
            } : { applied: false }
        });
        
        // Start async deployment
        processDeployment(theme._id, wizardData, branding);
        
        // Clear wizard session
        delete req.session.deployWizard;
        
        // Redirect to status page
        res.redirect(`/deploy/status/${theme._id}`);
        
    } catch (error) {
        logger.error('Deploy execute error:', error);
        req.flash('error_msg', 'Failed to start deployment: ' + error.message);
        res.redirect('/deploy');
    }
});

// ===========================================
// Deployment Status
// ===========================================

router.get('/status/:id', async (req, res) => {
    try {
        const theme = await Theme.findOne({
            _id: req.params.id,
            user: req.user._id
        }).populate('galleryTheme');
        
        if (!theme) {
            req.flash('error_msg', 'Deployment not found');
            return res.redirect('/dashboard');
        }
        
        res.render('deploy/status', {
            title: `Deployment Status - ${theme.name}`,
            theme
        });
        
    } catch (error) {
        logger.error('Deploy status error:', error);
        req.flash('error_msg', 'Failed to load status');
        res.redirect('/dashboard');
    }
});

// API: Get deployment status
router.get('/api/status/:id', async (req, res) => {
    try {
        const theme = await Theme.findOne({
            _id: req.params.id,
            user: req.user._id
        });
        
        if (!theme) {
            return res.status(404).json({ error: 'Not found' });
        }
        
        res.json({
            status: theme.deployment.status,
            progress: theme.deploymentProgress,
            logs: theme.deployment.deploymentLogs.slice(-20),
            websiteUrl: theme.deployment.powerPagesWebsiteUrl,
            errorMessage: theme.deployment.errorMessage
        });
        
    } catch (error) {
        logger.error('Deploy status API error:', error);
        res.status(500).json({ error: 'Failed to get status' });
    }
});

// ===========================================
// API: Fetch websites from environment
// ===========================================

router.post('/api/fetch-websites', async (req, res) => {
    try {
        const { environmentUrl } = req.body;
        
        if (!environmentUrl) {
            return res.status(400).json({ error: 'Environment URL required' });
        }
        
        const websites = await powerPagesService.getWebsites(environmentUrl);
        
        res.json({ websites });
        
    } catch (error) {
        logger.error('Fetch websites error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch websites',
            message: error.message
        });
    }
});

// ===========================================
// Async Deployment Processing
// ===========================================

async function processDeployment(themeId, wizardData, branding) {
    const theme = await Theme.findById(themeId).populate('user');
    
    try {
        // Step 1: Validating
        await updateDeploymentStatus(theme, 'validating', 'Validating theme structure...');
        await sleep(2000);
        
        // Get theme files
        let themeFiles = [];
        
        if (wizardData.themeSource === 'gallery') {
            // Download and extract gallery theme
            const galleryTheme = await GalleryTheme.findById(wizardData.galleryThemeId);
            if (!galleryTheme) {
                throw new Error('Gallery theme not found');
            }
            
            await updateDeploymentStatus(theme, 'validating', `Downloading ${galleryTheme.name}...`);
            themeFiles = await downloadAndExtractTheme(galleryTheme.downloadUrl);
            
        } else if (wizardData.uploadedFile) {
            // Extract uploaded theme
            const uploadPath = path.join(process.env.UPLOAD_DIR || './uploads', wizardData.uploadedFile);
            themeFiles = await extractThemeFromZip(uploadPath);
        }
        
        // Validate theme structure
        const validation = powerPagesService.validateThemeStructure(themeFiles);
        if (!validation.isValid) {
            throw new Error(`Theme validation failed: ${validation.errors.join(', ')}`);
        }
        
        if (validation.warnings.length > 0) {
            await updateDeploymentStatus(theme, 'validating', `Warnings: ${validation.warnings.join('; ')}`);
        }
        
        // Step 2: Creating site structure
        await updateDeploymentStatus(theme, 'creating_site', 'Preparing Power Pages site structure...');
        await sleep(3000);
        
        // Step 3: Deploying
        await updateDeploymentStatus(theme, 'deploying', 'Uploading theme assets...');
        
        // Deploy to Power Pages
        const deploymentResult = await powerPagesService.deployTheme(
            theme.deployment.powerPagesEnvironmentUrl,
            theme.deployment.powerPagesWebsiteId,
            themeFiles,
            branding
        );
        
        if (!deploymentResult.success && deploymentResult.errorCount > 0) {
            await updateDeploymentStatus(
                theme, 
                'deploying', 
                `Deployed ${deploymentResult.successCount}/${deploymentResult.totalFiles} files. ${deploymentResult.errorCount} errors.`
            );
        }
        
        // Step 4: Completed
        const websiteUrl = `https://${theme.deployment.powerPagesWebsiteId}.powerappsportals.com`;
        
        theme.deployment.status = 'completed';
        theme.deployment.completedAt = new Date();
        theme.deployment.powerPagesWebsiteUrl = websiteUrl;
        theme.deployment.deploymentLogs.push({
            timestamp: new Date(),
            level: 'success',
            message: 'Deployment completed successfully!'
        });
        await theme.save();
        
        // Send email notification
        try {
            await emailService.sendDeploymentCompleteEmail(theme.user, theme, websiteUrl);
        } catch (emailError) {
            logger.error('Failed to send deployment email:', emailError);
        }
        
        logger.info('Deployment completed', { themeId, websiteUrl });
        
    } catch (error) {
        logger.error('Deployment failed:', { themeId, error: error.message });
        
        theme.deployment.status = 'failed';
        theme.deployment.errorMessage = error.message;
        theme.deployment.deploymentLogs.push({
            timestamp: new Date(),
            level: 'error',
            message: `Deployment failed: ${error.message}`
        });
        await theme.save();
        
        // Send failure notification
        try {
            await emailService.sendDeploymentFailedEmail(theme.user, theme, error.message);
        } catch (emailError) {
            logger.error('Failed to send failure email:', emailError);
        }
    }
}

async function updateDeploymentStatus(theme, status, message) {
    theme.deployment.status = status;
    theme.deployment.deploymentLogs.push({
        timestamp: new Date(),
        level: 'info',
        message
    });
    await theme.save();
}

async function downloadAndExtractTheme(downloadUrl) {
    // In production, download from URL
    // For now, return mock data
    logger.info('Downloading theme from:', downloadUrl);
    
    // Simulate download
    await sleep(2000);
    
    // Return mock theme files
    return [
        {
            name: 'index.html',
            partialUrl: 'index.html',
            mimeType: 'text/html',
            content: Buffer.from('<html><head><title>{{ORG_NAME}}</title></head><body><h1>{{ORG_NAME}}</h1></body></html>').toString('base64')
        },
        {
            name: 'css/styles.css',
            partialUrl: 'css/styles.css',
            mimeType: 'text/css',
            content: Buffer.from(':root { --brand-primary: {{PRIMARY_COLOR}}; }').toString('base64')
        }
    ];
}

async function extractThemeFromZip(zipPath) {
    const themeFiles = [];
    
    try {
        const zip = new AdmZip(zipPath);
        const zipEntries = zip.getEntries();
        
        for (const entry of zipEntries) {
            if (entry.isDirectory) continue;
            
            const fileName = entry.entryName;
            const content = entry.getData();
            
            // Determine MIME type
            const ext = path.extname(fileName).toLowerCase();
            const mimeTypes = {
                '.html': 'text/html',
                '.htm': 'text/html',
                '.css': 'text/css',
                '.js': 'application/javascript',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml',
                '.webp': 'image/webp',
                '.woff': 'font/woff',
                '.woff2': 'font/woff2',
                '.ttf': 'font/ttf',
                '.eot': 'application/vnd.ms-fontobject'
            };
            
            themeFiles.push({
                name: fileName,
                partialUrl: fileName,
                mimeType: mimeTypes[ext] || 'application/octet-stream',
                content: content.toString('base64')
            });
        }
        
    } catch (error) {
        logger.error('Failed to extract zip:', error);
        throw new Error('Failed to extract theme archive');
    }
    
    return themeFiles;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = router;
