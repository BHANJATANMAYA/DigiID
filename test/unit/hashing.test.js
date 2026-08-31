'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { generateHash } = require('../../backend/src/features/documents/hashGenerator');

describe('Hashing Test Cases (HASH-001 to HASH-010)', () => {

    test('HASH-001: Deterministic Hash (Same inputs twice produce identical hashes)', () => {
        const hash1 = generateHash('123456789012', '2000-01-15', 'aadhaar');
        const hash2 = generateHash('123456789012', '2000-01-15', 'aadhaar');
        assert.equal(hash1, hash2);
        assert.equal(hash1.length, 64);
        assert.match(hash1, /^[0-9a-f]{64}$/);
    });

    test('HASH-002: Different Identity produces different hash', () => {
        const hash1 = generateHash('123456789012', '2000-01-15', 'aadhaar');
        const hash2 = generateHash('123456789013', '2000-01-15', 'aadhaar');
        assert.notEqual(hash1, hash2);
    });

    test('HASH-003: Different DOB produces different hash', () => {
        const hash1 = generateHash('123456789012', '2000-01-15', 'aadhaar');
        const hash2 = generateHash('123456789012', '2000-01-16', 'aadhaar');
        assert.notEqual(hash1, hash2);
    });

    test('HASH-004: Different Document Type produces different hash', () => {
        const hash1 = generateHash('ABCDE1234F', '1995-05-20', 'pan');
        const hash2 = generateHash('ABCDE1234F', '1995-05-20', 'voter');
        assert.notEqual(hash1, hash2);
    });

    test('HASH-005: Identity With Spaces produces same normalized hash', () => {
        const hashClean = generateHash('123456789012', '2000-01-15', 'aadhaar');
        const hashSpaced = generateHash('1234 5678 9012', '2000-01-15', 'aadhaar');
        assert.equal(hashSpaced, hashClean);
    });

    test('HASH-006: Identity With Hyphens produces same normalized hash', () => {
        const hashClean = generateHash('ABCDE1234F', '1995-05-20', 'pan');
        const hashHyphen = generateHash('ABC-DE-1234-F', '1995-05-20', 'pan');
        assert.equal(hashHyphen, hashClean);
    });

    test('HASH-007: Lowercase Identity produces same normalized uppercase hash', () => {
        const hashUpper = generateHash('ABCDE1234F', '1995-05-20', 'pan');
        const hashLower = generateHash('abcde1234f', '1995-05-20', 'pan');
        assert.equal(hashLower, hashUpper);
    });

    test('HASH-008: Special Characters normalization is deterministic and safe', () => {
        const hash1 = generateHash('WBM/1234#567!', '1998-11-04', 'voter');
        const hash2 = generateHash('WBM1234567', '1998-11-04', 'voter');
        assert.equal(hash1, hash2);
    });

    test('HASH-009: Empty/Null/Undefined Input has controlled handling without crashing', () => {
        assert.doesNotThrow(() => {
            const hashEmpty = generateHash('', '', '');
            assert.equal(hashEmpty.length, 64);

            const hashNull = generateHash(null, null, null);
            assert.equal(hashNull.length, 64);

            const hashUndefined = generateHash(undefined, undefined, undefined);
            assert.equal(hashUndefined.length, 64);
        });
    });

    test('HASH-010: Unicode Input causes no crash or unexpected encoding failure', () => {
        assert.doesNotThrow(() => {
            const hashUnicode = generateHash('१२३४५६७८९०१२', '2000-01-15', 'aadhaar');
            assert.equal(hashUnicode.length, 64);
            assert.match(hashUnicode, /^[0-9a-f]{64}$/);
        });
    });
});
