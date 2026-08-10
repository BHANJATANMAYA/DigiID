const { supabase } = require('../../backend/src/core/config/supabase');
const pool = require('../../backend/src/core/config/database');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    try {
        const { action } = req.query || {};

        if (action === 'stats') {
            if (supabase) {
                const { data: docs, error } = await supabase.from('gov_documents').select('doc_type, anchored_at');
                if (error) throw error;

                const stats = {
                    total: docs.length,
                    aadhaar: docs.filter(d => d.doc_type === 'aadhaar').length,
                    pan: docs.filter(d => d.doc_type === 'pan').length,
                    voter: docs.filter(d => d.doc_type === 'voter').length,
                    last_anchored: docs.length ? docs.reduce((max, d) => d.anchored_at > max ? d.anchored_at : max, docs[0].anchored_at) : null
                };

                return res.status(200).json({ success: true, data: stats });
            } else {
                const result = await pool.query(
                    `SELECT
                       COUNT(*)::int AS total,
                       COUNT(*) FILTER (WHERE doc_type='aadhaar')::int AS aadhaar,
                       COUNT(*) FILTER (WHERE doc_type='pan')::int AS pan,
                       COUNT(*) FILTER (WHERE doc_type='voter')::int AS voter,
                       MAX(anchored_at) AS last_anchored
                     FROM gov_documents;`
                );
                return res.status(200).json({ success: true, data: result.rows[0] });
            }
        }

        // List all documents
        if (supabase) {
            const { data, error } = await supabase
                .from('gov_documents')
                .select('id, doc_type, name, identity_no, dob, authority, hash, anchored_at, block_number, cert_id')
                .order('anchored_at', { ascending: false });

            if (error) throw error;
            return res.status(200).json({ success: true, count: data.length, data });
        } else {
            const result = await pool.query(
                `SELECT id, doc_type, name, identity_no, dob, authority, hash, anchored_at, block_number, cert_id
                 FROM gov_documents
                 ORDER BY anchored_at DESC;`
            );
            return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
        }

    } catch (err) {
        console.error('Error in /api/documents:', err);
        return res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
    }
};
