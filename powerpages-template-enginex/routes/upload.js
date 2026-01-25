/**
 * Upload Routes
 * Handle theme file uploads
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { ensureAuthenticated, ensureCanDeploy } = require('../middleware/auth');
const Theme = require('../models/Theme');
const logger = require('../config/logger');

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const userDir = path.join(uploadDir, req.user._id.toString());
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }
        cb(null, userDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || '.zip').split(',');
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only .zip files are allowed.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800 // 50MB default
    }
});

// Upload page
router.get('/', ensureAuthenticated, (req, res) => {
    const galleryThemeId = req.query.gallery;
    
    res.render('upload/index', {
        title: 'Upload Theme - PowerPages Template Engine',
        galleryThemeId,
        canDeploy: req.user.canDeployTheme(),
        themesDeployed: req.user.usage.themesDeployed,
        themesLimit: req.user.usage.themesLimit
    });
});

// Handle file upload
router.post('/',
    ensureAuthenticated,
    ensureCanDeploy,
    upload.single('themeFile'),
    async (req, res) => {
        try {
            if (!req.file) {
                req.flash('error_msg', 'Please select a file to upload');
                return res.redirect('/upload');
            }
            
            const { themeName, bootstrapVersion, category } = req.body;
            
            // Create theme record
            const theme = await Theme.create({
                user: req.user._id,
                name: themeName || path.basename(req.file.originalname, '.zip'),
                bootstrapVersion: bootstrapVersion || '5',
                category: category || 'other',
                source: {
                    type: 'upload',
                    originalName: req.file.originalname
                },
                files: {
                    zipPath: req.file.path,
                    totalSize: req.file.size
                },
                deployment: {
                    status: 'pending'
                }
            });
            
            // Update user's theme count
            req.user.usage.themesDeployed += 1;
            await req.user.save();
            
            logger.info('Theme uploaded', {
                userId: req.user._id,
                themeId: theme._id,
                fileName: req.file.originalname
            });
            
            // Start async deployment process
            // In production, this would be handled by a job queue
            processThemeDeployment(theme._id, req.user._id);
            
            res.redirect(`/upload/status/${theme._id}`);
            
        } catch (error) {
            logger.error('Upload error:', error);
            
            // Clean up uploaded file on error
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            
            req.flash('error_msg', error.message || 'Failed to upload theme');
            res.redirect('/upload');
        }
    }
);

// Upload status page
router.get('/status/:id', ensureAuthenticated, async (req, res) => {
    try {
        const theme = await Theme.findOne({
            _id: req.params.id,
            user: req.user._id
        });
        
        if (!theme) {
            req.flash('error_msg', 'Theme not found');
            return res.redirect('/dashboard/themes');
        }
        
        res.render('upload/status', {
            title: 'Deployment Status - PowerPages Template Engine',
            theme
        });
        
    } catch (error) {
        logger.error('Status page error:', error);
        req.flash('error_msg', 'Failed to load status');
        res.redirect('/dashboard/themes');
    }
});

// API endpoint for status polling
router.get('/api/status/:id', ensureAuthenticated, async (req, res) => {
    try {
        const theme = await Theme.findOne({
            _id: req.params.id,
            user: req.user._id
        }).select('name deployment');
        
        if (!theme) {
            return res.status(404).json({ error: 'Theme not found' });
        }
        
        res.json({
            id: theme._id,
            name: theme.name,
            status: theme.deployment.status,
            progress: theme.deploymentProgress,
            websiteUrl: theme.deployment.powerPagesWebsiteUrl,
            errorMessage: theme.deployment.errorMessage,
            logs: theme.deployment.deploymentLogs.slice(-10) // Last 10 logs
        });
        
    } catch (error) {
        logger.error('Status API error:', error);
        res.status(500).json({ error: 'Failed to get status' });
    }
});

// Multer error handler
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            req.flash('error_msg', 'File too large. Maximum size is 50MB.');
        } else {
            req.flash('error_msg', `Upload error: ${error.message}`);
        }
        return res.redirect('/upload');
    }
    
    if (error.message.includes('Invalid file type')) {
        req.flash('error_msg', error.message);
        return res.redirect('/upload');
    }
    
    next(error);
});

/**
 * Process theme deployment (async)
 * In production, this would be handled by a job queue like Bull/Redis
 */
async function processThemeDeployment(themeId, userId) {
    const Theme = require('../models/Theme');
    const User = require('../models/User');
    const emailService = require('../services/emailService');
    
    try {
        const theme = await Theme.findById(themeId);
        const user = await User.findById(userId);
        
        if (!theme || !user) {
            logger.error('Theme or user not found for deployment', { themeId, userId });
            return;
        }
        
        // Stage 1: Validating
        await theme.updateDeploymentStatus('validating', 'Validating theme structure...');
        await simulateDelay(2000);
        
        // Validate theme (simplified - in production, actually extract and validate)
        theme.validation.isValid = true;
        theme.validation.validatedAt = new Date();
        theme.validation.hasIndexHtml = true;
        theme.validation.hasCss = true;
        theme.addDeploymentLog('info', 'Theme validation passed');
        await theme.save();
        
        // Stage 2: Creating site
        await theme.updateDeploymentStatus('creating_site', 'Creating Power Pages site...');
        await simulateDelay(3000);
        theme.addDeploymentLog('info', 'Power Pages site created');
        await theme.save();
        
        // Stage 3: Deploying
        await theme.updateDeploymentStatus('deploying', 'Deploying theme assets...');
        await simulateDelay(4000);
        theme.addDeploymentLog('info', 'Theme assets deployed');
        await theme.save();
        
        // Stage 4: Complete
        theme.deployment.powerPagesWebsiteId = `site-${uuidv4().substring(0, 8)}`;
        theme.deployment.powerPagesWebsiteUrl = `https://${theme.name.toLowerCase().replace(/\s+/g, '-')}.powerappsportals.com`;
        await theme.updateDeploymentStatus('completed', 'Deployment completed successfully');
        
        logger.info('Theme deployment completed', { themeId, userId });
        
        // Send notification email
        try {
            await emailService.sendDeploymentComplete(user, theme);
        } catch (emailError) {
            logger.error('Failed to send deployment complete email:', emailError);
        }
        
    } catch (error) {
        logger.error('Theme deployment failed:', { themeId, error: error.message });
        
        const theme = await Theme.findById(themeId);
        if (theme) {
            await theme.updateDeploymentStatus('failed', error.message);
            
            const user = await User.findById(userId);
            if (user) {
                try {
                    await emailService.sendDeploymentFailed(user, theme, error.message);
                } catch (emailError) {
                    logger.error('Failed to send deployment failed email:', emailError);
                }
            }
        }
    }
}

function simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = router;
