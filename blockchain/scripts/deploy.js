import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("Compiling contracts...");
    await hre.run("compile");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contract with account:", deployer.address);
    console.log("Network:", hre.network.name);

    const IdentityLedger = await hre.ethers.getContractFactory("IdentityLedger");
    const ledger = await IdentityLedger.deploy();
    await ledger.waitForDeployment();

    const contractAddress = await ledger.getAddress();
    console.log("IdentityLedger deployed to:", contractAddress);

    const addressFilePath = path.join(__dirname, "..", "deployedAddress.json");
    fs.writeFileSync(addressFilePath, JSON.stringify({ address: contractAddress }, null, 2));
    console.log(`Saved deployed address to ${addressFilePath}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
