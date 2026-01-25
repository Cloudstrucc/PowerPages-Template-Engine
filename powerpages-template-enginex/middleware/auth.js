/**
 * Authentication Middleware
 */

const logger = require('../config/logger');

/**
 * Ensure user is authenticated
 */
const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    
    req.flash('error_msg', 'Please log in to access this page');
    req.session.returnTo = req.originalUrl;
    res.redirect('/auth/login');
};

/**
 * Ensure user is NOT authenticated (for login/register pages)
 */
const ensureGuest = (req, res, next) => {
    if (req.isAuthenticated()) {
        return res.redirect('/dashboard');
    }
    next();
};

/**
 * Ensure user has admin role
 */
const ensureAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'admin') {
        return next();
    }
    
    logger.warn('Unauthorized admin access attempt', {
        userId: req.user?._id,
        path: req.originalUrl
    });
    
    res.status(403).render('errors/403', {
        title: 'Access Denied',
        message: 'You do not have permission to access this page.'
    });
};

/**
 * Ensure user has active subscription
 */
const ensureSubscription = (req, res, next) => {
    if (req.isAuthenticated() && req.user.hasActiveSubscription()) {
        return next();
    }
    
    req.flash('error_msg', 'An active subscription is required to access this feature');
    res.redirect('/pricing');
};

/**
 * Ensure user has specific subscription tier or higher
 */
const ensureSubscriptionTier = (minimumTier) => {
    const tierOrder = ['free', 'basic', 'pro', 'enterprise'];
    
    return (req, res, next) => {
        if (!req.isAuthenticated()) {
            req.flash('error_msg', 'Please log in to access this page');
            return res.redirect('/auth/login');
        }
        
        const userTier = req.user.getSubscriptionTier();
        const userTierIndex = tierOrder.indexOf(userTier);
        const minimumTierIndex = tierOrder.indexOf(minimumTier);
        
        if (userTierIndex >= minimumTierIndex) {
            return next();
        }
        
        req.flash('error_msg', `This feature requires a ${minimumTier} subscription or higher`);
        res.redirect('/pricing');
    };
};

/**
 * Ensure user's email is verified
 */
const ensureEmailVerified = (req, res, next) => {
    if (req.isAuthenticated() && req.user.emailVerified) {
        return next();
    }
    
    req.flash('error_msg', 'Please verify your email address to continue');
    res.redirect('/auth/verify-email');
};

/**
 * Ensure user can deploy more themes (hasn't hit limit)
 */
const ensureCanDeploy = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.flash('error_msg', 'Please log in to access this page');
        return res.redirect('/auth/login');
    }
    
    if (req.user.canDeployTheme()) {
        return next();
    }
    
    req.flash('error_msg', 'You have reached your theme deployment limit. Please upgrade your subscription.');
    res.redirect('/pricing');
};

/**
 * Attach user to request if authenticated (for optional auth routes)
 */
const attachUser = (req, res, next) => {
    // User is already attached by Passport if authenticated
    next();
};

/**
 * Rate limit by user
 */
const userRateLimit = (maxRequests, windowMs) => {
    const userRequests = new Map();
    
    return (req, res, next) => {
        if (!req.isAuthenticated()) {
            return next();
        }
        
        const userId = req.user._id.toString();
        const now = Date.now();
        const windowStart = now - windowMs;
        
        // Get user's requests
        let requests = userRequests.get(userId) || [];
        
        // Filter to only requests in current window
        requests = requests.filter(timestamp => timestamp > windowStart);
        
        if (requests.length >= maxRequests) {
            return res.status(429).json({
                error: 'Too many requests. Please try again later.'
            });
        }
        
        requests.push(now);
        userRequests.set(userId, requests);
        
        next();
    };
};

module.exports = {
    ensureAuthenticated,
    ensureGuest,
    ensureAdmin,
    ensureSubscription,
    ensureSubscriptionTier,
    ensureEmailVerified,
    ensureCanDeploy,
    attachUser,
    userRateLimit
};
