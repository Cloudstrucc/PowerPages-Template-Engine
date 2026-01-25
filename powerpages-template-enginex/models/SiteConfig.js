/**
 * Site Configuration Model
 * MongoDB Schema for admin-managed application settings
 * Replaces hard-coded configuration values
 */

const mongoose = require('mongoose');

const siteConfigSchema = new mongoose.Schema({
    // Config key (unique identifier)
    key: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    
    // Config value (flexible - can store any JSON)
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    
    // Metadata
    category: {
        type: String,
        enum: ['general', 'pricing', 'stripe', 'email', 'features', 'limits', 'appearance', 'integrations', 'admin'],
        default: 'general'
    },
    
    description: {
        type: String
    },
    
    // Data type for validation
    valueType: {
        type: String,
        enum: ['string', 'number', 'boolean', 'json', 'array'],
        default: 'string'
    },
    
    // Is this sensitive (should be masked in UI)?
    isSensitive: {
        type: Boolean,
        default: false
    },
    
    // Can this be edited via admin UI?
    isEditable: {
        type: Boolean,
        default: true
    },
    
    // Admin tracking
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
    
}, {
    timestamps: true
});

// Index
siteConfigSchema.index({ key: 1 });
siteConfigSchema.index({ category: 1 });

// Static: Get config by key
siteConfigSchema.statics.get = async function(key, defaultValue = null) {
    const config = await this.findOne({ key });
    return config ? config.value : defaultValue;
};

// Static: Set config by key
siteConfigSchema.statics.set = async function(key, value, options = {}) {
    const config = await this.findOneAndUpdate(
        { key },
        { 
            value,
            ...options,
            updatedAt: new Date()
        },
        { upsert: true, new: true }
    );
    return config;
};

// Static: Get all configs by category
siteConfigSchema.statics.getByCategory = async function(category) {
    const configs = await this.find({ category });
    const result = {};
    configs.forEach(c => {
        result[c.key] = c.value;
    });
    return result;
};

// Static: Get multiple keys
siteConfigSchema.statics.getMultiple = async function(keys) {
    const configs = await this.find({ key: { $in: keys } });
    const result = {};
    configs.forEach(c => {
        result[c.key] = c.value;
    });
    return result;
};

// Static: Initialize default configs
siteConfigSchema.statics.initializeDefaults = async function() {
    const defaults = [
        // General Settings
        {
            key: 'site.name',
            value: 'PowerPages Template Engine',
            category: 'general',
            description: 'Site name displayed in header and emails',
            valueType: 'string'
        },
        {
            key: 'site.tagline',
            value: 'Deploy Bootstrap themes to Power Pages',
            category: 'general',
            description: 'Site tagline/description',
            valueType: 'string'
        },
        {
            key: 'site.url',
            value: 'https://templates.cloudstrucc.com',
            category: 'general',
            description: 'Production site URL',
            valueType: 'string'
        },
        {
            key: 'site.supportEmail',
            value: 'support@cloudstrucc.com',
            category: 'general',
            description: 'Support email address',
            valueType: 'string'
        },
        
        // Pricing Configuration
        {
            key: 'pricing.plans',
            value: [
                {
                    id: 'basic',
                    name: 'Basic',
                    description: 'For individual developers and small projects',
                    monthlyPrice: 50,
                    annualPrice: 40,
                    currency: 'USD',
                    features: [
                        'Bootstrap 3, 4 & 5 support',
                        'Up to 3 themes',
                        'Automatic theme validation',
                        'Email notifications',
                        'Documentation access'
                    ],
                    limits: {
                        themesLimit: 3,
                        storageLimit: 104857600, // 100MB
                        supportResponseHours: 72
                    },
                    stripePriceIdMonthly: '',
                    stripePriceIdAnnual: ''
                },
                {
                    id: 'pro',
                    name: 'Pro',
                    description: 'For teams and growing businesses',
                    monthlyPrice: 100,
                    annualPrice: 80,
                    currency: 'USD',
                    isPopular: true,
                    features: [
                        'Everything in Basic',
                        'Up to 10 themes',
                        'Automatic theme updates',
                        'Priority email support (24hr)',
                        'Bootstrap version migration',
                        'Staging environment'
                    ],
                    limits: {
                        themesLimit: 10,
                        storageLimit: 524288000, // 500MB
                        supportResponseHours: 24
                    },
                    stripePriceIdMonthly: '',
                    stripePriceIdAnnual: ''
                },
                {
                    id: 'enterprise',
                    name: 'Enterprise',
                    description: 'For organizations with complex needs',
                    monthlyPrice: 500,
                    annualPrice: 400,
                    currency: 'USD',
                    features: [
                        'Everything in Pro',
                        'Unlimited themes',
                        'Dedicated account manager',
                        '24/7 phone & chat support',
                        'Azure DevOps integration',
                        'GCWeb / WET compliance support',
                        'Multi-tenant deployment',
                        'Security audit reports'
                    ],
                    limits: {
                        themesLimit: 100,
                        storageLimit: 5368709120, // 5GB
                        supportResponseHours: 4
                    },
                    stripePriceIdMonthly: '',
                    stripePriceIdAnnual: ''
                }
            ],
            category: 'pricing',
            description: 'Pricing plans configuration',
            valueType: 'json'
        },
        {
            key: 'pricing.trialDays',
            value: 14,
            category: 'pricing',
            description: 'Free trial period in days',
            valueType: 'number'
        },
        {
            key: 'pricing.annualDiscount',
            value: 20,
            category: 'pricing',
            description: 'Annual billing discount percentage',
            valueType: 'number'
        },
        
        // Feature Flags
        {
            key: 'features.allowRegistration',
            value: true,
            category: 'features',
            description: 'Allow new user registration',
            valueType: 'boolean'
        },
        {
            key: 'features.allowLocalAuth',
            value: true,
            category: 'features',
            description: 'Allow email/password authentication',
            valueType: 'boolean'
        },
        {
            key: 'features.allowMicrosoftAuth',
            value: true,
            category: 'features',
            description: 'Allow Microsoft authentication',
            valueType: 'boolean'
        },
        {
            key: 'features.allowCustomThemeUpload',
            value: true,
            category: 'features',
            description: 'Allow users to upload custom themes',
            valueType: 'boolean'
        },
        {
            key: 'features.requireEmailVerification',
            value: false,
            category: 'features',
            description: 'Require email verification before access',
            valueType: 'boolean'
        },
        {
            key: 'features.maintenanceMode',
            value: false,
            category: 'features',
            description: 'Enable maintenance mode (admin only access)',
            valueType: 'boolean'
        },
        
        // Upload Limits
        {
            key: 'limits.maxFileSize',
            value: 52428800, // 50MB
            category: 'limits',
            description: 'Maximum upload file size in bytes',
            valueType: 'number'
        },
        {
            key: 'limits.allowedFileTypes',
            value: ['.zip'],
            category: 'limits',
            description: 'Allowed file extensions for upload',
            valueType: 'array'
        },
        {
            key: 'limits.freeThemesLimit',
            value: 1,
            category: 'limits',
            description: 'Number of themes for free tier users',
            valueType: 'number'
        },
        {
            key: 'limits.freeStorageLimit',
            value: 52428800, // 50MB
            category: 'limits',
            description: 'Storage limit for free tier in bytes',
            valueType: 'number'
        },
        
        // Admin Settings
        {
            key: 'admin.allowedDomains',
            value: ['cloudstrucc.com'],
            category: 'admin',
            description: 'Email domains allowed for admin access',
            valueType: 'array'
        },
        {
            key: 'admin.superAdminEmails',
            value: [],
            category: 'admin',
            description: 'Email addresses with super admin access',
            valueType: 'array'
        },
        
        // Power Platform Integration
        {
            key: 'integrations.powerPlatform.defaultRegion',
            value: 'canada',
            category: 'integrations',
            description: 'Default Power Platform region',
            valueType: 'string'
        },
        {
            key: 'integrations.powerPlatform.supportedRegions',
            value: ['unitedstates', 'canada', 'europe', 'asia', 'australia', 'unitedkingdom'],
            category: 'integrations',
            description: 'Supported Power Platform regions',
            valueType: 'array'
        }
    ];
    
    for (const config of defaults) {
        await this.findOneAndUpdate(
            { key: config.key },
            config,
            { upsert: true }
        );
    }
    
    return defaults.length;
};

module.exports = mongoose.model('SiteConfig', siteConfigSchema);
