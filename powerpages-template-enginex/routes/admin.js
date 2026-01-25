/**
 * Admin Routes
 * Administrative interface for managing gallery themes, configuration, and users
 * Restricted to cloudstrucc.com domain users
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { ensureAuthenticated } = require('../middleware/auth');
const GalleryTheme = require('../models/GalleryTheme');
const SiteConfig = require('../models/SiteConfig');
const User = require('../models/User');
const Organization = require('../models/Organization');
const logger = require('../config/logger');

// ===========================================
// Admin Authentication Middleware
// ===========================================

const ensureAdmin = async (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.flash('error_msg', 'Please log in to access admin panel');
        return res.redirect('/auth/login');
    }
    
    // Check if user's email domain is allowed
    const allowedDomains = await SiteConfig.get('admin.allowedDomains', ['cloudstrucc.com']);
    const superAdminEmails = await SiteConfig.get('admin.superAdminEmails', []);
    
    const userDomain = req.user.email.split('@')[1];
    const isAllowedDomain = allowedDomains.includes(userDomain);
    const isSuperAdmin = superAdminEmails.includes(req.user.email);
    
    if (!isAllowedDomain && !isSuperAdmin && req.user.role !== 'admin') {
        logger.warn('Unauthorized admin access attempt', {
            userId: req.user._id,
            email: req.user.email
        });
        req.flash('error_msg', 'You do not have permission to access the admin panel');
        return res.redirect('/dashboard');
    }
    
    // Attach admin info to request
    req.isAdminUser = true;
    req.isSuperAdmin = isSuperAdmin;
    
    next();
};

// Apply admin middleware to all routes
router.use(ensureAdmin);

// Multer configuration for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './public/uploads/admin';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|svg|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// ===========================================
// Admin Dashboard
// ===========================================

router.get('/', async (req, res) => {
    try {
        const [
            userCount,
            themeCount,
            galleryThemeCount,
            organizationCount,
            recentUsers,
            recentThemes
        ] = await Promise.all([
            User.countDocuments(),
            require('../models/Theme').countDocuments(),
            GalleryTheme.countDocuments(),
            Organization.countDocuments(),
            User.find().sort({ createdAt: -1 }).limit(5).select('email displayName createdAt'),
            require('../models/Theme').find().sort({ createdAt: -1 }).limit(5).populate('user', 'email displayName')
        ]);
        
        res.render('admin/index', {
            title: 'Admin Dashboard',
            layout: 'admin',
            stats: {
                userCount,
                themeCount,
                galleryThemeCount,
                organizationCount
            },
            recentUsers,
            recentThemes,
            isSuperAdmin: req.isSuperAdmin
        });
    } catch (error) {
        logger.error('Admin dashboard error:', error);
        req.flash('error_msg', 'Failed to load dashboard');
        res.redirect('/');
    }
});

// ===========================================
// Gallery Themes Management
// ===========================================

// List gallery themes
router.get('/gallery-themes', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;
        const filter = req.query.filter || 'all';
        
        let query = {};
        if (filter === 'published') query.isPublished = true;
        if (filter === 'draft') query.isPublished = false;
        if (filter === 'featured') query.isFeatured = true;
        
        const [themes, total] = await Promise.all([
            GalleryTheme.find(query)
                .sort({ displayOrder: 1, name: 1 })
                .skip(skip)
                .limit(limit)
                .populate('createdBy', 'email displayName'),
            GalleryTheme.countDocuments(query)
        ]);
        
        res.render('admin/gallery-themes/list', {
            title: 'Gallery Themes - Admin',
            layout: 'admin',
            themes,
            pagination: {
                page,
                totalPages: Math.ceil(total / limit),
                total
            },
            filter
        });
    } catch (error) {
        logger.error('Admin gallery themes error:', error);
        req.flash('error_msg', 'Failed to load themes');
        res.redirect('/admin');
    }
});

// Add gallery theme form
router.get('/gallery-themes/add', (req, res) => {
    res.render('admin/gallery-themes/edit', {
        title: 'Add Gallery Theme - Admin',
        layout: 'admin',
        theme: null,
        isNew: true
    });
});

// Edit gallery theme form
router.get('/gallery-themes/:id/edit', async (req, res) => {
    try {
        const theme = await GalleryTheme.findById(req.params.id);
        if (!theme) {
            req.flash('error_msg', 'Theme not found');
            return res.redirect('/admin/gallery-themes');
        }
        
        res.render('admin/gallery-themes/edit', {
            title: `Edit ${theme.name} - Admin`,
            layout: 'admin',
            theme,
            isNew: false
        });
    } catch (error) {
        logger.error('Admin edit theme error:', error);
        req.flash('error_msg', 'Failed to load theme');
        res.redirect('/admin/gallery-themes');
    }
});

// Save gallery theme (create or update)
router.post('/gallery-themes/save',
    upload.single('previewImageFile'),
    [
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('downloadUrl').trim().isURL().withMessage('Valid download URL is required'),
        body('category').isIn(['landing', 'portfolio', 'business', 'blog', 'admin', 'ecommerce', 'government', 'other'])
    ],
    async (req, res) => {
        const errors = validationResult(req);
        
        if (!errors.isEmpty()) {
            req.flash('error_msg', errors.array().map(e => e.msg).join(', '));
            return res.redirect('back');
        }
        
        try {
            const {
                themeId,
                name,
                slug,
                description,
                longDescription,
                category,
                bootstrapVersion,
                previewImage,
                demoUrl,
                downloadUrl,
                sourceUrl,
                documentationUrl,
                tags,
                licenseType,
                licenseUrl,
                authorName,
                authorUrl,
                features,
                isFree,
                price,
                displayOrder,
                isFeatured,
                isPublished,
                powerPagesEnhancedDataModel,
                powerPagesStandardDataModel,
                gcwebCompliant,
                wetCompliant,
                wcagLevel
            } = req.body;
            
            const themeData = {
                name,
                slug: slug || undefined,
                description,
                longDescription,
                category,
                bootstrapVersion: bootstrapVersion || '5',
                previewImage: req.file ? `/uploads/admin/${req.file.filename}` : previewImage,
                demoUrl,
                downloadUrl,
                sourceUrl,
                documentationUrl,
                tags: tags ? tags.split(',').map(t => t.trim().toLowerCase()) : [],
                license: {
                    type: licenseType || 'MIT',
                    url: licenseUrl
                },
                author: {
                    name: authorName,
                    url: authorUrl
                },
                features: features ? features.split('\n').filter(f => f.trim()) : [],
                pricing: {
                    isFree: isFree === 'true' || isFree === true,
                    price: parseFloat(price) || 0
                },
                displayOrder: parseInt(displayOrder) || 0,
                isFeatured: isFeatured === 'true' || isFeatured === true,
                isPublished: isPublished === 'true' || isPublished === true,
                isActive: true,
                compatibility: {
                    powerPagesEnhancedDataModel: powerPagesEnhancedDataModel === 'true',
                    powerPagesStandardDataModel: powerPagesStandardDataModel === 'true',
                    gcwebCompliant: gcwebCompliant === 'true',
                    wetCompliant: wetCompliant === 'true',
                    wcagLevel: wcagLevel || 'none'
                },
                updatedBy: req.user._id
            };
            
            if (themeId) {
                // Update existing
                await GalleryTheme.findByIdAndUpdate(themeId, themeData);
                logger.info('Gallery theme updated', { themeId, adminId: req.user._id });
                req.flash('success_msg', 'Theme updated successfully');
            } else {
                // Create new
                themeData.createdBy = req.user._id;
                const theme = await GalleryTheme.create(themeData);
                logger.info('Gallery theme created', { themeId: theme._id, adminId: req.user._id });
                req.flash('success_msg', 'Theme created successfully');
            }
            
            res.redirect('/admin/gallery-themes');
            
        } catch (error) {
            logger.error('Admin save theme error:', error);
            req.flash('error_msg', 'Failed to save theme: ' + error.message);
            res.redirect('back');
        }
    }
);

// Delete gallery theme
router.post('/gallery-themes/:id/delete', async (req, res) => {
    try {
        const theme = await GalleryTheme.findByIdAndDelete(req.params.id);
        if (theme) {
            logger.info('Gallery theme deleted', { themeId: req.params.id, adminId: req.user._id });
            req.flash('success_msg', 'Theme deleted successfully');
        } else {
            req.flash('error_msg', 'Theme not found');
        }
    } catch (error) {
        logger.error('Admin delete theme error:', error);
        req.flash('error_msg', 'Failed to delete theme');
    }
    res.redirect('/admin/gallery-themes');
});

// Toggle theme publish status
router.post('/gallery-themes/:id/toggle-publish', async (req, res) => {
    try {
        const theme = await GalleryTheme.findById(req.params.id);
        if (theme) {
            theme.isPublished = !theme.isPublished;
            theme.updatedBy = req.user._id;
            await theme.save();
            req.flash('success_msg', `Theme ${theme.isPublished ? 'published' : 'unpublished'}`);
        }
    } catch (error) {
        logger.error('Admin toggle publish error:', error);
        req.flash('error_msg', 'Failed to update theme');
    }
    res.redirect('/admin/gallery-themes');
});

// ===========================================
// Site Configuration
// ===========================================

router.get('/config', async (req, res) => {
    try {
        const configs = await SiteConfig.find().sort({ category: 1, key: 1 });
        
        // Group by category
        const configsByCategory = {};
        configs.forEach(config => {
            if (!configsByCategory[config.category]) {
                configsByCategory[config.category] = [];
            }
            configsByCategory[config.category].push(config);
        });
        
        res.render('admin/config/index', {
            title: 'Site Configuration - Admin',
            layout: 'admin',
            configsByCategory,
            isSuperAdmin: req.isSuperAdmin
        });
    } catch (error) {
        logger.error('Admin config error:', error);
        req.flash('error_msg', 'Failed to load configuration');
        res.redirect('/admin');
    }
});

// Update configuration
router.post('/config/update', async (req, res) => {
    try {
        const { key, value, valueType } = req.body;
        
        let parsedValue = value;
        
        // Parse value based on type
        switch (valueType) {
            case 'number':
                parsedValue = parseFloat(value);
                break;
            case 'boolean':
                parsedValue = value === 'true' || value === true;
                break;
            case 'json':
                parsedValue = JSON.parse(value);
                break;
            case 'array':
                parsedValue = value.split('\n').map(v => v.trim()).filter(v => v);
                break;
        }
        
        await SiteConfig.set(key, parsedValue, { updatedBy: req.user._id });
        
        logger.info('Config updated', { key, adminId: req.user._id });
        req.flash('success_msg', 'Configuration updated');
        
    } catch (error) {
        logger.error('Admin config update error:', error);
        req.flash('error_msg', 'Failed to update configuration');
    }
    res.redirect('/admin/config');
});

// Initialize default configs
router.post('/config/initialize-defaults', async (req, res) => {
    if (!req.isSuperAdmin) {
        req.flash('error_msg', 'Only super admins can initialize defaults');
        return res.redirect('/admin/config');
    }
    
    try {
        const count = await SiteConfig.initializeDefaults();
        logger.info('Config defaults initialized', { count, adminId: req.user._id });
        req.flash('success_msg', `Initialized ${count} default configuration values`);
    } catch (error) {
        logger.error('Admin config initialize error:', error);
        req.flash('error_msg', 'Failed to initialize defaults');
    }
    res.redirect('/admin/config');
});

// ===========================================
// Users Management
// ===========================================

router.get('/users', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 25;
        const skip = (page - 1) * limit;
        const search = req.query.search || '';
        
        let query = {};
        if (search) {
            query = {
                $or: [
                    { email: { $regex: search, $options: 'i' } },
                    { displayName: { $regex: search, $options: 'i' } },
                    { organization: { $regex: search, $options: 'i' } }
                ]
            };
        }
        
        const [users, total] = await Promise.all([
            User.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('-password'),
            User.countDocuments(query)
        ]);
        
        res.render('admin/users/list', {
            title: 'Users - Admin',
            layout: 'admin',
            users,
            pagination: {
                page,
                totalPages: Math.ceil(total / limit),
                total
            },
            search
        });
    } catch (error) {
        logger.error('Admin users error:', error);
        req.flash('error_msg', 'Failed to load users');
        res.redirect('/admin');
    }
});

// View user details
router.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/admin/users');
        }
        
        const themes = await require('../models/Theme').find({ user: user._id })
            .sort({ createdAt: -1 })
            .limit(10);
        
        const organizations = await Organization.find({
            $or: [
                { owner: user._id },
                { 'members.user': user._id }
            ]
        });
        
        res.render('admin/users/detail', {
            title: `${user.displayName || user.email} - Admin`,
            layout: 'admin',
            targetUser: user,
            themes,
            organizations,
            isSuperAdmin: req.isSuperAdmin
        });
    } catch (error) {
        logger.error('Admin user detail error:', error);
        req.flash('error_msg', 'Failed to load user');
        res.redirect('/admin/users');
    }
});

// Update user
router.post('/users/:id/update', async (req, res) => {
    try {
        const { role, isActive, themesLimit, storageLimit } = req.body;
        
        const updateData = {
            role,
            isActive: isActive === 'true',
            'usage.themesLimit': parseInt(themesLimit) || 1,
            'usage.storageLimit': parseInt(storageLimit) || 52428800
        };
        
        await User.findByIdAndUpdate(req.params.id, updateData);
        
        logger.info('User updated by admin', { 
            targetUserId: req.params.id, 
            adminId: req.user._id,
            changes: updateData
        });
        
        req.flash('success_msg', 'User updated successfully');
    } catch (error) {
        logger.error('Admin user update error:', error);
        req.flash('error_msg', 'Failed to update user');
    }
    res.redirect(`/admin/users/${req.params.id}`);
});

// ===========================================
// Organizations Management
// ===========================================

router.get('/organizations', async (req, res) => {
    try {
        const organizations = await Organization.find()
            .sort({ createdAt: -1 })
            .populate('owner', 'email displayName');
        
        res.render('admin/organizations/list', {
            title: 'Organizations - Admin',
            layout: 'admin',
            organizations
        });
    } catch (error) {
        logger.error('Admin organizations error:', error);
        req.flash('error_msg', 'Failed to load organizations');
        res.redirect('/admin');
    }
});

router.get('/organizations/:id', async (req, res) => {
    try {
        const organization = await Organization.findById(req.params.id)
            .populate('owner', 'email displayName')
            .populate('members.user', 'email displayName');
        
        if (!organization) {
            req.flash('error_msg', 'Organization not found');
            return res.redirect('/admin/organizations');
        }
        
        res.render('admin/organizations/detail', {
            title: `${organization.name} - Admin`,
            layout: 'admin',
            organization
        });
    } catch (error) {
        logger.error('Admin organization detail error:', error);
        req.flash('error_msg', 'Failed to load organization');
        res.redirect('/admin/organizations');
    }
});

// ===========================================
// Seed Gallery Themes
// ===========================================

router.post('/gallery-themes/seed-defaults', async (req, res) => {
    if (!req.isSuperAdmin) {
        req.flash('error_msg', 'Only super admins can seed default themes');
        return res.redirect('/admin/gallery-themes');
    }
    
    try {
        const defaultThemes = [
            {
                name: 'Agency',
                slug: 'agency',
                description: 'A one page portfolio theme for agencies',
                category: 'portfolio',
                bootstrapVersion: '5',
                previewImage: 'https://startbootstrap.com/assets/img/screenshots/themes/agency.png',
                demoUrl: 'https://startbootstrap.github.io/startbootstrap-agency/',
                downloadUrl: 'https://github.com/StartBootstrap/startbootstrap-agency/archive/refs/heads/master.zip',
                sourceUrl: 'https://github.com/StartBootstrap/startbootstrap-agency',
                tags: ['portfolio', 'agency', 'one-page'],
                license: { type: 'MIT' },
                author: { name: 'Start Bootstrap', url: 'https://startbootstrap.com' },
                pricing: { isFree: true },
                isPublished: true,
                isFeatured: true,
                displayOrder: 1
            },
            {
                name: 'Creative',
                slug: 'creative',
                description: 'A one page creative theme with modern design',
                category: 'landing',
                bootstrapVersion: '5',
                previewImage: 'https://startbootstrap.com/assets/img/screenshots/themes/creative.png',
                demoUrl: 'https://startbootstrap.github.io/startbootstrap-creative/',
                downloadUrl: 'https://github.com/StartBootstrap/startbootstrap-creative/archive/refs/heads/master.zip',
                sourceUrl: 'https://github.com/StartBootstrap/startbootstrap-creative',
                tags: ['creative', 'landing', 'one-page'],
                license: { type: 'MIT' },
                author: { name: 'Start Bootstrap', url: 'https://startbootstrap.com' },
                pricing: { isFree: true },
                isPublished: true,
                displayOrder: 2
            },
            {
                name: 'Clean Blog',
                slug: 'clean-blog',
                description: 'A clean, responsive blog theme',
                category: 'blog',
                bootstrapVersion: '5',
                previewImage: 'https://startbootstrap.com/assets/img/screenshots/themes/clean-blog.png',
                demoUrl: 'https://startbootstrap.github.io/startbootstrap-clean-blog/',
                downloadUrl: 'https://github.com/StartBootstrap/startbootstrap-clean-blog/archive/refs/heads/master.zip',
                sourceUrl: 'https://github.com/StartBootstrap/startbootstrap-clean-blog',
                tags: ['blog', 'clean', 'minimal'],
                license: { type: 'MIT' },
                author: { name: 'Start Bootstrap', url: 'https://startbootstrap.com' },
                pricing: { isFree: true },
                isPublished: true,
                displayOrder: 3
            },
            {
                name: 'Landing Page',
                slug: 'landing-page',
                description: 'A clean, functional landing page theme',
                category: 'landing',
                bootstrapVersion: '5',
                previewImage: 'https://startbootstrap.com/assets/img/screenshots/themes/landing-page.png',
                demoUrl: 'https://startbootstrap.github.io/startbootstrap-landing-page/',
                downloadUrl: 'https://github.com/StartBootstrap/startbootstrap-landing-page/archive/refs/heads/master.zip',
                sourceUrl: 'https://github.com/StartBootstrap/startbootstrap-landing-page',
                tags: ['landing', 'business', 'startup'],
                license: { type: 'MIT' },
                author: { name: 'Start Bootstrap', url: 'https://startbootstrap.com' },
                pricing: { isFree: true },
                isPublished: true,
                displayOrder: 4
            },
            {
                name: 'SB Admin 2',
                slug: 'sb-admin-2',
                description: 'A free Bootstrap admin dashboard template',
                category: 'admin',
                bootstrapVersion: '4',
                previewImage: 'https://startbootstrap.com/assets/img/screenshots/themes/sb-admin-2.png',
                demoUrl: 'https://startbootstrap.github.io/startbootstrap-sb-admin-2/',
                downloadUrl: 'https://github.com/StartBootstrap/startbootstrap-sb-admin-2/archive/refs/heads/master.zip',
                sourceUrl: 'https://github.com/StartBootstrap/startbootstrap-sb-admin-2',
                tags: ['admin', 'dashboard', 'bootstrap4'],
                license: { type: 'MIT' },
                author: { name: 'Start Bootstrap', url: 'https://startbootstrap.com' },
                pricing: { isFree: true },
                isPublished: true,
                displayOrder: 5
            },
            {
                name: 'Freelancer',
                slug: 'freelancer',
                description: 'A one page freelancer portfolio theme',
                category: 'portfolio',
                bootstrapVersion: '5',
                previewImage: 'https://startbootstrap.com/assets/img/screenshots/themes/freelancer.png',
                demoUrl: 'https://startbootstrap.github.io/startbootstrap-freelancer/',
                downloadUrl: 'https://github.com/StartBootstrap/startbootstrap-freelancer/archive/refs/heads/master.zip',
                sourceUrl: 'https://github.com/StartBootstrap/startbootstrap-freelancer',
                tags: ['portfolio', 'freelancer', 'one-page'],
                license: { type: 'MIT' },
                author: { name: 'Start Bootstrap', url: 'https://startbootstrap.com' },
                pricing: { isFree: true },
                isPublished: true,
                displayOrder: 6
            }
        ];
        
        for (const themeData of defaultThemes) {
            await GalleryTheme.findOneAndUpdate(
                { slug: themeData.slug },
                { ...themeData, createdBy: req.user._id, updatedBy: req.user._id },
                { upsert: true }
            );
        }
        
        logger.info('Default gallery themes seeded', { count: defaultThemes.length, adminId: req.user._id });
        req.flash('success_msg', `Seeded ${defaultThemes.length} default themes`);
        
    } catch (error) {
        logger.error('Seed themes error:', error);
        req.flash('error_msg', 'Failed to seed themes');
    }
    res.redirect('/admin/gallery-themes');
});

module.exports = router;
