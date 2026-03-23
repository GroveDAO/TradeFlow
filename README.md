# TradeFlow

> **SMEs get paid in hours, not 90 days — using their invoices as collateral.**

TradeFlow is a decentralized invoice-factoring platform built on the [Hedera](https://hedera.com) network. Small and medium-sized enterprises (SMEs) upload their outstanding invoices, receive an AI-generated risk score, and can request an immediate cash advance against those invoices. Liquidity providers earn yield by depositing USDC-H into the Bonzo Finance lending vault, while an immutable reputation ledger tracks every debtor payment event on-chain.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org)
[![Hedera](https://img.shields.io/badge/Hedera-Testnet%2FMainnet-5B4FBF)](https://hedera.com)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Repository Structure](#repository-structure)
5. [How It Works](#how-it-works)
   - [Invoice Lifecycle](#invoice-lifecycle)
   - [Risk Scoring](#risk-scoring)
   - [Reputation System](#reputation-system)
   - [Lending Vault](#lending-vault)
6. [Smart Contracts](#smart-contracts)
7. [API Reference](#api-reference)
8. [Database Schema](#database-schema)
9. [User Roles](#user-roles)
10. [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Environment Variables](#environment-variables)
    - [Local Development](#local-development)
    - [Docker Compose](#docker-compose)
11. [Scripts Reference](#scripts-reference)
12. [Deploying Smart Contracts](#deploying-smart-contracts)
13. [Hedera Setup](#hedera-setup)
14. [Testing](#testing)
15. [Linting](#linting)
16. [Key Numbers](#key-numbers)
17. [Contributing](#contributing)

---

## Overview

Traditional invoice factoring forces SMEs to wait 60–90 days for payment, or pay steep fees to a factor. TradeFlow replaces the manual, paper-heavy process with a transparent, on-chain pipeline:

| Pain point | TradeFlow solution |
|---|---|
| Weeks of credit checks | GPT-4o AI risk score in seconds |
| Opaque fee structure | Risk-tiered, on-chain fee (0.5–8% APY) |
| Single counterparty risk | Decentralized lending pool (Bonzo Finance) |
| No payment history | Tamper-proof HCS reputation ledger |
| PDF invoices in email | IPFS-pinned, NFT-backed proof of obligation |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         Browser / Client                       │
│              Next.js 15  ·  Tailwind CSS  ·  Recharts         │
└──────────────────────────┬───────────────────────────────────┘
                           │ REST / JSON  (JWT auth)
┌──────────────────────────▼───────────────────────────────────┐
│                        Express API  (port 4000)                │
│   Invoices · Lenders · Debtors · Keeper                       │
│                                                                │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐    │
│  │ HederaService│  │ BonzoService │  │  AIKeeperAgent    │    │
│  │  HTS NFT     │  │ Aave v3 EVM  │  │  GPT-4o + LangChain│  │
│  │  HCS topics  │  │  USDC-H vault│  │  keeper loop      │    │
│  └──────┬──────┘  └──────┬───────┘  └─────────┬─────────┘    │
│         │                │                     │              │
│  ┌──────▼──────┐  ┌──────▼───────┐  ┌─────────▼─────────┐   │
│  │  IPFSService │  │ OracleService│  │ReputationService   │   │
│  │  Pinata      │  │ SupraOracles │  │HCS rebuild         │   │
│  └─────────────┘  └──────────────┘  └───────────────────┘    │
│                                                                │
│                 Prisma ORM  ──►  PostgreSQL 16                 │
└──────────────────────────────────────────────────────────────┘
                           │
          ┌────────────────┴────────────────┐
          │            Hedera Network        │
          │  HTS (TFINV NFT collection)      │
          │  HCS (per-debtor reputation)     │
          │  EVM JSON-RPC (Bonzo Finance)    │
          └─────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | [Next.js 15](https://nextjs.org), React 18, Tailwind CSS, Recharts, Radix UI |
| Backend | [Express 4](https://expressjs.com), TypeScript 5, Prisma ORM, `express-async-errors` |
| Auth | [NextAuth.js 4](https://next-auth.js.org), JWT (`jsonwebtoken`) |
| AI | [LangChain](https://js.langchain.com) + OpenAI GPT-4o (`@langchain/openai`) |
| Blockchain (native) | [Hedera SDK](https://docs.hedera.com/hedera/sdks-and-apis/sdks) `@hashgraph/sdk` |
| Blockchain (EVM) | [ethers.js v6](https://docs.ethers.org) via Hedera JSON-RPC relay |
| DeFi | [Bonzo Finance](https://bonzo.finance) (Aave v3 fork on Hedera EVM) |
| Oracle | [SupraOracles](https://supraoracles.com) pull-service (HBAR/USD) with CoinGecko fallback |
| Storage | [Pinata](https://pinata.cloud) / IPFS (`@pinata/sdk`) |
| Smart contracts | [Hardhat](https://hardhat.org), Solidity 0.8.20, [OpenZeppelin 5](https://openzeppelin.com) |
| Database | PostgreSQL 16 |
| Validation | [Zod](https://zod.dev) |
| File upload | [multer](https://github.com/expressjs/multer) (memory storage, 10 MB limit) |
| Testing | Jest + ts-jest (API), Hardhat + Chai (contracts) |
| Containerisation | Docker Compose |

---

## Repository Structure

```
TradeFlow/
├── apps/
│   ├── api/                    # Express REST API
│   │   ├── prisma/
│   │   │   └── schema.prisma   # Database schema
│   │   └── src/
│   │       ├── index.ts        # App entry-point
│   │       ├── middleware/
│   │       │   └── auth.ts     # JWT auth + role guard
│   │       ├── routes/
│   │       │   ├── invoices.ts # Invoice CRUD + advance/repay
│   │       │   ├── lenders.ts  # LP deposit / withdraw
│   │       │   ├── debtors.ts  # Reputation lookup
│   │       │   └── keeper.ts   # Admin keeper trigger
│   │       ├── services/
│   │       │   ├── AIKeeperAgent.ts    # GPT-4o risk scorer + keeper loop
│   │       │   ├── BonzoService.ts     # Aave v3 vault interactions
│   │       │   ├── HederaService.ts    # HTS NFT + HCS topics
│   │       │   ├── IPFSService.ts      # Pinata IPFS uploads
│   │       │   ├── OracleService.ts    # HBAR/USD price feed
│   │       │   └── ReputationService.ts# Score rebuild from HCS
│   │       └── scripts/
│   │           └── setupHedera.ts      # One-time Hedera init
│   └── web/                    # Next.js 15 frontend
│       ├── app/
│       │   ├── (auth)/login/   # Login page
│       │   ├── dashboard/      # SME + LP dashboard
│       │   │   ├── invoices/   # Invoice list, detail, upload
│       │   │   ├── lend/       # LP deposit UI
│       │   │   └── portfolio/  # Portfolio overview
│       │   └── explore/        # Public invoice marketplace
│       └── components/
│           ├── InvoiceCard.tsx
│           ├── LendingPool.tsx
│           ├── ReputationChart.tsx
│           └── RiskScoreBadge.tsx
├── packages/
│   ├── contracts/              # Hardhat / Solidity
│   │   ├── contracts/
│   │   │   ├── InvoiceFactory.sol  # On-chain invoice registry
│   │   │   ├── LendingPool.sol     # USDC-H lending pool
│   │   │   └── MockERC20.sol       # Testing stub
│   │   ├── scripts/deploy.ts       # Deployment script
│   │   └── test/InvoiceFactory.test.ts
│   └── shared/                 # Shared TypeScript types
│       └── types/
│           ├── invoice.ts      # InvoiceDTO, RiskAssessment
│           ├── lender.ts       # LenderDTO, VaultStats
│           └── reputation.ts   # DebtorReputationDTO, ReputationEvent
├── docker-compose.yml
├── package.json                # Workspace root (npm workspaces)
└── .env.example
```

---

## How It Works

### Invoice Lifecycle

An invoice moves through the following states:

```
UPLOADED  ──►  MINTED  ──►  SCORED  ──►  ADVANCED  ──►  REPAID
                                                   └──►  DEFAULTED
```

| Status | Description |
|---|---|
| `UPLOADED` | Invoice metadata saved to the database |
| `MINTED` | PDF pinned to IPFS; NFT minted on Hedera Token Service (HTS); HCS event `ISSUED` submitted |
| `SCORED` | GPT-4o has assigned `riskScore`, `riskTier`, `advanceRate`, `feePercent` |
| `ADVANCED` | Funds borrowed from Bonzo vault and sent to the SME's EVM address |
| `REPAID` | SME repaid principal + fee; NFT burned; HCS event submitted; reputation updated |
| `DEFAULTED` | Keeper detected >30 days overdue; HCS event submitted; reputation penalised |

### Risk Scoring

The `AIKeeperAgent` calls OpenAI GPT-4o with a structured system prompt and returns a JSON object:

```json
{
  "riskTier": "AA",
  "riskScore": 82,
  "advanceRate": 0.85,
  "feePercent": 1.8,
  "reasoning": "Strong payment history with no defaults...",
  "redFlags": []
}
```

| Field | Description |
|---|---|
| `riskTier` | `AAA` → `CCC` (7 tiers) |
| `riskScore` | 0–100 (higher = safer) |
| `advanceRate` | Fraction of face value advanced (up to 0.95) |
| `feePercent` | Annualised factoring fee (0.5–8%) |
| `reasoning` | Human-readable justification |
| `redFlags` | Array of risk flags identified by the model |

The model is given: invoice amount, currency, days until due, debtor name, debtor reputation score (0–100), on-time / late / default counts, current HBAR/USD price, and the Bonzo vault APY.

### Reputation System

Every debtor has a dedicated **HCS topic** where payment events are appended as immutable, ordered messages:

| Event | Score impact |
|---|---|
| `ISSUED` | No change |
| `PAID_ON_TIME` | +2 points |
| `PAID_LATE` | −5 points |
| `DEFAULTED` | −15 points |

Scores start at 50 and are clamped to 0–100. The `ReputationService.rebuildFromHCS()` method can replay the entire HCS history to recompute a score from scratch, ensuring a single source of truth.

### Lending Vault

Liquidity providers deposit USDC-H into the **Bonzo Finance** vault (an Aave v3 fork deployed on Hedera's EVM layer). The platform then borrows from the vault to fund SME advances and repays with interest when invoices are settled. Key vault metrics:

- **APY for LPs**: 6–8% (real-time from `getReserveData`)
- **Currency**: USDC-H (Hedera native USDC)
- **Liquidation threshold**: 80% utilisation rate (enforced on-chain in `LendingPool.sol`)

---

## Smart Contracts

Two production contracts are deployed on Hedera EVM:

### `InvoiceFactory.sol`

Registers and tracks the full lifecycle of every invoice on-chain.

| Function | Access | Description |
|---|---|---|
| `authorizeFactor(address)` | `onlyOwner` | Grants a backend address permission to manage invoices |
| `registerInvoice(id, borrower, faceValue, dueDate)` | `onlyFactor` | Creates an invoice record |
| `markAdvanced(id, amount, feePercent)` | `onlyFactor` | Records that an advance was issued |
| `markRepaid(id)` | `onlyFactor` | Marks invoice as repaid |
| `markDefaulted(id)` | `onlyOwner` | Marks invoice as defaulted |
| `getInvoice(id)` | view | Returns the full `InvoiceRecord` struct |
| `count()` | view | Returns total number of registered invoices |

**Events**: `InvoiceRegistered`, `InvoiceAdvanced`, `InvoiceRepaid`, `InvoiceDefaulted`, `FactorAuthorized`

### `LendingPool.sol`

USDC-H lending pool with share-token accounting and interest accrual.

| Function | Access | Description |
|---|---|---|
| `deposit(amount)` | public | LP deposits USDC-H; receives proportional share tokens |
| `withdraw(shareAmount)` | public | LP redeems shares for USDC-H + yield |
| `borrow(invoiceId, borrower, amount, feePercent)` | `onlyFactory` | Issues a loan for an invoice advance |
| `repay(invoiceId)` | public | Borrower repays principal + accrued interest |
| `liquidate(invoiceId)` | `onlyOwner` | Writes off a defaulted loan |
| `getUtilizationRate()` | view | Returns utilisation in basis points |
| `availableLiquidity()` | view | Returns un-borrowed USDC-H |

**Constants**: Liquidation threshold 80% · Interest rate ~10% APY (expressed per-second in 1e18)

**Events**: `Deposited`, `Withdrawn`, `Borrowed`, `Repaid`, `Liquidated`

---

## API Reference

All endpoints are prefixed with `/api`. Authenticated routes require an `Authorization: Bearer <jwt>` header. The JWT is verified against `NEXTAUTH_SECRET`.

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | — | Returns `{ status: "ok", timestamp }` |

### Invoices

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/invoices/upload` | ✅ | Upload PDF + metadata; mints HTS NFT; pins to IPFS |
| `GET` | `/api/invoices` | ✅ | List the authenticated user's invoices |
| `GET` | `/api/invoices/explore` | — | Public marketplace of `SCORED`/`ADVANCED` invoices |
| `GET` | `/api/invoices/:id` | ✅ | Get a single invoice (owner-only) |
| `POST` | `/api/invoices/:id/score` | ✅ | Run AI risk scoring on an invoice |
| `POST` | `/api/invoices/:id/advance` | ✅ | Request a cash advance against a scored invoice |
| `POST` | `/api/invoices/:id/repay` | ✅ | Repay an advance; burns the NFT; updates reputation |

**Upload request** (`multipart/form-data`):
- `invoice` – PDF file (max 10 MB)
- `metadata` – JSON string matching the schema below

```jsonc
{
  "debtorName": "Acme Corp",
  "debtorAddress": "123 Main St",
  "debtorHederaId": "0.0.12345",   // optional
  "amount": 10000,
  "currency": "USD",               // defaults to "USD"
  "dueDate": "2026-06-01T00:00:00Z",
  "invoiceNumber": "INV-2026-001"
}
```

**Upload response**:
```jsonc
{
  "invoice": { /* InvoiceDTO */ },
  "hashScanUrl": "https://hashscan.io/testnet/token/0.0.XXXXX/1",
  "ipfsUrl": "https://ipfs.io/ipfs/bafyrei..."
}
```

### Lenders

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| `POST` | `/api/lenders/deposit` | ✅ | LENDER, ADMIN | Deposit USDC-H to Bonzo vault |
| `POST` | `/api/lenders/withdraw` | ✅ | LENDER, ADMIN | Withdraw USDC-H from Bonzo vault |
| `GET` | `/api/lenders/stats` | — | — | Public vault APY + total deposited |
| `GET` | `/api/lenders/my-deposits` | ✅ | — | List authenticated user's deposits |

### Debtors

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/debtors` | — | List all debtors sorted by reputation score |
| `GET` | `/api/debtors/lookup/:name` | — | Look up a debtor by name |
| `GET` | `/api/debtors/:id/history` | — | Full HCS event history for a debtor |
| `POST` | `/api/debtors/:id/rebuild` | ✅ | Rebuild reputation score from HCS replay |

### Keeper

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| `POST` | `/api/keeper/run` | ✅ | ADMIN | Manually trigger a keeper cycle |

---

## Database Schema

Managed by Prisma with PostgreSQL. Run `npm run prisma:migrate` to apply migrations.

```
User
  id, email (unique), name, companyName
  hederaAccountId?, evmAddress?
  role: SME | LENDER | ADMIN
  invoices[], deposits[]

Invoice
  id, invoiceNumber (unique), debtorName, debtorAddress, debtorHederaId?
  amount, currency, dueDate, ownerId → User
  ipfsHash?, htsTokenId?, htsSerialNumber?, hcsReputationSeq?
  status: UPLOADED | MINTED | SCORED | ADVANCED | REPAID | DEFAULTED
  riskScore?, riskTier? (AAA→CCC), advanceRate?, advanceAmount?
  advanceTxId?, repaidAt?, repayTxId?
  advances[]

Advance
  id, invoiceId → Invoice
  amount, feePercent, txId
  repaid, repaidAt?, repayTxId?

LPDeposit
  id, userId → User
  amount, currency (USDC-H), bonzoShareTokens?
  txId, withdrawn, withdrawnAt?

DebtorReputation
  id, debtorName, debtorHederaId? (unique)
  hcsTopicId
  totalInvoices, paidOnTime, latePaid, defaulted
  avgDaysToPayment?, reputationScore (0–100, default 50)
  lastUpdated
```

---

## User Roles

| Role | Capabilities |
|---|---|
| `SME` | Upload invoices, request scoring & advances, repay, view own invoices |
| `LENDER` | All SME capabilities + deposit/withdraw USDC-H to/from vault |
| `ADMIN` | All capabilities + trigger keeper cycle manually |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20 and **npm** ≥ 10
- **PostgreSQL** 16 (or Docker)
- A **Hedera testnet account** ([portal.hedera.com](https://portal.hedera.com))
- An **OpenAI API key** with GPT-4o access
- A **Pinata** account (free tier is sufficient for development)
- (Optional) A **SupraOracles** API key for production price feeds

### Environment Variables

Copy `.env.example` to `.env` and fill in every value:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `HEDERA_OPERATOR_ID` | Your Hedera account ID (e.g. `0.0.12345`) |
| `HEDERA_OPERATOR_KEY` | Your Hedera DER-encoded private key |
| `HEDERA_NETWORK` | `testnet` or `mainnet` |
| `HEDERA_INVOICE_TOKEN_ID` | HTS token ID for invoice NFTs (created by setup script) |
| `HEDERA_ALERTS_TOPIC_ID` | HCS topic for system-level alerts |
| `HEDERA_EVM_RPC` | Hedera JSON-RPC endpoint (default: `https://testnet.hashio.io/api`) |
| `EVM_PRIVATE_KEY` | EVM private key (`0x…`) for signing vault transactions |
| `BONZO_VAULT_ADDRESS` | Bonzo Finance vault contract address on Hedera EVM |
| `USDC_H_ADDRESS` | USDC-H ERC-20 contract address on Hedera EVM |
| `INVOICE_FACTORY_ADDRESS` | Deployed `InvoiceFactory` contract address |
| `SUPRA_API_KEY` | SupraOracles API key |
| `SUPRA_PULL_URL` | SupraOracles pull-service URL |
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `DATABASE_URL` | Full Prisma connection string |
| `OPENAI_API_KEY` | OpenAI API key (`sk-…`) |
| `PINATA_API_KEY` | Pinata API key |
| `PINATA_SECRET_API_KEY` | Pinata secret API key |
| `NEXT_PUBLIC_URL` | Public URL of the web app (used for CORS) |
| `NEXT_PUBLIC_API_URL` | URL of the API server as seen by the browser |
| `NEXTAUTH_SECRET` | Secret used to sign JWT tokens (generate with `openssl rand -base64 32`) |

### Local Development

```bash
# 1. Install all workspace dependencies
npm install

# 2. Start PostgreSQL (if not using Docker)
#    or: docker compose up -d postgres

# 3. Apply database migrations
npm run prisma:migrate --workspace=apps/api

# 4. (First time only) create the Hedera NFT collection and HCS topic
npm run setup:hedera

# 5. Start the API and web app in watch mode
npm run dev
#   API:  http://localhost:4000
#   Web:  http://localhost:3000
```

### Docker Compose

The supplied `docker-compose.yml` starts **PostgreSQL**, the **API**, and the **web app** together:

```bash
# Build images and start all services
docker compose up --build

# Run in the background
docker compose up --build -d

# Stop all services
docker compose down
```

Services and their ports:

| Service | Port |
|---|---|
| PostgreSQL | 5432 |
| API | 4000 |
| Web | 3000 |

---

## Scripts Reference

All scripts are run from the repository root unless noted.

| Command | Description |
|---|---|
| `npm run dev` | Start API + web in watch mode (concurrently) |
| `npm run build` | Build shared types → API → web |
| `npm run test` | Run Jest (API) + Hardhat (contracts) test suites |
| `npm run lint` | ESLint for API and Next.js web app |
| `npm run setup:hedera` | Run the one-time Hedera initialisation script |
| `npm run prisma:migrate --workspace=apps/api` | Apply Prisma migrations |
| `npm run prisma:studio --workspace=apps/api` | Open Prisma Studio (database GUI) |
| `npm run prisma:generate --workspace=apps/api` | Regenerate Prisma client |
| `npm run compile --workspace=packages/contracts` | Compile Solidity contracts |
| `npm run deploy:testnet --workspace=packages/contracts` | Deploy contracts to Hedera testnet |

---

## Deploying Smart Contracts

```bash
# Set USDC_H_ADDRESS and EVM_PRIVATE_KEY in .env, then:
npm run deploy:testnet --workspace=packages/contracts
```

The deploy script will:
1. Deploy `LendingPool` with the USDC-H token address
2. Deploy `InvoiceFactory` pointing at the pool
3. Call `setInvoiceFactory` to authorise the factory in the pool
4. Write a `deployments.json` file with all addresses
5. Print the `LENDING_POOL_ADDRESS` and `INVOICE_FACTORY_ADDRESS` values to add to `.env`

---

## Hedera Setup

The one-time setup script (`apps/api/src/scripts/setupHedera.ts`) creates:
- An HTS **NFT collection** (token type `NON_FUNGIBLE_UNIQUE`, symbol `TFINV`) for invoice NFTs
- An HCS **topic** for system-level alert messages

Run it once after setting your Hedera credentials:

```bash
npm run setup:hedera
```

Copy the printed token ID and topic ID into `HEDERA_INVOICE_TOKEN_ID` and `HEDERA_ALERTS_TOPIC_ID` in `.env`.

---

## Testing

```bash
# Run the full test suite
npm run test

# API unit tests only (Jest)
npm run test --workspace=apps/api

# Smart contract tests only (Hardhat + Chai)
npm run test --workspace=packages/contracts
```

The API test suite (`src/__tests__/AIKeeperAgent.test.ts`) covers:
- Invoice scoring via `AIKeeperAgent`
- Oracle and vault stats calls
- Keeper cycle processing (late payments, defaults)

The contract test suite (`test/InvoiceFactory.test.ts`) covers:
- Deployment, ownership, and factor authorisation
- Invoice registration, advance, repay, and default lifecycle
- Duplicate registration guard
- Event emission

---

## Linting

```bash
# Lint both API and web
npm run lint

# Lint API only
npm run lint --workspace=apps/api

# Lint web only
npm run lint --workspace=apps/web
```

---

## Key Numbers

| Metric | Value |
|---|---|
| Transaction cost on Hedera | ~$0.0001 |
| Time to advance | ~20 minutes (AI score + vault borrow) |
| Max advance rate | Up to 95% of invoice face value |
| Factoring fee range | 0.5%–8% APY (risk-adjusted) |
| LP yield | 6–8% APY (Bonzo vault) |
| Default threshold | >30 days overdue |
| Keeper loop interval | 60 seconds (production) |
| PDF upload limit | 10 MB |

---

## Contributing

1. Fork the repository and create a feature branch (`git checkout -b feat/your-feature`).
2. Make your changes, ensuring existing tests still pass (`npm run test`).
3. Add tests for any new behaviour.
4. Run the linter (`npm run lint`) and fix any warnings.
5. Open a pull request against `main` with a clear description of the change.

Please follow the existing TypeScript and Solidity coding style. For significant changes, open an issue first to discuss the approach.

---

*Built with ❤️ by [GroveDAO](https://github.com/GroveDAO)*
