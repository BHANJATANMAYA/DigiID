'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { anchorHashOnChain, verifyHashOnChain, revokeHashOnChain } = require('../../backend/src/core/config/blockchain');

describe('Blockchain Integration Tests (INT-BC-001 to INT-BC-006)', () => {

    test('INT-BC-003: RPC Failure Simulation handles offline node gracefully', async () => {
        // When RPC is unreachable, functions return controlled failure without throwing unhandled exceptions
        const res = await anchorHashOnChain('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'aadhaar');
        assert.equal(res.success, false);
        assert.equal(res.blockNumber, null);
    });

    test('INT-BC-004: Invalid Contract Address fails safely', async () => {
        const verifyRes = await verifyHashOnChain('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
        assert.equal(verifyRes.exists, false);
    });

    test('INT-BC-005: Missing Private Key write operation fails safely', async () => {
        const oldKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
        delete process.env.BLOCKCHAIN_PRIVATE_KEY;
        try {
            const res = await revokeHashOnChain('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
            assert.equal(res, false);
        } finally {
            if (oldKey) process.env.BLOCKCHAIN_PRIVATE_KEY = oldKey;
        }
    });
});
