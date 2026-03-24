require('dotenv').config({ path: require('path').join(__dirname, 'backend', '.env') });
const pool = require('./backend/src/core/config/database');
const { anchorHashOnChain } = require('./backend/src/core/config/blockchain');

async function syncAll() {
    try {
        console.log('🔄 Starting DB to Blockchain Sync...');
        const res = await pool.query('SELECT id, doc_type, identity_no, hash FROM gov_documents ORDER BY anchored_at ASC');
        console.log(`Found ${res.rows.length} documents in DB.`);

        for (const doc of res.rows) {
            const identityRef = doc.identity_no.slice(-4);
            console.log(`Anchoring document ID: ${doc.id} (Ref: ${identityRef})`);
            const chainResult = await anchorHashOnChain(doc.hash, doc.doc_type, identityRef);

            if (chainResult.success) {
                console.log(`✅ Synced block: ${chainResult.blockNumber}`);
            } else {
                console.log(`❌ Failed to sync: ${doc.hash}`);
            }
        }
    } catch (err) {
        console.error('Error during sync:', err.message);
    } finally {
        console.log('🏁 Sync complete.');
        process.exit(0);
    }
}

syncAll();
