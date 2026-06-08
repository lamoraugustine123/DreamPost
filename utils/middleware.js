const rateLimit = require('express-rate-limit');

function securityHeaders(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
}

function securityHeadersFull(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy
    res.setHeader('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-hashes'; " +
        "script-src-attr 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https:; " +
        "media-src 'self' data: https:; " +
        "connect-src 'self'"
    );

    // HSTS for production
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    next();
}

function createGeneralLimiter(opts = {}) {
    return rateLimit({
        windowMs: parseInt(opts.windowMs || process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
        max: parseInt(opts.max || process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
        message: {
            error: 'Too many requests from this IP. Please try again later.',
            retryAfter: 900
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
        keyGenerator: (req) => req.ip || req.connection.remoteAddress,
        handler: (req, res) => {
            res.status(429).json({
                error: 'Too many requests. Please try again later.',
                retryAfter: 900
            });
        }
    });
}

function createAuthLimiter(opts = {}) {
    return rateLimit({
        windowMs: parseInt(opts.windowMs || process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
        max: parseInt(opts.max || process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 20,
        message: {
            error: 'Too many authentication attempts. Please try again later.',
            retryAfter: 900
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
    });
}

module.exports = {
    securityHeaders,
    securityHeadersFull,
    createGeneralLimiter,
    createAuthLimiter,
};
