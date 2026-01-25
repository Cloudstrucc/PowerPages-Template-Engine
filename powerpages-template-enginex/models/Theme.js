/**
 * Theme Model
 * MongoDB Schema for uploaded/deployed themes
 */

const mongoose = require('mongoose');

const themeSchema = new mongoose.Schema({
    // Owner
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Theme Info
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    version: {
        type: String,
        default: '1.0.0'
    },
    bootstrapVersion: {
        type: String,
        enum: ['3', '4', '5'],
        default: '5'
    },
    category: {
        type: String,
        enum: ['landing', 'portfolio', 'business', 'blog', 'admin', 'ecommerce', 'other'],
        default: 'other'
    },
    tags: [{
        type: String,
        trim: true
    }],
    
    // Source
    source: {
        type: {
            type: String,
            enum: ['upload', 'gallery', 'url'],
            default: 'upload'
        },
        originalName: String,
        galleryId: String,
        sourceUrl: String
    },
    
    // Files
    files: {
        zipPath: String,
        extractedPath: String,
        previewImage: String,
        totalSize: {
            type: Number,
            default: 0
        },
        fileCount: {
            type: Number,
            default: 0
        }
    },
    
    // Validation
    validation: {
        isValid: {
            type: Boolean,
            default: false
        },
        validatedAt: Date,
        errors: [{
            type: String
        }],
        warnings: [{
            type: String
        }],
        hasIndexHtml: Boolean,
        hasCss: Boolean,
        hasJs: Boolean,
        hasImages: Boolean
    },
    
    // Deployment
    deployment: {
        status: {
            type: String,
            enum: ['pending', 'validating', 'creating_site', 'deploying', 'completed', 'failed'],
            default: 'pending'
        },
        powerPagesWebsiteId: String,
        powerPagesWebsiteUrl: String,
        dataverseEnvironmentId: String,
        deployedAt: Date,
        lastSyncedAt: Date,
        deploymentLogs: [{
            timestamp: Date,
            level: {
                type: String,
                enum: ['info', 'warning', 'error']
            },
            message: String
        }],
        errorMessage: String
    },
    
    // Statistics
    stats: {
        viewCount: {
            type: Number,
            default: 0
        },
        downloadCount: {
            type: Number,
            default: 0
        }
    },
    
    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    isPublic: {
        type: Boolean,
        default: false
    }
    
}, {
    timestamps: true
});

// Indexes
themeSchema.index({ user: 1, createdAt: -1 });
themeSchema.index({ 'deployment.status': 1 });
themeSchema.index({ category: 1 });
themeSchema.index({ isPublic: 1 });

// Virtual for deployment progress percentage
themeSchema.virtual('deploymentProgress').get(function() {
    const progressMap = {
        'pending': 0,
        'validating': 20,
        'creating_site': 40,
        'deploying': 70,
        'completed': 100,
        'failed': 0
    };
    return progressMap[this.deployment.status] || 0;
});

// Add deployment log entry
themeSchema.methods.addDeploymentLog = function(level, message) {
    this.deployment.deploymentLogs.push({
        timestamp: new Date(),
        level: level,
        message: message
    });
};

// Update deployment status
themeSchema.methods.updateDeploymentStatus = async function(status, message = null) {
    this.deployment.status = status;
    if (message) {
        this.addDeploymentLog(status === 'failed' ? 'error' : 'info', message);
    }
    if (status === 'completed') {
        this.deployment.deployedAt = new Date();
    }
    if (status === 'failed' && message) {
        this.deployment.errorMessage = message;
    }
    await this.save();
};

module.exports = mongoose.model('Theme', themeSchema);
