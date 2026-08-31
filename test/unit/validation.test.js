'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { validateDocument } = require('../../backend/src/features/documents/validator');

describe('Validation Test Cases (VAL-001 to VAL-017)', () => {

    test('VAL-001: Valid Aadhaar', () => {
        const input = {
            doc_type: 'aadhaar',
            identity_no: '123456789012',
            name: 'Aarav Sharma',
            dob: '2000-01-15',
            authority: 'UIDAI — Govt. of India'
        };
        const res = validateDocument(input);
        assert.equal(res.isValid, true);
        assert.equal(res.errors.length, 0);
    });

    test('VAL-002: Aadhaar Too Short (11 digits)', () => {
        const input = {
            doc_type: 'aadhaar',
            identity_no: '12345678901',
            name: 'Aarav Sharma',
            dob: '2000-01-15',
            authority: 'UIDAI'
        };
        const res = validateDocument(input);
        assert.equal(res.isValid, false);
        assert.ok(res.errors.some(e => e.toLowerCase().includes('short') || e.toLowerCase().includes('12')));
    });

    test('VAL-003: Aadhaar Too Long (13 digits)', () => {
        const input = {
            doc_type: 'aadhaar',
            identity_no: '1234567890123',
            name: 'Aarav Sharma',
            dob: '2000-01-15',
            authority: 'UIDAI'
        };
        const res = validateDocument(input);
        assert.equal(res.isValid, false);
        assert.ok(res.errors.some(e => e.toLowerCase().includes('long') || e.toLowerCase().includes('12')));
    });

    test('VAL-004: Aadhaar Contains Letters', () => {
        const input = {
            doc_type: 'aadhaar',
            identity_no: '12345678901A',
            name: 'Aarav Sharma',
            dob: '2000-01-15',
            authority: 'UIDAI'
        };
        const res = validateDocument(input);
        assert.equal(res.isValid, false);
        assert.ok(res.errors.some(e => e.toLowerCase().includes('letter') || e.toLowerCase().includes('12 digits')));
    });

    test('VAL-005: Valid PAN', () => {
        const input = {
            doc_type: 'pan',
            identity_no: 'ABCDE1234F',
            name: 'Vikram Mehta',
            dob: '1995-05-20',
            authority: 'Income Tax Department'
        };
        const res = validateDocument(input);
        assert.equal(res.isValid, true);
        assert.equal(res.errors.length, 0);
    });

    test('VAL-006: Invalid PAN', () => {
        const input = {
            doc_type: 'pan',
            identity_no: '12345ABCDE',
            name: 'Vikram Mehta',
            dob: '1995-05-20',
            authority: 'Income Tax Department'
        };
        const res = validateDocument(input);
        assert.equal(res.isValid, false);
        assert.ok(res.errors.some(e => e.toLowerCase().includes('pan')));
    });

    test('VAL-007: Valid Voter ID', () => {
        const input = {
            doc_type: 'voter',
            identity_no: 'WBM1234567',
            name: 'Priya Sen',
            dob: '1998-11-04',
            authority: 'Election Commission of India'
        };
        const res = validateDocument(input);
        assert.equal(res.isValid, true);
        assert.equal(res.errors.length, 0);
    });

    test('VAL-008: Invalid Voter ID', () => {
        const input = {
            doc_type: 'voter',
            identity_no: 'WB', // too short (< 8 chars)
            name: 'Priya Sen',
            dob: '1998-11-04',
            authority: 'Election Commission'
        };
        const res = validateDocument(input);
        assert.equal(res.isValid, false);
        assert.ok(res.errors.some(e => e.toLowerCase().includes('epic') || e.toLowerCase().includes('8–12')));
    });

    test('VAL-009: Missing Name', () => {
        const input = {
            doc_type: 'aadhaar',
            identity_no: '123456789012',
            name: '',
            dob: '2000-01-15',
            authority: 'UIDAI'
        };
        const res = validateDocument(input);
        assert.equal(res.isValid, false);
        assert.ok(res.errors.some(e => e.toLowerCase().includes('name')));
    });

    test('VAL-010: Empty Identity Number', () => {
        const input = {
            doc_type: 'aadhaar',
            identity_no: '',
            name: 'Aarav Sharma',
            dob: '2000-01-15',
            authority: 'UIDAI'
        };
        const res = validateDocument(input);
        assert.equal(res.isValid, false);
        assert.ok(res.errors.some(e => e.toLowerCase().includes('identity number')));
    });

    test('VAL-011: Missing DOB', () => {
        const input = {
            doc_type: 'aadhaar',
            identity_no: '123456789012',
            name: 'Aarav Sharma',
            dob: '',
            authority: 'UIDAI'
        };
        const res = validateDocument(input);
        assert.equal(res.isValid, false);
        assert.ok(res.errors.some(e => e.toLowerCase().includes('birth')));
    });

    test('VAL-012: Invalid DOB', () => {
        const input = {
            doc_type: 'aadhaar',
            identity_no: '123456789012',
            name: 'Aarav Sharma',
            dob: '15/01/2000', // not YYYY-MM-DD
            authority: 'UIDAI'
        };
        const res = validateDocument(input);
        assert.equal(res.isValid, false);
        assert.ok(res.errors.some(e => e.toLowerCase().includes('format') || e.toLowerCase().includes('yyyy-mm-dd')));
    });

    test('VAL-013: Future DOB', () => {
        const futureYear = new Date().getFullYear() + 2;
        const input = {
            doc_type: 'aadhaar',
            identity_no: '123456789012',
            name: 'Aarav Sharma',
            dob: `${futureYear}-01-01`,
            authority: 'UIDAI'
        };
        const res = validateDocument(input);
        assert.equal(res.isValid, false);
        assert.ok(res.errors.some(e => e.toLowerCase().includes('past')));
    });

    test('VAL-014: Missing Authority', () => {
        const input = {
            doc_type: 'aadhaar',
            identity_no: '123456789012',
            name: 'Aarav Sharma',
            dob: '2000-01-15',
            authority: ''
        };
        const res = validateDocument(input);
        assert.equal(res.isValid, false);
        assert.ok(res.errors.some(e => e.toLowerCase().includes('authority')));
    });

    test('VAL-015: Unsupported Document Type', () => {
        const input = {
            doc_type: 'driving_license',
            identity_no: '123456789012',
            name: 'Aarav Sharma',
            dob: '2000-01-15',
            authority: 'RTO'
        };
        const res = validateDocument(input);
        assert.equal(res.isValid, false);
        assert.ok(res.errors.some(e => e.toLowerCase().includes('doc_type')));
    });

    test('VAL-016: Extremely Long Name', () => {
        const input = {
            doc_type: 'aadhaar',
            identity_no: '123456789012',
            name: 'A'.repeat(101),
            dob: '2000-01-15',
            authority: 'UIDAI'
        };
        const res = validateDocument(input);
        assert.equal(res.isValid, false);
        assert.ok(res.errors.some(e => e.toLowerCase().includes('100 characters')));
    });

    test('VAL-017: Null/Undefined Input', () => {
        const resNull = validateDocument(null);
        assert.equal(resNull.isValid, false);
        assert.ok(Array.isArray(resNull.errors));

        const resUndefined = validateDocument(undefined);
        assert.equal(resUndefined.isValid, false);
        assert.ok(Array.isArray(resUndefined.errors));

        const resEmpty = validateDocument({});
        assert.equal(resEmpty.isValid, false);
        assert.ok(resEmpty.errors.length > 0);
    });
});
