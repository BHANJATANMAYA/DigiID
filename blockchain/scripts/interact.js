import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const addressFilePath = path.join(__dirname, "..", "deployedAddress.json");
    if (!fs.existsSync(addressFilePath)) {
        console.error("deployedAddress.json not found! Please run 'npx hardhat run scripts/deploy.js --network localhost' first.");
        process.exit(1);
    }

    const { address } = JSON.parse(fs.readFileSync(addressFilePath, "utf8"));
    const IdentityLedger = await hre.ethers.getContractFactory("IdentityLedger");
    const ledger = IdentityLedger.attach(address);

    console.log(`\nUsing IdentityLedger at address: ${address}\n`);

    const sampleHash = hre.ethers.id("sample-aadhaar-hash-12345");
    const docType = "aadhaar";
    const identityRef = "1234";

    console.log(`[1] Anchoring Hash: ${sampleHash}`);
    try {
        const anchorTx = await ledger.anchorDocument(sampleHash, docType, identityRef);
        await anchorTx.wait();
        console.log(`✅ Anchored Document successfully. Tx hash: ${anchorTx.hash}\n`);
    } catch (err) {
        console.log(`⚠️ Anchoring failed or already anchored. Skipped.\n`);
    }

    console.log(`[2] Verifying Document existence...`);
    const verifyResult1 = await ledger.verifyDocument(sampleHash);
    console.log(`Exists: ${verifyResult1[0]}, Revoked: ${verifyResult1[1]}, Type: ${verifyResult1[2]}, Ref: ${verifyResult1[3]}, Anchored: ${verifyResult1[4]}`);

    console.log(`\n[3] Checking isHashValid...`);
    const isValid1 = await ledger.isHashValid(sampleHash);
    console.log(`Is Hash Valid? ${isValid1}\n`);

    console.log(`[4] Revoking Document...`);
    try {
        const revokeTx = await ledger.revokeDocument(sampleHash);
        await revokeTx.wait();
        console.log(`✅ Revoked Document successfully. Tx hash: ${revokeTx.hash}\n`);
    } catch (err) {
        console.log(`⚠️ Revocation failed or already revoked. Skipped.\n`);
    }

    console.log(`[5] Verifying Document after revocation...`);
    const verifyResult2 = await ledger.verifyDocument(sampleHash);
    console.log(`Exists: ${verifyResult2[0]}, Revoked: ${verifyResult2[1]}, RevokedAt: ${verifyResult2[5]}`);

    console.log(`\n[6] Checking isHashValid after revocation...`);
    const isValid2 = await ledger.isHashValid(sampleHash);
    console.log(`Is Hash Valid? ${isValid2}\n`);

    console.log("Interaction script complete!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
