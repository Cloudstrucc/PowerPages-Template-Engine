/**
 * PowerPages Template Engine
 * Main Application Entry Point
 * 
 * @author Cloudstrucc inc.
 * @license MIT
 */

require('dotenv').config();

const express = require('express');
const { engine } = require('express-handlebars');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const mongoose = require('mongoose');

// Import configurations
const passportConfig = require('./config/passport');
const logger = require('./config/logger');

// Import routes
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const themesRoutes = require('./routes/themes');
const uploadRoutes = require('./routes/upload');
const paymentRoutes = require('./routes/payment');
const webhookRoutes = require('./routes/webhook');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const organizationRoutes = require('./routes/organization');
const deployRoutes = require('./routes/deploy');

// Initialize Express app
const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// ===========================================
// Database Connection
// ===========================================
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        logger.info('Connected to MongoDB');
    })
    .catch((err) => {
        logger.error('MongoDB connection error:', err);
        process.exit(1);
    });

// ===========================================
// Security Middleware
// ===========================================

// Helmet for security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "https://js.stripe.com"],
            frameSrc: ["'self'", "https://js.stripe.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.stripe.com"]
        }
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);
app.use('/auth/', limiter);

// ===========================================
// Body Parsing & Cookie Middleware
// ===========================================

// Webhook routes need raw body for Stripe signature verification
app.use('/webhook', express.raw({ type: 'application/json' }));

// Regular routes use JSON and URL-encoded parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ===========================================
// Session Configuration
// ===========================================
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'
    }
}));

// ===========================================
// Passport Authentication
// ===========================================
passportConfig(passport);
app.use(passport.initialize());
app.use(passport.session());

// Flash messages
app.use(flash());

// ===========================================
// CSRF Protection (after session, before routes)
// ===========================================
const csrfProtection = csrf({ cookie: true });

// Apply CSRF to all routes except webhooks and API
app.use((req, res, next) => {
    if (req.path.startsWith('/webhook') || req.path.startsWith('/api/')) {
        return next();
    }
    csrfProtection(req, res, next);
});

// ===========================================
// View Engine Setup (Handlebars)
// ===========================================
app.engine('hbs', engine({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: path.join(__dirname, 'views/partials'),
    helpers: require('./config/handlebars-helpers')
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// ===========================================
// Static Files
// ===========================================
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
}));

// ===========================================
// Global Template Variables
// ===========================================
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.isAuthenticated = req.isAuthenticated();
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
    res.locals.stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
    res.locals.currentYear = new Date().getFullYear();
    res.locals.appName = 'PowerPages Template Engine';
    next();
});

// ===========================================
// Routes
// ===========================================
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/themes', themesRoutes);
app.use('/upload', uploadRoutes);
app.use('/payment', paymentRoutes);
app.use('/webhook', webhookRoutes);
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);
app.use('/organization', organizationRoutes);
app.use('/deploy', deployRoutes);

// ===========================================
// Error Handling
// ===========================================

// 404 Handler
app.use((req, res, next) => {
    res.status(404).render('errors/404', {
        title: 'Page Not Found',
        layout: 'main'
    });
});

// CSRF Error Handler
app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        logger.warn('CSRF token validation failed', { 
            ip: req.ip, 
            path: req.path 
        });
        return res.status(403).render('errors/403', {
            title: 'Forbidden',
            message: 'Invalid or expired form submission. Please try again.',
            layout: 'main'
        });
    }
    next(err);
});

// General Error Handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message;

    res.status(statusCode).render('errors/500', {
        title: 'Error',
        message: message,
        error: process.env.NODE_ENV === 'development' ? err : {},
        layout: 'main'
    });
});

// ===========================================
// Server Startup
// ===========================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`\n🚀 PowerPages Template Engine`);
    console.log(`   Server: http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    mongoose.connection.close(false, () => {
        logger.info('MongoDB connection closed.');
        process.exit(0);
    });
});

module.exports = app;
