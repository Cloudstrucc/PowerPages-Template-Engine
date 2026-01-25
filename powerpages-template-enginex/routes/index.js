/**
 * Index Routes
 * Public pages (home, pricing, etc.)
 */

const express = require('express');
const router = express.Router();

// Home page
router.get('/', (req, res) => {
    res.render('index', {
        title: 'PowerPages Template Engine | Cloudstrucc',
        isHomePage: true
    });
});

// Pricing page
router.get('/pricing', (req, res) => {
    res.render('pricing', {
        title: 'Pricing - PowerPages Template Engine',
        canceled: req.query.canceled === 'true'
    });
});

// Documentation
router.get('/docs', (req, res) => {
    res.render('docs', {
        title: 'Documentation - PowerPages Template Engine'
    });
});

// About page
router.get('/about', (req, res) => {
    res.render('about', {
        title: 'About - PowerPages Template Engine'
    });
});

// Contact page
router.get('/contact', (req, res) => {
    res.render('contact', {
        title: 'Contact Us - PowerPages Template Engine'
    });
});

// Privacy Policy
router.get('/privacy', (req, res) => {
    res.render('legal/privacy', {
        title: 'Privacy Policy - PowerPages Template Engine'
    });
});

// Terms of Service
router.get('/terms', (req, res) => {
    res.render('legal/terms', {
        title: 'Terms of Service - PowerPages Template Engine'
    });
});

module.exports = router;
