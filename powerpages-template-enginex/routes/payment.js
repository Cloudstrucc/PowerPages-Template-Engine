/**
 * Payment Routes
 * Stripe checkout, billing portal, subscription management
 */

const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const stripeService = require('../services/stripeService');
const logger = require('../config/logger');

// Create checkout session
router.post('/create-checkout-session', ensureAuthenticated, async (req, res) => {
    try {
        const { plan, billingCycle } = req.body;
        
        if (!['basic', 'pro', 'enterprise'].includes(plan)) {
            return res.status(400).json({ error: 'Invalid plan selected' });
        }
        
        const session = await stripeService.createCheckoutSession(
            req.user,
            plan,
            billingCycle || 'monthly'
        );
        
        res.json({ url: session.url });
        
    } catch (error) {
        logger.error('Checkout session error:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

// Payment success page
router.get('/success', ensureAuthenticated, async (req, res) => {
    const sessionId = req.query.session_id;
    
    res.render('payment/success', {
        title: 'Payment Successful - PowerPages Template Engine',
        sessionId
    });
});

// Payment cancelled
router.get('/cancelled', ensureAuthenticated, (req, res) => {
    res.render('payment/cancelled', {
        title: 'Payment Cancelled - PowerPages Template Engine'
    });
});

// Billing portal
router.post('/billing-portal', ensureAuthenticated, async (req, res) => {
    try {
        if (!req.user.subscription.stripeCustomerId) {
            return res.status(400).json({ error: 'No billing account found' });
        }
        
        const session = await stripeService.createBillingPortalSession(req.user);
        res.json({ url: session.url });
        
    } catch (error) {
        logger.error('Billing portal error:', error);
        res.status(500).json({ error: 'Failed to access billing portal' });
    }
});

// Cancel subscription
router.post('/cancel-subscription', ensureAuthenticated, async (req, res) => {
    try {
        if (!req.user.hasActiveSubscription()) {
            return res.status(400).json({ error: 'No active subscription found' });
        }
        
        await stripeService.cancelSubscription(req.user);
        
        req.flash('success_msg', 'Your subscription will be cancelled at the end of the current billing period');
        res.redirect('/dashboard/subscription');
        
    } catch (error) {
        logger.error('Cancel subscription error:', error);
        req.flash('error_msg', 'Failed to cancel subscription');
        res.redirect('/dashboard/subscription');
    }
});

// Resume subscription
router.post('/resume-subscription', ensureAuthenticated, async (req, res) => {
    try {
        if (!req.user.subscription.cancelAtPeriodEnd) {
            return res.status(400).json({ error: 'Subscription is not scheduled for cancellation' });
        }
        
        await stripeService.resumeSubscription(req.user);
        
        req.flash('success_msg', 'Your subscription has been resumed');
        res.redirect('/dashboard/subscription');
        
    } catch (error) {
        logger.error('Resume subscription error:', error);
        req.flash('error_msg', 'Failed to resume subscription');
        res.redirect('/dashboard/subscription');
    }
});

module.exports = router;
