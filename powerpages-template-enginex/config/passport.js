/**
 * Passport Configuration
 * Microsoft Entra ID (Azure AD) Authentication
 */

const OIDCStrategy = require('passport-azure-ad').OIDCStrategy;
const User = require('../models/User');
const logger = require('./logger');

const config = {
    identityMetadata: `${process.env.AZURE_AD_CLOUD_INSTANCE}/${process.env.AZURE_AD_TENANT_ID}/v2.0/.well-known/openid-configuration`,
    clientID: process.env.AZURE_AD_CLIENT_ID,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
    responseType: 'code',
    responseMode: 'form_post',
    redirectUrl: process.env.AZURE_AD_REDIRECT_URI,
    allowHttpForRedirectUrl: process.env.NODE_ENV !== 'production',
    validateIssuer: process.env.AZURE_AD_TENANT_ID !== 'common',
    passReqToCallback: true,
    scope: ['profile', 'email', 'openid'],
    loggingLevel: process.env.NODE_ENV === 'development' ? 'info' : 'error',
    loggingNoPII: true,
    nonceLifetime: 600,
    nonceMaxAmount: 5,
    useCookieInsteadOfSession: false,
    cookieEncryptionKeys: [
        { key: process.env.SESSION_SECRET.substring(0, 32).padEnd(32, '0'), iv: process.env.SESSION_SECRET.substring(0, 12).padEnd(12, '0') }
    ]
};

module.exports = function(passport) {
    
    // Serialize user for session
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    // Deserialize user from session
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id).select('-__v');
            done(null, user);
        } catch (err) {
            logger.error('Error deserializing user:', err);
            done(err, null);
        }
    });

    // Microsoft Entra ID (Azure AD) Strategy
    passport.use('azuread-openidconnect', new OIDCStrategy(config,
        async (req, iss, sub, profile, accessToken, refreshToken, params, done) => {
            try {
                logger.info('Azure AD authentication callback received', {
                    oid: profile.oid,
                    email: profile._json?.email || profile.upn
                });

                // Extract user information from profile
                const email = profile._json?.email || profile.upn || profile._json?.preferred_username;
                const displayName = profile.displayName || profile._json?.name || 'User';
                const firstName = profile._json?.given_name || displayName.split(' ')[0];
                const lastName = profile._json?.family_name || displayName.split(' ').slice(1).join(' ');

                if (!email) {
                    logger.error('No email found in Azure AD profile');
                    return done(null, false, { message: 'Email not provided by Microsoft account' });
                }

                // Find or create user
                let user = await User.findOne({ 
                    $or: [
                        { microsoftId: profile.oid },
                        { email: email.toLowerCase() }
                    ]
                });

                if (user) {
                    // Update existing user with Microsoft info
                    user.microsoftId = profile.oid;
                    user.lastLogin = new Date();
                    if (!user.displayName) user.displayName = displayName;
                    if (!user.firstName) user.firstName = firstName;
                    if (!user.lastName) user.lastName = lastName;
                    await user.save();
                    
                    logger.info('Existing user logged in via Microsoft', { 
                        userId: user._id, 
                        email: user.email 
                    });
                } else {
                    // Create new user
                    user = await User.create({
                        microsoftId: profile.oid,
                        email: email.toLowerCase(),
                        displayName: displayName,
                        firstName: firstName,
                        lastName: lastName,
                        authProvider: 'microsoft',
                        emailVerified: true, // Microsoft accounts are verified
                        lastLogin: new Date()
                    });
                    
                    logger.info('New user created via Microsoft', { 
                        userId: user._id, 
                        email: user.email 
                    });
                }

                return done(null, user);

            } catch (err) {
                logger.error('Error in Azure AD strategy:', err);
                return done(err, null);
            }
        }
    ));
};
