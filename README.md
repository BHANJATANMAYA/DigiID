# DigiID Verify — National Identity Verification Portal

**DigiID Verify** is a secure, hybrid Web2/Web3 platform for anchoring and verifying government identity documents (Aadhaar, PAN, Voter ID). It combines SHA-256 cryptographic hashing, a Supabase PostgreSQL database, and Ethereum smart contracts (`IdentityLedger.sol` on Sepolia / Hardhat) to provide immutable on-chain verification, printable identity certificates with dynamic QR codes, and a comprehensive Super Admin management portal.

---

## 🚀 Key Features

- **Blockchain Anchoring**: Generates deterministic SHA-256 fingerprints for identity documents and permanently anchors them to the Ethereum ledger.
- **Identity Verification Certificates**: Produces printable, tamper-evident certificates with dynamic QR codes linking directly to the verification portal.
- **Public Citizen Verification**: Dedicated interface for third parties to verify document validity in real-time via Certificate ID or QR scan.
- **Super Admin Portal**:
  - **Secure Authentication**: Salted PBKDF2 password hashing, HMAC cryptographically signed sessions, and brute-force lockout protection (5 failed attempts per IP/email).
  - **Live Telemetry & KPI Cards**: Real-time counters (Total, Active, Revoked, Aadhaar/PAN/Voter distributions) and live health monitors for Database, Blockchain RPC, and API.
  - **Identity Registry & Masked PII**: All sensitive identity numbers are masked by default (`XXXX XXXX 9012`).
  - **Audited PII Reveal**: Authorized unmasking requires a stated administrative purpose and is permanently logged in the immutable audit ledger.
  - **Revocation Lifecycle**: Mandatory reason required for revocations, which updates database status to `REVOKED` and marks the hash as revoked on the blockchain.
  - **Identity Correction with Versioning**: Preserves full historical audit trails, increments document version, invalidates the old hash on-chain, and anchors the newly corrected hash.
  - **Formula-Injection-Safe CSV Export**: Client-ready export with automatic sanitization for spreadsheet formula injection vectors (`=`, `+`, `-`, `@`).
- **Comprehensive Automated Test Suite**: 131 test cases spanning Unit, Security, Concurrency, Regression, Smart Contracts, and Admin workflows with automated reporting (`TEST_REPORT.md`).
- **Multilingual Support**: Built-in English and Hindi (i18n) localization.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Modern CSS3 (Glassmorphism design system), Vanilla JavaScript (no heavy frontend dependencies).
- **Backend & Serverless API**: Node.js, Express.js, Vercel Serverless Functions (`/api`).
- **Database**: Supabase PostgreSQL with Row Level Security (RLS) and versioned document history.
- **Blockchain**: Solidity (`IdentityLedger.sol`), Hardhat, Ethers.js v6.
- **Deployment Platform**: Vercel (Frontend, Serverless API, and Admin Panel).

---

## 📋 Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| [Node.js](https://nodejs.org/) | v18+ (tested on v22) | Backend runtime & tooling |
| [Supabase](https://supabase.com/) | Cloud / Local | PostgreSQL Database & Storage |
| [Hardhat](https://hardhat.org/) | Latest | Smart contract development & testing |
| [Vercel CLI](https://vercel.com/cli) | Latest | Serverless deployment |

---

## ⚙️ Environment Variables

Create `.env` files locally (which are strictly ignored by source control in `.gitignore`).

### Backend (`backend/.env`):
```env
PORT=5000
NODE_ENV=development

# Supabase / PostgreSQL Connection String
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.lrvjxqjfwomgnyfsliao.supabase.co:5432/postgres

# Blockchain Connection (Sepolia Testnet or Local Hardhat Node)
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
BLOCKCHAIN_PRIVATE_KEY=your_deployer_private_key_here

# Citizen API Bearer Token
AUTH_TOKEN=digiid-secret

# Super Admin Credentials & Session Signing
ADMIN_EMAIL=admin@digiid.gov.in
ADMIN_PASSWORD=SuperAdmin@DigiID2026
ADMIN_JWT_SECRET=digiid_super_admin_hmac_secret_2026
```

### Blockchain (`blockchain/.env`):
```env
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
BLOCKCHAIN_PRIVATE_KEY=your_deployer_private_key_here
```

---

## 🏃 Local Development & Running

1. **Install Dependencies**:
   ```bash
   npm install
   cd blockchain && npm install && cd ..
   ```

2. **Run Local Blockchain Node (Optional for local testing)**:
   ```bash
   cd blockchain
   npx hardhat node
   ```

3. **Start the Application**:
   ```bash
   npm start
   ```
   - **Citizen Portal**: `http://localhost:5000`
   - **Citizen Login**: `http://localhost:5000/login.html`
   - **Super Admin Portal**: `http://localhost:5000/admin/login.html`
     - **Email**: `admin@digiid.gov.in`
     - **Password**: `SuperAdmin@DigiID2026`

---

## 🧪 Automated Testing Suite

DigiID includes an executable master test runner verifying 131 test cases across the entire stack:

```bash
# Run all 131 automated tests and generate TEST_REPORT.md
npm test
```

### Running Targeted Test Suites:
```bash
# Validation rules (Aadhaar, PAN, Voter ID)
node --test test/unit/validation.test.js

# Cryptographic hashing & normalization
node --test test/unit/hashing.test.js

# Certificate generation, QR codes & XSS escaping
node --test test/unit/certificates.test.js

# Security, SQL injection & Token tampering
node --test test/security/security.test.js

# Admin Authentication & Rate limiting
node --test test/admin/admin-auth.test.js

# Admin End-to-End & Correction lifecycles
node --test test/admin/admin-e2e.test.js

# Smart contract tests in Hardhat
cd blockchain && npx hardhat test
```

The test runner compiles detailed pass/fail evidence, environment limitations, and security audits into [TEST_REPORT.md](TEST_REPORT.md).

---

## ☁️ Deploying & Updating on Vercel

### Will the already deployed version still be running?
**Yes!** Any previous deployment on Vercel will continue running the build snapshot that was active when it was deployed. 

However, previous deployments did not contain:
- The newly built **Super Admin Portal** (`/admin/login.html`).
- Critical bug fixes (the serverless import crash on `backend/src/core/config/supabase` and database/blockchain update synchronization).
- Security hardening (PBKDF2 admin auth, brute-force protection, CSV formula injection sanitization).

### To deploy your latest changes to Vercel:

1. **Commit and Push to GitHub**:
   ```bash
   git add .
   git commit -m "Add Super Admin portal, defect fixes, and automated test suite"
   git push origin main
   ```
   *(Vercel will detect the push and automatically initiate a zero-downtime rebuild).*

2. **Configure Admin Environment Variables on Vercel**:
   In your Vercel project dashboard, go to **Settings → Environment Variables** and ensure these variables are added:
   * `DATABASE_URL`: Your Supabase connection string
   * `BLOCKCHAIN_RPC_URL`: Your Sepolia / Alchemy RPC URL
   * `BLOCKCHAIN_PRIVATE_KEY`: Deployer private key
   * `AUTH_TOKEN`: Citizen token secret
   * `ADMIN_EMAIL`: `admin@digiid.gov.in` (or your custom admin email)
   * `ADMIN_PASSWORD`: Your strong admin password
   * `ADMIN_JWT_SECRET`: Random 32+ character HMAC secret

---

## 🛡️ Security & Privacy Architecture

- **Default PII Masking**: Citizen identification numbers are always masked (`XXXX XXXX 9012`) across responses and UI tables.
- **Zero Raw PII On-Chain**: Only cryptographic SHA-256 hashes are anchored to the blockchain.
- **Append-Only Audit Ledger**: Every admin action (login, search, PII reveal, revocation, correction, export) is immutably logged with timestamp, actor, and mandatory justification.
- **Brute-Force Lockout**: Automatically locks out repeated failed login attempts for 15 minutes.
- **CSV Formula Sanitization**: Prepends apostrophe to sensitive characters (`=`, `+`, `-`, `@`) to prevent CSV injection in spreadsheet software.

---

© 2026 DigiID Verify. All Rights Reserved.
