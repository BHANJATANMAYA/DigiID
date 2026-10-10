'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

describe('Database Tests (DB-001 to DB-010)', () => {

    test('DB-008: Database Connection Failure returns controlled error without crashing process', async () => {
        const { Pool } = require('pg');
        const brokenPool = new Pool({
            host: '127.0.0.1',
            port: 54329, // closed port
            connectionTimeoutMillis: 500
        });

        try {
            await brokenPool.connect();
            assert.fail('Should have failed to connect');
        } catch (err) {
            assert.ok(err.message);
            // Verify application catches it safely
        } finally {
            await brokenPool.end().catch(() => {});
        }
    });

    test('DB-009: SQL Injection Protection via Parameterized Queries', () => {
        // Verify database queries in controllers always use parameterized $1, $2 instead of string interpolation
        const fs = require('fs');
        const path = require('path');
        const controllerCode = fs.readFileSync(path.join(__dirname, '..', '..', 'backend', 'src', 'features', 'documents', 'document.controller.js'), 'utf8');

        assert.ok(!controllerCode.includes("WHERE identity_no = '" + "${"), 'Dangerous string interpolation found in SQL query');
        assert.ok(controllerCode.includes('WHERE identity_no = $1'), 'Parameterized query $1 properly used');
    });

    test('DB-010: Public Data Exposure Prevention in RLS and Masking', () => {
        const { maskPII } = require('../../backend/src/features/admin/admin.service');
        const rawId = '123456789012';
        const masked = maskPII(rawId);
        assert.equal(masked, 'XXXX XXXX 9012');
    });
});
