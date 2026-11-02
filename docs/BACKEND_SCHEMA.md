# GoldSwap Backend Schema

**Status:** Current database and service map  
**Schema migrations:** `001_identity` through `008_production`  
**Last updated:** 2 November 2026

This is a conceptual reference. Executable truth remains in `database/migrations/*.sql`, constraints and backend services. Financial columns ending in `_atoms` are integers; never interpret them as display decimals without asset precision.

## 1. Identity, access and security

| Table | Purpose | Important rule |
|---|---|---|
| `users` | Customer/staff profile and status | Unique email; verification, demo, restriction/archive and profile data. |
| `identities` | Password/Google identity | Provider identity belongs to one user. |
| `sessions` | Authenticated sessions | Hashed key, expiry/device data, MFA assurance and reauthentication time. |
| `account_tokens` | Verification/reset/setup | Hashed, purpose-scoped, expiring and single-use. |
| `oauth_flows` | OAuth state lifecycle | Expiring one-time flow. |
| `auth_attempts` | Abuse/rate records | Expiring cleanup records. |
| `roles` | Built-in/custom roles | user, moderator, admin, super_admin plus controlled custom roles. |
| `permissions` | Permission catalogue | Seeded from `backend/db.ts`. |
| `user_roles` | User-to-role | Many-to-many. |
| `role_permissions` | Role grant | Checked server-side. |
| `permission_overrides` | Per-user allow/deny | Explicit deny wins. |
| `mfa_credentials` | Staff TOTP/recovery | Staff production requirement. |
| `withdrawal_addresses` | Customer address book | Owner-scoped asset/network/destination. |

Permission catalogue:

```text
users.view, users.restrict, users.delete
kyc.view, kyc.review
deposits.view, deposits.review
withdrawals.view, withdrawals.review, withdrawals.process
trades.view, settlements.review
support.view, support.reply, support.assign
reports.view, reports.export
configuration.manage, roles.manage, audit.view, adjustments.review
```

## 2. Files, KYC and external operations

| Table | Purpose | Notes |
|---|---|---|
| `private_files` | Encrypted KYC/proof/support/fulfilment content | Owner/purpose metadata and purge marker; never public. |
| `kyc_cases` | Current identity request | Document IDs/type, status, expiry/renewal, deletion request and legal hold. |
| `kyc_history` | Immutable KYC review snapshot | Case, actor, action, reason and snapshot. |
| `crypto_settings` | Per-route operational settings | Address, memo/tag, enable flags, confirmations and limits. |
| `deposits` | Deposit request | Route, amount atoms, reference, proof, status and review. |
| `withdrawals` | Crypto payout request | Gross/fee/reserve, destination, proof/reference and lifecycle. |
| `transaction_documents` | Receipts/invoices | Transaction type/id to stored document metadata. |

Allowed KYC types: `national_id`, `passport`, `birth_certificate`.

## 3. Financial ledger

| Table | Purpose |
|---|---|
| `money_accounts` | Per-user/platform crypto buckets: available, reserved, treasury and fees. |
| `money_journals` | Immutable business event per asset/reference. |
| `money_lines` | Signed debit/credit lines belonging to a journal. |
| `gold_accounts` | Customer/platform gold available, locked, reserved and fee buckets. |
| `treasury_accounts` | Platform crypto liquidity by asset. |

Ledger invariants:

- each journal balances to zero within its asset;
- retryable business references are unique;
- affected balances are row-locked before validation/update;
- reserve/release is journalled, never inferred by editing a total;
- gold uses 6 decimals; crypto precision follows `shared/crypto.ts`.

## 4. Gold, holds and physical fulfilment

| Table | Purpose | Important rule |
|---|---|---|
| `platform_gold_settings` | Active policy/version | Super Admin controlled and audited. |
| `gold_stock` | Recorded available/reserved platform stock | Not independent custody proof by itself. |
| `inventory_receipts` | Evidenced stock adjustment | Unique receipt/custody reference and private proof. |
| `gold_quotes` | Expiring buy/sell quote | User-scoped, server-priced, one-time consumption. |
| `gold_orders` | Executed gold buy/sell | Atomic customer/platform movement. |
| `gold_trades` | Five-day hold | Frozen plan/rate/principal/profit, maturity and settlement. |
| `physical_gold_requests` | Physical order lifecycle | Delivered grams, 2% fee, total reserve, recipient, dispatch/delivery proof. |

Hold settlement is idempotent and credits only previously reserved profit.

## 5. Internal swaps

| Table | Purpose |
|---|---|
| `swap_quotes` | Owner-scoped, expiring source/destination quote, fee and output. |
| `swap_orders` | Confirmed atomic exchange with unique quote consumption. |

## 6. Customer service and communication

| Table | Purpose |
|---|---|
| `notifications` | In-app event with read state and deep-link metadata. |
| `email_outbox` | Rendered delivery queue, lease, attempts, retry and result. |
| `support_tickets` | Owner, status, priority, assignee and optional transaction link. |
| `support_messages` | Conversation with staff/customer flag and attachment IDs. |
| `customer_service_config` | Service configuration. |
| `processed_customer_events` | Event idempotency marker. |

## 7. Administration and runtime

| Table | Purpose |
|---|---|
| `website_settings` | Name, support email, announcement, hero and availability/maintenance switches. |
| `audit_events` | Actor, action, target, timestamp and structured metadata. |
| `demo_snapshots` | Isolated demo UI data; never production funds. |
| `schema_migrations` | Applied migration IDs. |
| `worker_health` | Worker heartbeat/last success for readiness. |

## 8. Supported route catalogue

Eight canonical assets use 22 route identities:

- BTC: Bitcoin;
- ETH: Ethereum, Arbitrum One, BNB Smart Chain;
- USDC: Ethereum, BNB Smart Chain, Solana, Arbitrum, Avalanche, Arc;
- USDT: Ethereum, Tron, BNB Smart Chain, Mantle USDT0, TON, Solana, Arbitrum USDT0, Avalanche;
- XRP: XRP Ledger with destination-tag support;
- TRX: Tron;
- BNB: BNB Smart Chain;
- SOL: Solana.

An identical EVM receiving address does not merge route identities. Route IDs/precision are immutable accounting identities after transactions exist.

## 9. Service ownership

| Module | Responsibility |
|---|---|
| `backend/api.ts` | Auth, session, profile, dashboard, role API and composition. |
| `backend/account-security.ts` | Password, sessions, staff MFA and reauthentication. |
| `backend/operations.ts` | Files, KYC, deposits, withdrawals and route settings. |
| `backend/gold.ts` | Gold quote/order, holds, physical requests and inventory. |
| `backend/swap.ts` | Internal swap quote/confirmation. |
| `backend/customer-services.ts` | Notifications, email status, support, KYC lifecycle and documents. |
| `backend/staff-control.ts` | Staff overview, users, exports and settings access. |
| `backend/jobs.ts` | Settlement, mail/event processing and cleanup. |
| `backend/production.ts` | Production validation and staff assurance guard. |
| `backend/db.ts` | Connection, transaction wrapper and migrations. |

## 10. Migration procedure

1. Add the next numbered SQL file; never edit an applied file.
2. Add its ID to the migration order in `backend/db.ts`.
3. Make backfill safe and rerunnable where possible.
4. Add PostgreSQL tests for constraints and concurrency-sensitive behaviour.
5. Deploy backward-compatible code before destructive cleanup.
6. Back up and run a restore check before a high-risk migration.

