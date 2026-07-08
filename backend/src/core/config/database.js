const { Pool } = require('pg');
require('dotenv').config();

// Use DATABASE_URL (Supabase / Neon / any cloud PG) if set,
// otherwise fall back to individual host/port/user/pass vars for local dev.
const poolConfig = process.env.DATABASE_URL
    ? {
          connectionString: process.env.DATABASE_URL,
          // Required by Supabase, Neon, and most cloud Postgres providers.
          ssl: { rejectUnauthorized: false },
      }
    : {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT, 10) || 5432,
          database: process.env.DB_NAME || 'identity_db',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || '',
      };

const pool = new Pool(poolConfig);

pool.on('connect', () => {
    const target = process.env.DATABASE_URL
        ? 'Supabase / Cloud PostgreSQL'
        : `${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`;
    console.log(`✅ Connected to PostgreSQL (${target})`);
});

pool.on('error', (err) => {
    console.error('❌ Unexpected database pool error:', err.message);
    process.exit(-1);
});

module.exports = pool;
