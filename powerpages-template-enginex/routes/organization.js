/**
 * Organization Routes
 * Handle organization/company branding and settings
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { ensureAuthenticated } = require('../middleware/auth');
const Organization = require('../models/Organization');
const logger = require('../config/logger');

// Multer configuration for logo uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = `./public/uploads/organizations/${req.params.id || 'new'}`;
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const prefix = file.fieldname; // logo, logoDark, favicon, icon
        cb(null, `${prefix}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|svg|webp|ico/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (extname) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

const logoUpload = upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'logoDark', maxCount: 1 },
    { name: 'favicon', maxCount: 1 },
    { name: 'icon', maxCount: 1 }
]);

// Apply authentication to all routes
router.use(ensureAuthenticated);

// ===========================================
// Organization List & Selection
// ===========================================

// List user's organizations
router.get('/', async (req, res) => {
    try {
        const organizations = await Organization.find({
            $or: [
                { owner: req.user._id },
                { 'members.user': req.user._id }
            ]
        }).populate('owner', 'email displayName');
        
        res.render('organization/list', {
            title: 'My Organizations - PowerPages Template Engine',
            organizations
        });
    } catch (error) {
        logger.error('Organization list error:', error);
        req.flash('error_msg', 'Failed to load organizations');
        res.redirect('/dashboard');
    }
});

// ===========================================
// Create Organization
// ===========================================

router.get('/create', (req, res) => {
    res.render('organization/create', {
        title: 'Create Organization - PowerPages Template Engine'
    });
});

router.post('/create',
    [
        body('name').trim().notEmpty().withMessage('Organization name is required'),
        body('website').optional().isURL().withMessage('Please enter a valid website URL')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('organization/create', {
                title: 'Create Organization - PowerPages Template Engine',
                errors: errors.array(),
                formData: req.body
            });
        }
        
        try {
            const { name, description, website, email, phone } = req.body;
            
            const organization = await Organization.create({
                name,
                description,
                owner: req.user._id,
                contact: {
                    email: email || req.user.email,
                    phone,
                    website
                },
                members: [{
                    user: req.user._id,
                    role: 'owner'
                }]
            });
            
            logger.info('Organization created', { 
                orgId: organization._id, 
                userId: req.user._id 
            });
            
            req.flash('success_msg', 'Organization created successfully');
            res.redirect(`/organization/${organization._id}/branding`);
            
        } catch (error) {
            logger.error('Organization create error:', error);
            req.flash('error_msg', 'Failed to create organization');
            res.redirect('/organization/create');
        }
    }
);

// ===========================================
// Organization Settings
// ===========================================

// Get organization - middleware to load org
const loadOrganization = async (req, res, next) => {
    try {
        const organization = await Organization.findById(req.params.id)
            .populate('owner', 'email displayName')
            .populate('members.user', 'email displayName');
        
        if (!organization) {
            req.flash('error_msg', 'Organization not found');
            return res.redirect('/organization');
        }
        
        // Check access
        if (!organization.isMember(req.user._id)) {
            req.flash('error_msg', 'You do not have access to this organization');
            return res.redirect('/organization');
        }
        
        req.organization = organization;
        req.isOrgAdmin = organization.isAdmin(req.user._id);
        res.locals.organization = organization;
        res.locals.isOrgAdmin = req.isOrgAdmin;
        
        next();
    } catch (error) {
        logger.error('Load organization error:', error);
        req.flash('error_msg', 'Failed to load organization');
        res.redirect('/organization');
    }
};

// Organization dashboard
router.get('/:id', loadOrganization, (req, res) => {
    res.render('organization/dashboard', {
        title: `${req.organization.name} - PowerPages Template Engine`
    });
});

// ===========================================
// Branding Settings
// ===========================================

router.get('/:id/branding', loadOrganization, (req, res) => {
    res.render('organization/branding', {
        title: `Branding - ${req.organization.name}`,
        organization: req.organization
    });
});

router.post('/:id/branding',
    loadOrganization,
    logoUpload,
    async (req, res) => {
        if (!req.isOrgAdmin) {
            req.flash('error_msg', 'Only admins can update branding');
            return res.redirect(`/organization/${req.params.id}/branding`);
        }
        
        try {
            const {
                logoAltText,
                primaryColor,
                secondaryColor,
                accentColor,
                textColor,
                backgroundColor,
                headingFont,
                bodyFont,
                googleFontsUrl,
                customCss
            } = req.body;
            
            const organization = req.organization;
            
            // Update logos if uploaded
            if (req.files) {
                if (req.files.logo) {
                    organization.branding.logo = {
                        url: `/uploads/organizations/${organization._id}/${req.files.logo[0].filename}`,
                        altText: logoAltText || organization.name
                    };
                }
                if (req.files.logoDark) {
                    organization.branding.logoDark = {
                        url: `/uploads/organizations/${organization._id}/${req.files.logoDark[0].filename}`
                    };
                }
                if (req.files.favicon) {
                    organization.branding.favicon = {
                        url: `/uploads/organizations/${organization._id}/${req.files.favicon[0].filename}`
                    };
                }
                if (req.files.icon) {
                    organization.branding.icon = {
                        url: `/uploads/organizations/${organization._id}/${req.files.icon[0].filename}`
                    };
                }
            }
            
            // Update colors
            organization.branding.colors = {
                primary: primaryColor || '#2563eb',
                secondary: secondaryColor || '#1e40af',
                accent: accentColor || '#06b6d4',
                text: textColor || '#1e293b',
                background: backgroundColor || '#ffffff'
            };
            
            // Update fonts
            organization.branding.fonts = {
                heading: headingFont || 'Plus Jakarta Sans',
                body: bodyFont || 'Plus Jakarta Sans',
                googleFontsUrl
            };
            
            // Update custom CSS
            if (customCss !== undefined) {
                organization.branding.customCss = customCss;
            }
            
            await organization.save();
            
            logger.info('Organization branding updated', {
                orgId: organization._id,
                userId: req.user._id
            });
            
            req.flash('success_msg', 'Branding updated successfully');
            res.redirect(`/organization/${organization._id}/branding`);
            
        } catch (error) {
            logger.error('Update branding error:', error);
            req.flash('error_msg', 'Failed to update branding');
            res.redirect(`/organization/${req.params.id}/branding`);
        }
    }
);

// ===========================================
// Power Platform Environment Settings
// ===========================================

router.get('/:id/environments', loadOrganization, (req, res) => {
    res.render('organization/environments', {
        title: `Power Platform Environments - ${req.organization.name}`,
        organization: req.organization
    });
});

router.post('/:id/environments/add',
    loadOrganization,
    [
        body('environmentName').trim().notEmpty().withMessage('Environment name is required'),
        body('environmentUrl').trim().isURL().withMessage('Valid environment URL is required')
    ],
    async (req, res) => {
        if (!req.isOrgAdmin) {
            req.flash('error_msg', 'Only admins can manage environments');
            return res.redirect(`/organization/${req.params.id}/environments`);
        }
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error_msg', errors.array().map(e => e.msg).join(', '));
            return res.redirect(`/organization/${req.params.id}/environments`);
        }
        
        try {
            const { environmentName, environmentId, environmentUrl, environmentType, isDefault } = req.body;
            
            const organization = req.organization;
            
            // If setting as default, unset other defaults
            if (isDefault === 'true') {
                organization.powerPlatform.environments.forEach(env => {
                    env.isDefault = false;
                });
            }
            
            organization.powerPlatform.environments.push({
                name: environmentName,
                environmentId,
                environmentUrl: environmentUrl.replace(/\/$/, ''), // Remove trailing slash
                type: environmentType || 'sandbox',
                isDefault: isDefault === 'true',
                connectedAt: new Date()
            });
            
            await organization.save();
            
            logger.info('Environment added', {
                orgId: organization._id,
                environmentName,
                userId: req.user._id
            });
            
            req.flash('success_msg', 'Environment added successfully');
            res.redirect(`/organization/${organization._id}/environments`);
            
        } catch (error) {
            logger.error('Add environment error:', error);
            req.flash('error_msg', 'Failed to add environment');
            res.redirect(`/organization/${req.params.id}/environments`);
        }
    }
);

router.post('/:id/environments/:envIndex/remove', loadOrganization, async (req, res) => {
    if (!req.isOrgAdmin) {
        req.flash('error_msg', 'Only admins can manage environments');
        return res.redirect(`/organization/${req.params.id}/environments`);
    }
    
    try {
        const organization = req.organization;
        const envIndex = parseInt(req.params.envIndex);
        
        if (envIndex >= 0 && envIndex < organization.powerPlatform.environments.length) {
            organization.powerPlatform.environments.splice(envIndex, 1);
            await organization.save();
            req.flash('success_msg', 'Environment removed');
        }
        
    } catch (error) {
        logger.error('Remove environment error:', error);
        req.flash('error_msg', 'Failed to remove environment');
    }
    res.redirect(`/organization/${req.params.id}/environments`);
});

// ===========================================
// Contact & Legal Info
// ===========================================

router.get('/:id/settings', loadOrganization, (req, res) => {
    res.render('organization/settings', {
        title: `Settings - ${req.organization.name}`,
        organization: req.organization
    });
});

router.post('/:id/settings', loadOrganization, async (req, res) => {
    if (!req.isOrgAdmin) {
        req.flash('error_msg', 'Only admins can update settings');
        return res.redirect(`/organization/${req.params.id}/settings`);
    }
    
    try {
        const {
            name,
            description,
            contactEmail,
            contactPhone,
            contactWebsite,
            addressStreet,
            addressCity,
            addressState,
            addressPostalCode,
            addressCountry,
            socialLinkedin,
            socialTwitter,
            socialGithub,
            companyNumber,
            vatNumber,
            copyrightText,
            privacyPolicyUrl,
            termsOfServiceUrl
        } = req.body;
        
        const organization = req.organization;
        
        organization.name = name;
        organization.description = description;
        
        organization.contact = {
            email: contactEmail,
            phone: contactPhone,
            website: contactWebsite,
            address: {
                street: addressStreet,
                city: addressCity,
                state: addressState,
                postalCode: addressPostalCode,
                country: addressCountry
            }
        };
        
        organization.social = {
            linkedin: socialLinkedin,
            twitter: socialTwitter,
            github: socialGithub
        };
        
        organization.legal = {
            companyNumber,
            vatNumber,
            copyrightText,
            privacyPolicyUrl,
            termsOfServiceUrl
        };
        
        await organization.save();
        
        req.flash('success_msg', 'Settings updated successfully');
        res.redirect(`/organization/${organization._id}/settings`);
        
    } catch (error) {
        logger.error('Update organization settings error:', error);
        req.flash('error_msg', 'Failed to update settings');
        res.redirect(`/organization/${req.params.id}/settings`);
    }
});

// ===========================================
// Member Management
// ===========================================

router.get('/:id/members', loadOrganization, (req, res) => {
    res.render('organization/members', {
        title: `Members - ${req.organization.name}`,
        organization: req.organization
    });
});

router.post('/:id/members/add',
    loadOrganization,
    [
        body('email').isEmail().withMessage('Valid email is required')
    ],
    async (req, res) => {
        if (!req.isOrgAdmin) {
            req.flash('error_msg', 'Only admins can manage members');
            return res.redirect(`/organization/${req.params.id}/members`);
        }
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error_msg', errors.array().map(e => e.msg).join(', '));
            return res.redirect(`/organization/${req.params.id}/members`);
        }
        
        try {
            const { email, role } = req.body;
            const User = require('../models/User');
            
            // Find user by email
            const user = await User.findOne({ email: email.toLowerCase() });
            if (!user) {
                req.flash('error_msg', 'User not found. They must create an account first.');
                return res.redirect(`/organization/${req.params.id}/members`);
            }
            
            const organization = req.organization;
            
            // Check if already a member
            if (organization.isMember(user._id)) {
                req.flash('error_msg', 'User is already a member');
                return res.redirect(`/organization/${req.params.id}/members`);
            }
            
            organization.members.push({
                user: user._id,
                role: role || 'member'
            });
            
            await organization.save();
            
            // TODO: Send invitation email
            
            req.flash('success_msg', 'Member added successfully');
            res.redirect(`/organization/${organization._id}/members`);
            
        } catch (error) {
            logger.error('Add member error:', error);
            req.flash('error_msg', 'Failed to add member');
            res.redirect(`/organization/${req.params.id}/members`);
        }
    }
);

router.post('/:id/members/:userId/remove', loadOrganization, async (req, res) => {
    if (!req.isOrgAdmin) {
        req.flash('error_msg', 'Only admins can manage members');
        return res.redirect(`/organization/${req.params.id}/members`);
    }
    
    try {
        const organization = req.organization;
        
        // Cannot remove owner
        if (organization.owner.equals(req.params.userId)) {
            req.flash('error_msg', 'Cannot remove the organization owner');
            return res.redirect(`/organization/${req.params.id}/members`);
        }
        
        organization.members = organization.members.filter(
            m => !m.user.equals(req.params.userId)
        );
        
        await organization.save();
        
        req.flash('success_msg', 'Member removed');
        res.redirect(`/organization/${organization._id}/members`);
        
    } catch (error) {
        logger.error('Remove member error:', error);
        req.flash('error_msg', 'Failed to remove member');
        res.redirect(`/organization/${req.params.id}/members`);
    }
});

module.exports = router;
