'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../../backend/src/app');

describe('API & Authentication Integration Tests (API-001 to API-017 & AUTH-001 to AUTH-010)', () => {
    let server;
    let baseUrl;

    before(async () => {
        await new Promise((resolve) => {
            server = app.listen(0, () => {
                const port = server.address().port;
                baseUrl = `http://127.0.0.1:${port}`;
                resolve();
            });
        });
    });

    after(async () => {
        if (server) {
            await new Promise(resolve => server.close(resolve));
        }
    });

    // ── API-001: Health Endpoint ──
    test('API-001: Health Endpoint returns HTTP 200 and success status', async () => {
        const res = await fetch(`${baseUrl}/api/health`);
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.success, true);
        assert.ok(data.message.includes('DigiID'));
        assert.ok(data.timestamp);
    });

    // ── API-003: Empty Request Body ──
    test('API-003: Empty Request Body returns 400 validation error', async () => {
        const res = await fetch(`${baseUrl}/api/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        assert.equal(res.status, 400);
        const data = await res.json();
        assert.equal(data.success, false);
        assert.ok(Array.isArray(data.errors));
    });

    // ── API-004: Missing Document Type ──
    test('API-004: Missing Document Type returns 400 error', async () => {
        const res = await fetch(`${baseUrl}/api/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identity_no: '123456789012',
                name: 'Anand Kumar',
                dob: '2000-01-01',
                authority: 'UIDAI'
            })
        });
        assert.equal(res.status, 400);
        const data = await res.json();
        assert.ok(data.errors.some(e => e.includes('doc_type')));
    });

    // ── API-005: Invalid Document Type ──
    test('API-005: Invalid Document Type returns 400 error', async () => {
        const res = await fetch(`${baseUrl}/api/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                doc_type: 'passport',
                identity_no: '123456789012',
                name: 'Anand Kumar',
                dob: '2000-01-01',
                authority: 'UIDAI'
            })
        });
        assert.equal(res.status, 400);
        const data = await res.json();
        assert.ok(data.errors.some(e => e.includes('doc_type')));
    });

    // ── API-006: Missing Identity Number ──
    test('API-006: Missing Identity Number returns 400 error', async () => {
        const res = await fetch(`${baseUrl}/api/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                doc_type: 'aadhaar',
                name: 'Anand Kumar',
                dob: '2000-01-01',
                authority: 'UIDAI'
            })
        });
        assert.equal(res.status, 400);
        const data = await res.json();
        assert.ok(data.errors.some(e => e.includes('Identity number')));
    });

    // ── AUTH-001 & AUTH-002: Protected Mutation Endpoints require Bearer Token ──
    test('AUTH-001: PUT /api/documents/:id without Auth header returns 401', async () => {
        const res = await fetch(`${baseUrl}/api/documents/123456789012`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Updated Name' })
        });
        assert.equal(res.status, 401);
        const data = await res.json();
        assert.equal(data.success, false);
    });

    test('AUTH-002: DELETE /api/documents/:id with Invalid Bearer Token returns 401', async () => {
        const res = await fetch(`${baseUrl}/api/documents/123456789012`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer invalid-token-xyz',
                'Content-Type': 'application/json'
            }
        });
        assert.equal(res.status, 401);
        const data = await res.json();
        assert.equal(data.success, false);
    });

    test('AUTH-003: Empty Bearer Token is rejected with 401', async () => {
        const res = await fetch(`${baseUrl}/api/certificates/123456789012`, {
            headers: { 'Authorization': 'Bearer ' }
        });
        assert.equal(res.status, 401);
    });

    test('AUTH-004: Malformed Authorization Header is rejected with 401', async () => {
        const res = await fetch(`${baseUrl}/api/certificates/123456789012`, {
            headers: { 'Authorization': 'Basic dXNlcjpwYXNz' }
        });
        assert.equal(res.status, 401);
    });

    test('AUTH-005: Valid Token grants access to protected certificate endpoint', async () => {
        const res = await fetch(`${baseUrl}/api/certificates/123456789012`, {
            headers: { 'Authorization': 'Bearer digiid-secret' }
        });
        // Returns 404 (document not found) or 200, but NOT 401
        assert.notEqual(res.status, 401);
    });

    test('AUTH-010: Frontend Demo OTP Classification Finding', () => {
        const fs = require('fs');
        const path = require('path');
        const loginHtml = fs.readFileSync(path.join(__dirname, '..', '..', 'frontend', 'login.html'), 'utf8');
        // Confirmed finding: accepts any 6-digit OTP in demo mode
        assert.ok(loginHtml.includes('any 6-digit'));
        assert.ok(loginHtml.includes('digiid_auth'));
    });
});
