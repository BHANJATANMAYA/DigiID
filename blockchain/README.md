# DigiID Verify - Blockchain Integration

This folder contains the Hardhat blockchain environment for the DigiID Verify project. It includes the `IdentityLedger` smart contract which acts as an immutable, tamper-proof registry for government document hashes (Aadhaar, PAN, Voter ID).

## Prerequisites
- Node.js (v18+)
- npm

## Setup & Installation

1. Navigate to the `blockchain` directory:
   ```bash
   cd blockchain
   ```

2. Install dependencies:
   ```bash
   npm install
   ```
   *Note: Ensure Hardhat is installed globally with `npm install -g hardhat` or run it via `npx hardhat`.*

3. Setup environment variables:
   Copy `.env.example` (or `.env` template) to `.env` and configure your `HARDHAT_PRIVATE_KEY`
   ```bash
   cp .env.example .env
   ```
   *(For local testing, Hardhat accounts will be used automatically without .env).*

## Commands

### 1. Compile the Smart Contract
Compiles the Solidity files and generates the artifacts & ABI needed by the backend.
```bash
npx hardhat compile
```

### 2. Run Tests
Runs the full Chai/Mocha test suite to verify contract behavior.
```bash
npx hardhat test
```

### 3. Start Local Blockchain Network
Start the local Hardhat node on `127.0.0.1:8545`. Leave this terminal open.
```bash
npx hardhat node
```

### 4. Deploy Contract
In a new terminal window (ensure the Hardhat node is running):
```bash
npx hardhat run scripts/deploy.js --network localhost
```
The deployed contract address will be automatically saved to `deployedAddress.json`. The backend reads this file to connect to the contract.

### 5. Run Interaction Script
Tests the full lifecycle (anchor, verify, revoke) using hardhat scripts.
```bash
npx hardhat run scripts/interact.js --network localhost
```

## Backend Integration
The main Node.js backend automatically integrates with this blockchain. 
1. It reads the ABI from `blockchain/artifacts/contracts/IdentityLedger.sol/IdentityLedger.json`
2. It reads the deployed address from `blockchain/deployedAddress.json`
3. It connects using the `BLOCKCHAIN_RPC_URL` (usually `http://127.0.0.1:8545`) defined in the root `.env`.
