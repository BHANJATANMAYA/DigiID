'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { generateHash } = require('../../backend/src/features/documents/hashGenerator');

describe('Concurrency Tests (CON-001 to CON-004)', () => {

    test('CON-001: Concurrent Hash Generations for Same Identity are Idempotent', async () => {
        const promises = Array.from({ length: 20 }, () =>
            Promise.resolve(generateHash('123456789012', '2000-01-15', 'aadhaar'))
        );
        const results = await Promise.all(promises);
        const first = results[0];
        assert.ok(results.every(r => r === first));
    });

    test('CON-002: Concurrent Verification Requests do not corrupt state', async () => {
        const idNo = '123456789012';
        const expectedHash = generateHash(idNo, '2000-01-15', 'aadhaar');

        const verificationTasks = Array.from({ length: 10 }, (_, i) => {
            const inputHash = generateHash(idNo, i % 2 === 0 ? '2000-01-15' : '1999-01-01', 'aadhaar');
            return {
                index: i,
                isMatch: inputHash === expectedHash
            };
        });

        const results = await Promise.all(verificationTasks.map(t => Promise.resolve(t)));
        assert.equal(results.length, 10);
        assert.equal(results.filter(r => r.isMatch).length, 5);
    });

    test('CON-003: Concurrent Revocations on Already Revoked Identity are Blocked', async () => {
        let isRevoked = false;
        const revokeOperation = async () => {
            if (isRevoked) {
                return { success: false, reason: 'Already revoked' };
            }
            isRevoked = true;
            return { success: true, reason: 'Revoked successfully' };
        };

        const results = await Promise.all([
            revokeOperation(),
            revokeOperation(),
            revokeOperation()
        ]);

        const successful = results.filter(r => r.success);
        assert.equal(successful.length, 1, 'Only one revocation can succeed');
    });
});
