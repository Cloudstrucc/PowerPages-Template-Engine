/**
 * API Routes
 * RESTful API endpoints
 */

const express = require('express');
const router = express.Router();
const { ensureAuthenticated, userRateLimit } = require('../middleware/auth');
const Theme = require('../models/Theme');
const logger = require('../config/logger');

// Apply rate limiting to API routes
router.use(userRateLimit(100, 15 * 60 * 1000)); // 100 requests per 15 minutes

// Get current user
router.get('/me', ensureAuthenticated, (req, res) => {
    res.json({
        user: {
            id: req.user._id,
            email: req.user.email,
            displayName: req.user.displayName,
            subscription: {
                status: req.user.subscription.status,
                plan: req.user.subscription.plan
            },
            usage: req.user.usage
        }
    });
});

// Get user's themes
router.get('/themes', ensureAuthenticated, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const skip = (page - 1) * limit;
        
        const [themes, total] = await Promise.all([
            Theme.find({ user: req.user._id })
                .select('-deployment.deploymentLogs')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Theme.countDocuments({ user: req.user._id })
        ]);
        
        res.json({
            themes,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        logger.error('API themes error:', error);
        res.status(500).json({ error: 'Failed to fetch themes' });
    }
});

// Get single theme
router.get('/themes/:id', ensureAuthenticated, async (req, res) => {
    try {
        const theme = await Theme.findOne({
            _id: req.params.id,
            user: req.user._id
        });
        
        if (!theme) {
            return res.status(404).json({ error: 'Theme not found' });
        }
        
        res.json({ theme });
        
    } catch (error) {
        logger.error('API theme detail error:', error);
        res.status(500).json({ error: 'Failed to fetch theme' });
    }
});

// Delete theme
router.delete('/themes/:id', ensureAuthenticated, async (req, res) => {
    try {
        const theme = await Theme.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id
        });
        
        if (!theme) {
            return res.status(404).json({ error: 'Theme not found' });
        }
        
        // Update user's theme count
        req.user.usage.themesDeployed = Math.max(0, req.user.usage.themesDeployed - 1);
        await req.user.save();
        
        logger.info('Theme deleted via API', { userId: req.user._id, themeId: req.params.id });
        
        res.json({ success: true, message: 'Theme deleted' });
        
    } catch (error) {
        logger.error('API theme delete error:', error);
        res.status(500).json({ error: 'Failed to delete theme' });
    }
});

// Health check
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: require('../package.json').version
    });
});

module.exports = router;
