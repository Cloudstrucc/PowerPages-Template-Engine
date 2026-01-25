/**
 * Winston Logger Configuration
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.dirname(process.env.LOG_FILE || './logs/app.log');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack, ...metadata }) => {
        let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
        if (Object.keys(metadata).length > 0) {
            log += ` ${JSON.stringify(metadata)}`;
        }
        if (stack) {
            log += `\n${stack}`;
        }
        return log;
    })
);

// Console format (colorized for development)
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ level, message, timestamp }) => {
        return `${timestamp} ${level}: ${message}`;
    })
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'powerpages-template-engine' },
    transports: [
        // Write all logs to file
        new winston.transports.File({
            filename: process.env.LOG_FILE || './logs/app.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            tailable: true
        }),
        // Write error logs to separate file
        new winston.transports.File({
            filename: './logs/error.log',
            level: 'error',
            maxsize: 5242880,
            maxFiles: 5,
            tailable: true
        })
    ],
    exceptionHandlers: [
        new winston.transports.File({ filename: './logs/exceptions.log' })
    ],
    rejectionHandlers: [
        new winston.transports.File({ filename: './logs/rejections.log' })
    ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: consoleFormat
    }));
}

module.exports = logger;
