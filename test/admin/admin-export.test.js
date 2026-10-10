'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { generateCSV } = require('../../backend/src/features/admin/admin.service');

describe('Admin Export Tests (ADMIN-EXPORT-001 to ADMIN-EXPORT-006)', () => {

    test('ADMIN-EXPORT-001: CSV Export Format with Masked PII by Default', () => {
        const docs = [{
            cert_id: 'CERT-2026-AA1234',
            doc_type: 'aadhaar',
            name: 'Rohan Sharma',
            identity_no: '123456789012',
            dob: '2000-01-15',
            authority: 'UIDAI',
            status: 'ACTIVE',
            hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            anchored_at: '2026-03-20'
        }];

        const csv = generateCSV(docs);
        assert.ok(csv.includes('Certificate ID,Document Type,Full Name,Identity Number (Masked)'));
        assert.ok(csv.includes('CERT-2026-AA1234'));
        assert.ok(csv.includes('XXXX XXXX 9012'));
        assert.ok(!csv.includes('123456789012')); // Raw identity must not appear in export
    });

    test('ADMIN-EXPORT-004: Empty Export Produces Headers Only', () => {
        const csv = generateCSV([]);
        assert.ok(csv.includes('Certificate ID'));
        const lines = csv.split('\r\n');
        assert.equal(lines.length, 1);
    });

    test('ADMIN-EXPORT-005: CSV Formula Injection Protection Sanitizes =, +, -, @', () => {
        const maliciousDocs = [{
            cert_id: '=cmd|"/c calc"!A0',
            doc_type: '+12345',
            name: '-DDE("cmd";"calc")',
            identity_no: '@SUM(1+1)',
            dob: '2000-01-01',
            authority: 'UIDAI',
            status: 'ACTIVE',
            hash: 'hash',
            anchored_at: '2026-03-20'
        }];

        const csv = generateCSV(maliciousDocs);
        // Formula triggers must be prefixed with single quote '
        assert.ok(csv.includes("'\=cmd"));
        assert.ok(csv.includes("'\+12345"));
        assert.ok(csv.includes("'\-DDE"));
    });
});
