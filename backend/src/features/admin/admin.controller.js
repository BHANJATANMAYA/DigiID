'use strict';

const pool = require('../../core/config/database');
const {
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
} = require('./admin.service');
const {
    createAdminToken,
    recordLoginFailure,
    recordLoginSuccess
} = require('../../core/middleware/admin.middleware');
const { verifyHashOnChain } = require('../../core/config/blockchain');

// ── Auth Handlers ─────────────────────────────────────────────

async function login(req, res) {
    const { email, password } = req.body || {};
    const key = req._rateLimitKey;

    if (!email || typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({ success: false, error: 'Email is required' });
    }

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
        return res.status(400).json({ success: false, error: 'Invalid email address format' });
    }

    if (!password || typeof password !== 'string' || !password.trim()) {
        return res.status(400).json({ success: false, error: 'Password is required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    const isValid = verifyAdminPassword(cleanEmail, password);
    if (!isValid) {
        recordLoginFailure(key);
        await recordAuditLog({
            adminEmail: cleanEmail,
            action: 'ADMIN_LOGIN_FAILED',
            targetResource: 'admin_portal',
            outcome: 'FAILURE',
            reason: 'Invalid credentials'
        });
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    recordLoginSuccess(key);

    const token = createAdminToken({ email: cleanEmail, role: 'SUPER_ADMIN' });

    await recordAuditLog({
        adminEmail: cleanEmail,
        action: 'ADMIN_LOGIN',
        targetResource: 'admin_portal',
        outcome: 'SUCCESS'
    });

    return res.status(200).json({
        success: true,
        message: 'Admin authentication successful',
        token,
        admin: { email: cleanEmail, role: 'SUPER_ADMIN' }
    });
}

async function logout(req, res) {
    const adminEmail = req.admin?.email || 'unknown';
    await recordAuditLog({
        adminEmail,
        action: 'ADMIN_LOGOUT',
        targetResource: 'admin_portal',
        outcome: 'SUCCESS'
    });

    return res.status(200).json({ success: true, message: 'Logged out successfully' });
}

async function getMe(req, res) {
    return res.status(200).json({
        success: true,
        admin: req.admin
    });
}

// ── Dashboard Metrics ─────────────────────────────────────────

async function getDashboard(req, res, next) {
    try {
        let stats = {
            total: 0,
            active: 0,
            revoked: 0,
            aadhaar: 0,
            pan: 0,
            voter: 0,
            last_anchored: null
        };

        try {
            const dbRes = await pool.query(`
                SELECT
                    COUNT(*)::int AS total,
                    COUNT(*) FILTER (WHERE status = 'ACTIVE' OR status IS NULL)::int AS active,
                    COUNT(*) FILTER (WHERE status = 'REVOKED')::int AS revoked,
                    COUNT(*) FILTER (WHERE doc_type = 'aadhaar')::int AS aadhaar,
                    COUNT(*) FILTER (WHERE doc_type = 'pan')::int AS pan,
                    COUNT(*) FILTER (WHERE doc_type = 'voter')::int AS voter,
                    MAX(anchored_at) AS last_anchored
                FROM gov_documents;
            `);
            if (dbRes.rows[0]) stats = dbRes.rows[0];
        } catch {}

        // Recent registrations
        let recentRegistrations = [];
        try {
            const recRes = await pool.query(`
                SELECT id, doc_type, name, identity_no, authority, cert_id, status, anchored_at
                FROM gov_documents
                ORDER BY anchored_at DESC
                LIMIT 5;
            `);
            recentRegistrations = recRes.rows.map(r => ({
                ...r,
                identity_no: maskPII(r.identity_no)
            }));
        } catch {}

        // System health
        const health = await checkSystemHealth();

        // Blockchain status
        let blockchainStats = { totalAnchored: stats.total, totalActive: stats.active, failedTxCount: 0 };
        try {
            const fs = require('fs');
            const path = require('path');
            const addrPath = path.join(__dirname, '..', '..', '..', '..', 'blockchain', 'deployedAddress.json');
            if (fs.existsSync(addrPath)) {
                blockchainStats.contractAddress = JSON.parse(fs.readFileSync(addrPath, 'utf8')).address;
            }
        } catch {}

        return res.status(200).json({
            success: true,
            data: {
                metrics: stats,
                recentRegistrations,
                blockchain: blockchainStats,
                health
            }
        });
    } catch (err) {
        next(err);
    }
}

// ── Document Management ───────────────────────────────────────

async function getDocuments(req, res, next) {
    const {
        q,
        doc_type,
        status,
        cert_id,
        identity_no,
        page = 1,
        limit = 20
    } = req.query || {};

    try {

        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        let whereClauses = [];
        let params = [];

        if (doc_type) {
            params.push(doc_type.toLowerCase());
            whereClauses.push(`LOWER(doc_type) = $${params.length}`);
        }

        if (status) {
            params.push(status.toUpperCase());
            whereClauses.push(`(status = $${params.length} OR ($${params.length} = 'ACTIVE' AND status IS NULL))`);
        }

        if (cert_id) {
            params.push(`%${cert_id.trim()}%`);
            whereClauses.push(`cert_id ILIKE $${params.length}`);
        }

        if (identity_no) {
            const clean = identity_no.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            params.push(`%${clean}%`);
            whereClauses.push(`identity_no ILIKE $${params.length}`);
        }

        if (q) {
            params.push(`%${q.trim()}%`);
            const pIdx = params.length;
            whereClauses.push(`(name ILIKE $${pIdx} OR cert_id ILIKE $${pIdx} OR identity_no ILIKE $${pIdx} OR hash ILIKE $${pIdx})`);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const countRes = await pool.query(`SELECT COUNT(*)::int AS total FROM gov_documents ${whereSql};`, params);
        const total = countRes.rows[0]?.total || 0;

        params.push(parseInt(limit, 10), offset);
        const docsRes = await pool.query(
            `SELECT id, doc_type, name, identity_no, dob, authority, address, hash, anchored_at, block_number, cert_id, status, revocation_reason, version
             FROM gov_documents
             ${whereSql}
             ORDER BY anchored_at DESC
             LIMIT $${params.length - 1} OFFSET $${params.length};`,
            params
        );

        // Mask PII by default
        const maskedDocs = docsRes.rows.map(d => ({
            ...d,
            identity_no_masked: maskPII(d.identity_no),
            identity_no: maskPII(d.identity_no) // default masked
        }));

        await recordAuditLog({
            adminEmail: req.admin?.email || 'SYSTEM',
            action: 'DOCUMENT_SEARCHED',
            targetResource: 'gov_documents',
            outcome: 'SUCCESS',
            metadata: { query: req.query, count: total }
        });

        return res.status(200).json({
            success: true,
            total,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            data: maskedDocs
        });
    } catch (err) {
        return res.status(200).json({
            success: true,
            total: 0,
            page: parseInt(page, 10) || 1,
            limit: parseInt(limit, 10) || 20,
            data: []
        });
    }
}

async function getDocumentById(req, res, next) {
    try {
        const cleanId = String(req.params.identity_no).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const result = await pool.query(
            `SELECT id, doc_type, name, identity_no, dob, authority, address, hash, anchored_at, block_number, cert_id, status, revocation_reason, version
             FROM gov_documents WHERE identity_no = $1 ORDER BY version DESC LIMIT 1;`,
            [cleanId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Document not found' });
        }

        const doc = result.rows[0];

        await recordAuditLog({
            adminEmail: req.admin?.email || 'SYSTEM',
            action: 'DOCUMENT_VIEWED',
            targetResource: cleanId,
            outcome: 'SUCCESS'
        });

        return res.status(200).json({
            success: true,
            data: {
                ...doc,
                identity_no: maskPII(doc.identity_no)
            }
        });
    } catch (err) {
        next(err);
    }
}

async function revealPII(req, res, next) {
    try {
        const cleanId = String(req.params.identity_no).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const result = await pool.query(
            `SELECT id, identity_no, name, cert_id FROM gov_documents WHERE identity_no = $1 LIMIT 1;`,
            [cleanId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Document not found' });
        }

        const doc = result.rows[0];

        // Audit PII reveal action
        await recordAuditLog({
            adminEmail: req.admin?.email || 'SYSTEM',
            action: 'PII_REVEALED',
            targetResource: doc.cert_id || cleanId,
            outcome: 'SUCCESS',
            reason: req.body?.reason || 'Admin identity verification inquiry'
        });

        return res.status(200).json({
            success: true,
            identity_no: doc.identity_no,
            name: doc.name
        });
    } catch (err) {
        next(err);
    }
}

async function verifyDocumentHandler(req, res, next) {
    try {
        const cleanId = String(req.params.identity_no).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const result = await pool.query(
            `SELECT * FROM gov_documents WHERE identity_no = $1 ORDER BY version DESC LIMIT 1;`,
            [cleanId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Document not found' });
        }

        const doc = result.rows[0];
        const onChain = await verifyHashOnChain(doc.hash);

        await recordAuditLog({
            adminEmail: req.admin?.email || 'SYSTEM',
            action: 'DOCUMENT_VERIFIED',
            targetResource: cleanId,
            outcome: onChain.exists ? 'SUCCESS' : 'ONCHAIN_NOT_FOUND',
            metadata: { onChain }
        });

        return res.status(200).json({
            success: true,
            databaseStatus: doc.status || 'ACTIVE',
            blockchainStatus: onChain
        });
    } catch (err) {
        next(err);
    }
}

async function revokeDocumentHandler(req, res, next) {
    try {
        const { reason } = req.body || {};
        if (!reason || typeof reason !== 'string' || !reason.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Mandatory revocation reason is required'
            });
        }

        const result = await revokeDocument({
            identityNo: req.params.identity_no,
            reason,
            adminEmail: req.admin?.email || 'SYSTEM'
        });

        return res.status(200).json({
            success: true,
            message: 'Document successfully revoked',
            data: result.document,
            blockchainRevoked: result.onChainSuccess
        });
    } catch (err) {
        if (err.message.includes('already revoked')) {
            return res.status(409).json({ success: false, error: err.message });
        }
        if (err.message.includes('not found')) {
            return res.status(404).json({ success: false, error: err.message });
        }
        next(err);
    }
}

async function correctDocumentHandler(req, res, next) {
    try {
        const { reason, updates } = req.body || {};
        if (!reason || typeof reason !== 'string' || !reason.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Mandatory correction reason is required'
            });
        }

        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Updates object is required'
            });
        }

        const corrected = await correctDocument({
            identityNo: req.params.identity_no,
            updates,
            reason,
            adminEmail: req.admin?.email || 'SYSTEM'
        });

        return res.status(200).json({
            success: true,
            message: 'Document corrected and new version anchored on blockchain',
            data: corrected
        });
    } catch (err) {
        if (err.message.includes('not found')) {
            return res.status(404).json({ success: false, error: err.message });
        }
        next(err);
    }
}

// ── Blockchain Monitoring ─────────────────────────────────────

async function getBlockchainInfo(req, res, next) {
    try {
        const fs = require('fs');
        const path = require('path');
        const addressPath = path.join(__dirname, '..', '..', '..', '..', 'blockchain', 'deployedAddress.json');

        let contractAddress = 'Not Deployed';
        if (fs.existsSync(addressPath)) {
            try {
                contractAddress = JSON.parse(fs.readFileSync(addressPath, 'utf8')).address;
            } catch {}
        }

        const health = await checkSystemHealth();

        return res.status(200).json({
            success: true,
            data: {
                contractAddress,
                network: process.env.BLOCKCHAIN_NETWORK || 'Hardhat Localhost (Chain ID: 31337)',
                rpcUrl: process.env.BLOCKCHAIN_RPC_URL ? 'Configured' : 'Default (127.0.0.1:8545)',
                rpcHealth: health.blockchain,
                walletConfigured: !!process.env.BLOCKCHAIN_PRIVATE_KEY
            }
        });
    } catch (err) {
        next(err);
    }
}

// ── Audit Logs ────────────────────────────────────────────────

async function getAuditLogsHandler(req, res, next) {
    try {
        const { limit = 50, offset = 0, action } = req.query;
        const result = await getAuditLogs({
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
            action
        });

        return res.status(200).json({
            success: true,
            total: result.total,
            data: result.logs
        });
    } catch (err) {
        next(err);
    }
}

// ── Export ────────────────────────────────────────────────────

async function exportDocumentsHandler(req, res, next) {
    try {
        const { format = 'csv' } = req.query;
        const result = await pool.query(
            `SELECT cert_id, doc_type, name, identity_no, dob, authority, status, hash, anchored_at
             FROM gov_documents ORDER BY anchored_at DESC LIMIT 1000;`
        );

        await recordAuditLog({
            adminEmail: req.admin?.email || 'SYSTEM',
            action: 'DOCUMENT_EXPORTED',
            targetResource: 'gov_documents',
            outcome: 'SUCCESS',
            metadata: { format, rowCount: result.rows.length }
        });

        if (format === 'csv') {
            const csv = generateCSV(result.rows);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="DigiID-Export-${Date.now()}.csv"`);
            return res.status(200).send(csv);
        }

        return res.status(400).json({ success: false, error: 'Unsupported format. Use format=csv' });
    } catch (err) {
        next(err);
    }
}

// ── Settings ──────────────────────────────────────────────────

async function getSettingsHandler(req, res, next) {
    try {
        const settings = await getSystemSettings();
        return res.status(200).json({ success: true, data: settings });
    } catch (err) {
        next(err);
    }
}

async function updateSettingsHandler(req, res, next) {
    try {
        const updates = req.body;
        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({ success: false, error: 'Invalid settings payload' });
        }

        const settings = await updateSystemSettings(updates, req.admin?.email || 'SYSTEM');
        return res.status(200).json({ success: true, message: 'Settings updated successfully', data: settings });
    } catch (err) {
        next(err);
    }
}

// ── Alerts ────────────────────────────────────────────────────

async function getAlertsHandler(req, res) {
    const health = await checkSystemHealth();
    const alerts = [];

    if (health.database.status !== 'HEALTHY') {
        alerts.push({
            id: 'alert-db',
            level: 'CRITICAL',
            title: 'Database Connectivity Degradation',
            message: 'Unable to connect to primary PostgreSQL database.',
            timestamp: new Date().toISOString()
        });
    }

    if (health.blockchain.status !== 'HEALTHY') {
        alerts.push({
            id: 'alert-rpc',
            level: 'WARNING',
            title: 'Blockchain RPC Node Status',
            message: `Ethereum RPC status is ${health.blockchain.status}.`,
            timestamp: new Date().toISOString()
        });
    }

    alerts.push({
        id: 'alert-sys',
        level: 'INFO',
        title: 'System Operational',
        message: 'Portal verification engine and audit ledger running normally.',
        timestamp: new Date().toISOString()
    });

    return res.status(200).json({ success: true, data: alerts });
}

module.exports = {
    login,
    logout,
    getMe,
    getDashboard,
    getDocuments,
    getDocumentById,
    revealPII,
    verifyDocumentHandler,
    revokeDocumentHandler,
    correctDocumentHandler,
    getBlockchainInfo,
    getAuditLogsHandler,
    exportDocumentsHandler,
    getSettingsHandler,
    updateSettingsHandler,
    getAlertsHandler
};
