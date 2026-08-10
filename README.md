# DigiID Verify — National Identity Verification Portal

**DigiID Verify** is a secure, blockchain-powered platform for anchoring and verifying government identity documents (Aadhaar, PAN, Voter ID). It uses SHA-256 cryptographic hashing, a Supabase PostgreSQL database, and Ethereum smart contracts (Hardhat / Sepolia testnet) to provide immutable on-chain verification and printable identity certificates with QR codes.

---

## 🚀 Key Features

- **Blockchain Anchoring**: Generate unique SHA-256 fingerprints for identity documents and anchor them permanently to the Ethereum ledger (Sepolia / Local Hardhat).
- **Identity Verification Certificates**: Generate printable, secure certificates with dynamic QR codes for instant verification.
- **Public Verification Portal**: Dedicated serverless interface for third parties to verify document authenticity via Certificate ID or QR scan.
- **Supabase PostgreSQL & RLS**: Database secured with Row Level Security policies for verification.
- **Multilingual Support**: Full English and Hindi (i18n) localization for a seamless citizen experience.
- **Audit Trail**: Immutable recording of all document anchoring and revocation events on the blockchain.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Modern CSS3 (Glassmorphism), and Vanilla JavaScript.
- **Backend & Serverless API**: Node.js, Express.js, Vercel Serverless Functions (`/api`).
- **Database**: Supabase PostgreSQL with Row Level Security (RLS).
- **Blockchain**: Solidity (`IdentityLedger.sol`), Hardhat, Ethers.js v6, Sepolia Testnet.
- **Deployment Platform**: Vercel (Frontend & Serverless API).

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Version | Purpose |
|---|---|---|
| [Node.js](https://nodejs.org/) | v18+ | Backend runtime & tooling |
| [Supabase](https://supabase.com/) | Cloud | PostgreSQL Database & Storage |
| [Hardhat](https://hardhat.org/) | Latest | Smart contract development & testing |
| [Vercel CLI](https://vercel.com/cli) | Latest | Serverless deployment |

---

## ⚙️ Environment Variables

Create `.env` files locally (which are strictly ignored by `.gitignore`).

### Backend (`backend/.env`):
```env
PORT=3000

# Supabase PostgreSQL Connection String
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.lrvjxqjfwomgnyfsliao.supabase.co:5432/postgres

# Blockchain Connection (Sepolia Testnet or Local Hardhat Node)
BLOCKCHAIN_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
BLOCKCHAIN_PRIVATE_KEY=your_deployer_private_key_here

# Auth Token Secret
AUTH_TOKEN=digiid-secret
```

### Blockchain (`blockchain/.env`):
```env
BLOCKCHAIN_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
BLOCKCHAIN_PRIVATE_KEY=your_deployer_private_key_here
```

---

## ☁️ Deploying to Vercel

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Prepare DigiID for Vercel deployment"
   git push origin main
   ```

2. **Import Project in Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/new).
   - Import your GitHub repository (`DigiID`).
   - Keep Framework Preset as **Other** (Vercel automatically detects `vercel.json`).

3. **Set Environment Variables on Vercel**:
   Add the following variables in **Project Settings → Environment Variables**:
   * `DATABASE_URL`: Your Supabase PostgreSQL URI
   * `BLOCKCHAIN_RPC_URL`: Your Sepolia RPC URL
   * `BLOCKCHAIN_PRIVATE_KEY`: Your Wallet Private Key
   * `AUTH_TOKEN`: `digiid-secret`

4. **Deploy**:
   Click **Deploy**. Vercel will build and host both your frontend interface and `/api` serverless endpoints.

---

## 🏃 Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   cd blockchain && npm install && cd ..
   ```

2. **Run Hardhat Unit Tests**:
   ```bash
   cd blockchain
   npx hardhat test
   ```

3. **Run Local Dev Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 🛡️ Security & Privacy

- **Data Masking**: All identity numbers are masked (`XXXX XXXX 1234`) before display or storage.
- **Privacy-Preserving On-Chain Hashing**: Only SHA-256 hashes are stored on the public blockchain — PII (Personally Identifiable Information) is never exposed on-chain.
- **Row Level Security**: Database access is protected by Supabase RLS policies.

---

© 2026 DigiID Verify. All Rights Reserved.
