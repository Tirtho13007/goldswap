> Production update, 2 November 2026: see [DEPLOYMENT.md](DEPLOYMENT.md). Staff MFA/session reauthentication now replace the earlier blanket production block; live email delivery is implemented but requires provider configuration. Historical notes below may describe earlier milestones.

# Crypto operations — 1 November 2026

**Current confirmed rules and gold implementation: [PLATFORM_RULES.md](PLATFORM_RULES.md).** This page describes the original manual crypto flow; the confirmed policy supersedes its earlier activation notes.

Deposit, withdrawal and purchase funding accept **BTC, ETH, USDC, USDT, XRP and TRX only**. Fiat providers, cards and gateways are removed from the selectable UI and rejected by the backend route whitelist.

## Local setup

Run the steps in [BACKEND_SETUP.md](BACKEND_SETUP.md). Existing accounts and demo snapshots are preserved by migration 003. There is no default administrator password. Bootstrap the first Super Admin with your own email and a unique password, then sign in and open **Operations centre → networks**. Configure actual receiving mainnet addresses and XRP tags, required confirmations, minimum amounts and withdrawal fees. Deposit and withdrawal enable flags are separate; all networks start disabled.

Do not use an illustrative address from a screenshot or the integration tests. Tests run in an isolated in-memory database; their balances, documents and transaction hashes are fixtures and never populate the local account database.

## User workflow

1. Submit a legal name, country, identity document type and private document in **Verification / KYC**. A permitted reviewer can approve, reject, or request more information with a reason. Approved identity fields cannot be edited through the ordinary profile endpoint. Email verification does not block access to the dashboard or these menus.
2. Select an enabled asset/network in **Deposit**. Submit the exact decimal amount, transaction hash, transfer/output/log index and proof. Pending requests never credit funds. The reviewer checks the actual chain receipt, asset/token contract, destination, tag, amount and confirmations, then records evidence and approves or rejects. Approval credits the crypto balance once.
3. **Withdraw** requires approved KYC and sufficient available crypto. The requested amount includes the configured fee; the net payout is amount minus fee. Submission reserves the entire amount. Pending requests may be cancelled; rejection/cancellation releases the reserve once. Staff approval precedes processing. After an actual external payment, processing staff record the transaction hash/index, exact recipient/tag, confirmations, net amount and payout proof to complete the request. Completion consumes the reserve once.

This implementation records manual verification; it does not independently query chains, sign transactions, hold private wallet keys or send funds automatically. Staff must verify transfers through their operational wallet/chain tools. Gold is supplied directly by GoldSwap. Fresh 30-second quotes execute against documented platform gold inventory and funded crypto liquidity. Five-day holds reserve their profit at entry and settle automatically. See PLATFORM_RULES.md for physical delivery and the confirmed fee schedule.

## Permissions and records

Staff queues require `kyc.view`, `deposits.view` or `withdrawals.view`. Decisions require the matching `.review` permission. Payout processing and proof upload require `withdrawals.process`. Network edits require both Super Admin and `configuration.manage`. Self approval/processing is denied. Existing role assignment and explicit allow/deny APIs remain available. Production staff endpoints stay blocked until MFA is implemented.

Amounts use integer atoms, never floating point money. Available and reserved balances update atomically with balanced money journals and audit events. Row locks protect concurrent requests; idempotency keys protect retries. A unique chain/hash/transfer-index combination prevents duplicate deposit and payout records. The dashboard shows actual requests/balances and keeps demo snapshots separate. No real crypto is credited from demo records.

## Private uploads

Accepted uploads: PNG, JPEG and PDF, up to 5 MB, with basic file signature checks. Files are stored as AES-256-GCM ciphertext, downloaded as attachments and scoped to their owner or permitted case reviewers; users can also download their completed payout proofs. Download access is audited. Malware scanning and document retention automation are not yet integrated.

Production requires `UPLOAD_ENCRYPTION_KEY`: 32 cryptographically random bytes encoded as 64 hexadecimal characters. Keep it stable and back it up separately from the database. Development generates `data/private-files.key`, which must also be preserved with local backups. Do not commit either key. Losing or replacing the key prevents decryption of existing documents.

## API additions

All paths are under `/api/v1` and require a signed-in account:

| Endpoint | Purpose |
|---|---|
| `GET /crypto/methods` | Supported routes, enabled flags, fees and limits |
| `POST /files`, `GET /files/:id` | Encrypted private upload / authorised download |
| `GET/POST /kyc` | Own verification case and submission |
| `GET/POST /deposits` | Own deposit history and proof submission |
| `GET/POST /withdrawals` | Own withdrawal history and reservation |
| `POST /withdrawals/:id/cancel` | Cancel own pending request |
| `POST /gold/quote` | Fresh crypto-only buy/sell/gold-withdrawal quote |
| `GET /staff/operations/:kind` | Permission-scoped review queues |
| `PUT /staff/crypto/:id` | Super Admin network settings |
| `POST /staff/kyc/:id/review` | KYC decision |
| `POST /staff/deposits/:id/review` | Verify/approve or reject deposit |
| `POST /staff/withdrawals/:id/review` | Approve/reject withdrawal |
| `POST /staff/withdrawals/:id/process` | Start an approved payout |
| `POST /staff/withdrawals/:id/complete` | Record verified actual payout |

## Validation and remaining activation work

Run `npm test`, `npm run typecheck:backend` and `npm run build`. Integration tests cover private document access, manual KYC, exact amounts, disabled networks, deposit idempotency/approval, concurrent withdrawals, reserve release, payout completion and journal balancing.

Before live financial use, configure real wallets and operational ownership, implement staff MFA/reauthentication and chain verification/reconciliation, complete deployment and backup testing with external PostgreSQL, and document actual company gold custody/inventory. Email is still queued locally until a delivery worker/provider is connected. No live blockchain payment or external custody was executed or verified during this update.
