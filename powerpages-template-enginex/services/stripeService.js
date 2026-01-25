/**
 * Stripe Payment Service
 * Handle subscriptions, payments, and webhooks
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const logger = require('../config/logger');
const emailService = require('./emailService');

class StripeService {
    
    /**
     * Get price IDs for plans
     */
    getPriceId(plan, billingCycle = 'monthly') {
        const prices = {
            basic: {
                monthly: process.env.STRIPE_PRICE_BASIC,
                annual: process.env.STRIPE_PRICE_BASIC_ANNUAL
            },
            pro: {
                monthly: process.env.STRIPE_PRICE_PRO,
                annual: process.env.STRIPE_PRICE_PRO_ANNUAL
            },
            enterprise: {
                monthly: process.env.STRIPE_PRICE_ENTERPRISE,
                annual: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL
            }
        };
        
        return prices[plan]?.[billingCycle] || prices[plan]?.monthly;
    }
    
    /**
     * Get plan limits
     */
    getPlanLimits(plan) {
        const limits = {
            free: { themesLimit: 1, storageLimit: 52428800 }, // 50MB
            basic: { themesLimit: 3, storageLimit: 104857600 }, // 100MB
            pro: { themesLimit: 10, storageLimit: 524288000 }, // 500MB
            enterprise: { themesLimit: 100, storageLimit: 5368709120 } // 5GB
        };
        return limits[plan] || limits.free;
    }
    
    /**
     * Create or get Stripe customer
     */
    async getOrCreateCustomer(user) {
        if (user.subscription.stripeCustomerId) {
            try {
                const customer = await stripe.customers.retrieve(user.subscription.stripeCustomerId);
                if (!customer.deleted) {
                    return customer;
                }
            } catch (error) {
                logger.warn('Stripe customer not found, creating new one', {
                    userId: user._id,
                    oldCustomerId: user.subscription.stripeCustomerId
                });
            }
        }
        
        // Create new customer
        const customer = await stripe.customers.create({
            email: user.email,
            name: user.fullName,
            metadata: {
                userId: user._id.toString()
            }
        });
        
        // Save customer ID to user
        user.subscription.stripeCustomerId = customer.id;
        await user.save();
        
        logger.info('Created Stripe customer', {
            userId: user._id,
            customerId: customer.id
        });
        
        return customer;
    }
    
    /**
     * Create checkout session for subscription
     */
    async createCheckoutSession(user, plan, billingCycle = 'monthly') {
        const priceId = this.getPriceId(plan, billingCycle);
        
        if (!priceId) {
            throw new Error(`Invalid plan: ${plan}`);
        }
        
        // Get or create customer
        const customer = await this.getOrCreateCustomer(user);
        
        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customer.id,
            payment_method_types: ['card'],
            line_items: [{
                price: priceId,
                quantity: 1
            }],
            mode: 'subscription',
            success_url: `${process.env.APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.APP_URL}/pricing?canceled=true`,
            metadata: {
                userId: user._id.toString(),
                plan: plan,
                billingCycle: billingCycle
            },
            subscription_data: {
                metadata: {
                    userId: user._id.toString(),
                    plan: plan
                },
                trial_period_days: user.subscription.status === 'none' ? 14 : undefined
            },
            allow_promotion_codes: true,
            billing_address_collection: 'required'
        });
        
        logger.info('Created checkout session', {
            userId: user._id,
            sessionId: session.id,
            plan: plan
        });
        
        return session;
    }
    
    /**
     * Create billing portal session
     */
    async createBillingPortalSession(user) {
        if (!user.subscription.stripeCustomerId) {
            throw new Error('No Stripe customer found for this user');
        }
        
        const session = await stripe.billingPortal.sessions.create({
            customer: user.subscription.stripeCustomerId,
            return_url: `${process.env.APP_URL}/dashboard/settings`
        });
        
        return session;
    }
    
    /**
     * Cancel subscription at period end
     */
    async cancelSubscription(user) {
        if (!user.subscription.stripeSubscriptionId) {
            throw new Error('No active subscription found');
        }
        
        const subscription = await stripe.subscriptions.update(
            user.subscription.stripeSubscriptionId,
            { cancel_at_period_end: true }
        );
        
        user.subscription.cancelAtPeriodEnd = true;
        await user.save();
        
        logger.info('Subscription scheduled for cancellation', {
            userId: user._id,
            subscriptionId: subscription.id
        });
        
        return subscription;
    }
    
    /**
     * Resume cancelled subscription
     */
    async resumeSubscription(user) {
        if (!user.subscription.stripeSubscriptionId) {
            throw new Error('No subscription found');
        }
        
        const subscription = await stripe.subscriptions.update(
            user.subscription.stripeSubscriptionId,
            { cancel_at_period_end: false }
        );
        
        user.subscription.cancelAtPeriodEnd = false;
        await user.save();
        
        logger.info('Subscription resumed', {
            userId: user._id,
            subscriptionId: subscription.id
        });
        
        return subscription;
    }
    
    /**
     * Handle webhook events
     */
    async handleWebhook(event) {
        logger.info('Processing Stripe webhook', { type: event.type });
        
        switch (event.type) {
            case 'checkout.session.completed':
                await this.handleCheckoutComplete(event.data.object);
                break;
                
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await this.handleSubscriptionUpdate(event.data.object);
                break;
                
            case 'customer.subscription.deleted':
                await this.handleSubscriptionDeleted(event.data.object);
                break;
                
            case 'invoice.payment_succeeded':
                await this.handlePaymentSucceeded(event.data.object);
                break;
                
            case 'invoice.payment_failed':
                await this.handlePaymentFailed(event.data.object);
                break;
                
            default:
                logger.debug('Unhandled webhook event type', { type: event.type });
        }
    }
    
    /**
     * Handle checkout completion
     */
    async handleCheckoutComplete(session) {
        const userId = session.metadata.userId;
        const plan = session.metadata.plan;
        
        const user = await User.findById(userId);
        if (!user) {
            logger.error('User not found for checkout session', { userId, sessionId: session.id });
            return;
        }
        
        // Update user with subscription info
        user.subscription.stripeSubscriptionId = session.subscription;
        user.subscription.plan = plan;
        user.subscription.billingCycle = session.metadata.billingCycle || 'monthly';
        user.subscription.status = 'active';
        
        // Set plan limits
        const limits = this.getPlanLimits(plan);
        user.usage.themesLimit = limits.themesLimit;
        user.usage.storageLimit = limits.storageLimit;
        
        await user.save();
        
        // Send confirmation email
        try {
            await emailService.sendSubscriptionConfirmation(user, plan);
        } catch (error) {
            logger.error('Failed to send subscription confirmation email', { error });
        }
        
        logger.info('Checkout completed', { userId, plan, subscriptionId: session.subscription });
    }
    
    /**
     * Handle subscription updates
     */
    async handleSubscriptionUpdate(subscription) {
        const userId = subscription.metadata.userId;
        const user = await User.findById(userId);
        
        if (!user) {
            // Try finding by customer ID
            const userByCustomer = await User.findOne({
                'subscription.stripeCustomerId': subscription.customer
            });
            if (!userByCustomer) {
                logger.error('User not found for subscription update', {
                    subscriptionId: subscription.id,
                    customerId: subscription.customer
                });
                return;
            }
        }
        
        const targetUser = user || await User.findOne({
            'subscription.stripeCustomerId': subscription.customer
        });
        
        if (!targetUser) return;
        
        // Map Stripe status to our status
        const statusMap = {
            'active': 'active',
            'trialing': 'trialing',
            'past_due': 'past_due',
            'canceled': 'canceled',
            'unpaid': 'unpaid',
            'incomplete': 'pending',
            'incomplete_expired': 'canceled'
        };
        
        targetUser.subscription.status = statusMap[subscription.status] || subscription.status;
        targetUser.subscription.stripeSubscriptionId = subscription.id;
        targetUser.subscription.stripePriceId = subscription.items.data[0]?.price.id;
        targetUser.subscription.currentPeriodStart = new Date(subscription.current_period_start * 1000);
        targetUser.subscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        targetUser.subscription.cancelAtPeriodEnd = subscription.cancel_at_period_end;
        
        await targetUser.save();
        
        logger.info('Subscription updated', {
            userId: targetUser._id,
            status: targetUser.subscription.status
        });
    }
    
    /**
     * Handle subscription deletion
     */
    async handleSubscriptionDeleted(subscription) {
        const user = await User.findOne({
            'subscription.stripeSubscriptionId': subscription.id
        });
        
        if (!user) {
            logger.warn('User not found for subscription deletion', {
                subscriptionId: subscription.id
            });
            return;
        }
        
        // Reset subscription
        user.subscription.status = 'canceled';
        user.subscription.plan = 'none';
        user.subscription.stripeSubscriptionId = null;
        user.subscription.stripePriceId = null;
        user.subscription.cancelAtPeriodEnd = false;
        
        // Reset to free tier limits
        const freeLimits = this.getPlanLimits('free');
        user.usage.themesLimit = freeLimits.themesLimit;
        user.usage.storageLimit = freeLimits.storageLimit;
        
        await user.save();
        
        logger.info('Subscription deleted', { userId: user._id });
    }
    
    /**
     * Handle successful payment
     */
    async handlePaymentSucceeded(invoice) {
        const user = await User.findOne({
            'subscription.stripeCustomerId': invoice.customer
        });
        
        if (user && user.subscription.status === 'past_due') {
            user.subscription.status = 'active';
            await user.save();
            
            logger.info('Payment succeeded, subscription reactivated', {
                userId: user._id
            });
        }
    }
    
    /**
     * Handle failed payment
     */
    async handlePaymentFailed(invoice) {
        const user = await User.findOne({
            'subscription.stripeCustomerId': invoice.customer
        });
        
        if (user) {
            user.subscription.status = 'past_due';
            await user.save();
            
            logger.warn('Payment failed', {
                userId: user._id,
                invoiceId: invoice.id
            });
            
            // TODO: Send payment failed email
        }
    }
    
    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(payload, signature) {
        return stripe.webhooks.constructEvent(
            payload,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    }
}

module.exports = new StripeService();
