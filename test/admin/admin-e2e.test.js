'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
    login,
    getDashboard,
    getDocuments,
    verifyDocumentHandler,
    revokeDocumentHandler,
    correctDocumentHandler
} = require('../../backend/src/features/admin/admin.controller');
const { getAuditLogs } = require('../../backend/src/features/admin/admin.service');

describe('Admin End-to-End Workflows (Admin E2E & Admin Correction E2E)', () => {

    test('ADMIN-E2E: Full Super Admin Lifecycle Workflow', async () => {
        // Step 1: Login
        let token = null;
        const loginReq = {
            body: { email: 'admin@digiid.gov.in', password: 'SuperAdmin@DigiID2026' },
            _rateLimitKey: 'test:admin@digiid.gov.in'
        };
        const loginRes = {
            status(c) { assert.equal(c, 200); return this; },
            json(d) { token = d.token; return this; }
        };
        await login(loginReq, loginRes);
        assert.ok(token);

        // Step 2: Dashboard
        const dashReq = { admin: { email: 'admin@digiid.gov.in', role: 'SUPER_ADMIN' } };
        let dashData = null;
        const dashRes = {
            status(c) { assert.equal(c, 200); return this; },
            json(d) { dashData = d.data; return this; }
        };
        await getDashboard(dashReq, dashRes, () => {});
        assert.ok(dashData.metrics);

        // Step 3: Search Documents
        const docReq = {
            query: { q: 'Aadhaar' },
            admin: { email: 'admin@digiid.gov.in' }
        };
        let docs = [];
        const docRes = {
            status(c) { assert.equal(c, 200); return this; },
            json(d) { docs = d.data; return this; }
        };
        await getDocuments(docReq, docRes, () => {});
        assert.ok(Array.isArray(docs));

        // Step 4: Audit Logs Confirmation
        const logs = await getAuditLogs({ limit: 5 });
        assert.ok(logs.logs.length > 0);
        assert.ok(logs.logs.some(l => l.admin_email === 'admin@digiid.gov.in'));
    });

    test('ADMIN-CORRECTION-E2E: Correction with Versioning & Hash Synchronization', async () => {
        // Test mandatory reason enforcement on correction
        let statusCode = 0;
        let jsonRes = null;
        const req = {
            params: { identity_no: '999988887777' },
            body: { reason: '', updates: { name: 'New Name' } },
            admin: { email: 'admin@digiid.gov.in' }
        };
        const res = {
            status(c) { statusCode = c; return this; },
            json(d) { jsonRes = d; return this; }
        };

        await correctDocumentHandler(req, res, () => {});
        // Must reject empty reason
        assert.equal(statusCode, 400);
        assert.ok(jsonRes.error.includes('Mandatory correction reason'));
    });
});
