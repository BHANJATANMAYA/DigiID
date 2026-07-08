import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Resolve the private key for non-default networks.
 * Accepts both raw hex and 0x-prefixed formats.
 * Falls back to Hardhat's built-in accounts for the `hardhat` network.
 */
function getPrivateKey() {
    const raw = process.env.BLOCKCHAIN_PRIVATE_KEY || '';
    const stripped = raw.startsWith('0x') ? raw.slice(2) : raw;

    if (stripped.length !== 64) {
        // Only warn — the `hardhat` network uses its own built-in accounts.
        // Deploying to `localhost` or `sepolia` without a valid key will fail explicitly.
        return undefined;
    }
    return `0x${stripped}`;
}

const pk = getPrivateKey();
const accounts = pk ? [pk] : [];

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    // Local Hardhat node (for development)
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      ...(accounts.length ? { accounts } : {}),
    },
    // Ethereum Sepolia Testnet (for deployment)
    // Set BLOCKCHAIN_RPC_URL to your Alchemy/Infura Sepolia URL
    // Set BLOCKCHAIN_PRIVATE_KEY to your wallet private key (with testnet ETH)
    sepolia: {
      url: process.env.BLOCKCHAIN_RPC_URL || '',
      chainId: 11155111,
      accounts,
    },
    // Polygon Amoy Testnet (alternative, lower gas fees)
    amoy: {
      url: process.env.BLOCKCHAIN_RPC_URL || '',
      chainId: 80002,
      accounts,
    },
  },
};

