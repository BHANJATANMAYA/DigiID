'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { getBlockchainInfo } = require('../../backend/src/features/admin/admin.controller');

describe('Admin Blockchain Administration Tests (ADMIN-BC-001 to ADMIN-BC-010)', () => {

    test('ADMIN-BC-001 to ADMIN-BC-006: Blockchain Status Payload Content', async () => {
        let statusCode = 0;
        let responseJson = null;
        const req = { admin: { email: 'admin@digiid.gov.in' } };
        const res = {
            status(c) { statusCode = c; return this; },
            json(d) { responseJson = d; return this; }
        };

        await getBlockchainInfo(req, res, () => {});
        assert.equal(statusCode, 200);
        assert.equal(responseJson.success, true);
        assert.ok('contractAddress' in responseJson.data);
        assert.ok('network' in responseJson.data);
        assert.ok('rpcHealth' in responseJson.data);
    });

    test('ADMIN-BC-010: Browser / Response Contains No Private Key', async () => {
        let responseJson = null;
        const req = { admin: { email: 'admin@digiid.gov.in' } };
        const res = {
            status() { return this; },
            json(d) { responseJson = d; }
        };

        await getBlockchainInfo(req, res, () => {});
        const serialized = JSON.stringify(responseJson);
        assert.ok(!serialized.includes('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'));
        assert.ok(!serialized.includes('BLOCKCHAIN_PRIVATE_KEY'));
    });
});
