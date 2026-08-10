const { revokeHashOnChain } = require('../../backend/src/core/config/blockchain');
const { supabase } = require('../../backend/src/core/config/supabase');
const pool = require('../../backend/src/core/config/database');

function normalizeId(raw) {
    return raw ? raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST' && req.method !== 'DELETE') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    try {
        const { identity_no } = req.body || req.query || {};
        if (!identity_no) {
            return res.status(400).json({ success: false, error: 'identity_no is required' });
        }

        const cleanId = normalizeId(identity_no);
        let doc;

        if (supabase) {
            const { data, error } = await supabase
                .from('gov_documents')
                .select('id, doc_type, name, identity_no, hash')
                .eq('identity_no', cleanId)
                .single();

            if (error || !data) {
                return res.status(404).json({ success: false, error: 'No document found with this identity number' });
            }
            doc = data;

            // Revoke on chain
            const isRevokedOnChain = await revokeHashOnChain(doc.hash);

            // Delete from DB
            await supabase.from('gov_documents').delete().eq('identity_no', cleanId);

            return res.status(200).json({
                success: true,
                message: 'Document removed from ledger',
                data: doc,
                blockchainRevoked: isRevokedOnChain
            });
        } else {
            const result = await pool.query(
                `DELETE FROM gov_documents WHERE identity_no = $1 RETURNING id, doc_type, name, identity_no, hash;`,
                [cleanId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'No document found with this identity number' });
            }

            doc = result.rows[0];
            const isRevokedOnChain = await revokeHashOnChain(doc.hash);

            return res.status(200).json({
                success: true,
                message: 'Document removed from ledger',
                data: doc,
                blockchainRevoked: isRevokedOnChain
            });
        }

    } catch (err) {
        console.error('Error in /api/documents/revoke:', err);
        return res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
    }
};
