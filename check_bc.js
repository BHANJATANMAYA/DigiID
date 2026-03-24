require('dotenv').config({ path: require('path').join(__dirname, 'backend', '.env') });
const pool = require('./backend/src/core/config/database');
const { verifyHashOnChain } = require('./backend/src/core/config/blockchain');

async function test() {
    try {
        const res = await pool.query('SELECT hash FROM gov_documents LIMIT 1');
        if (!res.rows.length) {
            console.log('No records in DB');
            process.exit(0);
        }
        const hash = res.rows[0].hash;
        console.log('Testing hash from DB:', hash);
        const onchain = await verifyHashOnChain(hash);
        console.log('On-chain verification result:', onchain);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit(0);
    }
}
test();
