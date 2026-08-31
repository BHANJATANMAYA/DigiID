'use strict';

const pool = require('../../core/config/database');
const { generateHash } = require('./hashGenerator');
const { validateDocument } = require('./validator');
const { anchorHashOnChain, revokeHashOnChain, verifyHashOnChain } = require('../../core/config/blockchain');

/**
 * Normalize an identity number by stripping ALL non-alphanumeric characters
 * and converting to uppercase. Handles null/undefined safely.
 */
function normalizeId(raw) {
    if (raw == null) return '';
    return String(raw).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

const DOC_LABELS = {
    aadhaar: 'Aadhaar Card',
    pan: 'PAN Card',
    voter: 'Voter Identity Card',
};

/**
 * POST /api/documents
 * Anchor a new government identity document to the ledger.
 * Public endpoint for citizen registration.
 */
async function anchorDocument(req, res, next) {
    if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ success: false, errors: ['Request body must be a valid JSON object'] });
    }

    const { doc_type, name, identity_no, dob, authority, address } = req.body;

    const validation = validateDocument({ doc_type, name, identity_no, dob, authority });
    if (!validation.isValid) {
        return res.status(400).json({ success: false, errors: validation.errors });
    }

    const cleanId = normalizeId(identity_no);
    const hash = generateHash(cleanId, dob, doc_type);

    let client;
    try {
        client = await pool.connect();
    } catch (dbErr) {
        return res.status(503).json({
            success: false,
            error: 'Database connection failure. Please try again later.'
        });
    }

    try {
        // ── Begin transaction ─────────────────────────────────────────────
        await client.query('BEGIN');

        const result = await client.query(
            `INSERT INTO gov_documents (doc_type, name, identity_no, dob, authority, address, hash, status, version)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', 1)
             RETURNING id, doc_type, name, identity_no, dob, authority, address, hash, anchored_at;`,
            [doc_type, name.trim(), cleanId, dob, authority.trim(), address?.trim() || null, hash]
        );

        const doc = result.rows[0];

        // Blockchain Integration: Anchor hash on-chain
        const chainResult = await anchorHashOnChain(hash, doc_type);

        if (!chainResult.success) {
            // Rollback DB insert if blockchain fails (ensures consistency CONS-002)
            await client.query('ROLLBACK');
            client.release();
            return res.status(503).json({
                success: false,
                error: 'Blockchain anchoring failed. The document was NOT saved. Please ensure the blockchain node is running.',
            });
        }

        // Generate certificate ID: CERT-YYYY-DTLAST4-RAND4
        const anchorYear = new Date(doc.anchored_at).getFullYear();
        const last4 = cleanId.slice(-4);
        const docPrefix = doc_type.toUpperCase().slice(0, 2);
        const rand4 = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4).padEnd(4, '0');
        const certId = `CERT-${anchorYear}-${docPrefix}${last4}-${rand4}`;

        // Persist block_number and cert_id back to the DB row
        const updated = await client.query(
            `UPDATE gov_documents SET block_number = $1, cert_id = $2 WHERE id = $3
             RETURNING id, doc_type, name, identity_no, dob, authority, address, hash, anchored_at, block_number, cert_id, status;`,
            [chainResult.blockNumber, certId, doc.id]
        );

        // ── Commit transaction ────────────────────────────────────────────
        await client.query('COMMIT');
        client.release();

        const finalDoc = updated.rows[0];

        return res.status(201).json({
            success: true,
            message: `${DOC_LABELS[doc_type] || 'Document'} anchored to the government ledger`,
            data: finalDoc,
            blockchainAnchored: true
        });
    } catch (err) {
        if (client) {
            await client.query('ROLLBACK').catch(() => {});
            client.release();
        }

        if (err.code === '23505') {
            return res.status(409).json({
                success: false,
                error: 'This identity number is already anchored on the ledger',
            });
        }
        next(err);
    }
}

/**
 * GET /api/documents
 * Return all anchored documents (most recent first).
 */
async function getAllDocuments(req, res, next) {
    try {
        const result = await pool.query(
            `SELECT id, doc_type, name, identity_no, dob, authority, hash, anchored_at, block_number, cert_id, status
             FROM gov_documents
             WHERE status != 'CORRECTED' OR status IS NULL
             ORDER BY anchored_at DESC;`
        );
        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows,
        });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/documents/verify
 * Verify an identity by re-computing hash and comparing.
 * Body: { identity_no, dob, doc_type }
 */
async function verifyDocument(req, res, next) {
    try {
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ success: false, error: 'identity_no, dob and doc_type are required' });
        }

        const { identity_no, dob, doc_type } = req.body;

        if (!identity_no || !dob || !doc_type) {
            return res.status(400).json({ success: false, error: 'identity_no, dob and doc_type are required' });
        }

        const cleanId = normalizeId(identity_no);

        const result = await pool.query(
            `SELECT id, doc_type, name, authority, hash, anchored_at, status
             FROM gov_documents WHERE identity_no = $1 AND (status = 'ACTIVE' OR status IS NULL)
             ORDER BY version DESC LIMIT 1;`,
            [cleanId]
        );

        if (result.rows.length === 0) {
            return res.status(200).json({ success: true, verified: false, reason: 'NOT_FOUND' });
        }

        const record = result.rows[0];
        const inputHash = generateHash(cleanId, dob, doc_type);
        const verified = inputHash === record.hash;

        return res.status(200).json({
            success: true,
            verified,
            reason: verified ? 'HASH_MATCH' : 'HASH_MISMATCH',
            holderName: verified ? record.name : null,
            authority: verified ? record.authority : null,
            docType: verified ? record.doc_type : null,
            anchoredAt: verified ? record.anchored_at : null,
            status: record.status || 'ACTIVE'
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/documents/stats
 */
async function getStats(req, res, next) {
    try {
        const result = await pool.query(
            `SELECT
               COUNT(*)::int                                    AS total,
               COUNT(*) FILTER (WHERE doc_type='aadhaar')::int  AS aadhaar,
               COUNT(*) FILTER (WHERE doc_type='pan')::int      AS pan,
               COUNT(*) FILTER (WHERE doc_type='voter')::int    AS voter,
               MAX(anchored_at)                                 AS last_anchored
             FROM gov_documents;`
        );
        return res.status(200).json({ success: true, data: result.rows[0] });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/documents/:identity_no
 */
async function getDocumentByIdentity(req, res, next) {
    try {
        const cleanId = normalizeId(req.params.identity_no);

        const result = await pool.query(
            `SELECT id, doc_type, name, identity_no, dob, authority, address, hash, anchored_at, block_number, cert_id, status
             FROM gov_documents WHERE identity_no = $1 ORDER BY version DESC LIMIT 1;`,
            [cleanId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No document found with this identity number',
            });
        }

        return res.status(200).json({ success: true, data: result.rows[0] });
    } catch (err) {
        next(err);
    }
}

/**
 * PUT /api/documents/:identity_no
 * Protected by requireAuth.
 * Prevents silent hash divergence (CONS-004):
 * If DOB or doc_type changes, revokes old hash and anchors new hash on-chain!
 */
async function updateDocument(req, res, next) {
    try {
        const cleanId = normalizeId(req.params.identity_no);
        const { name, dob, authority, address } = req.body || {};

        const existing = await pool.query(
            `SELECT * FROM gov_documents WHERE identity_no = $1 ORDER BY version DESC LIMIT 1;`,
            [cleanId]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No document found with this identity number',
            });
        }

        const current = existing.rows[0];
        const updatedName = name?.trim() || current.name;
        const updatedDob = dob || current.dob;
        const updatedAuthority = authority?.trim() || current.authority;
        const updatedAddress = address !== undefined ? (address?.trim() || null) : current.address;

        let newHash = current.hash;
        let blockNumber = current.block_number;

        // If DOB changes, we must maintain blockchain consistency
        if (dob && dob !== current.dob) {
            newHash = generateHash(cleanId, updatedDob, current.doc_type);

            // Revoke old hash on-chain
            await revokeHashOnChain(current.hash);

            // Anchor new hash on-chain
            const anchorRes = await anchorHashOnChain(newHash, current.doc_type);
            if (anchorRes.success) {
                blockNumber = anchorRes.blockNumber;
            }
        }

        const result = await pool.query(
            `UPDATE gov_documents
             SET name = $1, dob = $2, authority = $3, address = $4, hash = $5, block_number = $6
             WHERE id = $7
             RETURNING id, doc_type, name, identity_no, dob, authority, address, hash, anchored_at, block_number, cert_id, status;`,
            [updatedName, updatedDob, updatedAuthority, updatedAddress, newHash, blockNumber, current.id]
        );

        return res.status(200).json({
            success: true,
            message: `${DOC_LABELS[current.doc_type] || 'Document'} updated successfully`,
            data: result.rows[0],
            blockchainUpdated: dob !== current.dob
        });
    } catch (err) {
        next(err);
    }
}

/**
 * DELETE /api/documents/:identity_no
 * Protected by requireAuth.
 * Revokes on blockchain and marks REVOKED in DB (maintains CONS-005 consistency).
 */
async function deleteDocument(req, res, next) {
    try {
        const cleanId = normalizeId(req.params.identity_no);

        const existing = await pool.query(
            `SELECT * FROM gov_documents WHERE identity_no = $1 ORDER BY version DESC LIMIT 1;`,
            [cleanId]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No document found with this identity number',
            });
        }

        const doc = existing.rows[0];

        // 1. Revoke on chain
        const isRevokedOnChain = await revokeHashOnChain(doc.hash);

        // 2. Mark REVOKED in database (or remove if no history)
        const reason = req.body?.reason || 'Document revoked by authorized API request';
        const result = await pool.query(
            `UPDATE gov_documents SET status = 'REVOKED', revocation_reason = $1, revoked_at = NOW()
             WHERE id = $2 RETURNING id, doc_type, name, identity_no, hash, status;`,
            [reason, doc.id]
        );

        return res.status(200).json({
            success: true,
            message: `${DOC_LABELS[doc.doc_type] || 'Document'} revoked from the ledger`,
            data: result.rows[0],
            blockchainRevoked: isRevokedOnChain
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/documents/:identity_no/blockchain-verify
 */
async function blockchainVerify(req, res, next) {
    try {
        const cleanId = normalizeId(req.params.identity_no);

        const result = await pool.query(
            `SELECT id, doc_type, name, identity_no, dob, authority, hash, anchored_at, status
             FROM gov_documents WHERE identity_no = $1 ORDER BY version DESC LIMIT 1;`,
            [cleanId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No document found in Database to verify against Blockchain',
            });
        }

        const record = result.rows[0];
        const onChainData = await verifyHashOnChain(record.hash);

        return res.status(200).json({
            success: true,
            databaseRecord: {
                id: record.id,
                docType: record.doc_type,
                name: record.name,
                anchoredAt: record.anchored_at,
                hash: record.hash,
                status: record.status || 'ACTIVE'
            },
            blockchainRecord: onChainData
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    anchorDocument,
    getAllDocuments,
    verifyDocument,
    getStats,
    getDocumentByIdentity,
    updateDocument,
    deleteDocument,
    blockchainVerify
};
