const pool = require('../../core/config/database');
const { generateHash } = require('./hashGenerator');
const { validateDocument } = require('./validator');
const { anchorHashOnChain, revokeHashOnChain, verifyHashOnChain } = require('../../core/config/blockchain');

const DOC_LABELS = {
    aadhaar: 'Aadhaar Card',
    pan: 'PAN Card',
    voter: 'Voter Identity Card',
};

/**
 * POST /api/documents
 * Anchor a new government identity document to the ledger.
 */
async function anchorDocument(req, res, next) {
    try {
        const { doc_type, name, identity_no, dob, authority, address } = req.body;

        const validation = validateDocument({ doc_type, name, identity_no, dob, authority });
        if (!validation.isValid) {
            return res.status(400).json({ success: false, errors: validation.errors });
        }

        const cleanId = identity_no.replace(/\s/g, '').toUpperCase();
        const hash = generateHash(cleanId, dob, doc_type);

        const result = await pool.query(
            `INSERT INTO gov_documents (doc_type, name, identity_no, dob, authority, address, hash)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, doc_type, name, identity_no, dob, authority, address, hash, anchored_at;`,
            [doc_type, name.trim(), cleanId, dob, authority.trim(), address?.trim() || null, hash]
        );

        const doc = result.rows[0];

        // Blockchain Integration: Anchor hash on-chain
        const identityRef = cleanId.slice(-4);
        const chainResult = await anchorHashOnChain(hash, doc_type, identityRef);
        const isAnchoredOnChain = chainResult.success;
        const blockNumber = chainResult.blockNumber;

        // Generate certificate ID: CERT-YYYY-DTLAST4-RAND4
        const anchorYear = new Date(doc.anchored_at).getFullYear();
        const last4 = cleanId.slice(-4);
        const docPrefix = doc_type.toUpperCase().slice(0, 2);
        const rand4 = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4).padEnd(4, '0');
        const certId = `CERT-${anchorYear}-${docPrefix}${last4}-${rand4}`;

        // Persist block_number and cert_id back to the DB row
        const updated = await pool.query(
            `UPDATE gov_documents SET block_number = $1, cert_id = $2 WHERE id = $3
             RETURNING id, doc_type, name, identity_no, dob, authority, address, hash, anchored_at, block_number, cert_id;`,
            [blockNumber, certId, doc.id]
        );

        const finalDoc = updated.rows[0];

        return res.status(201).json({
            success: true,
            message: `${DOC_LABELS[doc_type] || 'Document'} anchored to the government ledger`,
            data: finalDoc,
            blockchainAnchored: isAnchoredOnChain
        });
    } catch (err) {
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
            `SELECT id, doc_type, name, identity_no, dob, authority, hash, anchored_at, block_number, cert_id
             FROM gov_documents
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
        const { identity_no, dob, doc_type } = req.body;

        if (!identity_no || !dob || !doc_type) {
            return res.status(400).json({ success: false, error: 'identity_no, dob and doc_type are required' });
        }

        const cleanId = identity_no.replace(/\s/g, '').toUpperCase();

        const result = await pool.query(
            `SELECT id, doc_type, name, authority, hash, anchored_at
             FROM gov_documents WHERE identity_no = $1;`,
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
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/documents/stats
 * Return aggregate stats: total counts per doc_type, last anchored time.
 */
async function getStats(req, res, next) {
    try {
        const result = await pool.query(
            `SELECT
               COUNT(*)::int                            AS total,
               COUNT(*) FILTER (WHERE doc_type='aadhaar')::int AS aadhaar,
               COUNT(*) FILTER (WHERE doc_type='pan')::int     AS pan,
               COUNT(*) FILTER (WHERE doc_type='voter')::int   AS voter,
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
 * Return a single document by its identity number.
 */
async function getDocumentByIdentity(req, res, next) {
    try {
        const cleanId = req.params.identity_no.replace(/\s/g, '').toUpperCase();

        const result = await pool.query(
            `SELECT id, doc_type, name, identity_no, dob, authority, address, hash, anchored_at
             FROM gov_documents WHERE identity_no = $1;`,
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
 * Update an existing document record (name, dob, authority, address).
 * Re-computes hash if dob or doc_type changes.
 */
async function updateDocument(req, res, next) {
    try {
        const cleanId = req.params.identity_no.replace(/\s/g, '').toUpperCase();
        const { name, dob, authority, address } = req.body;

        // Check the document exists
        const existing = await pool.query(
            `SELECT * FROM gov_documents WHERE identity_no = $1;`,
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

        // Re-compute hash with potentially updated DOB
        const hash = generateHash(cleanId, updatedDob, current.doc_type);

        const result = await pool.query(
            `UPDATE gov_documents
             SET name = $1, dob = $2, authority = $3, address = $4, hash = $5
             WHERE identity_no = $6
             RETURNING id, doc_type, name, identity_no, dob, authority, address, hash, anchored_at;`,
            [updatedName, updatedDob, updatedAuthority, updatedAddress, hash, cleanId]
        );

        return res.status(200).json({
            success: true,
            message: `${DOC_LABELS[current.doc_type] || 'Document'} updated successfully`,
            data: result.rows[0],
        });
    } catch (err) {
        next(err);
    }
}

/**
 * DELETE /api/documents/:identity_no
 * Remove a document from the ledger by identity number.
 */
async function deleteDocument(req, res, next) {
    try {
        const cleanId = req.params.identity_no.replace(/\s/g, '').toUpperCase();

        const result = await pool.query(
            `DELETE FROM gov_documents WHERE identity_no = $1 RETURNING id, doc_type, name, identity_no, hash;`,
            [cleanId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No document found with this identity number',
            });
        }

        const doc = result.rows[0];

        // Blockchain Integration: Revoke hash on-chain
        const isRevokedOnChain = await revokeHashOnChain(doc.hash);

        return res.status(200).json({
            success: true,
            message: `${DOC_LABELS[doc.doc_type] || 'Document'} removed from the ledger`,
            data: { id: doc.id, doc_type: doc.doc_type, name: doc.name, identity_no: doc.identity_no },
            blockchainRevoked: isRevokedOnChain
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/documents/:identity_no/blockchain-verify
 * Verifies a specific document hash on the blockchain.
 */
async function blockchainVerify(req, res, next) {
    try {
        const cleanId = req.params.identity_no.replace(/\s/g, '').toUpperCase();

        const result = await pool.query(
            `SELECT id, doc_type, name, identity_no, dob, authority, hash, anchored_at
             FROM gov_documents WHERE identity_no = $1;`,
            [cleanId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No document found in Database to verify against Blockchain',
            });
        }

        const record = result.rows[0];

        // Blockchain Integration: Verify Hash on-chain
        const onChainData = await verifyHashOnChain(record.hash);

        return res.status(200).json({
            success: true,
            databaseRecord: {
                id: record.id,
                docType: record.doc_type,
                name: record.name,
                anchoredAt: record.anchored_at,
                hash: record.hash
            },
            blockchainRecord: onChainData
        });

    } catch (err) {
        next(err);
    }
}

module.exports = { anchorDocument, getAllDocuments, verifyDocument, getStats, getDocumentByIdentity, updateDocument, deleteDocument, blockchainVerify };
