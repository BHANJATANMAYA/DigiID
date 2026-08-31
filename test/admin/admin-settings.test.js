'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
    getSystemSettings,
    updateSystemSettings
} = require('../../backend/src/features/admin/admin.service');
const {
    getSettingsHandler,
    updateSettingsHandler
} = require('../../backend/src/features/admin/admin.controller');

describe('Admin Settings Tests (ADMIN-SET-001 to ADMIN-SET-006)', () => {

    test('ADMIN-SET-001: Read Settings Returns Whitelisted Safe Configuration', async () => {
        const settings = await getSystemSettings();
        assert.ok('maintenance_mode' in settings);
        assert.ok('allow_public_verification' in settings);
        assert.ok('supported_doc_types' in settings);
    });

    test('ADMIN-SET-002: Update Valid Setting Persists Changes', async () => {
        const updated = await updateSystemSettings({ maintenance_mode: true }, 'admin@digiid.gov.in');
        assert.equal(updated.maintenance_mode, true);
        // Reset
        await updateSystemSettings({ maintenance_mode: false }, 'admin@digiid.gov.in');
    });

    test('ADMIN-SET-003 & ADMIN-SET-005: Prevent Secret Exposure & Disallow Arbitrary Injection', async () => {
        const payload = {
            private_key: '0xmalicious',
            db_password: 'injected_password',
            maintenance_mode: false
        };
        const updated = await updateSystemSettings(payload, 'admin@digiid.gov.in');
        assert.equal(updated.private_key, undefined);
        assert.equal(updated.db_password, undefined);
    });

    test('ADMIN-SET-004: Unauthorized Settings Modification is Blocked by Middleware', () => {
        const { requireAdminAuth } = require('../../backend/src/core/middleware/admin.middleware');
        let code = 0;
        const req = { headers: {} };
        const res = {
            status(c) { code = c; return this; },
            json(d) { return d; }
        };
        requireAdminAuth(req, res, () => { assert.fail('Allowed without admin auth'); });
        assert.equal(code, 401);
    });
});
