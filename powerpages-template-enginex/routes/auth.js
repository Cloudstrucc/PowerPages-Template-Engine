/**
 * Authentication Routes
 * Login, Register, Password Reset, Microsoft OAuth
 */

const express = require('express');
const router = express.Router();
const passport = require('passport');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { ensureGuest, ensureAuthenticated } = require('../middleware/auth');
const emailService = require('../services/emailService');
const logger = require('../config/logger');

// ===========================================
// Login Routes
// ===========================================

// GET - Login page
router.get('/login', ensureGuest, (req, res) => {
    res.render('auth/login', {
        title: 'Sign In - PowerPages Template Engine',
        returnTo: req.session.returnTo
    });
});

// POST - Local login
router.post('/login',
    ensureGuest,
    [
        body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
        body('password').notEmpty().withMessage('Password is required')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('auth/login', {
                title: 'Sign In - PowerPages Template Engine',
                errors: errors.array(),
                email: req.body.email
            });
        }
        
        try {
            const { email, password } = req.body;
            
            // Find user with password
            const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
            
            if (!user) {
                req.flash('error_msg', 'Invalid email or password');
                return res.redirect('/auth/login');
            }
            
            // Check if user uses Microsoft auth only
            if (user.authProvider === 'microsoft' && !user.password) {
                req.flash('error_msg', 'Please sign in with Microsoft');
                return res.redirect('/auth/login');
            }
            
            // Verify password
            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                req.flash('error_msg', 'Invalid email or password');
                return res.redirect('/auth/login');
            }
            
            // Check if account is active
            if (!user.isActive) {
                req.flash('error_msg', 'Your account has been deactivated');
                return res.redirect('/auth/login');
            }
            
            // Log in the user
            req.login(user, async (err) => {
                if (err) {
                    logger.error('Login error:', err);
                    req.flash('error_msg', 'An error occurred during login');
                    return res.redirect('/auth/login');
                }
                
                // Record login
                await user.recordLogin();
                
                logger.info('User logged in', { userId: user._id, email: user.email });
                
                // Redirect to original destination or dashboard
                const returnTo = req.session.returnTo || '/dashboard';
                delete req.session.returnTo;
                res.redirect(returnTo);
            });
            
        } catch (error) {
            logger.error('Login error:', error);
            req.flash('error_msg', 'An error occurred during login');
            res.redirect('/auth/login');
        }
    }
);

// ===========================================
// Registration Routes
// ===========================================

// GET - Register page
router.get('/register', ensureGuest, (req, res) => {
    res.render('auth/register', {
        title: 'Sign Up - PowerPages Template Engine'
    });
});

// POST - Register new user
router.post('/register',
    ensureGuest,
    [
        body('fullName')
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('Name must be between 2 and 100 characters'),
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Please enter a valid email'),
        body('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters')
            .matches(/[A-Z]/)
            .withMessage('Password must contain at least one uppercase letter')
            .matches(/[0-9]/)
            .withMessage('Password must contain at least one number'),
        body('confirmPassword')
            .custom((value, { req }) => value === req.body.password)
            .withMessage('Passwords do not match'),
        body('organization')
            .optional()
            .trim()
            .isLength({ max: 100 })
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('auth/register', {
                title: 'Sign Up - PowerPages Template Engine',
                errors: errors.array(),
                fullName: req.body.fullName,
                email: req.body.email,
                organization: req.body.organization
            });
        }
        
        try {
            const { fullName, email, password, organization } = req.body;
            
            // Check if user exists
            const existingUser = await User.findOne({ email: email.toLowerCase() });
            if (existingUser) {
                req.flash('error_msg', 'An account with this email already exists');
                return res.redirect('/auth/register');
            }
            
            // Parse name
            const nameParts = fullName.trim().split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ');
            
            // Generate verification token
            const verificationToken = crypto.randomBytes(32).toString('hex');
            
            // Create user
            const user = await User.create({
                email: email.toLowerCase(),
                password: password,
                displayName: fullName,
                firstName: firstName,
                lastName: lastName || undefined,
                organization: organization || undefined,
                authProvider: 'local',
                emailVerificationToken: verificationToken,
                emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
            });
            
            logger.info('New user registered', { userId: user._id, email: user.email });
            
            // Send verification email
            try {
                await emailService.sendVerification(user, verificationToken);
            } catch (emailError) {
                logger.error('Failed to send verification email:', emailError);
            }
            
            // Send welcome email
            try {
                await emailService.sendWelcome(user);
            } catch (emailError) {
                logger.error('Failed to send welcome email:', emailError);
            }
            
            // Log in the user
            req.login(user, (err) => {
                if (err) {
                    logger.error('Auto-login after registration failed:', err);
                    req.flash('success_msg', 'Registration successful! Please log in.');
                    return res.redirect('/auth/login');
                }
                
                req.flash('success_msg', 'Welcome! Please check your email to verify your account.');
                res.redirect('/dashboard');
            });
            
        } catch (error) {
            logger.error('Registration error:', error);
            req.flash('error_msg', 'An error occurred during registration');
            res.redirect('/auth/register');
        }
    }
);

// ===========================================
// Microsoft OAuth Routes
// ===========================================

// GET - Initiate Microsoft login
router.get('/microsoft',
    (req, res, next) => {
        // Save return URL
        if (req.query.returnTo) {
            req.session.returnTo = req.query.returnTo;
        }
        next();
    },
    passport.authenticate('azuread-openidconnect', {
        failureRedirect: '/auth/login',
        failureFlash: true
    })
);

// POST - Microsoft callback
router.post('/microsoft/callback',
    passport.authenticate('azuread-openidconnect', {
        failureRedirect: '/auth/login',
        failureFlash: true
    }),
    async (req, res) => {
        try {
            // Record login
            await req.user.recordLogin();
            
            logger.info('User logged in via Microsoft', {
                userId: req.user._id,
                email: req.user.email
            });
            
            // Check if new user (just created)
            const isNewUser = (Date.now() - req.user.createdAt.getTime()) < 60000;
            
            if (isNewUser) {
                try {
                    await emailService.sendWelcome(req.user);
                } catch (emailError) {
                    logger.error('Failed to send welcome email:', emailError);
                }
            }
            
            // Redirect
            const returnTo = req.session.returnTo || '/dashboard';
            delete req.session.returnTo;
            res.redirect(returnTo);
            
        } catch (error) {
            logger.error('Microsoft callback error:', error);
            req.flash('error_msg', 'An error occurred during authentication');
            res.redirect('/auth/login');
        }
    }
);

// ===========================================
// Email Verification Routes
// ===========================================

// GET - Verify email page
router.get('/verify-email', ensureAuthenticated, (req, res) => {
    res.render('auth/verify-email', {
        title: 'Verify Email - PowerPages Template Engine',
        emailVerified: req.user.emailVerified
    });
});

// GET - Verify email token
router.get('/verify-email/:token', async (req, res) => {
    try {
        const user = await User.findOne({
            emailVerificationToken: req.params.token,
            emailVerificationExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            req.flash('error_msg', 'Invalid or expired verification link');
            return res.redirect('/auth/login');
        }
        
        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();
        
        logger.info('Email verified', { userId: user._id });
        
        req.flash('success_msg', 'Your email has been verified!');
        
        if (req.isAuthenticated()) {
            res.redirect('/dashboard');
        } else {
            res.redirect('/auth/login');
        }
        
    } catch (error) {
        logger.error('Email verification error:', error);
        req.flash('error_msg', 'An error occurred during verification');
        res.redirect('/auth/login');
    }
});

// POST - Resend verification email
router.post('/resend-verification', ensureAuthenticated, async (req, res) => {
    try {
        if (req.user.emailVerified) {
            req.flash('info_msg', 'Your email is already verified');
            return res.redirect('/dashboard');
        }
        
        // Generate new token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        req.user.emailVerificationToken = verificationToken;
        req.user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
        await req.user.save();
        
        // Send email
        await emailService.sendVerification(req.user, verificationToken);
        
        req.flash('success_msg', 'Verification email sent! Please check your inbox.');
        res.redirect('/auth/verify-email');
        
    } catch (error) {
        logger.error('Resend verification error:', error);
        req.flash('error_msg', 'Failed to send verification email');
        res.redirect('/auth/verify-email');
    }
});

// ===========================================
// Password Reset Routes
// ===========================================

// GET - Forgot password page
router.get('/forgot-password', ensureGuest, (req, res) => {
    res.render('auth/forgot-password', {
        title: 'Forgot Password - PowerPages Template Engine'
    });
});

// POST - Request password reset
router.post('/forgot-password',
    ensureGuest,
    [
        body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('auth/forgot-password', {
                title: 'Forgot Password - PowerPages Template Engine',
                errors: errors.array()
            });
        }
        
        try {
            const user = await User.findOne({ email: req.body.email.toLowerCase() });
            
            // Always show success message (don't reveal if email exists)
            if (!user) {
                req.flash('success_msg', 'If an account exists with that email, you will receive a password reset link.');
                return res.redirect('/auth/forgot-password');
            }
            
            // Check if user uses Microsoft auth only
            if (user.authProvider === 'microsoft' && !user.password) {
                req.flash('info_msg', 'This account uses Microsoft sign-in. Please use the "Sign in with Microsoft" button.');
                return res.redirect('/auth/login');
            }
            
            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
            user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
            await user.save();
            
            // Send reset email
            await emailService.sendPasswordReset(user, resetToken);
            
            logger.info('Password reset requested', { userId: user._id });
            
            req.flash('success_msg', 'If an account exists with that email, you will receive a password reset link.');
            res.redirect('/auth/forgot-password');
            
        } catch (error) {
            logger.error('Forgot password error:', error);
            req.flash('error_msg', 'An error occurred. Please try again.');
            res.redirect('/auth/forgot-password');
        }
    }
);

// GET - Reset password page
router.get('/reset-password/:token', ensureGuest, async (req, res) => {
    try {
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
        
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            req.flash('error_msg', 'Password reset link is invalid or has expired');
            return res.redirect('/auth/forgot-password');
        }
        
        res.render('auth/reset-password', {
            title: 'Reset Password - PowerPages Template Engine',
            token: req.params.token
        });
        
    } catch (error) {
        logger.error('Reset password page error:', error);
        req.flash('error_msg', 'An error occurred');
        res.redirect('/auth/forgot-password');
    }
});

// POST - Reset password
router.post('/reset-password/:token',
    ensureGuest,
    [
        body('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters')
            .matches(/[A-Z]/)
            .withMessage('Password must contain at least one uppercase letter')
            .matches(/[0-9]/)
            .withMessage('Password must contain at least one number'),
        body('confirmPassword')
            .custom((value, { req }) => value === req.body.password)
            .withMessage('Passwords do not match')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('auth/reset-password', {
                title: 'Reset Password - PowerPages Template Engine',
                token: req.params.token,
                errors: errors.array()
            });
        }
        
        try {
            const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
            
            const user = await User.findOne({
                passwordResetToken: hashedToken,
                passwordResetExpires: { $gt: Date.now() }
            });
            
            if (!user) {
                req.flash('error_msg', 'Password reset link is invalid or has expired');
                return res.redirect('/auth/forgot-password');
            }
            
            // Update password
            user.password = req.body.password;
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save();
            
            logger.info('Password reset successful', { userId: user._id });
            
            req.flash('success_msg', 'Your password has been reset. Please log in with your new password.');
            res.redirect('/auth/login');
            
        } catch (error) {
            logger.error('Reset password error:', error);
            req.flash('error_msg', 'An error occurred. Please try again.');
            res.redirect('/auth/forgot-password');
        }
    }
);

// ===========================================
// Logout Route
// ===========================================

router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) {
            logger.error('Logout error:', err);
            return next(err);
        }
        req.flash('success_msg', 'You have been logged out');
        res.redirect('/');
    });
});

module.exports = router;
