const VALID_DOC_TYPES = ['aadhaar', 'pan', 'voter'];

const IDENTITY_RULES = {
    aadhaar: { min: 12, max: 12, pattern: /^\d{12}$/, label: 'Aadhaar number must be exactly 12 digits' },
    pan: { min: 10, max: 10, pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, label: 'PAN must be in format ABCDE1234F' },
    voter: { min: 8, max: 12, pattern: /^[A-Z0-9]{8,12}$/, label: 'EPIC number must be 8–12 alphanumeric characters' },
};

function validateDocument(data) {
    const errors = [];

    // doc_type
    if (!data.doc_type || !VALID_DOC_TYPES.includes(data.doc_type)) {
        errors.push(`doc_type must be one of: ${VALID_DOC_TYPES.join(', ')}`);
    }

    // name
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
        errors.push('Name is required');
    } else if (data.name.trim().length > 100) {
        errors.push('Name must not exceed 100 characters');
    }

    // identity_no
    if (!data.identity_no || typeof data.identity_no !== 'string') {
        errors.push('Identity number is required');
    } else {
        const clean = data.identity_no.replace(/\s/g, '').toUpperCase();
        const rule = IDENTITY_RULES[data.doc_type];
        if (rule && !rule.pattern.test(clean)) {
            errors.push(rule.label);
        }
    }

    // dob
    if (!data.dob) {
        errors.push('Date of birth is required (YYYY-MM-DD)');
    } else {
        const d = new Date(data.dob);
        if (isNaN(d.getTime())) {
            errors.push('Date of birth must be a valid date');
        } else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.dob)) {
            errors.push('Date of birth must be in YYYY-MM-DD format');
        } else if (d >= new Date()) {
            errors.push('Date of birth must be in the past');
        }
    }

    // authority (issuing authority — auto-supplied by frontend, validate presence)
    if (!data.authority || typeof data.authority !== 'string' || data.authority.trim().length === 0) {
        errors.push('Issuing authority is required');
    }

    return { isValid: errors.length === 0, errors };
}

module.exports = { validateDocument };
