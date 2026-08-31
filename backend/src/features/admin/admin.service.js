'use strict';

const crypto = require('crypto');
const pool = require('../../core/config/database');
const { generateHash } = require('../documents/hashGenerator');
const { anchorHashOnChain, revokeHashOnChain, verifyHashOnChain } = require('../../core/config/blockchain');

// ── Super Admin Credentials Setup ─────────────────────────────
const DEFAULT_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@digiid.gov.in').toLowerCase().trim();
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SuperAdmin@DigiID2026';

let _adminAccount = null;

function hashPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function initAdminAccount() {
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(DEFAULT_ADMIN_PASSWORD, salt);
    _adminAccount = {
        email: DEFAULT_ADMIN_EMAIL,
        passwordHash,
        salt,
        role: 'SUPER_ADMIN',
        createdAt: new Date().toISOString(),
        lastLogin: null
    };
}

initAdminAccount();

function verifyAdminPassword(email, password) {
    if (!email || !password || !_adminAccount) return false;
    if (email.toLowerCase().trim() !== _adminAccount.email) return false;

    const hash = hashPassword(password, _adminAccount.salt);
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(_adminAccount.passwordHash));
}

// ── Audit Logs Store (Append-Only) ─────────────────────────────
const _inMemoryAuditLogs = [];
let _auditLogIdCounter = 1;

/**
 * Record an audit log event.
 * Strips secrets, passwords, private keys from metadata.
 */
async function recordAuditLog({ adminEmail, action, targetResource, outcome, reason, txHash, metadata }) {
    const cleanMeta = metadata ? { ...metadata } : {};
    delete cleanMeta.password;
    delete cleanMeta.token;
    delete cleanMeta.privateKey;
    delete cleanMeta.secret;

    const entry = {
        id: _auditLogIdCounter++,
        admin_email: adminEmail || 'SYSTEM',
        action: action || 'UNKNOWN_ACTION',
        target_resource: targetResource || null,
        outcome: outcome || 'SUCCESS',
        reason: reason || null,
        tx_hash: txHash || null,
        metadata: cleanMeta,
        created_at: new Date().toISOString()
    };

    _inMemoryAuditLogs.unshift(entry);

    // Persist to PostgreSQL if connected
    try {
        await pool.query(
            `INSERT INTO admin_audit_logs (admin_email, action, target_resource, outcome, reason, tx_hash, metadata, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
            [entry.admin_email, entry.action, entry.target_resource, entry.outcome, entry.reason, entry.tx_hash, JSON.stringify(cleanMeta), entry.created_at]
        );
    } catch {
        // Fallback to in-memory if DB is offline
    }

    return entry;
}

async function getAuditLogs({ limit = 50, offset = 0, action = null }) {
    try {
        let query = `SELECT * FROM admin_audit_logs`;
        const params = [];
        if (action) {
            query += ` WHERE action = $1`;
            params.push(action);
        }
        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;
        params.push(limit, offset);

        const res = await pool.query(query, params);
        return { logs: res.rows, total: res.rows.length };
    } catch {
        let filtered = _inMemoryAuditLogs;
        if (action) {
            filtered = filtered.filter(l => l.action.toLowerCase() === action.toLowerCase());
        }
        return {
            logs: filtered.slice(offset, offset + limit),
            total: filtered.length
        };
    }
}

// ── PII Masking & Protection ──────────────────────────────────
function maskPII(identityNo, docType = '') {
    if (!identityNo) return '';
    const clean = String(identityNo).replace(/\s/g, '');
    const len = clean.length;
    if (len <= 4) return clean;

    const last4 = clean.slice(-4);
    const maskedPart = 'X'.repeat(len - 4);
    // Group in chunks of 4 for standard presentation
    return (maskedPart + last4).replace(/(.{4})(?=.)/g, '$1 ');
}

// ── System Settings ───────────────────────────────────────────
const _inMemorySettings = {
    maintenance_mode: false,
    allow_public_verification: true,
    supported_doc_types: ['aadhaar', 'pan', 'voter'],
    auto_anchor_blockchain: true,
    require_revocation_reason: true,
    pii_masking_enabled: true,
    log_retention_days: 90
};

async function getSystemSettings() {
    try {
        const res = await pool.query(`SELECT key, value FROM admin_settings;`);
        if (res.rows.length > 0) {
            const dbSettings = {};
            for (const row of res.rows) {
                dbSettings[row.key] = row.value;
            }
            return { ..._inMemorySettings, ...dbSettings };
        }
    } catch {}
    return { ..._inMemorySettings };
}

async function updateSystemSettings(updates, adminEmail) {
    // Whitelist allowed settings to prevent secret injection
    const allowedKeys = Object.keys(_inMemorySettings);
    const safeUpdates = {};

    for (const [key, value] of Object.entries(updates)) {
        if (allowedKeys.includes(key)) {
            safeUpdates[key] = value;
            _inMemorySettings[key] = value;

            try {
                await pool.query(
                    `INSERT INTO admin_settings (key, value, updated_by, updated_at)
                     VALUES ($1, $2, $3, NOW())
                     ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW();`,
                    [key, JSON.stringify(value), adminEmail]
                );
            } catch {}
        }
    }

    await recordAuditLog({
        adminEmail,
        action: 'SETTINGS_CHANGED',
        targetResource: 'admin_settings',
        outcome: 'SUCCESS',
        metadata: safeUpdates
    });

    return { ..._inMemorySettings };
}

// ── System Health Monitoring ──────────────────────────────────
async function checkSystemHealth() {
    // 1. Database health
    let dbStatus = 'HEALTHY';
    let dbLatencyMs = 0;
    try {
        const start = Date.now();
        await pool.query('SELECT 1;');
        dbLatencyMs = Date.now() - start;
    } catch (err) {
        dbStatus = 'OFFLINE';
    }

    // 2. Blockchain / RPC health
    let rpcStatus = 'HEALTHY';
    let rpcBlockNumber = null;
    try {
        const { contract } = require('../../core/config/blockchain').getConnection?.() || {};
        if (contract) {
            const runner = contract.runner;
            if (runner && runner.provider) {
                rpcBlockNumber = await runner.provider.getBlockNumber();
            } else {
                rpcStatus = 'DISCONNECTED';
            }
        } else {
            rpcStatus = 'NOT_CONFIGURED';
        }
    } catch {
        rpcStatus = 'UNREACHABLE';
    }

    return {
        api: { status: 'HEALTHY', uptime: process.uptime() },
        database: { status: dbStatus, latencyMs: dbLatencyMs },
        blockchain: { status: rpcStatus, latestBlock: rpcBlockNumber },
        timestamp: new Date().toISOString()
    };
}

// ── Document Correction with History Lifecycle ────────────────
async function correctDocument({ identityNo, updates, reason, adminEmail }) {
    if (!reason || !reason.trim()) {
        throw new Error('Mandatory correction reason is required');
    }

    const cleanId = String(identityNo).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    // 1. Fetch current active document
    const res = await pool.query(
        `SELECT * FROM gov_documents WHERE identity_no = $1 AND status = 'ACTIVE' ORDER BY version DESC LIMIT 1;`,
        [cleanId]
    );

    if (res.rows.length === 0) {
        throw new Error('Active document not found with this identity number');
    }

    const current = res.rows[0];
    const oldHash = current.hash;

    // 2. Compute new values
    const newName = updates.name?.trim() || current.name;
    const newDob = updates.dob || current.dob;
    const newAuthority = updates.authority?.trim() || current.authority;
    const newAddress = updates.address !== undefined ? (updates.address?.trim() || null) : current.address;
    const newDocType = updates.doc_type || current.doc_type;

    const newHash = generateHash(cleanId, newDob, newDocType);

    // 3. Blockchain Lifecycle: Revoke old hash on-chain
    await revokeHashOnChain(oldHash);

    // 4. Anchor new hash on-chain
    const anchorRes = await anchorHashOnChain(newHash, newDocType);

    // 5. Update existing record to CORRECTED
    await pool.query(
        `UPDATE gov_documents SET status = 'CORRECTED', revocation_reason = $1, revoked_at = NOW() WHERE id = $2;`,
        [`Corrected to version ${(current.version || 1) + 1}: ${reason}`, current.id]
    );

    // 6. Insert new version record
    const newVersion = (current.version || 1) + 1;
    const newCertId = `CERT-${new Date().getFullYear()}-${newDocType.slice(0, 2).toUpperCase()}${cleanId.slice(-4)}-V${newVersion}`;

    const insertRes = await pool.query(
        `INSERT INTO gov_documents (doc_type, name, identity_no, dob, authority, address, hash, block_number, cert_id, status, version, previous_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE', $10, $11)
         RETURNING *;`,
        [newDocType, newName, cleanId, newDob, newAuthority, newAddress, newHash, anchorRes.blockNumber, newCertId, newVersion, oldHash]
    );

    // 7. Audit log
    await recordAuditLog({
        adminEmail,
        action: 'DOCUMENT_CORRECTED',
        targetResource: cleanId,
        outcome: 'SUCCESS',
        reason,
        txHash: anchorRes.blockNumber ? `block-${anchorRes.blockNumber}` : null,
        metadata: { oldHash, newHash, version: newVersion }
    });

    return insertRes.rows[0];
}

// ── Document Revocation Lifecycle ─────────────────────────────
async function revokeDocument({ identityNo, reason, adminEmail }) {
    if (!reason || !reason.trim()) {
        throw new Error('Mandatory revocation reason is required');
    }

    const cleanId = String(identityNo).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    const res = await pool.query(
        `SELECT * FROM gov_documents WHERE identity_no = $1 ORDER BY version DESC LIMIT 1;`,
        [cleanId]
    );

    if (res.rows.length === 0) {
        throw new Error('Document not found with this identity number');
    }

    const doc = res.rows[0];
    if (doc.status === 'REVOKED') {
        throw new Error('Document is already revoked');
    }

    // 1. Revoke on chain
    const onChainSuccess = await revokeHashOnChain(doc.hash);

    // 2. Mark revoked in DB
    const updateRes = await pool.query(
        `UPDATE gov_documents
         SET status = 'REVOKED', revocation_reason = $1, revoked_at = NOW()
         WHERE id = $2
         RETURNING *;`,
        [reason.trim(), doc.id]
    );

    // 3. Audit log
    await recordAuditLog({
        adminEmail,
        action: 'DOCUMENT_REVOKED',
        targetResource: cleanId,
        outcome: onChainSuccess ? 'SUCCESS' : 'BLOCKCHAIN_FAILED',
        reason: reason.trim(),
        metadata: { cert_id: doc.cert_id, onChainSuccess }
    });

    return { document: updateRes.rows[0], onChainSuccess };
}

// ── CSV Export with Formula Injection Protection ──────────────
function escapeCSV(val) {
    if (val == null) return '""';
    let str = String(val);
    // Prevent CSV formula injection: prepend single quote if starts with =, +, -, @
    if (/^[=+\-@]/.test(str)) {
        str = "'" + str;
    }
    return `"${str.replace(/"/g, '""')}"`;
}

function generateCSV(documents) {
    const headers = ['Certificate ID', 'Document Type', 'Full Name', 'Identity Number (Masked)', 'Date of Birth', 'Issuing Authority', 'Status', 'Blockchain Hash', 'Anchored Date'];
    const rows = documents.map(d => [
        escapeCSV(d.cert_id),
        escapeCSV(d.doc_type),
        escapeCSV(d.name),
        escapeCSV(maskPII(d.identity_no)),
        escapeCSV(d.dob),
        escapeCSV(d.authority),
        escapeCSV(d.status || 'ACTIVE'),
        escapeCSV(d.hash),
        escapeCSV(d.anchored_at)
    ].join(','));

    return [headers.join(','), ...rows].join('\r\n');
}

module.exports = {
    verifyAdminPassword,
    recordAuditLog,
    getAuditLogs,
    maskPII,
    getSystemSettings,
    updateSystemSettings,
    checkSystemHealth,
    correctDocument,
    revokeDocument,
    generateCSV,
    DEFAULT_ADMIN_EMAIL
};
