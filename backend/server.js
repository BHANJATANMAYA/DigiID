require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const app = require('./src/app');
const pool = require('./src/core/config/database');

const PORT = process.env.PORT || 3000;

async function startServer() {
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
        console.error('❌ Failed to start server:', error.message);
        console.error('💡 Make sure PostgreSQL is running and your .env file is configured correctly');
        process.exit(1);
    }
}

startServer();
