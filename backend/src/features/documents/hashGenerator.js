'use strict';

const crypto = require('crypto');

/**
 * Generate deterministic SHA-256 hash for a government identity document.
 * Normalizes identity number by stripping non-alphanumerics and uppercasing.
 * Handles null/undefined/empty input safely (HASH-009, HASH-010).
 *
 * @param {string} identityNo - Aadhaar / PAN / EPIC number
 * @param {string} dob        - Date of birth in YYYY-MM-DD format
 * @param {string} docType    - 'aadhaar' | 'pan' | 'voter'
 * @returns {string} 64-character hex hash
 */
function generateHash(identityNo, dob, docType) {
    const rawId = identityNo != null ? String(identityNo) : '';
    const cleanId = rawId.replace(/[^a-zA-Z0-9]/gu, '').toUpperCase();
    const cleanDob = dob != null ? String(dob).trim() : '';
    const cleanType = docType != null ? String(docType).trim().toLowerCase() : '';

    const input = `${cleanId}|${cleanDob}|${cleanType}`.toUpperCase();
    return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

module.exports = { generateHash };
