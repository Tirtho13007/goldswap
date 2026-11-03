# Confirmed platform rules — 1 November 2026

These rules replace the earlier illustrative fee schedule and external gold-provider assumption.

| Item | Confirmed rule |
|---|---|
| Super Admin | GoldSwap · app.goldswap@gmail.com |
| Deposit | Minimum $15 USD equivalent; platform fee 0% |
| Normal withdrawal | Minimum $20 USD equivalent before fee; 1.5% deducted from requested gold |
| Example normal withdrawal | 100 g requested → 1.5 g fee → crypto payout equivalent to 98.5 g |
| Unspent crypto withdrawal | 1.5% deducted from the requested crypto amount |
| Maximum deposit / withdrawal | No platform cap; balance, precision and liquidity constraints still apply |
| Physical order / withdrawal | Minimum delivery 500 g; 2% additional gold charge |
| Physical example | Deliver 500 g; reserve/deduct 510 g, including 10 g fee |
| KYC documents | National ID, passport, birth certificate; manual approval |
| Holding duration | Five full days from the server-recorded start time |
| Five-day rates | Silver 3%, Gold 5%, Platinum 7%, Diamond 10%, Elite 12% |
| Settlement | Principal plus pre-reserved profit automatically credited to available gold once |
| Processing time | Manual deposit/payout review may take time; no instant-completion promise |

## Wallet import

44 user-supplied wallet images were read from the specified Downloads/Wallet directory. Their QR payloads were decoded locally; the asset/network labels were visually checked. Duplicate light/dark screenshots were deduplicated. All 22 distinct asset/network routes in the 44 screenshots are now imported for eight coins: BTC, ETH, USDC, USDT, XRP, TRX, BNB and SOL. XRP's required tag was separately read from its screenshot and stored with the address.

All supplied chain variants are represented separately; an identical EVM receiving address does not merge their network identities. USDT includes BSC, Ethereum, Tron, Mantle USDT0, TON, Solana, Arbitrum USDT0 and Avalanche. USDC includes BSC, Ethereum, Solana, Arbitrum, Avalanche and Arc. ETH includes Ethereum, Arbitrum and BSC; the remaining coins use their supplied networks. Receiving QR images in the account encode the actual stored address; the required XRP tag is shown separately. Checksums are validated, but wallet ownership, exchange deposit support and actual chain receipts were not independently verified by sending funds.

Local wallet settings and the import manifest are stored in the database / ignored `data/` directory, not shipped as defaults in the source ZIP. Production setup must configure its own database. Staff can update receiving settings in Operations centre; policy minimums/percentage fees are enforced centrally, rather than editable flat per-network fees.

## Platform gold and reserves

GoldSwap is the platform counterparty. Fresh gold/crypto reference prices generate 30-second server quotes. Buy/sell orders execute against recorded platform gold inventory and crypto liquidity; no third-party execution is implied. A purchase cannot create gold if inventory is empty. A sale or gold payout cannot proceed without funded crypto liquidity.

Super Admin records actual gold stock with a unique custody/receipt reference and private evidence in **Gold operations**. This is an operator attestation, not independent custody verification. No customer gold, company gold stock or crypto liquidity was invented during configuration. Inventory starts at zero until evidence is entered.

On a buy, approved crypto balance is transferred to platform treasury and recorded company gold is transferred to the user. On a sell, the reverse occurs. Integer crypto units and micrograms are used, with balanced asset journals and atomic transactions. Quotes are owner-scoped, expire, and cannot execute twice. Buy/sell platform fee is currently 0%; the published 1.5% applies to withdrawal.

## Five-day holdings

The existing gram bands remain: Silver below 8 g, Gold 8–below 40 g, Platinum 40–below 80 g, Diamond 80–below 400 g, Elite 400–800 g inclusive. The selected amount/rate and policy version are frozen when the hold starts. No early withdrawal endpoint is offered.

Starting a hold locks user principal and reserves its entire profit from company stock. Insufficient company profit reserve rejects the hold without locking user gold. A server job checks maturity every 15 seconds and at startup; it runs without an open browser. Due positions are locked and settled atomically, with a unique settlement journal preventing duplicate credit across workers/retries. A restart resumes pending settlement. The dashboard refreshes every 15 seconds; the countdown itself ticks each second.

The rate is a platform payout obligation backed by the recorded reserved stock, not a prediction or guarantee of gold-market growth. No real holding was opened using customer funds during validation.

## Gold withdrawal and physical delivery

Normal gold withdrawal reserves the requested gold and its quoted net crypto payout liquidity. The 1.5% gold fee is deducted first, then the rest is converted at the accepted quote. Rejection or pending cancellation releases both reserves exactly once. Staff record and verify an actual external crypto transfer before completion consumes the reserves.

Physical requests reserve delivery grams plus a 2% charge. A 500 g order reserves 510 g immediately from available gold. Manual approval precedes dispatch, which requires tracking and private proof. Actual delivery confirmation consumes the reserve and records the 2% fee. Rejection or pending cancellation releases the entire amount. Delivery areas, logistics and timing are arranged by staff; the application does not book a courier or move physical gold automatically.

Both physical requests and crypto payouts require approved KYC. Document and dispatch/payout proof access is scoped and audited. Gold purchase/sale, holding profit, physical requests and crypto requests appear in account history.

## Administrator setup and production limits

The requested administrator is provisioned locally. An initial, one-time password setup link is saved privately in `data/GoldSwap-admin-setup.txt`, valid for 24 hours. It is not included in the source package or emailed. No default public password is shipped. Set the password, return to login, and sign in with the requested email.

The local configuration helper `backend/configure-platform.ts` validates its import manifest, migrates, provisions the owner, enables all 22 supplied routes, and records the confirmed terms in audit history. Re-running it preserves an existing administrator password and does not create funds. Do not run a separate CLI against persistent PGlite while the server is using it.

Production staff endpoints remain disabled pending MFA and sensitive-action reauthentication. Real deployment also needs external PostgreSQL and backup testing, stable private-upload encryption, email delivery and operational chain reconciliation. No real blockchain transfer, custody audit, courier booking or production deployment was performed. Automated tests use an isolated in-memory database and clearly fictitious receipts/transactions.


## Staff control panel update

Super Admin, admin, moderator and permission-bearing custom staff roles now enter a separate staff workspace. It has no personal deposit, withdrawal, buy/sell, personal holdings or demo-preview navigation. Menus expose only assigned duties. Super Admin sees user/registration counts, review queues, user management, staff roles and overrides, wallet networks, gold inventory, website settings and audit history.

User blocking/removal revokes sessions. Removal is an account archive: financial/audit records are retained, and Super Admin can restore the account. Owner/self privilege changes and Super Admin removal are protected. New staff accounts use private one-time password setup links, never a default password or an automatically sent email. Grant/revoke checks apply server-side on each request; the frontend refreshes its access state every 30 seconds. Explicit deny overrides a role grant.

Website settings cover platform name, support email, announcement, hero text, registration availability and maintenance mode. Saved changes update the public application; registration and financial submission switches are enforced by the API. Reviewers can preview private PNG/JPEG evidence and download PDF evidence through permission-scoped access.

Asset balances use canonical accounting units shared across their networks: USDT/USDC use six decimal places, ETH/BNB 18, SOL nine, BTC eight, XRP/TRX six. These are internal accounting units, not a claim that every token contract exposes identical native decimals. Manual transfer verification compares human token amounts. Solana signatures remain case-sensitive Base58; TON Base64 transaction hashes normalize to hexadecimal. TON receiving addresses validate their CRC checksum. Network-specific operational verification is still manual.

Physical charges remain percentage-based at every order size: 1000 g delivery + 20 g fee = 1020 g reserved/deducted. No fixed 10 g fee is used.


## Wallet exchange and staff workflow refinement

Buy/sell, swap and withdrawal now share a wallet-style amount → review → result flow. The receive/deposit page groups coin/network selection, receiving QR, copy controls and proof submission. Asset pickers show actual available balances and support search. MAX uses only available balance, excluding locked/reserved money. Amount/asset/network changes invalidate the prior quote; fields are locked while a financial confirmation is running. Destination syntax/checksum validation runs before a payout review, followed by the existing final server checks. Quote countdowns use server time offset; expiry requires a fresh review.

Internal swaps exchange supported crypto balances inside GoldSwap at fresh 30-second server quotes, with current platform swap fee 0%. No blockchain transfer or Trust Wallet integration is claimed. The source balance and target company treasury must be funded; insufficient liquidity changes nothing. Both asset journals update in one transaction, with owner-scoped quotes, unique quote usage and idempotent confirmation. Swaps appear in customer activity. Output rounds down to the canonical receive-asset precision. Physical and normal withdrawal rules remain unchanged.

Migration 006 adds `swap_quotes` and `swap_orders`. New API paths: `POST /swaps/quote`, `POST /swaps/confirm`, `POST /crypto/estimate`, `POST /crypto/validate-address`. Maintenance mode also pauses swap/estimate financial submissions. Demo accounts cannot execute swaps.

Staff summaries use decorative icon/ring accents, not fabricated percentage metrics. Permission-filtered quick actions open real review tools. Inventory/liquidity checks show the recorded available/reserved amounts. KYC/deposit/withdrawal queues support email/status filters, FIFO pagination and background refresh. CSV export requires both `reports.export` and the corresponding view permission, caps output at 5,000 records and logs the export. Spreadsheet formula strings are neutralised. Withdrawal exports separately name gross crypto, fee, net payout and any requested/fee gold grams.

Frontend visual/flow checks use clearly isolated read/confirmation fixtures when privileged access or funded balances are needed. Backend integration tests run in a separate in-memory database. No real swaps, funding, payouts or staff privilege changes were performed to generate the UI previews.

Design reference for the preview-before-confirm interaction: [Trust Wallet's official swap page](https://trustwallet.com/swap). GoldSwap remains an account-balance platform with manual deposits/payouts; its execution model is described above.
