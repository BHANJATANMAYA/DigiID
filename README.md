# DigiID Verify — National Identity Verification Portal

**DigiID Verify** is a secure, blockchain-powered platform for anchoring and verifying government identity documents (Aadhaar, PAN, Voter ID). It uses SHA-256 hashing, a PostgreSQL database, and a local Ethereum blockchain (Hardhat) to provide immutable on-chain verification and printable identity certificates.

---

## 🚀 Key Features

- **Blockchain Anchoring**: Generate unique SHA-256 fingerprints for identity documents and anchor them to the Ethereum ledger.
- **Identity Verification Certificates**: Generate printable, secure certificates with dynamic QR codes for instant verification.
- **Public Verification Page**: A dedicated interface for third parties to verify document authenticity via Certificate ID or QR scan.
- **Multilingual Support**: Full English and Hindi (i18n) localization for a seamless citizen experience.
- **Audit Trail**: Immutable recording of all anchoring events on the blockchain.

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5, CSS3 (Glassmorphism), and JavaScript.
- **Backend**: Node.js & Express.js.
- **Database**: PostgreSQL (Metadata & Hash storage).
- **Blockchain**: Solidity Smart Contracts + Hardhat (Local Ethereum Network).
- **Utilities**: `qrcode` for QR generation, `puppeteer` for PDF export, `ethers.js` for blockchain interaction.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Version | Purpose |
|---|---|---|
| [Node.js](https://nodejs.org/) | v18+ | Backend runtime & tooling |
| [PostgreSQL](https://www.postgresql.org/) | v12+ | Local database for metadata |
| [Hardhat](https://hardhat.org/) | Latest | Local Ethereum blockchain simulation |
| Git | Any | Version control |

---

## ⚙️ Project Setup

### 1. Install Dependencies

Install root and blockchain dependencies:
```bash
# Root dependencies
npm install

# Blockchain dependencies
cd blockchain
npm install
cd ..
```

### 2. Database Configuration

1. Create a PostgreSQL database named `identity_db`.
2. Run the migration script to initialize tables:
   ```bash
   node backend/scripts/migrate.js
   ```

### 3. Environment Variables

Create a `.env` file in the `backend/` directory:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=identity_db
DB_USER=your_username
DB_PASSWORD=your_password
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
```

---

## 🏃 Running the Application

You will need **three separate terminals**:

### Terminal 1: Local Blockchain
```bash
cd blockchain
npx hardhat node
```

### Terminal 2: Smart Contract Deployment
```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```
*Note: This generates the contract address and ABI used by the backend.*

### Terminal 3: Backend Server
```bash
npm start
```

---

## 🌐 Usage

1. Open `http://localhost:3000` in your browser.
2. **Login**: Use Phone `9876543210` and OTP `123456` (Demo Mode).
3. **Anchor**: Enter identity details and click **"Secure Details on Ledger"**.
4. **Certificate**: Once anchored, click **"View Certificate"** to see your blockchain-verified document.
5. **Verify**: Use the "Quick Identity Verify" tool on the dashboard or use the Public Verification page.

---

## 🛡️ Security & Privacy
- All identity numbers are masked (`XXXX XXXX 1234`) before being displayed or stored.
- Only SHA-256 hashes are stored on the public blockchain, ensuring PII (Personally Identifiable Information) remains private.
- Compliant with GIGW 3.0 and STQC architectural guidelines.

---

© 2025 DigiID Verify. All Rights Reserved.

