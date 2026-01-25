/**
 * User Model
 * MongoDB Schema for user accounts
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // Authentication
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },
    password: {
        type: String,
        minlength: [8, 'Password must be at least 8 characters'],
        select: false // Don't include password by default in queries
    },
    microsoftId: {
        type: String,
        sparse: true,
        unique: true
    },
    authProvider: {
        type: String,
        enum: ['local', 'microsoft'],
        default: 'local'
    },
    
    // Profile
    displayName: {
        type: String,
        trim: true
    },
    firstName: {
        type: String,
        trim: true
    },
    lastName: {
        type: String,
        trim: true
    },
    organization: {
        type: String,
        trim: true
    },
    avatar: {
        type: String
    },
    
    // Verification
    emailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    
    // Password Reset
    passwordResetToken: String,
    passwordResetExpires: Date,
    
    // Subscription & Billing
    subscription: {
        status: {
            type: String,
            enum: ['none', 'trialing', 'active', 'past_due', 'canceled', 'unpaid'],
            default: 'none'
        },
        plan: {
            type: String,
            enum: ['none', 'basic', 'pro', 'enterprise'],
            default: 'none'
        },
        billingCycle: {
            type: String,
            enum: ['monthly', 'annual'],
            default: 'monthly'
        },
        stripeCustomerId: String,
        stripeSubscriptionId: String,
        stripePriceId: String,
        currentPeriodStart: Date,
        currentPeriodEnd: Date,
        cancelAtPeriodEnd: {
            type: Boolean,
            default: false
        }
    },
    
    // Usage Limits
    usage: {
        themesDeployed: {
            type: Number,
            default: 0
        },
        themesLimit: {
            type: Number,
            default: 1 // Free tier gets 1 theme
        },
        storageUsed: {
            type: Number,
            default: 0 // in bytes
        },
        storageLimit: {
            type: Number,
            default: 52428800 // 50MB default
        }
    },
    
    // Activity
    lastLogin: {
        type: Date
    },
    loginCount: {
        type: Number,
        default: 0
    },
    
    // Account Status
    isActive: {
        type: Boolean,
        default: true
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    }
    
}, {
    timestamps: true // Adds createdAt and updatedAt
});

// Index for faster queries (email and microsoftId already indexed via unique: true)
userSchema.index({ 'subscription.stripeCustomerId': 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    if (this.firstName && this.lastName) {
        return `${this.firstName} ${this.lastName}`;
    }
    return this.displayName || this.email.split('@')[0];
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    // Only hash if password was modified
    if (!this.isModified('password')) {
        return next();
    }
    
    // Don't hash if no password (Microsoft auth users)
    if (!this.password) {
        return next();
    }
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    if (!this.password) {
        return false;
    }
    return bcrypt.compare(candidatePassword, this.password);
};

// Check if subscription is active
userSchema.methods.hasActiveSubscription = function() {
    return ['trialing', 'active'].includes(this.subscription.status);
};

// Get subscription tier
userSchema.methods.getSubscriptionTier = function() {
    if (!this.hasActiveSubscription()) {
        return 'free';
    }
    return this.subscription.plan;
};

// Check if user can deploy more themes
userSchema.methods.canDeployTheme = function() {
    return this.usage.themesDeployed < this.usage.themesLimit;
};

// Update login stats
userSchema.methods.recordLogin = async function() {
    this.lastLogin = new Date();
    this.loginCount += 1;
    await this.save();
};

// Sanitize user object for client
userSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.password;
    delete obj.emailVerificationToken;
    delete obj.passwordResetToken;
    delete obj.__v;
    return obj;
};

module.exports = mongoose.model('User', userSchema);
