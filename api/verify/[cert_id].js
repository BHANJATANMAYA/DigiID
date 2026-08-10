const { verifyHashOnChain } = require('../../../backend/src/core/config/blockchain');
const { generateQRCode, buildCertificateHTML } = require('../../../backend/src/features/certificates/certificateGenerator');
const { supabase } = require('../../../backend/src/core/config/supabase');
const pool = require('../../../backend/src/core/config/database');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { cert_id } = req.query || {};

    if (!cert_id) {
        return res.status(400).json({ success: false, error: 'cert_id parameter is required' });
    }

    try {
        let doc;
        if (supabase) {
            const { data } = await supabase
                .from('gov_documents')
                .select('id, doc_type, name, identity_no, dob, authority, address, hash, anchored_at, block_number, cert_id')
                .eq('cert_id', cert_id)
                .single();
            doc = data;
        } else {
            const result = await pool.query(
                `SELECT id, doc_type, name, identity_no, dob, authority, address, hash, anchored_at, block_number, cert_id
                 FROM gov_documents WHERE cert_id = $1;`,
                [cert_id]
            );
            doc = result.rows[0] || null;
        }

        if (!doc) {
            return res.status(404).send(notFoundHTML());
        }

        // Live blockchain verification
        const onChain = await verifyHashOnChain(doc.hash);

        const hostUrl = req.headers.host ? `https://${req.headers.host}` : 'https://digiid.app';
        const verifyUrl = `${hostUrl}/verify/${doc.cert_id}`;
        const qrBase64 = await generateQRCode(verifyUrl);
        const certHTML = buildCertificateHTML(doc, qrBase64);

        let bannerColor, bannerIcon, bannerTitle, bannerMsg;
        if (!onChain.exists) {
            bannerColor = '#dc2626';
            bannerIcon = '✗';
            bannerTitle = 'NOT FOUND ON CHAIN';
            bannerMsg = 'This hash was not found on the blockchain. The document may be fraudulent.';
        } else if (onChain.isRevoked) {
            bannerColor = '#d97706';
            bannerIcon = '⚠';
            bannerTitle = 'REVOKED';
            bannerMsg = `This document has been revoked on-chain${onChain.revokedAt ? ' on ' + new Date(onChain.revokedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : ''}.`;
        } else {
            bannerColor = '#16a34a';
            bannerIcon = '✓';
            bannerTitle = 'BLOCKCHAIN VERIFIED';
            bannerMsg = `Hash confirmed on Ethereum · Block #${doc.block_number || 'N/A'} · Anchored ${onChain.anchoredAt ? new Date(onChain.anchoredAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'} IST`;
        }

        const bannerHTML = `
<div style="
  max-width: 1050px; margin: 20px auto; border-radius: 10px;
  background: ${bannerColor}; color: #fff;
  padding: 18px 28px; display: flex; align-items: center; gap: 18px;
  font-family: Arial, sans-serif; box-shadow: 0 4px 16px rgba(0,0,0,0.18);
">
  <div style="font-size: 32px; line-height:1;">${bannerIcon}</div>
  <div>
    <div style="font-size:15px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:4px;">
      ${bannerTitle}
    </div>
    <div style="font-size:13px; opacity:0.92;">${bannerMsg}</div>
  </div>
</div>`;

        const fullPage = certHTML.replace('</body>', `${bannerHTML}</body>`);
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(fullPage);

    } catch (err) {
        console.error('Error in /api/verify/[cert_id]:', err);
        return res.status(500).send(notFoundHTML());
    }
};

function notFoundHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Certificate Not Found — DigiID Verify</title></head>
<body style="margin:0;padding:48px;font-family:Arial,sans-serif;background:#f5f0e8;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="text-align:center;max-width:480px;">
    <div style="font-size:64px;margin-bottom:16px;">🔍</div>
    <h1 style="color:#0a6b5e;font-family:Georgia,serif;margin:0 0 12px;">Certificate Not Found</h1>
    <p style="color:#666;font-size:15px;line-height:1.6;">
      No certificate matches this ID. It may have been revoked or the link is incorrect.
    </p>
    <a href="/" style="display:inline-block;margin-top:24px;padding:11px 28px;background:#0a6b5e;color:#fff;border-radius:24px;text-decoration:none;font-weight:700;font-size:13px;">
      Return to Portal
    </a>
  </div>
</body>
</html>`;
}
