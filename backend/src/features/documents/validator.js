'use strict';

const VALID_DOC_TYPES = ['aadhaar', 'pan', 'voter'];

const IDENTITY_RULES = {
    aadhaar: { min: 12, max: 12, pattern: /^\d{12}$/, label: 'Aadhaar number must be exactly 12 digits' },
    pan: { min: 10, max: 10, pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, label: 'PAN must be in format ABCDE1234F' },
    voter: { min: 8, max: 12, pattern: /^[A-Z0-9]{8,12}$/, label: 'EPIC number must be 8–12 alphanumeric characters' },
};

/**
 * Validate document data against strict government ID rules.
 * Handles null/undefined/non-object input safely (VAL-017).
 *
 * @param {Object} data
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateDocument(data) {
    const errors = [];

    if (!data || typeof data !== 'object') {
        return { isValid: false, errors: ['Request body must be a valid JSON object'] };
    }

    // doc_type (VAL-015)
    if (!data.doc_type || typeof data.doc_type !== 'string' || !VALID_DOC_TYPES.includes(data.doc_type.toLowerCase())) {
        errors.push(`doc_type must be one of: ${VALID_DOC_TYPES.join(', ')}`);
    }

    const docType = data.doc_type ? String(data.doc_type).toLowerCase() : '';

    // name (VAL-009, VAL-016)
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
        errors.push('Name is required');
    } else if (data.name.trim().length > 100) {
        errors.push('Name must not exceed 100 characters');
    }

    // identity_no (VAL-001 to VAL-008, VAL-010)
    if (!data.identity_no || typeof data.identity_no !== 'string' || data.identity_no.trim().length === 0) {
        errors.push('Identity number is required');
    } else {
        const rawId = data.identity_no.trim();
        const clean = rawId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

        if (docType === 'aadhaar') {
            // Aadhaar cannot contain letters (VAL-004)
            if (/[a-zA-Z]/.test(rawId)) {
                errors.push('Aadhaar number cannot contain letters');
            } else if (clean.length < 12) {
                errors.push('Aadhaar number is too short');
            } else if (clean.length > 12) {
                errors.push('Aadhaar number is too long');
            } else if (!/^\d{12}$/.test(clean)) {
                errors.push('Aadhaar number must be exactly 12 digits');
            }
        } else if (docType === 'pan') {
            if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(clean)) {
                errors.push('PAN must be in format ABCDE1234F');
            }
        } else if (docType === 'voter') {
            if (clean.length < 8 || clean.length > 12 || !/^[A-Z0-9]{8,12}$/.test(clean)) {
                errors.push('EPIC number must be 8–12 alphanumeric characters');
            }
        }
    }

    // dob (VAL-011, VAL-012, VAL-013)
    if (!data.dob || typeof data.dob !== 'string' || data.dob.trim().length === 0) {
        errors.push('Date of birth is required (YYYY-MM-DD)');
    } else {
        const dobStr = data.dob.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dobStr)) {
            errors.push('Date of birth must be in YYYY-MM-DD format');
        } else {
            const d = new Date(dobStr);
            if (isNaN(d.getTime())) {
                errors.push('Date of birth must be a valid date');
            } else if (d >= new Date()) {
                errors.push('Date of birth must be in the past');
            }
        }
    }

    // authority (VAL-014)
    if (!data.authority || typeof data.authority !== 'string' || data.authority.trim().length === 0) {
        errors.push('Issuing authority is required');
    }

    return { isValid: errors.length === 0, errors };
}

module.exports = { validateDocument, VALID_DOC_TYPES };
