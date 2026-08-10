const { generateQRCode, buildCertificateHTML } = require('../../backend/src/features/certificates/certificateGenerator');
const { supabase } = require('../../backend/src/core/config/supabase');
const pool = require('../../backend/src/core/config/database');

function normalizeId(raw) {
    return raw ? raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';
}

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
        const { identity_no } = req.query || {};
        if (!identity_no) {
            return res.status(400).json({ success: false, error: 'identity_no parameter is required' });
        }

        const cleanId = normalizeId(identity_no);
        let doc;

        if (supabase) {
            const { data } = await supabase
                .from('gov_documents')
                .select('id, doc_type, name, identity_no, dob, authority, address, hash, anchored_at, block_number, cert_id')
                .eq('identity_no', cleanId)
                .single();
            doc = data;
        } else {
            const result = await pool.query(
                `SELECT id, doc_type, name, identity_no, dob, authority, address, hash, anchored_at, block_number, cert_id
                 FROM gov_documents WHERE identity_no = $1;`,
                [cleanId]
            );
            doc = result.rows[0] || null;
        }

        if (!doc) {
            return res.status(404).json({ success: false, error: 'No document found with this identity number' });
        }

        const certId = doc.cert_id || 'CERT-PENDING';
        const hostUrl = req.headers.host ? `https://${req.headers.host}` : 'https://digiid.app';
        const verifyUrl = `${hostUrl}/verify/${certId}`;

        const qrBase64 = await generateQRCode(verifyUrl);
        const certificateHTML = buildCertificateHTML(doc, qrBase64);

        return res.status(200).json({
            success: true,
            certificateHTML,
            verifyUrl,
            cert_id: certId,
            block_number: doc.block_number || null,
        });

    } catch (err) {
        console.error('Error in /api/certificates:', err);
        return res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
    }
};
