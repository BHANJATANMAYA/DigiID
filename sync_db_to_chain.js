require('dotenv').config({ path: require('path').join(__dirname, 'backend', '.env') });
const pool = require('./backend/src/core/config/database');
const { anchorHashOnChain } = require('./backend/src/core/config/blockchain');

async function syncAll() {
    try {
        console.log('🔄 Starting DB to Blockchain Sync...');
        const res = await pool.query('SELECT id, doc_type, identity_no, hash FROM gov_documents ORDER BY anchored_at ASC');
        console.log(`Found ${res.rows.length} documents in DB.`);

        let synced = 0;
        let failed = 0;

        for (const doc of res.rows) {
            console.log(`Anchoring document ID: ${doc.id} (${doc.doc_type})`);
            const chainResult = await anchorHashOnChain(doc.hash, doc.doc_type);

            if (chainResult.success) {
                console.log(`✅ Synced block: ${chainResult.blockNumber}`);

                // Issue #5: Write block_number back to DB
                if (chainResult.blockNumber) {
                    await pool.query(
                        'UPDATE gov_documents SET block_number = $1 WHERE id = $2',
                        [chainResult.blockNumber, doc.id]
                    );
                    console.log(`   📝 Updated block_number in DB for document ID: ${doc.id}`);
                }
                synced++;
            } else {
                console.log(`❌ Failed to sync: ${doc.hash}`);
                failed++;
            }
        }

        console.log(`\n📊 Summary: ${synced} synced, ${failed} failed out of ${res.rows.length} total.`);
    } catch (err) {
        console.error('Error during sync:', err.message);
    } finally {
        console.log('🏁 Sync complete.');
        await pool.end();
        process.exit(0);
    }
}

syncAll();
