// ============================================
// CSV Import Script — Gov Documents
// Reads a CSV and bulk-inserts government identity
// documents into the gov_documents table with SHA-256 hashes
// ============================================
// Usage: node scripts/importCSV.js <path-to-csv-file>
// Example: node scripts/importCSV.js data/sample_documents.csv

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../src/config/database');
const { generateHash } = require('../src/utils/hashGenerator');

const VALID_DOC_TYPES = ['aadhaar', 'pan', 'voter'];

/**
 * Parse a CSV string into an array of document objects.
 * Expects headers: doc_type, name, identity_no, dob, authority, address
 *
 * @param {string} csvContent - Raw CSV file content
 * @returns {Object[]} Array of parsed document records
 */
function parseCSV(csvContent) {
    const lines = csvContent
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    if (lines.length < 2) {
        throw new Error('CSV file must contain a header row and at least one data row');
    }

    // Parse header row (case-insensitive, trimmed)
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

    // Validate required columns
    const requiredColumns = ['doc_type', 'name', 'identity_no', 'dob', 'authority'];
    for (const col of requiredColumns) {
        if (!headers.includes(col)) {
            throw new Error(`Missing required column: "${col}". Required columns: ${requiredColumns.join(', ')}`);
        }
    }

    // Get column indices
    const docTypeIdx = headers.indexOf('doc_type');
    const nameIdx = headers.indexOf('name');
    const identityNoIdx = headers.indexOf('identity_no');
    const dobIdx = headers.indexOf('dob');
    const authorityIdx = headers.indexOf('authority');
    const addressIdx = headers.indexOf('address'); // optional

    // Parse data rows
    const documents = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim());

        if (values.length < requiredColumns.length) {
            console.warn(`⚠️  Skipping row ${i + 1}: not enough columns`);
            continue;
        }

        documents.push({
            doc_type: values[docTypeIdx]?.toLowerCase(),
            name: values[nameIdx],
            identity_no: values[identityNoIdx],
            dob: values[dobIdx],
            authority: values[authorityIdx],
            address: addressIdx >= 0 ? values[addressIdx] || null : null,
            row: i + 1, // Track original row number for error reporting
        });
    }

    return documents;
}

/**
 * Validate a single document record.
 *
 * @param {Object} doc - Document data
 * @returns {string[]} Array of error messages (empty if valid)
 */
function validateRecord(doc) {
    const errors = [];

    if (!doc.doc_type || !VALID_DOC_TYPES.includes(doc.doc_type)) {
        errors.push(`doc_type must be one of: ${VALID_DOC_TYPES.join(', ')}, got: "${doc.doc_type}"`);
    }

    if (!doc.name || doc.name.length === 0) {
        errors.push('Name is required');
    } else if (doc.name.length > 100) {
        errors.push('Name must not exceed 100 characters');
    }

    if (!doc.identity_no || doc.identity_no.length === 0) {
        errors.push('Identity number is required');
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(doc.dob)) {
        errors.push(`DOB must be in YYYY-MM-DD format, got: "${doc.dob}"`);
    } else {
        const dobDate = new Date(doc.dob);
        if (isNaN(dobDate.getTime())) {
            errors.push(`DOB is not a valid date: "${doc.dob}"`);
        } else if (dobDate >= new Date()) {
            errors.push('DOB must be in the past');
        }
    }

    if (!doc.authority || doc.authority.length === 0) {
        errors.push('Authority is required');
    } else if (doc.authority.length > 150) {
        errors.push('Authority must not exceed 150 characters');
    }

    return errors;
}

/**
 * Import government documents from a CSV file into the database.
 *
 * @param {string} filePath - Path to the CSV file
 */
async function importCSV(filePath) {
    // Resolve file path
    const resolvedPath = path.resolve(filePath);

    if (!fs.existsSync(resolvedPath)) {
        console.error(`❌ File not found: ${resolvedPath}`);
        process.exit(1);
    }

    console.log(`📂 Reading CSV file: ${resolvedPath}`);
    const csvContent = fs.readFileSync(resolvedPath, 'utf-8');

    // Parse CSV
    let documents;
    try {
        documents = parseCSV(csvContent);
    } catch (error) {
        console.error(`❌ CSV parsing error: ${error.message}`);
        process.exit(1);
    }

    console.log(`📋 Found ${documents.length} document records in CSV\n`);

    // Track results
    let inserted = 0;
    let skipped = 0;
    let failed = 0;
    const errors = [];

    // Process each document
    for (const doc of documents) {
        // Validate record
        const validationErrors = validateRecord(doc);
        if (validationErrors.length > 0) {
            console.error(`❌ Row ${doc.row}: Validation failed`);
            validationErrors.forEach((err) => console.error(`   - ${err}`));
            errors.push({ row: doc.row, identity_no: doc.identity_no, errors: validationErrors });
            failed++;
            continue;
        }

        // Clean identity number and generate SHA-256 hash
        const cleanId = doc.identity_no.replace(/\s/g, '').toUpperCase();
        const hash = generateHash(cleanId, doc.dob, doc.doc_type);

        try {
            const query = `
                INSERT INTO gov_documents (doc_type, name, identity_no, dob, authority, address, hash)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (identity_no) DO NOTHING
                RETURNING *;
            `;
            const values = [doc.doc_type, doc.name, cleanId, doc.dob, doc.authority, doc.address, hash];
            const result = await pool.query(query, values);

            if (result.rows.length > 0) {
                console.log(`✅ Row ${doc.row}: Inserted - ${doc.name} [${doc.doc_type}] (${cleanId})`);
                inserted++;
            } else {
                console.warn(`⚠️  Row ${doc.row}: Skipped - identity_no ${cleanId} already exists`);
                skipped++;
            }
        } catch (error) {
            console.error(`❌ Row ${doc.row}: Database error - ${error.message}`);
            errors.push({ row: doc.row, identity_no: doc.identity_no, errors: [error.message] });
            failed++;
        }
    }

    // Print summary
    console.log('\n========================================');
    console.log('         IMPORT SUMMARY');
    console.log('========================================');
    console.log(`📊 Total records:   ${documents.length}`);
    console.log(`✅ Inserted:        ${inserted}`);
    console.log(`⚠️  Skipped (dupes): ${skipped}`);
    console.log(`❌ Failed:          ${failed}`);
    console.log('========================================\n');

    if (errors.length > 0) {
        console.log('Failed records:');
        errors.forEach((e) => {
            console.log(`  Row ${e.row} (${e.identity_no}): ${e.errors.join(', ')}`);
        });
    }

    // Close the pool
    await pool.end();
}

// --- Main execution ---
const filePath = process.argv[2];

if (!filePath) {
    console.error('❌ Usage: node scripts/importCSV.js <path-to-csv-file>');
    console.error('   Example: node scripts/importCSV.js data/sample_documents.csv');
    process.exit(1);
}

importCSV(filePath)
    .then(() => {
        console.log('🎉 Import process completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Import failed:', error.message);
        process.exit(1);
    });
