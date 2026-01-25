/**
 * Organization Model
 * MongoDB Schema for client organizations and branding
 */

const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
    // Basic Info
    name: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    
    // Owner
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Members
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        role: {
            type: String,
            enum: ['owner', 'admin', 'member'],
            default: 'member'
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Branding - Logos
    branding: {
        // Primary logo (full color, for light backgrounds)
        logo: {
            url: String,
            altText: String,
            width: Number,
            height: Number
        },
        // Logo for dark backgrounds
        logoDark: {
            url: String,
            altText: String
        },
        // Favicon
        favicon: {
            url: String
        },
        // Icon only (for small spaces)
        icon: {
            url: String
        },
        
        // Colors
        colors: {
            primary: {
                type: String,
                default: '#2563eb'
            },
            secondary: {
                type: String,
                default: '#1e40af'
            },
            accent: {
                type: String,
                default: '#06b6d4'
            },
            text: {
                type: String,
                default: '#1e293b'
            },
            background: {
                type: String,
                default: '#ffffff'
            }
        },
        
        // Typography
        fonts: {
            heading: {
                type: String,
                default: 'Plus Jakarta Sans'
            },
            body: {
                type: String,
                default: 'Plus Jakarta Sans'
            },
            googleFontsUrl: String
        },
        
        // Custom CSS (advanced)
        customCss: {
            type: String,
            maxlength: 50000
        }
    },
    
    // Contact Information
    contact: {
        email: String,
        phone: String,
        website: String,
        address: {
            street: String,
            city: String,
            state: String,
            postalCode: String,
            country: String
        }
    },
    
    // Social Media
    social: {
        linkedin: String,
        twitter: String,
        facebook: String,
        instagram: String,
        youtube: String,
        github: String
    },
    
    // Legal/Footer content
    legal: {
        companyNumber: String,
        vatNumber: String,
        copyrightText: String,
        privacyPolicyUrl: String,
        termsOfServiceUrl: String
    },
    
    // Power Platform Settings
    powerPlatform: {
        // Environment details
        environments: [{
            name: String,
            environmentId: String,
            environmentUrl: String,
            type: {
                type: String,
                enum: ['production', 'sandbox', 'developer', 'trial'],
                default: 'sandbox'
            },
            isDefault: {
                type: Boolean,
                default: false
            },
            connectedAt: Date
        }],
        
        // Default website settings
        defaultWebsiteSettings: {
            language: {
                type: String,
                default: 'en-US'
            },
            timezone: {
                type: String,
                default: 'UTC'
            }
        }
    },
    
    // Subscription (linked to owner's subscription or separate org subscription)
    subscription: {
        type: {
            type: String,
            enum: ['individual', 'team', 'enterprise'],
            default: 'individual'
        },
        stripeCustomerId: String,
        stripeSubscriptionId: String
    },
    
    // Usage
    usage: {
        themesDeployed: {
            type: Number,
            default: 0
        },
        themesLimit: {
            type: Number,
            default: 1
        },
        storageUsed: {
            type: Number,
            default: 0
        },
        storageLimit: {
            type: Number,
            default: 104857600 // 100MB
        }
    },
    
    // Status
    isActive: {
        type: Boolean,
        default: true
    }
    
}, {
    timestamps: true
});

// Indexes
organizationSchema.index({ owner: 1 });
organizationSchema.index({ 'members.user': 1 });
organizationSchema.index({ slug: 1 });

// Pre-save: generate slug
organizationSchema.pre('save', function(next) {
    if (this.isModified('name') && !this.slug) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }
    next();
});

// Check if user is member
organizationSchema.methods.isMember = function(userId) {
    if (this.owner.equals(userId)) return true;
    return this.members.some(m => m.user.equals(userId));
};

// Check if user is admin
organizationSchema.methods.isAdmin = function(userId) {
    if (this.owner.equals(userId)) return true;
    const member = this.members.find(m => m.user.equals(userId));
    return member && ['owner', 'admin'].includes(member.role);
};

// Get user's role
organizationSchema.methods.getUserRole = function(userId) {
    if (this.owner.equals(userId)) return 'owner';
    const member = this.members.find(m => m.user.equals(userId));
    return member ? member.role : null;
};

// Get default environment
organizationSchema.methods.getDefaultEnvironment = function() {
    if (!this.powerPlatform.environments.length) return null;
    return this.powerPlatform.environments.find(e => e.isDefault) || this.powerPlatform.environments[0];
};

module.exports = mongoose.model('Organization', organizationSchema);
