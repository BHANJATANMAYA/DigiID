'use strict';

const crypto = require('crypto');

const ADMIN_SECRET = process.env.ADMIN_JWT_SECRET || 'digiid-admin-super-secret-key-change-in-production';
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Rate limiting state
const failedAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Generate a cryptographically signed admin token.
 * Format: base64(payload).signature
 */
function createAdminToken(payload) {
    const data = {
        iat: Date.now(),
        exp: Date.now() + TOKEN_EXPIRY_MS,
        ...payload,
    };
    if (payload && payload.exp !== undefined) {
        data.exp = payload.exp;
    }
    const bodyStr = Buffer.from(JSON.stringify(data)).toString('base64url');
    const signature = crypto.createHmac('sha256', ADMIN_SECRET).update(bodyStr).digest('base64url');
    return `${bodyStr}.${signature}`;
}

/**
 * Verify signed admin token.
 */
function verifyAdminToken(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [bodyStr, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', ADMIN_SECRET).update(bodyStr).digest('base64url');

    try {
        if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
            return null;
        }
        const payload = JSON.parse(Buffer.from(bodyStr, 'base64url').toString('utf8'));
        if (Date.now() > payload.exp) {
            return null; // Expired
        }
        return payload;
    } catch {
        return null;
    }
}

/**
 * Middleware: require valid admin authentication.
 */
function requireAdminAuth(req, res, next) {
    const authHeader = req.headers['authorization'] || req.headers['x-admin-token'] || '';
    let token = '';

    if (authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim();
    } else if (authHeader) {
        token = authHeader.trim();
    } else if (req.query && req.query.token) {
        token = req.query.token.trim();
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Admin authorization required. Missing token.',
            code: 'AUTH_REQUIRED'
        });
    }

    const payload = verifyAdminToken(token);
    if (!payload) {
        return res.status(401).json({
            success: false,
            error: 'Invalid, tampered, or expired admin session token.',
            code: 'INVALID_TOKEN'
        });
    }

    req.admin = payload;
    next();
}

/**
 * Middleware: brute-force / rate-limit protection for admin login.
 */
function loginRateLimiter(req, res, next) {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const email = (req.body?.email || '').toLowerCase().trim();
    const key = `${ip}:${email}`;

    const record = failedAttempts.get(key);
    if (record) {
        if (record.count >= MAX_ATTEMPTS) {
            const remainingTime = Math.ceil((record.lockoutUntil - Date.now()) / 1000);
            if (remainingTime > 0) {
                return res.status(429).json({
                    success: false,
                    error: `Too many failed login attempts. Account temporarily locked. Try again in ${remainingTime} seconds.`,
                    code: 'RATE_LIMITED',
                    retryAfter: remainingTime
                });
            } else {
                failedAttempts.delete(key);
            }
        }
    }

    req._rateLimitKey = key;
    next();
}

function recordLoginFailure(key) {
    if (!key) return;
    const now = Date.now();
    const record = failedAttempts.get(key) || { count: 0, lockoutUntil: 0 };
    record.count += 1;
    if (record.count >= MAX_ATTEMPTS) {
        record.lockoutUntil = now + LOCKOUT_MS;
    }
    failedAttempts.set(key, record);
}

function recordLoginSuccess(key) {
    if (key) failedAttempts.delete(key);
}

module.exports = {
    createAdminToken,
    verifyAdminToken,
    requireAdminAuth,
    loginRateLimiter,
    recordLoginFailure,
    recordLoginSuccess,
};
