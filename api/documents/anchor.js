const { generateHash } = require('../../backend/src/features/documents/hashGenerator');
const { validateDocument } = require('../../backend/src/features/documents/validator');
const { anchorHashOnChain } = require('../../backend/src/core/config/blockchain');
const { supabase } = require('../../backend/src/core/config/supabase');
const pool = require('../../backend/src/core/config/database');

function normalizeId(raw) {
    return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

const DOC_LABELS = {
    aadhaar: 'Aadhaar Card',
    pan: 'PAN Card',
    voter: 'Voter Identity Card',
};

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    try {
        const { doc_type, name, identity_no, dob, authority, address } = req.body || {};

        const validation = validateDocument({ doc_type, name, identity_no, dob, authority });
        if (!validation.isValid) {
            return res.status(400).json({ success: false, errors: validation.errors });
        }

        const cleanId = normalizeId(identity_no);
        const hash = generateHash(cleanId, dob, doc_type);

        // 1. Blockchain Integration: Anchor hash on-chain
        const chainResult = await anchorHashOnChain(hash, doc_type);

        if (!chainResult.success) {
            return res.status(503).json({
                success: false,
                error: 'Blockchain anchoring failed. The document was NOT saved. Please ensure the blockchain RPC node is running and contract is deployed.',
            });
        }

        // Generate cert ID
        const anchorYear = new Date().getFullYear();
        const last4 = cleanId.slice(-4);
        const docPrefix = doc_type.toUpperCase().slice(0, 2);
        const rand4 = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4).padEnd(4, '0');
        const certId = `CERT-${anchorYear}-${docPrefix}${last4}-${rand4}`;

        let docRecord;

        // Insert into database (using Supabase Client if configured, or PG Pool as fallback)
        if (supabase) {
            const { data, error } = await supabase
                .from('gov_documents')
                .insert([{
                    doc_type,
                    name: name.trim(),
                    identity_no: cleanId,
                    dob,
                    authority: authority.trim(),
                    address: address?.trim() || null,
                    hash,
                    block_number: chainResult.blockNumber,
                    cert_id: certId
                }])
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    return res.status(409).json({
                        success: false,
                        error: 'This identity number is already anchored on the ledger',
                    });
                }
                throw error;
            }
            docRecord = data;
        } else {
            const result = await pool.query(
                `INSERT INTO gov_documents (doc_type, name, identity_no, dob, authority, address, hash, block_number, cert_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING id, doc_type, name, identity_no, dob, authority, address, hash, anchored_at, block_number, cert_id;`,
                [doc_type, name.trim(), cleanId, dob, authority.trim(), address?.trim() || null, hash, chainResult.blockNumber, certId]
            );
            docRecord = result.rows[0];
        }

        return res.status(201).json({
            success: true,
            message: `${DOC_LABELS[doc_type] || 'Document'} anchored to the government ledger`,
            data: docRecord,
            blockchainAnchored: true
        });

    } catch (err) {
        console.error('Error in /api/documents/anchor:', err);
        return res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
    }
};
