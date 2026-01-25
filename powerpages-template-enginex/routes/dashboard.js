/**
 * Dashboard Routes
 * Protected user dashboard pages
 */

const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const Theme = require('../models/Theme');
const logger = require('../config/logger');

// Apply authentication to all dashboard routes
router.use(ensureAuthenticated);

// Dashboard home
router.get('/', async (req, res) => {
    try {
        // Get user's themes
        const themes = await Theme.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(5);
        
        // Get deployment stats
        const stats = {
            totalThemes: await Theme.countDocuments({ user: req.user._id }),
            activeThemes: await Theme.countDocuments({ 
                user: req.user._id, 
                'deployment.status': 'completed' 
            }),
            pendingThemes: await Theme.countDocuments({ 
                user: req.user._id, 
                'deployment.status': { $in: ['pending', 'validating', 'creating_site', 'deploying'] }
            }),
            failedThemes: await Theme.countDocuments({ 
                user: req.user._id, 
                'deployment.status': 'failed' 
            })
        };
        
        res.render('dashboard/index', {
            title: 'Dashboard - PowerPages Template Engine',
            themes,
            stats,
            isDashboard: true
        });
        
    } catch (error) {
        logger.error('Dashboard error:', error);
        req.flash('error_msg', 'Failed to load dashboard');
        res.redirect('/');
    }
});

// My themes
router.get('/themes', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const skip = (page - 1) * limit;
        
        const [themes, total] = await Promise.all([
            Theme.find({ user: req.user._id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Theme.countDocuments({ user: req.user._id })
        ]);
        
        const totalPages = Math.ceil(total / limit);
        
        res.render('dashboard/themes', {
            title: 'My Themes - PowerPages Template Engine',
            themes,
            pagination: {
                page,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            isDashboard: true
        });
        
    } catch (error) {
        logger.error('Themes list error:', error);
        req.flash('error_msg', 'Failed to load themes');
        res.redirect('/dashboard');
    }
});

// Theme details
router.get('/themes/:id', async (req, res) => {
    try {
        const theme = await Theme.findOne({
            _id: req.params.id,
            user: req.user._id
        });
        
        if (!theme) {
            req.flash('error_msg', 'Theme not found');
            return res.redirect('/dashboard/themes');
        }
        
        res.render('dashboard/theme-details', {
            title: `${theme.name} - PowerPages Template Engine`,
            theme,
            isDashboard: true
        });
        
    } catch (error) {
        logger.error('Theme details error:', error);
        req.flash('error_msg', 'Failed to load theme details');
        res.redirect('/dashboard/themes');
    }
});

// Delete theme
router.post('/themes/:id/delete', async (req, res) => {
    try {
        const theme = await Theme.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id
        });
        
        if (!theme) {
            req.flash('error_msg', 'Theme not found');
            return res.redirect('/dashboard/themes');
        }
        
        // Update user's theme count
        req.user.usage.themesDeployed = Math.max(0, req.user.usage.themesDeployed - 1);
        await req.user.save();
        
        logger.info('Theme deleted', { userId: req.user._id, themeId: req.params.id });
        
        req.flash('success_msg', 'Theme deleted successfully');
        res.redirect('/dashboard/themes');
        
    } catch (error) {
        logger.error('Theme deletion error:', error);
        req.flash('error_msg', 'Failed to delete theme');
        res.redirect('/dashboard/themes');
    }
});

// Settings page
router.get('/settings', (req, res) => {
    res.render('dashboard/settings', {
        title: 'Settings - PowerPages Template Engine',
        isDashboard: true
    });
});

// Update profile
router.post('/settings/profile', async (req, res) => {
    try {
        const { displayName, firstName, lastName, organization } = req.body;
        
        req.user.displayName = displayName;
        req.user.firstName = firstName;
        req.user.lastName = lastName;
        req.user.organization = organization;
        await req.user.save();
        
        req.flash('success_msg', 'Profile updated successfully');
        res.redirect('/dashboard/settings');
        
    } catch (error) {
        logger.error('Profile update error:', error);
        req.flash('error_msg', 'Failed to update profile');
        res.redirect('/dashboard/settings');
    }
});

// Subscription page
router.get('/subscription', (req, res) => {
    res.render('dashboard/subscription', {
        title: 'Subscription - PowerPages Template Engine',
        isDashboard: true
    });
});

module.exports = router;
