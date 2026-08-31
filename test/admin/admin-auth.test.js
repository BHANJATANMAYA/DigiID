'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
    login,
    logout,
    getMe
} = require('../../backend/src/features/admin/admin.controller');
const {
    createAdminToken,
    verifyAdminToken,
    requireAdminAuth,
    loginRateLimiter,
    recordLoginFailure
} = require('../../backend/src/core/middleware/admin.middleware');

describe('Admin Authentication Tests (ADMIN-AUTH-001 to ADMIN-AUTH-012)', () => {

    test('ADMIN-AUTH-001: Valid Admin Login', async () => {
        let statusCode = 0;
        let responseJson = null;
        const req = {
            body: {
                email: 'admin@digiid.gov.in',
                password: 'SuperAdmin@DigiID2026'
            },
            _rateLimitKey: 'test:admin@digiid.gov.in'
        };
        const res = {
            status(c) { statusCode = c; return this; },
            json(d) { responseJson = d; return this; }
        };

        await login(req, res);
        assert.equal(statusCode, 200);
        assert.equal(responseJson.success, true);
        assert.ok(responseJson.token);
        assert.equal(responseJson.admin.role, 'SUPER_ADMIN');
    });

    test('ADMIN-AUTH-002: Invalid Password', async () => {
        let statusCode = 0;
        let responseJson = null;
        const req = {
            body: {
                email: 'admin@digiid.gov.in',
                password: 'WrongPassword123'
            },
            _rateLimitKey: 'test:admin@digiid.gov.in'
        };
        const res = {
            status(c) { statusCode = c; return this; },
            json(d) { responseJson = d; return this; }
        };

        await login(req, res);
        assert.equal(statusCode, 401);
        assert.equal(responseJson.success, false);
        assert.ok(responseJson.error.includes('Invalid email or password'));
    });

    test('ADMIN-AUTH-003: Unknown Email', async () => {
        let statusCode = 0;
        let responseJson = null;
        const req = {
            body: {
                email: 'stranger@unknown.org',
                password: 'SuperAdmin@DigiID2026'
            },
            _rateLimitKey: 'test:stranger@unknown.org'
        };
        const res = {
            status(c) { statusCode = c; return this; },
            json(d) { responseJson = d; return this; }
        };

        await login(req, res);
        assert.equal(statusCode, 401);
        assert.equal(responseJson.success, false);
    });

    test('ADMIN-AUTH-004: Empty Email', async () => {
        let statusCode = 0;
        let responseJson = null;
        const req = {
            body: { email: '', password: 'SuperAdmin@DigiID2026' },
            _rateLimitKey: 'test:'
        };
        const res = {
            status(c) { statusCode = c; return this; },
            json(d) { responseJson = d; return this; }
        };

        await login(req, res);
        assert.equal(statusCode, 400);
        assert.ok(responseJson.error.includes('Email is required'));
    });

    test('ADMIN-AUTH-005: Empty Password', async () => {
        let statusCode = 0;
        let responseJson = null;
        const req = {
            body: { email: 'admin@digiid.gov.in', password: '' },
            _rateLimitKey: 'test:admin@digiid.gov.in'
        };
        const res = {
            status(c) { statusCode = c; return this; },
            json(d) { responseJson = d; return this; }
        };

        await login(req, res);
        assert.equal(statusCode, 400);
        assert.ok(responseJson.error.includes('Password is required'));
    });

    test('ADMIN-AUTH-006: Malformed Email', async () => {
        let statusCode = 0;
        let responseJson = null;
        const req = {
            body: { email: 'not-an-email', password: 'SuperAdmin@DigiID2026' },
            _rateLimitKey: 'test:not-an-email'
        };
        const res = {
            status(c) { statusCode = c; return this; },
            json(d) { responseJson = d; return this; }
        };

        await login(req, res);
        assert.equal(statusCode, 400);
        assert.ok(responseJson.error.includes('format'));
    });

    test('ADMIN-AUTH-007: Logout', async () => {
        let statusCode = 0;
        let responseJson = null;
        const req = { admin: { email: 'admin@digiid.gov.in' } };
        const res = {
            status(c) { statusCode = c; return this; },
            json(d) { responseJson = d; return this; }
        };

        await logout(req, res);
        assert.equal(statusCode, 200);
        assert.equal(responseJson.success, true);
    });

    test('ADMIN-AUTH-008: Expired Session Token', () => {
        const expiredToken = createAdminToken({ email: 'admin@digiid.gov.in', exp: Date.now() - 1000 });
        const payload = verifyAdminToken(expiredToken);
        assert.equal(payload, null);
    });

    test('ADMIN-AUTH-009: Missing Authorization', () => {
        let statusCode = 0;
        let responseJson = null;
        const req = { headers: {} };
        const res = {
            status(c) { statusCode = c; return this; },
            json(d) { responseJson = d; return this; }
        };

        requireAdminAuth(req, res, () => {});
        assert.equal(statusCode, 401);
        assert.equal(responseJson.code, 'AUTH_REQUIRED');
    });

    test('ADMIN-AUTH-010: Invalid Token', () => {
        let statusCode = 0;
        let responseJson = null;
        const req = { headers: { authorization: 'Bearer invalid.bogus.token' } };
        const res = {
            status(c) { statusCode = c; return this; },
            json(d) { responseJson = d; return this; }
        };

        requireAdminAuth(req, res, () => {});
        assert.equal(statusCode, 401);
        assert.equal(responseJson.code, 'INVALID_TOKEN');
    });

    test('ADMIN-AUTH-011: Token Tampering', () => {
        const token = createAdminToken({ email: 'admin@digiid.gov.in', role: 'SUPER_ADMIN' });
        const tampered = token.slice(0, -8) + 'X9Y8Z7W6';
        assert.equal(verifyAdminToken(tampered), null);
    });

    test('ADMIN-AUTH-012: Brute-Force Rate Limiting Protection', () => {
        const key = 'test-ip:attacker@evil.com';
        for (let i = 0; i < 5; i++) {
            recordLoginFailure(key);
        }

        let statusCode = 0;
        let responseJson = null;
        const req = {
            ip: 'test-ip',
            body: { email: 'attacker@evil.com' }
        };
        const res = {
            status(c) { statusCode = c; return this; },
            json(d) { responseJson = d; return this; }
        };

        loginRateLimiter(req, res, () => {});
        assert.equal(statusCode, 429);
        assert.equal(responseJson.code, 'RATE_LIMITED');
    });
});
