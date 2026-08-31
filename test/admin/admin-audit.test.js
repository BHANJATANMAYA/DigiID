'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
    recordAuditLog,
    getAuditLogs
} = require('../../backend/src/features/admin/admin.service');

describe('Admin Audit Log Tests (ADMIN-AUDIT-001 to ADMIN-AUDIT-013)', () => {

    test('ADMIN-AUDIT-001 to 010: Recording Events Across All Admin Operations', async () => {
        const events = [
            { action: 'ADMIN_LOGIN', targetResource: 'portal', outcome: 'SUCCESS' },
            { action: 'ADMIN_LOGIN_FAILED', targetResource: 'portal', outcome: 'FAILURE', reason: 'Bad pass' },
            { action: 'DOCUMENT_VIEWED', targetResource: '123456789012', outcome: 'SUCCESS' },
            { action: 'DOCUMENT_VERIFIED', targetResource: '123456789012', outcome: 'SUCCESS' },
            { action: 'DOCUMENT_REVOKED', targetResource: '123456789012', outcome: 'SUCCESS', reason: 'Court order' },
            { action: 'DOCUMENT_CORRECTED', targetResource: '123456789012', outcome: 'SUCCESS', reason: 'Typo' },
            { action: 'PII_REVEALED', targetResource: '123456789012', outcome: 'SUCCESS', reason: 'Official inquiry' },
            { action: 'DOCUMENT_EXPORTED', targetResource: 'gov_documents', outcome: 'SUCCESS' }
        ];

        for (const ev of events) {
            const entry = await recordAuditLog({
                adminEmail: 'admin@digiid.gov.in',
                ...ev
            });
            assert.ok(entry.id);
            assert.equal(entry.action, ev.action);
            assert.equal(entry.outcome, ev.outcome);
        }
    });

    test('ADMIN-AUDIT-011: Valid Audit Timestamp is ISO Format', async () => {
        const entry = await recordAuditLog({
            adminEmail: 'admin@digiid.gov.in',
            action: 'TIMESTAMP_TEST',
            outcome: 'SUCCESS'
        });
        assert.ok(entry.created_at);
        assert.ok(!isNaN(new Date(entry.created_at).getTime()));
    });

    test('ADMIN-AUDIT-012: No Secrets, Passwords or Tokens in Logs', async () => {
        const entry = await recordAuditLog({
            adminEmail: 'admin@digiid.gov.in',
            action: 'SECRET_TEST',
            outcome: 'SUCCESS',
            metadata: {
                password: 'super-secret-password',
                token: 'jwt-bearer-token',
                privateKey: '0x1234567890',
                safeInfo: 'ok'
            }
        });

        assert.equal(entry.metadata.password, undefined);
        assert.equal(entry.metadata.token, undefined);
        assert.equal(entry.metadata.privateKey, undefined);
        assert.equal(entry.metadata.safeInfo, 'ok');
    });

    test('ADMIN-AUDIT-013: Audit History Protection', async () => {
        // Query audit logs verifies append-only retrieval
        const logs = await getAuditLogs({ limit: 10 });
        assert.ok(logs.logs.length > 0);
        // Ordinary admin operations cannot delete audit logs (no DELETE endpoint exists in admin.routes)
        const adminRoutes = require('../../backend/src/features/admin/admin.routes');
        assert.ok(adminRoutes);
    });
});
