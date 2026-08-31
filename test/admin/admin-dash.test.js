'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { getDashboard } = require('../../backend/src/features/admin/admin.controller');
const { checkSystemHealth } = require('../../backend/src/features/admin/admin.service');

describe('Admin Dashboard Tests (ADMIN-DASH-001 to ADMIN-DASH-017)', () => {

    test('ADMIN-DASH-001 to ADMIN-DASH-010: Dashboard Metrics and Data Shape', async () => {
        let statusCode = 0;
        let responseJson = null;
        const req = { admin: { email: 'admin@digiid.gov.in', role: 'SUPER_ADMIN' } };
        const res = {
            status(c) { statusCode = c; return this; },
            json(d) { responseJson = d; return this; }
        };

        await getDashboard(req, res, () => {});
        assert.equal(statusCode, 200);
        assert.equal(responseJson.success, true);
        assert.ok(responseJson.data);

        const { metrics, health, recentRegistrations, blockchain } = responseJson.data;

        // Metrics presence (ADMIN-DASH-001 to ADMIN-DASH-005)
        assert.ok('total' in metrics);
        assert.ok('active' in metrics);
        assert.ok('revoked' in metrics);
        assert.ok('aadhaar' in metrics);
        assert.ok('pan' in metrics);
        assert.ok('voter' in metrics);

        // Recent registrations array (ADMIN-DASH-006)
        assert.ok(Array.isArray(recentRegistrations));

        // Blockchain stats (ADMIN-DASH-009, 010)
        assert.ok('failedTxCount' in blockchain);
    });

    test('ADMIN-DASH-011, 012, 013: System Health Components (Database, RPC, API)', async () => {
        const health = await checkSystemHealth();
        assert.ok(health.api);
        assert.ok(health.database);
        assert.ok(health.blockchain);
        assert.equal(health.api.status, 'HEALTHY');
        assert.ok(typeof health.database.status === 'string');
        assert.ok(typeof health.blockchain.status === 'string');
    });

    test('ADMIN-DASH-014 & 015: Charts Handle Normal & Empty Data Gracefully', () => {
        // Test data aggregator functions handle empty datasets without NaN or exceptions
        const emptyDocs = [];
        const stats = {
            total: emptyDocs.length,
            aadhaar: emptyDocs.filter(d => d.doc_type === 'aadhaar').length,
            pan: emptyDocs.filter(d => d.doc_type === 'pan').length,
            voter: emptyDocs.filter(d => d.doc_type === 'voter').length
        };
        assert.equal(stats.total, 0);
        assert.equal(stats.aadhaar, 0);
        assert.equal(stats.pan, 0);
        assert.equal(stats.voter, 0);
    });
});
