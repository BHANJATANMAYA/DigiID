// Run: node scripts/migrate.js
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../src/core/config/database');

const sql = fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8');

(async () => {
    try {
        console.log('🔄  Running schema migration…');
        await pool.query(sql);
        console.log('✅  gov_documents table created (students table dropped if existed)');
    } catch (err) {
        console.error('❌  Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
})();
