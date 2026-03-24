'use strict';

const QRCode = require('qrcode');

// ── Date formatting helpers (no external dep needed for simple cases) ──────────

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Format a Date-like value as "D Month YYYY" (e.g. "1 January 2003")
 */
function formatDOB(dob) {
    const d = new Date(dob);
    return `${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * Format a Date-like value as "DD Mon YYYY, HH:MM AM/PM IST" (e.g. "23 Mar 2026, 09:14 AM IST")
 */
function formatAnchoredAt(ts) {
    const d = new Date(ts);
    // Convert to IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const ist = new Date(d.getTime() + istOffset);

    const day = String(ist.getUTCDate()).padStart(2, '0');
    const mon = MONTHS_SHORT[ist.getUTCMonth()];
    const year = ist.getUTCFullYear();
    let hours = ist.getUTCHours();
    const mins = String(ist.getUTCMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    return `${day} ${mon} ${year}, ${String(hours).padStart(2, '0')}:${mins} ${ampm} IST`;
}

/**
 * Mask identity number: show "XXXX XXXX LAST4"
 * Works for Aadhaar (12-digit), PAN (10-char), Voter ID, etc.
 */
function maskIdentityNo(identityNo) {
    const clean = identityNo.replace(/\s/g, '');
    const last4 = clean.slice(-4);
    if (clean.length <= 4) return last4;
    const masked = 'X'.repeat(clean.length - 4);
    // Group every 4 characters with space for readability
    const grouped = (masked + last4).replace(/(.{4})(?=.)/g, '$1 ');
    return grouped;
}

/**
 * Truncate hash: first 8 chars + "..." + last 4 chars
 */
function truncateHash(hash) {
    if (!hash || hash.length < 12) return hash;
    return `${hash.slice(0, 8)}...${hash.slice(-4)}`;
}

// ── QR Code generator ─────────────────────────────────────────────────────────

/**
 * Generate a QR code as a base64 PNG data URI.
 * @param {string} url - The URL to encode in the QR code
 * @returns {Promise<string>} - base64 PNG data URI
 */
async function generateQRCode(url) {
    const dataUri = await QRCode.toDataURL(url, {
        width: 200,
        margin: 1,
        errorCorrectionLevel: 'H',
        color: {
            dark: '#0a6b5e',
            light: '#ffffff',
        },
    });
    return dataUri; // already a data URI: data:image/png;base64,...
}

// ── Certificate HTML builder ──────────────────────────────────────────────────

const TEAL = '#0a6b5e';
const CREAM = '#f5f0e8';
const BORDER = '#d4c9b0';

/**
 * Build a complete, self-contained HTML certificate string (inline styles only).
 * @param {Object} doc - Document record from PostgreSQL
 * @param {string} qrCodeBase64 - base64 PNG data URI from generateQRCode()
 * @returns {string} - Complete HTML string
 */
function buildCertificateHTML(doc, qrCodeBase64) {
    const {
        doc_type,
        name,
        identity_no,
        dob,
        authority,
        anchored_at,
        hash,
        block_number,
        cert_id,
    } = doc;

    const DOC_LABELS = {
        aadhaar: 'Aadhaar Card',
        pan: 'PAN Card',
        voter: 'Voter Identity Card',
    };

    const docLabel = DOC_LABELS[doc_type] || doc_type;
    const maskedId = maskIdentityNo(identity_no || '');
    const formattedDOB = formatDOB(dob);
    const formattedAt = formatAnchoredAt(anchored_at);
    const shortHash = truncateHash(hash);
    const last4 = (identity_no || '').replace(/\s/g, '').slice(-4);

    // Short verify URL shown under QR
    const shortVerifyUrl = `digiid.app/verify/${cert_id || last4}`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DigiID Verify — Identity Verification Certificate</title>
<meta name="description" content="Blockchain-verified Identity Verification Certificate issued by DigiID Verify.">
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 32px;
    background: #e8e4dc;
    font-family: Arial, Helvetica, sans-serif;
    display: flex; flex-direction: column;
    align-items: center; justify-content: flex-start;
    min-height: 100vh;
  }
  .cert-card {
    background: ${CREAM};
    border: 2px solid ${BORDER};
    border-radius: 12px;
    width: 1050px;
    max-width: 100%;
    padding: 36px 44px 28px;
    box-shadow: 0 8px 32px rgba(10,107,94,0.12);
  }
  .cert-header {
    display: flex; align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 18px;
  }
  .portal-name {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 22px; font-weight: bold;
    color: ${TEAL}; letter-spacing: 0.5px;
  }
  .portal-name span { font-weight: 400; }
  .badge-row { display: flex; gap: 10px; margin-top: 4px; flex-wrap: wrap; }
  .badge {
    border: 1.5px solid ${TEAL}; color: ${TEAL};
    border-radius: 20px; padding: 3px 12px;
    font-size: 10px; font-weight: 700;
    letter-spacing: 1px; text-transform: uppercase;
  }
  .badge-solid { background: ${TEAL}; color: #fff; border-color: ${TEAL}; }
  .cert-divider { border: none; border-top: 2px solid ${BORDER}; margin: 18px 0; }
  .cert-title-block { text-align: center; margin-bottom: 24px; }
  .cert-title {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 26px; font-weight: bold;
    color: ${TEAL}; letter-spacing: 2px;
    text-transform: uppercase; margin: 0 0 6px;
  }
  .cert-subtitle {
    font-size: 12px; color: #888;
    letter-spacing: 0.5px; margin: 0;
  }
  .cert-body {
    display: flex; gap: 40px; align-items: flex-start;
  }
  .cert-fields { flex: 1; }
  .field-row {
    display: flex; align-items: baseline;
    padding: 9px 0; border-bottom: 1px solid ${BORDER};
  }
  .field-row:last-child { border-bottom: none; }
  .field-label {
    font-size: 9px; font-weight: 700;
    color: #999; letter-spacing: 1.2px;
    text-transform: uppercase; width: 148px;
    flex-shrink: 0;
  }
  .field-value {
    font-size: 14px; color: #1a1a1a;
    font-weight: 500; word-break: break-all;
  }
  .field-value.mono {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px; letter-spacing: 0.5px;
  }
  .cert-qr-col {
    display: flex; flex-direction: column;
    align-items: center; flex-shrink: 0; width: 180px;
  }
  .qr-wrapper {
    border: 3px solid ${TEAL}; border-radius: 8px;
    padding: 8px; background: #fff;
    display: inline-block;
  }
  .qr-wrapper img { display: block; width: 160px; height: 160px; }
  .qr-caption {
    font-size: 10px; color: #888;
    text-align: center; margin-top: 8px;
    line-height: 1.5;
  }
  .qr-caption strong {
    display: block; color: ${TEAL};
    font-family: 'Courier New', monospace;
    font-size: 9px; margin-top: 3px;
    word-break: break-all;
  }
  .cert-footer {
    display: flex; align-items: center;
    justify-content: space-between;
    margin-top: 22px; padding-top: 14px;
    border-top: 1px solid ${BORDER};
  }
  .cert-footer-left {
    display: flex; align-items: center; gap: 7px;
    font-size: 11px; color: #555;
  }
  .status-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #22c55e; flex-shrink: 0;
    display: inline-block;
  }
  .cert-id {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px; color: #aaa; letter-spacing: 1px;
  }
  /* Action buttons row below the card */
  .action-row {
    display: flex; gap: 12px; margin-top: 24px;
    flex-wrap: wrap; justify-content: center;
  }
  .action-btn {
    background: #1a1a1a; color: #fff;
    border: none; border-radius: 24px;
    padding: 11px 22px; font-size: 13px;
    font-weight: 600; cursor: pointer;
    display: flex; align-items: center; gap: 8px;
    text-decoration: none; font-family: Arial, sans-serif;
    letter-spacing: 0.3px;
  }
  .action-btn:hover { background: ${TEAL}; }
  .action-btn svg { width: 15px; height: 15px; }
  @media print {
    body { background: #fff; padding: 0; }
    .cert-card { box-shadow: none; width: 100%; }
    .action-row { display: none; }
  }
</style>
</head>
<body>

<div class="cert-card" id="certificate">

  <!-- Header -->
  <div class="cert-header">
    <div>
      <div class="portal-name">DigiID <span>Verify</span></div>
    </div>
    <div style="text-align:right">
      <div class="badge-row" style="justify-content:flex-end">
        <span class="badge">Blockchain Verified</span>
        <span class="badge badge-solid">Active</span>
      </div>
    </div>
  </div>

  <hr class="cert-divider">

  <!-- Title -->
  <div class="cert-title-block">
    <h1 class="cert-title">Identity Verification Certificate</h1>
    <p class="cert-subtitle">Government of India &middot; Parul University DigiID Platform</p>
  </div>

  <!-- Body: Fields + QR -->
  <div class="cert-body">

    <!-- Left: Fields -->
    <div class="cert-fields">
      <div class="field-row">
        <span class="field-label">Document Type</span>
        <span class="field-value">${escapeHtml(docLabel)}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Full Name</span>
        <span class="field-value">${escapeHtml(name)}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Identity No</span>
        <span class="field-value mono">${escapeHtml(maskedId)}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Date of Birth</span>
        <span class="field-value">${escapeHtml(formattedDOB)}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Issuing Authority</span>
        <span class="field-value">${escapeHtml(authority)}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Anchored On</span>
        <span class="field-value">${escapeHtml(formattedAt)}</span>
      </div>
      <div class="field-row">
        <span class="field-label">SHA-256 Hash</span>
        <span class="field-value mono">${escapeHtml(shortHash)}</span>
      </div>
    </div>

    <!-- Right: QR Code -->
    <div class="cert-qr-col">
      <div class="qr-wrapper">
        <img src="${qrCodeBase64}" alt="Verification QR Code" width="160" height="160">
      </div>
      <p class="qr-caption">
        Scan to verify on blockchain
        <strong>${escapeHtml(shortVerifyUrl)}</strong>
      </p>
    </div>

  </div>

  <!-- Footer -->
  <div class="cert-footer">
    <div class="cert-footer-left">
      <span class="status-dot"></span>
      Anchored on Ethereum &middot; Block #${escapeHtml(String(block_number || 'N/A'))}
    </div>
    <div class="cert-id">${escapeHtml(cert_id || 'CERT-PENDING')}</div>
  </div>

</div>

<!-- Action Buttons (visible in browser, hidden in print/PDF) -->
<div class="action-row" id="certActionRow">
  <button class="action-btn" onclick="window.downloadCertPDF && window.downloadCertPDF()">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
    Generate PDF
  </button>
  <button class="action-btn" id="qrBtn" onclick="window.open(document.getElementById('qrImg')?.src, '_blank')">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect>
      <rect x="3" y="14" width="7" height="7"></rect>
      <line x1="14" y1="14" x2="21" y2="14"></line><line x1="14" y1="14" x2="14" y2="21"></line>
      <line x1="21" y1="21" x2="21" y2="21"></line>
    </svg>
    QR Code
  </button>
  <button class="action-btn" onclick="window.openVerifyPage && window.openVerifyPage()">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
      <polyline points="15 3 21 3 21 9"></polyline>
      <line x1="10" y1="14" x2="21" y2="3"></line>
    </svg>
    Public Verify Page
  </button>
</div>

</body>
</html>`;
}

// ── Utility: HTML entity escaping ─────────────────────────────────────────────
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

module.exports = { generateQRCode, buildCertificateHTML };
