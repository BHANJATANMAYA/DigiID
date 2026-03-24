'use strict';

const pool = require('../../core/config/database');
const { verifyHashOnChain } = require('../../core/config/blockchain');
const { generateQRCode, buildCertificateHTML } = require('./certificateGenerator');

/**
 * Helper: look up a document by identity_no.
 */
async function findDocByIdentity(identityNo) {
    const cleanId = identityNo.replace(/\s/g, '').toUpperCase();
    const result = await pool.query(
        `SELECT id, doc_type, name, identity_no, dob, authority, address, hash, anchored_at, block_number, cert_id
         FROM gov_documents WHERE identity_no = $1;`,
        [cleanId]
    );
    return result.rows[0] || null;
}

/**
 * Helper: look up a document by cert_id.
 */
async function findDocByCertId(certId) {
    const result = await pool.query(
        `SELECT id, doc_type, name, identity_no, dob, authority, address, hash, anchored_at, block_number, cert_id
         FROM gov_documents WHERE cert_id = $1;`,
        [certId]
    );
    return result.rows[0] || null;
}

// ── GET /api/certificates/:identity_no ────────────────────────────────────────

/**
 * Return certificate data (HTML + metadata) as JSON.
 * Protected by requireAuth.
 */
async function getCertificate(req, res, next) {
    try {
        const doc = await findDocByIdentity(req.params.identity_no);
        if (!doc) {
            return res.status(404).json({ success: false, error: 'No document found with this identity number' });
        }

        const certId = doc.cert_id || 'CERT-PENDING';
        const verifyUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/verify/${certId}`;

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
        next(err);
    }
}

// ── GET /api/certificates/:identity_no/pdf ────────────────────────────────────

/**
 * Generate and stream a PDF of the certificate.
 * Protected by requireAuth.
 */
async function downloadCertificatePDF(req, res, next) {
    let browser;
    try {
        const doc = await findDocByIdentity(req.params.identity_no);
        if (!doc) {
            return res.status(404).json({ success: false, error: 'No document found with this identity number' });
        }

        const certId = doc.cert_id || 'CERT-PENDING';
        const verifyUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/verify/${certId}`;

        const qrBase64 = await generateQRCode(verifyUrl);
        const certificateHTML = buildCertificateHTML(doc, qrBase64);

        const puppeteer = require('puppeteer');
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const page = await browser.newPage();
        await page.setContent(certificateHTML, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            landscape: true,
            printBackground: true,
            margin: { top: '16px', bottom: '16px', left: '16px', right: '16px' },
        });

        await browser.close();
        browser = null;

        const last4 = (doc.identity_no || '').slice(-4);
        const filename = `DigiID-Certificate-${last4}.pdf`;

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': pdfBuffer.length,
        });

        return res.send(pdfBuffer);
    } catch (err) {
        if (browser) {
            try { await browser.close(); } catch (_) { /* ignore */ }
        }
        next(err);
    }
}

// ── GET /verify/:cert_id  (public) ────────────────────────────────────────────

/**
 * Public page: render certificate + live blockchain verification banner.
 * No authentication required.
 */
async function getPublicVerifyPage(req, res, next) {
    try {
        const doc = await findDocByCertId(req.params.cert_id);

        if (!doc) {
            return res.status(404).send(notFoundHTML());
        }

        // Live blockchain check
        const onChain = await verifyHashOnChain(doc.hash);

        // Build certificate HTML (without the action buttons — they are shown outside)
        const verifyUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/verify/${doc.cert_id}`;
        const qrBase64 = await generateQRCode(verifyUrl);
        const certHTML = buildCertificateHTML(doc, qrBase64);

        // Determine banner state
        let bannerColor, bannerIcon, bannerTitle, bannerMsg;
        if (!onChain.exists) {
            bannerColor = '#dc2626';   // red
            bannerIcon = '✗';
            bannerTitle = 'NOT FOUND ON CHAIN';
            bannerMsg = 'This hash was not found on the blockchain. The document may be fraudulent.';
        } else if (onChain.isRevoked) {
            bannerColor = '#d97706';   // amber
            bannerIcon = '⚠';
            bannerTitle = 'REVOKED';
            bannerMsg = `This document has been revoked on-chain${onChain.revokedAt ? ' on ' + new Date(onChain.revokedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : ''}.`;
        } else {
            bannerColor = '#16a34a';   // green
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

        // Inject the banner after the cert card by replacing </body>
        const fullPage = certHTML.replace('</body>', `${bannerHTML}</body>`);

        return res.status(200).send(fullPage);
    } catch (err) {
        next(err);
    }
}

// ── Fallback HTML ─────────────────────────────────────────────────────────────

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

module.exports = { getCertificate, downloadCertificatePDF, getPublicVerifyPage };
