const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
require('dotenv').config();

// 1. Setup Provider (Local Hardhat Node)
const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
const provider = new ethers.JsonRpcProvider(rpcUrl);

// 2. Setup Wallet (Signer)
const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
if (!privateKey) {
    console.warn('⚠️ BLOCKCHAIN_PRIVATE_KEY is not defined in .env. Blockchain interactions may fail.');
}
const wallet = privateKey ? new ethers.Wallet(privateKey, provider) : null;

// 3. Load Contract ABI and Address
const artifactsPath = path.join(__dirname, '..', '..', '..', '..', 'blockchain', 'artifacts', 'contracts', 'IdentityLedger.sol', 'IdentityLedger.json');
const addressPath = path.join(__dirname, '..', '..', '..', '..', 'blockchain', 'deployedAddress.json');

let contract = null;

try {
    if (fs.existsSync(artifactsPath) && fs.existsSync(addressPath)) {
        const { abi } = JSON.parse(fs.readFileSync(artifactsPath, 'utf8'));
        const { address } = JSON.parse(fs.readFileSync(addressPath, 'utf8'));

        if (wallet) {
            contract = new ethers.Contract(address, abi, wallet);
            console.log(`🔗 Connected to Blockchain Contract at: ${address}`);
        } else {
            console.warn('⚠️ Wallet not configured. Read-only blockchain connection.');
            contract = new ethers.Contract(address, abi, provider);
        }
    } else {
        console.warn('⚠️ Blockchain artifacts or deployedAddress.json not found. Did you deploy the contract?');
    }
} catch (error) {
    console.error('❌ Failed to initialize blockchain contract:', error.message);
}

/**
 * Format a 64-character hex string from PostgreSQL to bytes32 format
 * Needed because ethers requires `0x` prefix for bytes32 hex
 * @param {string} hexHash 
 * @returns {string} properly padded 0x prefixed hex string equivalent to bytes32
 */
function formatBytes32(hexHash) {
    // Ensure it has 0x prefix
    const prefixed = hexHash.startsWith('0x') ? hexHash : `0x${hexHash}`;
    return ethers.zeroPadValue(prefixed, 32);
}

/**
 * Anchor a hash on the blockchain.
 * @param {string} dbHash The 64 character hex hash from DB
 * @param {string} docType The document type (aadhaar, pan, voter)
 * @param {string} identityRef The last 4 characters of the ID
 * @returns {boolean} True if successfully anchored
 */
async function anchorHashOnChain(dbHash, docType, identityRef) {
    if (!contract || !wallet) return { success: false, blockNumber: null };

    try {
        const bytes32Hash = formatBytes32(dbHash);

        // Check if already anchored to avoid tx reverting
        const isAnchored = await contract.isHashAnchored(bytes32Hash);
        if (isAnchored) {
            console.log(`Blockchain: Hash already anchored (${bytes32Hash})`);
            return { success: true, blockNumber: null };
        }

        const tx = await contract.anchorDocument(bytes32Hash, docType, identityRef);
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
 * @param {string} dbHash The 64 character hex hash from DB
 * @returns {Object} On-chain verification details
 */
async function verifyHashOnChain(dbHash) {
    if (!contract) return { exists: false, error: 'Blockchain not connected' };

    try {
        const bytes32Hash = formatBytes32(dbHash);
        const result = await contract.verifyDocument(bytes32Hash);

        return {
            exists: result[0],
            isRevoked: result[1],
            docType: result[2],
            identityRef: result[3],
            anchoredAt: result[0] ? new Date(Number(result[4]) * 1000).toISOString() : null,
            revokedAt: result[1] ? new Date(Number(result[5]) * 1000).toISOString() : null
        };
    } catch (error) {
        console.error(`❌ Blockchain Verify Error:`, error.message);
        return { exists: false, error: 'Verification failed' };
    }
}

/**
 * Revoke a hash on the blockchain.
 * @param {string} dbHash The 64 character hex hash from DB
 * @returns {boolean} True if successfully revoked
 */
async function revokeHashOnChain(dbHash) {
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
