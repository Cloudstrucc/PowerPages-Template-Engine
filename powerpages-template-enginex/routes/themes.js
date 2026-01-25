/**
 * Themes Routes
 * Public theme gallery and theme pages
 */

const express = require('express');
const router = express.Router();
const Theme = require('../models/Theme');
const logger = require('../config/logger');

// Gallery themes data (Start Bootstrap free themes)
const galleryThemes = [
    {
        id: 'agency',
        name: 'Agency',
        description: 'A one page portfolio theme for agencies',
        category: 'portfolio',
        bootstrapVersion: '5',
        previewImage: 'https://startbootstrap.com/assets/img/screenshots/themes/agency.png',
        demoUrl: 'https://startbootstrap.github.io/startbootstrap-agency/',
        downloadUrl: 'https://github.com/StartBootstrap/startbootstrap-agency/archive/refs/heads/master.zip',
        tags: ['portfolio', 'agency', 'one-page']
    },
    {
        id: 'creative',
        name: 'Creative',
        description: 'A one page creative theme with modern design',
        category: 'landing',
        bootstrapVersion: '5',
        previewImage: 'https://startbootstrap.com/assets/img/screenshots/themes/creative.png',
        demoUrl: 'https://startbootstrap.github.io/startbootstrap-creative/',
        downloadUrl: 'https://github.com/StartBootstrap/startbootstrap-creative/archive/refs/heads/master.zip',
        tags: ['creative', 'landing', 'one-page']
    },
    {
        id: 'clean-blog',
        name: 'Clean Blog',
        description: 'A clean, responsive blog theme',
        category: 'blog',
        bootstrapVersion: '5',
        previewImage: 'https://startbootstrap.com/assets/img/screenshots/themes/clean-blog.png',
        demoUrl: 'https://startbootstrap.github.io/startbootstrap-clean-blog/',
        downloadUrl: 'https://github.com/StartBootstrap/startbootstrap-clean-blog/archive/refs/heads/master.zip',
        tags: ['blog', 'clean', 'minimal']
    },
    {
        id: 'landing-page',
        name: 'Landing Page',
        description: 'A clean, functional landing page theme',
        category: 'landing',
        bootstrapVersion: '5',
        previewImage: 'https://startbootstrap.com/assets/img/screenshots/themes/landing-page.png',
        demoUrl: 'https://startbootstrap.github.io/startbootstrap-landing-page/',
        downloadUrl: 'https://github.com/StartBootstrap/startbootstrap-landing-page/archive/refs/heads/master.zip',
        tags: ['landing', 'business', 'startup']
    },
    {
        id: 'freelancer',
        name: 'Freelancer',
        description: 'A one page freelancer portfolio theme',
        category: 'portfolio',
        bootstrapVersion: '5',
        previewImage: 'https://startbootstrap.com/assets/img/screenshots/themes/freelancer.png',
        demoUrl: 'https://startbootstrap.github.io/startbootstrap-freelancer/',
        downloadUrl: 'https://github.com/StartBootstrap/startbootstrap-freelancer/archive/refs/heads/master.zip',
        tags: ['portfolio', 'freelancer', 'one-page']
    },
    {
        id: 'sb-admin-2',
        name: 'SB Admin 2',
        description: 'A free Bootstrap admin dashboard template',
        category: 'admin',
        bootstrapVersion: '4',
        previewImage: 'https://startbootstrap.com/assets/img/screenshots/themes/sb-admin-2.png',
        demoUrl: 'https://startbootstrap.github.io/startbootstrap-sb-admin-2/',
        downloadUrl: 'https://github.com/StartBootstrap/startbootstrap-sb-admin-2/archive/refs/heads/master.zip',
        tags: ['admin', 'dashboard', 'bootstrap4']
    },
    {
        id: 'grayscale',
        name: 'Grayscale',
        description: 'A multipurpose one page theme',
        category: 'landing',
        bootstrapVersion: '5',
        previewImage: 'https://startbootstrap.com/assets/img/screenshots/themes/grayscale.png',
        demoUrl: 'https://startbootstrap.github.io/startbootstrap-grayscale/',
        downloadUrl: 'https://github.com/StartBootstrap/startbootstrap-grayscale/archive/refs/heads/master.zip',
        tags: ['grayscale', 'dark', 'one-page']
    },
    {
        id: 'business-casual',
        name: 'Business Casual',
        description: 'A fully developed business website theme',
        category: 'business',
        bootstrapVersion: '5',
        previewImage: 'https://startbootstrap.com/assets/img/screenshots/themes/business-casual.png',
        demoUrl: 'https://startbootstrap.github.io/startbootstrap-business-casual/',
        downloadUrl: 'https://github.com/StartBootstrap/startbootstrap-business-casual/archive/refs/heads/master.zip',
        tags: ['business', 'casual', 'multi-page']
    },
    {
        id: 'new-age',
        name: 'New Age',
        description: 'An app landing page theme',
        category: 'landing',
        bootstrapVersion: '5',
        previewImage: 'https://startbootstrap.com/assets/img/screenshots/themes/new-age.png',
        demoUrl: 'https://startbootstrap.github.io/startbootstrap-new-age/',
        downloadUrl: 'https://github.com/StartBootstrap/startbootstrap-new-age/archive/refs/heads/master.zip',
        tags: ['app', 'landing', 'mobile']
    },
    {
        id: 'resume',
        name: 'Resume',
        description: 'A Bootstrap resume theme',
        category: 'portfolio',
        bootstrapVersion: '5',
        previewImage: 'https://startbootstrap.com/assets/img/screenshots/themes/resume.png',
        demoUrl: 'https://startbootstrap.github.io/startbootstrap-resume/',
        downloadUrl: 'https://github.com/StartBootstrap/startbootstrap-resume/archive/refs/heads/master.zip',
        tags: ['resume', 'cv', 'portfolio']
    },
    {
        id: 'stylish-portfolio',
        name: 'Stylish Portfolio',
        description: 'A stylish Bootstrap portfolio theme',
        category: 'portfolio',
        bootstrapVersion: '5',
        previewImage: 'https://startbootstrap.com/assets/img/screenshots/themes/stylish-portfolio.png',
        demoUrl: 'https://startbootstrap.github.io/startbootstrap-stylish-portfolio/',
        downloadUrl: 'https://github.com/StartBootstrap/startbootstrap-stylish-portfolio/archive/refs/heads/master.zip',
        tags: ['portfolio', 'stylish', 'sidebar']
    },
    {
        id: 'coming-soon',
        name: 'Coming Soon',
        description: 'A coming soon theme with countdown',
        category: 'landing',
        bootstrapVersion: '5',
        previewImage: 'https://startbootstrap.com/assets/img/screenshots/themes/coming-soon.png',
        demoUrl: 'https://startbootstrap.github.io/startbootstrap-coming-soon/',
        downloadUrl: 'https://github.com/StartBootstrap/startbootstrap-coming-soon/archive/refs/heads/master.zip',
        tags: ['coming-soon', 'countdown', 'minimal']
    }
];

// Theme gallery page
router.get('/', (req, res) => {
    const category = req.query.category || 'all';
    
    let filteredThemes = galleryThemes;
    if (category !== 'all') {
        filteredThemes = galleryThemes.filter(t => t.category === category);
    }
    
    res.render('themes/gallery', {
        title: 'Theme Gallery - PowerPages Template Engine',
        themes: filteredThemes,
        categories: ['all', 'landing', 'portfolio', 'business', 'blog', 'admin'],
        currentCategory: category
    });
});

// Single theme details
router.get('/:id', (req, res) => {
    const theme = galleryThemes.find(t => t.id === req.params.id);
    
    if (!theme) {
        req.flash('error_msg', 'Theme not found');
        return res.redirect('/themes');
    }
    
    // Get related themes (same category)
    const relatedThemes = galleryThemes
        .filter(t => t.category === theme.category && t.id !== theme.id)
        .slice(0, 3);
    
    res.render('themes/detail', {
        title: `${theme.name} - PowerPages Template Engine`,
        theme,
        relatedThemes
    });
});

// Install theme (redirect to upload with gallery theme)
router.get('/:id/install', (req, res) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = `/themes/${req.params.id}/install`;
        req.flash('error_msg', 'Please sign in to install themes');
        return res.redirect('/auth/login');
    }
    
    const theme = galleryThemes.find(t => t.id === req.params.id);
    
    if (!theme) {
        req.flash('error_msg', 'Theme not found');
        return res.redirect('/themes');
    }
    
    res.redirect(`/upload?gallery=${theme.id}`);
});

module.exports = router;
