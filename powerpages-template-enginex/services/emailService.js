/**
 * Email Service
 * Send emails via Exchange Online (Office 365)
 */

const nodemailer = require('nodemailer');
const logger = require('../config/logger');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initialized = false;
    }
    
    /**
     * Initialize email transporter
     */
    async initialize() {
        if (this.initialized) {
            return;
        }
        
        try {
            // Create transporter for Exchange Online / Office 365
            this.transporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST || 'smtp.office365.com',
                port: parseInt(process.env.EMAIL_PORT) || 587,
                secure: process.env.EMAIL_SECURE === 'true',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD
                },
                tls: {
                    ciphers: 'SSLv3',
                    rejectUnauthorized: process.env.NODE_ENV === 'production'
                }
            });
            
            // Verify connection
            await this.transporter.verify();
            logger.info('Email service initialized successfully');
            this.initialized = true;
            
        } catch (error) {
            logger.error('Failed to initialize email service:', error);
            throw error;
        }
    }
    
    /**
     * Send email
     */
    async send(options) {
        if (!this.initialized) {
            await this.initialize();
        }
        
        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html
        };
        
        try {
            const info = await this.transporter.sendMail(mailOptions);
            logger.info('Email sent successfully', {
                messageId: info.messageId,
                to: options.to,
                subject: options.subject
            });
            return info;
        } catch (error) {
            logger.error('Failed to send email:', {
                error: error.message,
                to: options.to,
                subject: options.subject
            });
            throw error;
        }
    }
    
    /**
     * Send welcome email
     */
    async sendWelcome(user) {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
                    .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Welcome to PowerPages Template Engine!</h1>
                    </div>
                    <div class="content">
                        <p>Hi ${user.firstName || user.displayName || 'there'},</p>
                        <p>Thank you for signing up for PowerPages Template Engine. We're excited to have you on board!</p>
                        <p>With our platform, you can:</p>
                        <ul>
                            <li>Deploy professional Bootstrap themes to your Power Pages sites</li>
                            <li>Choose from our curated gallery of free themes</li>
                            <li>Upload your own custom themes</li>
                            <li>Manage all your deployments in one place</li>
                        </ul>
                        <p>
                            <a href="${process.env.APP_URL}/dashboard" class="button">Go to Dashboard</a>
                        </p>
                        <p>If you have any questions, feel free to reach out to our support team.</p>
                        <p>Best regards,<br>The Cloudstrucc Team</p>
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} Cloudstrucc inc. All rights reserved.</p>
                        <p>1 Sussex Drive, 7th Floor, Office 805, Ottawa, ON</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        return this.send({
            to: user.email,
            subject: 'Welcome to PowerPages Template Engine!',
            text: `Welcome to PowerPages Template Engine! Visit ${process.env.APP_URL}/dashboard to get started.`,
            html: html
        });
    }
    
    /**
     * Send email verification
     */
    async sendVerification(user, token) {
        const verifyUrl = `${process.env.APP_URL}/auth/verify-email/${token}`;
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
                    .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
                    .code { background: #e2e8f0; padding: 10px 20px; border-radius: 4px; font-family: monospace; font-size: 14px; word-break: break-all; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Verify Your Email</h1>
                    </div>
                    <div class="content">
                        <p>Hi ${user.firstName || user.displayName || 'there'},</p>
                        <p>Please click the button below to verify your email address:</p>
                        <p>
                            <a href="${verifyUrl}" class="button">Verify Email Address</a>
                        </p>
                        <p>Or copy and paste this link into your browser:</p>
                        <p class="code">${verifyUrl}</p>
                        <p>This link will expire in 24 hours.</p>
                        <p>If you didn't create an account, you can safely ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} Cloudstrucc inc. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        return this.send({
            to: user.email,
            subject: 'Verify Your Email - PowerPages Template Engine',
            text: `Please verify your email by visiting: ${verifyUrl}`,
            html: html
        });
    }
    
    /**
     * Send password reset email
     */
    async sendPasswordReset(user, token) {
        const resetUrl = `${process.env.APP_URL}/auth/reset-password/${token}`;
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
                    .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
                    .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Reset Your Password</h1>
                    </div>
                    <div class="content">
                        <p>Hi ${user.firstName || user.displayName || 'there'},</p>
                        <p>We received a request to reset your password. Click the button below to create a new password:</p>
                        <p>
                            <a href="${resetUrl}" class="button">Reset Password</a>
                        </p>
                        <p>This link will expire in 1 hour.</p>
                        <div class="warning">
                            <strong>⚠️ Security Notice:</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
                        </div>
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} Cloudstrucc inc. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        return this.send({
            to: user.email,
            subject: 'Reset Your Password - PowerPages Template Engine',
            text: `Reset your password by visiting: ${resetUrl}`,
            html: html
        });
    }
    
    /**
     * Send deployment complete notification
     */
    async sendDeploymentComplete(user, theme) {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
                    .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
                    .info-box { background: #dbeafe; border: 1px solid #3b82f6; padding: 15px; border-radius: 4px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Deployment Complete!</h1>
                    </div>
                    <div class="content">
                        <p>Hi ${user.firstName || user.displayName || 'there'},</p>
                        <p>Great news! Your theme <strong>"${theme.name}"</strong> has been successfully deployed to your Power Pages site.</p>
                        <div class="info-box">
                            <p><strong>Theme:</strong> ${theme.name}</p>
                            <p><strong>Bootstrap Version:</strong> ${theme.bootstrapVersion}</p>
                            ${theme.deployment.powerPagesWebsiteUrl ? `<p><strong>Website URL:</strong> <a href="${theme.deployment.powerPagesWebsiteUrl}">${theme.deployment.powerPagesWebsiteUrl}</a></p>` : ''}
                        </div>
                        <p>
                            <a href="${process.env.APP_URL}/dashboard/themes/${theme._id}" class="button">View Theme Details</a>
                        </p>
                        <p>Need to make changes? You can update or redeploy your theme at any time from your dashboard.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} Cloudstrucc inc. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        return this.send({
            to: user.email,
            subject: `✅ Theme Deployed: ${theme.name} - PowerPages Template Engine`,
            text: `Your theme "${theme.name}" has been successfully deployed!`,
            html: html
        });
    }
    
    /**
     * Send deployment failed notification
     */
    async sendDeploymentFailed(user, theme, errorMessage) {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
                    .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
                    .error-box { background: #fee2e2; border: 1px solid #ef4444; padding: 15px; border-radius: 4px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>⚠️ Deployment Failed</h1>
                    </div>
                    <div class="content">
                        <p>Hi ${user.firstName || user.displayName || 'there'},</p>
                        <p>Unfortunately, we encountered an issue while deploying your theme <strong>"${theme.name}"</strong>.</p>
                        <div class="error-box">
                            <p><strong>Error:</strong> ${errorMessage || 'Unknown error occurred'}</p>
                        </div>
                        <p>Here are some things you can try:</p>
                        <ul>
                            <li>Check that your theme follows our Bootstrap structure requirements</li>
                            <li>Ensure your zip file contains a valid index.html</li>
                            <li>Verify that all CSS and JS files are properly referenced</li>
                        </ul>
                        <p>
                            <a href="${process.env.APP_URL}/dashboard/themes/${theme._id}" class="button">View Error Details</a>
                        </p>
                        <p>Need help? Contact our support team and we'll assist you.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} Cloudstrucc inc. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        return this.send({
            to: user.email,
            subject: `❌ Deployment Failed: ${theme.name} - PowerPages Template Engine`,
            text: `Deployment failed for theme "${theme.name}". Error: ${errorMessage}`,
            html: html
        });
    }
    
    /**
     * Send subscription confirmation
     */
    async sendSubscriptionConfirmation(user, plan) {
        const planNames = {
            basic: 'Basic',
            pro: 'Pro',
            enterprise: 'Enterprise'
        };
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
                    .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Subscription Confirmed!</h1>
                    </div>
                    <div class="content">
                        <p>Hi ${user.firstName || user.displayName || 'there'},</p>
                        <p>Thank you for subscribing to the <strong>${planNames[plan] || plan}</strong> plan!</p>
                        <p>Your subscription is now active and you have access to all the features included in your plan.</p>
                        <p>
                            <a href="${process.env.APP_URL}/dashboard" class="button">Start Using Your Plan</a>
                        </p>
                        <p>If you have any questions about your subscription, please don't hesitate to reach out.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} Cloudstrucc inc. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        return this.send({
            to: user.email,
            subject: `Welcome to ${planNames[plan] || plan} - PowerPages Template Engine`,
            text: `Thank you for subscribing to the ${planNames[plan] || plan} plan!`,
            html: html
        });
    }
}

// Export singleton instance
module.exports = new EmailService();
