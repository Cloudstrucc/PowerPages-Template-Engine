/**
 * Gallery Theme Model
 * MongoDB Schema for admin-managed gallery themes
 */

const mongoose = require('mongoose');

const galleryThemeSchema = new mongoose.Schema({
    // Basic Info
    name: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    longDescription: {
        type: String,
        trim: true
    },
    
    // Categorization
    category: {
        type: String,
        enum: ['landing', 'portfolio', 'business', 'blog', 'admin', 'ecommerce', 'government', 'other'],
        default: 'other'
    },
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    
    // Bootstrap Version
    bootstrapVersion: {
        type: String,
        enum: ['3', '4', '5'],
        default: '5'
    },
    
    // URLs and Resources
    previewImage: {
        type: String,
        required: true
    },
    previewImages: [{
        type: String
    }],
    demoUrl: {
        type: String
    },
    downloadUrl: {
        type: String,
        required: true
    },
    sourceUrl: {
        type: String // GitHub, original source
    },
    documentationUrl: {
        type: String
    },
    
    // Licensing
    license: {
        type: {
            type: String,
            enum: ['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'CC-BY-4.0', 'Commercial', 'Custom'],
            default: 'MIT'
        },
        url: String,
        attribution: String
    },
    
    // Author/Source
    author: {
        name: String,
        url: String,
        email: String
    },
    
    // Compatibility
    compatibility: {
        powerPagesEnhancedDataModel: {
            type: Boolean,
            default: true
        },
        powerPagesStandardDataModel: {
            type: Boolean,
            default: false
        },
        gcwebCompliant: {
            type: Boolean,
            default: false
        },
        wetCompliant: {
            type: Boolean,
            default: false
        },
        wcagLevel: {
            type: String,
            enum: ['none', 'A', 'AA', 'AAA'],
            default: 'none'
        }
    },
    
    // Features
    features: [{
        type: String
    }],
    
    // Pricing (for premium themes)
    pricing: {
        isFree: {
            type: Boolean,
            default: true
        },
        price: {
            type: Number,
            default: 0
        },
        currency: {
            type: String,
            default: 'USD'
        }
    },
    
    // Statistics
    stats: {
        installCount: {
            type: Number,
            default: 0
        },
        viewCount: {
            type: Number,
            default: 0
        },
        rating: {
            type: Number,
            min: 0,
            max: 5,
            default: 0
        },
        reviewCount: {
            type: Number,
            default: 0
        }
    },
    
    // Display Order
    displayOrder: {
        type: Number,
        default: 0
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    
    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    
    // Admin tracking
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
    
}, {
    timestamps: true
});

// Indexes
galleryThemeSchema.index({ slug: 1 });
galleryThemeSchema.index({ category: 1, isActive: 1, isPublished: 1 });
galleryThemeSchema.index({ isFeatured: 1, displayOrder: 1 });
galleryThemeSchema.index({ tags: 1 });

// Pre-save: generate slug from name
galleryThemeSchema.pre('save', function(next) {
    if (this.isModified('name') && !this.slug) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }
    next();
});

// Increment install count
galleryThemeSchema.methods.incrementInstallCount = async function() {
    this.stats.installCount += 1;
    await this.save();
};

// Increment view count
galleryThemeSchema.methods.incrementViewCount = async function() {
    this.stats.viewCount += 1;
    await this.save();
};

// Static: Get published themes
galleryThemeSchema.statics.getPublished = function(category = null) {
    const query = { isActive: true, isPublished: true };
    if (category && category !== 'all') {
        query.category = category;
    }
    return this.find(query).sort({ isFeatured: -1, displayOrder: 1, name: 1 });
};

// Static: Get featured themes
galleryThemeSchema.statics.getFeatured = function(limit = 6) {
    return this.find({ isActive: true, isPublished: true, isFeatured: true })
        .sort({ displayOrder: 1 })
        .limit(limit);
};

module.exports = mongoose.model('GalleryTheme', galleryThemeSchema);
