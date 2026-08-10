const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
require('dotenv').config();

// ── Config ────────────────────────────────────────────────────────────────────

const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';

// Map string doc types to the Solidity enum indices
const DOC_TYPE_ENUM = { aadhaar: 0, pan: 1, voter: 2 };

// Paths to contract artifacts
const artifactsPath = path.join(__dirname, '..', '..', '..', '..', 'blockchain', 'artifacts', 'contracts', 'IdentityLedger.sol', 'IdentityLedger.json');
const addressPath = path.join(__dirname, '..', '..', '..', '..', 'blockchain', 'deployedAddress.json');

// ── Lazy Initialisation ───────────────────────────────────────────────────────

let _provider = null;
let _wallet = null;
let _contract = null;

/**
 * Lazily initialise (or re-initialise) the blockchain connection.
 * Returns { contract, wallet } or throws if configuration is missing.
 */
function getConnection() {
    // Re-create provider on every call so a Hardhat restart is handled
    _provider = new ethers.JsonRpcProvider(rpcUrl);

    // Read private key from BLOCKCHAIN_PRIVATE_KEY
    const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
    if (!privateKey) {
        console.warn('⚠️ BLOCKCHAIN_PRIVATE_KEY is not set. Blockchain writes will fail.');
        _wallet = null;
    } else {
        const stripped = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
        if (stripped.length !== 64) {
            console.warn('⚠️ BLOCKCHAIN_PRIVATE_KEY is invalid (expected 64 hex chars). Blockchain writes will fail.');
            _wallet = null;
        } else {
            _wallet = new ethers.Wallet(stripped, _provider);
        }
    }

    if (!fs.existsSync(artifactsPath) || !fs.existsSync(addressPath)) {
        console.warn('⚠️ Blockchain artifacts or deployedAddress.json not found. Did you deploy the contract?');
        _contract = null;
        return { contract: null, wallet: null };
    }

    const { abi } = JSON.parse(fs.readFileSync(artifactsPath, 'utf8'));
    const { address } = JSON.parse(fs.readFileSync(addressPath, 'utf8'));

    const signer = _wallet || _provider;  // read-only if no wallet
    _contract = new ethers.Contract(address, abi, signer);
    console.log(`🔗 Connected to Blockchain Contract at: ${address}`);

    return { contract: _contract, wallet: _wallet };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Strict bytes32 formatting.
 * SHA-256 must be exactly 64 hex chars. Throws on invalid input
 * instead of silently zero-padding.
 */
function formatBytes32(hexHash) {
    const stripped = hexHash.startsWith('0x') ? hexHash.slice(2) : hexHash;
    if (stripped.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(stripped)) {
        throw new Error(`Invalid SHA-256 hash: expected 64 hex chars, got "${hexHash}"`);
    }
    return `0x${stripped}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Anchor a hash on the blockchain.
 * @param {string} dbHash  64-char hex SHA-256 hash from DB
 * @param {string} docType 'aadhaar' | 'pan' | 'voter'
 * @returns {{ success: boolean, blockNumber: string|null }}
 */
async function anchorHashOnChain(dbHash, docType) {
    const { contract, wallet } = getConnection();
    if (!contract || !wallet) return { success: false, blockNumber: null };

    try {
        const bytes32Hash = formatBytes32(dbHash);
        const enumValue = DOC_TYPE_ENUM[docType];
        if (enumValue === undefined) {
            throw new Error(`Unknown doc_type "${docType}". Expected: aadhaar, pan, voter`);
        }

        // Check if already anchored to avoid tx reverting
        const isAnchored = await contract.isHashAnchored(bytes32Hash);
        if (isAnchored) {
            console.log(`Blockchain: Hash already anchored (${bytes32Hash})`);
            return { success: true, blockNumber: null };
        }

        const tx = await contract.anchorDocument(bytes32Hash, enumValue);
        const receipt = await tx.wait();
        const blockNumber = receipt?.blockNumber != null ? String(receipt.blockNumber) : null;
        console.log(`✅ Blockchain: Document Anchored on-chain. Tx: ${tx.hash} · Block: ${blockNumber}`);
        return { success: true, blockNumber };
    } catch (error) {
        console.error(`❌ Blockchain Anchor Error:`, error.message);
        return { success: false, blockNumber: null };
    }
}

/**
 * Verify a hash on the blockchain.
 * @param {string} dbHash  64-char hex SHA-256 hash from DB
 * @returns {Object} On-chain verification details
 */
async function verifyHashOnChain(dbHash) {
    const { contract } = getConnection();
    if (!contract) return { exists: false, error: 'Blockchain not connected' };

    try {
        const bytes32Hash = formatBytes32(dbHash);
        const result = await contract.verifyDocument(bytes32Hash);

        // Enum names for display
        const DOC_TYPE_NAMES = ['aadhaar', 'pan', 'voter'];

        return {
            exists: result[0],
            isRevoked: result[1],
            docType: result[0] ? DOC_TYPE_NAMES[Number(result[2])] : null,
            anchoredAt: result[0] ? new Date(Number(result[3]) * 1000).toISOString() : null,
            revokedAt: result[1] ? new Date(Number(result[4]) * 1000).toISOString() : null
        };
    } catch (error) {
        console.error(`❌ Blockchain Verify Error:`, error.message);
        return { exists: false, error: 'Verification failed' };
    }
}

/**
 * Revoke a hash on the blockchain.
 * @param {string} dbHash  64-char hex SHA-256 hash from DB
 * @returns {boolean} True if successfully revoked
 */
async function revokeHashOnChain(dbHash) {
    const { contract, wallet } = getConnection();
    if (!contract || !wallet) return false;

    try {
        const bytes32Hash = formatBytes32(dbHash);

        const isAnchored = await contract.isHashAnchored(bytes32Hash);
        if (!isAnchored) return false; // Not on chain

        const isValid = await contract.isHashValid(bytes32Hash);
        if (!isValid) return true; // Already revoked

        const tx = await contract.revokeDocument(bytes32Hash);
        await tx.wait();
        console.log(`✅ Blockchain: Document Revoked on-chain. Tx: ${tx.hash}`);
        return true;
    } catch (error) {
        console.error(`❌ Blockchain Revoke Error:`, error.message);
        return false;
    }
}

module.exports = {
    anchorHashOnChain,
    verifyHashOnChain,
    revokeHashOnChain
};
