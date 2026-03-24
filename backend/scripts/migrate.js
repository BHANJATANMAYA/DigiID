// Run: node scripts/migrate.js
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'identity_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'your_password',
});

const sql = fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8');

(async () => {
    try {
        console.log('🔄  Running schema migration…');
        await pool.query(sql);
        console.log('✅  gov_documents table created (students table dropped if existed)');
    } catch (err) {
        console.error('❌  Migration failed:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
})();
