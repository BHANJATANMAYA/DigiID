require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const app = require('./src/app');
const pool = require('./src/core/config/database');

const PORT = process.env.PORT || 3000;

async function startServer() {
    // Log which DB we're connecting to (safe — no password shown)
    const dbTarget = process.env.DATABASE_URL
        ? `Supabase / Cloud DB (${process.env.DATABASE_URL.replace(/:([^@]+)@/, ':[REDACTED]@')})`
        : `localhost:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'identity_db'}`;
    console.log(`🔌 Connecting to database: ${dbTarget}`);

    try {
        const client = await pool.connect();
        console.log('✅ Database connection verified');
        client.release();

        app.listen(PORT, () => {
            console.log(`🚀 Server is running on http://localhost:${PORT}`);
            console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
            console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:');
        console.error('   Error:', error.message || error);
        console.error('   Code:', error.code);
        console.error('   Full error:', JSON.stringify(error, null, 2));
        console.error('💡 Make sure DATABASE_URL (or DB_HOST/DB_PORT/DB_USER/DB_PASSWORD) is set correctly in your environment variables.');
        process.exit(1);
    }
}

startServer();

