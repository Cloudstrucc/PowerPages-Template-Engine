/**
 * Webhook Routes
 * Handle Stripe webhooks
 */

const express = require('express');
const router = express.Router();
const stripeService = require('../services/stripeService');
const logger = require('../config/logger');

// Stripe webhook handler
// Note: This route receives raw body (configured in app.js)
router.post('/stripe', async (req, res) => {
    const signature = req.headers['stripe-signature'];
    
    if (!signature) {
        logger.warn('Stripe webhook received without signature');
        return res.status(400).send('No signature');
    }
    
    try {
        // Verify webhook signature and construct event
        const event = stripeService.verifyWebhookSignature(req.body, signature);
        
        // Handle the event
        await stripeService.handleWebhook(event);
        
        // Return success
        res.json({ received: true });
        
    } catch (error) {
        logger.error('Stripe webhook error:', {
            error: error.message,
            type: error.type
        });
        
        // Return 400 for signature verification errors
        if (error.type === 'StripeSignatureVerificationError') {
            return res.status(400).send('Invalid signature');
        }
        
        // Return 500 for processing errors (Stripe will retry)
        res.status(500).send('Webhook processing failed');
    }
});

module.exports = router;
