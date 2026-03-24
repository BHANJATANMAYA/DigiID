const crypto = require('crypto');

/**
 * Generate SHA-256 hash for a government identity document.
 * Combines identity number + date of birth + document type.
 * @param {string} identityNo - Aadhaar / PAN / EPIC number (spaces removed)
 * @param {string} dob        - Date of birth in YYYY-MM-DD format
 * @param {string} docType    - 'aadhaar' | 'pan' | 'voter'
 * @returns {string} 64-character hex hash
 */
function generateHash(identityNo, dob, docType) {
    const input = `${identityNo.replace(/\s/g, '')}|${dob}|${docType}`.toUpperCase();
    return crypto.createHash('sha256').update(input).digest('hex');
}

module.exports = { generateHash };
