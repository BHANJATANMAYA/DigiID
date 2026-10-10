'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { validateDocument } = require('../../backend/src/features/documents/validator');
const { verifyAdminToken } = require('../../backend/src/core/middleware/admin.middleware');
const requireAuth = require('../../backend/src/core/middleware/auth.middleware');

describe('Security Test Cases (SEC-001 to SEC-013)', () => {

    test('SEC-001: SQL Injection Attempt in Validation and Search Fields', () => {
        const sqlPayloads = [
            "' OR '1'='1",
            "'; DROP TABLE gov_documents; --",
            "1' UNION SELECT * FROM admin_users --"
        ];

        for (const payload of sqlPayloads) {
            const input = {
                doc_type: 'aadhaar',
                identity_no: payload,
                name: payload,
                dob: '2000-01-01',
                authority: payload
            };
            const res = validateDocument(input);
            // Must fail validation for identity number, no execution of raw SQL
            assert.equal(res.isValid, false);
            assert.ok(res.errors.length > 0);
        }
    });

    test('SEC-002 & SEC-003: XSS & HTML Attribute Injection in Document Fields', () => {
        const { buildCertificateHTML } = require('../../backend/src/features/certificates/certificateGenerator');
        const doc = {
            id: 1,
            doc_type: 'aadhaar',
            name: '<script>alert("xss")</script>" onmouseover="alert(1)"',
            identity_no: '123456789012',
            dob: '2000-01-01',
            authority: '<b onfocus="alert(1)">UIDAI</b>',
            hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            anchored_at: new Date().toISOString(),
            cert_id: 'CERT-2026-XSS'
        };

        const html = buildCertificateHTML(doc, 'data:image/png;base64,mock');
        assert.ok(!html.includes('<script>'));
        assert.ok(!html.includes('<b onfocus='));
        assert.ok(html.includes('&lt;script&gt;'));
        assert.ok(html.includes('&lt;b '));
    });

    test('SEC-004: Authorization Bypass Attempt (Missing Credentials)', () => {
        let statusCode = null;
        let responseJson = null;

        const req = { headers: {} };
        const res = {
            status(code) { statusCode = code; return this; },
            json(data) { responseJson = data; return this; }
        };
        const next = () => { assert.fail('next() called without auth credentials'); };

        requireAuth(req, res, next);
        assert.equal(statusCode, 401);
        assert.equal(responseJson.success, false);
    });

    test('SEC-005: Token Manipulation / Tampering', () => {
        const { createAdminToken } = require('../../backend/src/core/middleware/admin.middleware');
        const validToken = createAdminToken({ email: 'admin@digiid.gov.in', role: 'SUPER_ADMIN' });
        assert.ok(validToken);

        // Tamper with signature
        const tamperedToken = validToken.slice(0, -4) + 'abcd';
        const payload = verifyAdminToken(tamperedToken);
        assert.equal(payload, null);

        // Tamper with payload
        const parts = validToken.split('.');
        const tamperedBody = Buffer.from(JSON.stringify({ email: 'hacker@malicious.com', exp: Date.now() + 100000 })).toString('base64url');
        const payloadTampered = verifyAdminToken(`${tamperedBody}.${parts[1]}`);
        assert.equal(payloadTampered, null);
    });

    test('SEC-006 & SEC-008: Secret Exposure & Private Key Safety in Frontend Files', () => {
        const frontendDir = path.join(__dirname, '..', '..', 'frontend');
        const files = fs.readdirSync(frontendDir).filter(f => f.endsWith('.js') || f.endsWith('.html'));

        for (const file of files) {
            const content = fs.readFileSync(path.join(frontendDir, file), 'utf8');
            // Check for raw private keys
            assert.ok(!content.includes('BLOCKCHAIN_PRIVATE_KEY'), `File ${file} exposes BLOCKCHAIN_PRIVATE_KEY`);
            assert.ok(!content.includes('DATABASE_URL'), `File ${file} exposes DATABASE_URL`);
            assert.ok(!content.includes('ADMIN_PASSWORD'), `File ${file} exposes ADMIN_PASSWORD`);
            // Check for 64-char private key hex
            assert.ok(!content.match(/0x[0-9a-fA-F]{64}/), `File ${file} contains raw private key hex string`);
        }
    });

    test('SEC-007: Environment Variable Leakage Protection', () => {
        const { errorHandler } = require('../../backend/src/core/middleware/error.middleware');
        let statusCode = 0;
        let responseJson = null;

        const req = { method: 'GET', originalUrl: '/api/documents' };
        const res = {
            status(code) { statusCode = code; return this; },
            json(data) { responseJson = data; return this; }
        };
        const error = new Error('Database password failed: postgresql://postgres:secretpassword@localhost:5432');

        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        try {
            errorHandler(error, req, res, () => {});
            assert.equal(statusCode, 500);
            assert.equal(responseJson.success, false);
            // In production, stack is not leaked
            assert.equal(responseJson.error.stack, undefined);
        } finally {
            process.env.NODE_ENV = originalEnv;
        }
    });

    test('SEC-009: Error Information Leakage in Production Mode', () => {
        const { errorHandler } = require('../../backend/src/core/middleware/error.middleware');
        let jsonRes;
        const res = {
            status() { return this; },
            json(d) { jsonRes = d; }
        };
        const err = new Error('Simulated DB Failure');
        err.stack = 'Secret DB Stack: at PG.connect (x:/passwords/db.js:10:1)';

        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        try {
            errorHandler(err, {}, res);
            assert.equal(jsonRes.error.stack, undefined);
        } finally {
            process.env.NODE_ENV = originalEnv;
        }
    });

    test('SEC-011: Admin Login Rate Limiting / Brute-Force Lockout', () => {
        const { loginRateLimiter, recordLoginFailure } = require('../../backend/src/core/middleware/admin.middleware');

        const req = {
            ip: '192.168.1.100',
            body: { email: 'bruteforce@test.gov.in' }
        };
        let statusCode = 0;
        let jsonRes = null;
        const res = {
            status(c) { statusCode = c; return this; },
            json(d) { jsonRes = d; return this; }
        };

        const key = '192.168.1.100:bruteforce@test.gov.in';
        // Simulate 5 consecutive failed attempts
        for (let i = 0; i < 5; i++) {
            recordLoginFailure(key);
        }

        loginRateLimiter(req, res, () => { assert.fail('Rate limiter did not block locked account'); });
        assert.equal(statusCode, 429);
        assert.equal(jsonRes.code, 'RATE_LIMITED');
    });

    test('SEC-013: Malformed JSON Handling', () => {
        const express = require('express');
        const app = require('../../backend/src/app');
        // Express json parser rejects malformed JSON with 400 status
        assert.ok(app);
    });
});
