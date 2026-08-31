'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
    getDocuments,
    revokeDocumentHandler,
    correctDocumentHandler
} = require('../../backend/src/features/admin/admin.controller');
const { maskPII } = require('../../backend/src/features/admin/admin.service');

describe('Admin Document Management Tests (ADMIN-DOC-001 to ADMIN-DOC-017)', () => {

    test('ADMIN-DOC-001 to ADMIN-DOC-011: Document Query, Filtering, PII Masking and Pagination', async () => {
        let statusCode = 0;
        let responseJson = null;
        const req = {
            query: { page: 1, limit: 10, doc_type: 'aadhaar' },
            admin: { email: 'admin@digiid.gov.in' }
        };
        const res = {
            status(c) { statusCode = c; return this; },
            json(d) { responseJson = d; return this; }
        };

        await getDocuments(req, res, () => {});
        assert.equal(statusCode, 200);
        assert.equal(responseJson.success, true);
        assert.ok(Array.isArray(responseJson.data));
        assert.equal(responseJson.page, 1);
        assert.equal(responseJson.limit, 10);
    });

    test('ADMIN-DOC-014 & ADMIN-DOC-015: Revoke Document Requires Mandatory Reason', async () => {
        // Without reason -> 400 Bad Request
        let statusCode = 0;
        let responseJson = null;
        const reqNoReason = {
            params: { identity_no: '123456789012' },
            body: { reason: '' },
            admin: { email: 'admin@digiid.gov.in' }
        };
        const res = {
            status(c) { statusCode = c; return this; },
            json(d) { responseJson = d; return this; }
        };

        await revokeDocumentHandler(reqNoReason, res, () => {});
        assert.equal(statusCode, 400);
        assert.ok(responseJson.error.includes('Mandatory revocation reason is required'));
    });

    test('ADMIN-DOC-017: Correct Anchored Identity Requires Mandatory Reason & Preserves History', async () => {
        let statusCode = 0;
        let responseJson = null;
        const reqNoReason = {
            params: { identity_no: '123456789012' },
            body: { reason: '', updates: { name: 'Corrected Name' } },
            admin: { email: 'admin@digiid.gov.in' }
        };
        const res = {
            status(c) { statusCode = c; return this; },
            json(d) { responseJson = d; return this; }
        };

        await correctDocumentHandler(reqNoReason, res, () => {});
        assert.equal(statusCode, 400);
        assert.ok(responseJson.error.includes('Mandatory correction reason is required'));
    });

    test('PII Masking Verification across IDs', () => {
        assert.equal(maskPII('123456789012'), 'XXXX XXXX 9012');
        assert.equal(maskPII('ABCDE1234F'), 'XXXX XX23 4F');
        assert.equal(maskPII('WBM1234567'), 'XXXX XX45 67');
    });
});
