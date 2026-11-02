# GoldSwap Product Requirements

**Document owner:** GoldSwap  
**Status:** Approved product baseline  
**Version:** 1.0  
**Last updated:** 2 November 2026

This document is the product source of truth. A design or implementation may improve presentation, accessibility or reliability, but must not silently change the rules below. Conflicts must be resolved here first and then propagated to the linked documents.

## 1. Product definition

GoldSwap is a crypto-funded account platform where customers can:

1. create and access an account before verifying email;
2. complete manually reviewed KYC;
3. deposit supported crypto with proof and manual approval;
4. buy or sell platform-provided gold using an expiring server quote;
5. swap supported internal crypto balances;
6. place eligible gold into a five-day hold and receive the level-specific gold payout after maturity;
7. request a crypto withdrawal or physical-gold delivery; and
8. obtain support, notifications, receipts and an auditable transaction history.

GoldSwap is the counterparty. The application does not claim automatic exchange execution, automatic blockchain settlement, independent custody verification or courier integration.

## 2. User types

| Actor | Primary purpose |
|---|---|
| Visitor | Understand the service, market, fees, risks and company information; register or sign in. |
| Customer | Manage identity, balances, gold, holds, deposits, withdrawals, physical orders and support. |
| Moderator | Perform only explicitly assigned review/support duties. |
| Admin | Perform assigned operational duties; no implicit Super Admin authority. |
| Super Admin | Control staff access, users, settings, networks, inventory, review queues and audit oversight. |
| Worker | Settle matured holds, deliver queued mail, clean expired records and maintain service health. |

## 3. Confirmed commercial rules

| Requirement | Approved rule |
|---|---|
| Funding and payout methods | Crypto only. No bank, card, PayPal, bKash, Nagad, Stripe or SSLCommerz deposit/withdrawal. |
| Supported assets | BTC, ETH, USDC, USDT, XRP, TRX, BNB and SOL through enabled network routes. |
| Deposit | Minimum USD-equivalent value: **$15**; platform fee: **0%**; manual proof review. |
| Crypto withdrawal | Minimum USD-equivalent value: **$20** before fee; **1.5%** deducted from the requested asset/gold; manual processing. |
| Maximum | No product-level maximum; available balance, liquidity, route precision and operational controls still apply. |
| Physical gold | Minimum delivered quantity: **500 g**; additional **2%** gold charge. 500 g delivers 500 g and deducts 510 g; 1,000 g deducts 1,020 g. |
| KYC documents | National ID, passport or birth certificate; manual approval. |
| Hold term | Five full days from server-recorded start time; no early exit endpoint. |
| Hold levels | Silver 0–<8 g: 3%; Gold 8–<40 g: 5%; Platinum 40–<80 g: 7%; Diamond 80–<400 g: 10%; Elite 400–800 g: 12%. |
| Hold settlement | Lock principal and reserve profit at start; credit principal plus profit exactly once after maturity. |
| Processing promise | Deposits, KYC, payouts and physical fulfilment are not instant. |

The canonical executable values are in `shared/policy.ts` and `shared/crypto.ts`. This document and those modules must be changed together.

## 4. Functional requirements

### 4.1 Identity and account

- **PR-AUTH-01:** Email/password registration creates an active customer account with a safe default avatar.
- **PR-AUTH-02:** An unverified user can enter the dashboard and see all navigation and features. Verification is a visible, dismissible follow-up action, not a dashboard gate.
- **PR-AUTH-03:** Password reset, verification resend, logout and optional Google identity linkage must be supported.
- **PR-AUTH-04:** Account profile supports name, avatar, country/flag selector, phone, address, city, postal code and light/dark appearance.
- **PR-AUTH-05:** Customers can view/revoke sessions and change password. Customer authenticator MFA is intentionally not offered in this product baseline.
- **PR-AUTH-06:** Production staff must use authenticator MFA and reauthenticate for sensitive writes.

### 4.2 KYC

- **PR-KYC-01:** A customer selects one approved document type and uploads private evidence.
- **PR-KYC-02:** Staff with `kyc.view` can inspect; staff with `kyc.review` can approve, reject or request more information.
- **PR-KYC-03:** Resubmission, reviewer history, expiry/renewal, deletion request, retention and legal hold are auditable.
- **PR-KYC-04:** Approved KYC is required before crypto payout or physical delivery.

### 4.3 Crypto deposits

- **PR-DEP-01:** Customer chooses asset and enabled network, then sees the exact address, QR code and required memo/tag.
- **PR-DEP-02:** Customer submits amount, transaction reference and payment proof.
- **PR-DEP-03:** Staff manually validates proof and chain details before approval credits the internal balance exactly once.
- **PR-DEP-04:** Rejection includes a customer-visible reason; approval creates a receipt and notification.

### 4.4 Gold buy, sell and swap

- **PR-TRD-01:** Amount → review → confirm → result is the shared wallet-style interaction.
- **PR-TRD-02:** Quotes are generated by the server, owner-scoped, expire after 30 seconds and cannot execute twice.
- **PR-TRD-03:** Buy requires customer crypto and recorded platform gold inventory; sell requires customer gold and platform crypto liquidity.
- **PR-TRD-04:** Internal crypto swap requires source balance and treasury liquidity and is atomic.
- **PR-TRD-05:** Asset/network/amount changes invalidate the prior quote. MAX excludes locked or reserved balance.

### 4.5 Five-day holds

- **PR-HOLD-01:** The applicable level, rate, amount and policy version are frozen at start.
- **PR-HOLD-02:** Starting a hold atomically locks principal and reserves the full profit from company stock.
- **PR-HOLD-03:** Customer sees a live one-second countdown and progress bar based on server time.
- **PR-HOLD-04:** A background worker settles due holds exactly once and resumes safely after restart.

### 4.6 Withdrawals and physical gold

- **PR-WD-01:** Crypto withdrawal validates route, destination address, memo/tag, balance, KYC, minimum, quote and liquidity.
- **PR-WD-02:** Customer reviews gross amount, 1.5% fee and net payout before submitting.
- **PR-WD-03:** Staff review, processing reference, proof, completion, rejection and cancellation have an auditable timeline.
- **PR-PHY-01:** Physical order confirms recipient and delivery address, reserves delivered grams plus 2%, and starts at 500 g.
- **PR-PHY-02:** Staff records allocation, dispatch tracking, private proof and delivery acknowledgement.
- **PR-PHY-03:** Rejection or eligible cancellation releases the full reserve exactly once.

### 4.7 Customer service and communication

- **PR-SUP-01:** Support tickets include conversation, attachments, priority, assigned staff, status and optional transaction link.
- **PR-NOT-01:** In-app and email events cover verification, KYC, deposit, withdrawal, hold settlement, support and security.
- **PR-NOT-02:** Failed email delivery retries safely and is visible to authorized staff.
- **PR-DOC-01:** Transaction details include timeline, fee breakdown, rejection reason, receipt/invoice and explorer link where relevant.

### 4.8 Staff administration

- **PR-ADM-01:** Staff workspace must never show personal deposit, withdrawal, buy/sell or personal holdings controls.
- **PR-ADM-02:** Super Admin sees real user/registration counts, queues, inventory/liquidity, health and recent activity.
- **PR-ADM-03:** Super Admin can add/remove admin or moderator, create custom roles, grant permissions and apply explicit per-user deny/allow overrides. Explicit deny wins.
- **PR-ADM-04:** Staff access is enforced server-side. Hiding a button is not authorization.
- **PR-ADM-05:** Super Admin can restrict, archive and restore users; financial/audit records remain retained.
- **PR-ADM-06:** Reviews, exports, settings, inventory adjustments, role changes and evidence access are audited.

## 5. Dashboard information hierarchy

Customer overview priority:

1. total portfolio/available and reserved balances;
2. quick actions: deposit, withdraw, buy/sell, swap, holds, physical gold and support;
3. active five-day hold countdown/progress;
4. pending KYC/deposit/withdrawal actions;
5. recent transaction history and notification status;
6. email-verification reminder without feature hiding.

Staff overview priority:

1. real operational totals and review queues;
2. needs-attention/health states;
3. permission-filtered quick actions;
4. recent registrations and recorded fees;
5. audit and service status.

## 6. Non-goals and prohibited claims

- No fiat/card/mobile-money funding or payout in the approved release.
- No customer two-step authenticator feature.
- No fake balances, fake percentages, fake reviews or invented custody evidence in production.
- No promise of instant processing, guaranteed market growth, independent insurance or licensing without verified documents.
- No private keys or seed phrases are stored or requested.
- No automatic blockchain transfer is implied by an internal status change.

## 7. Launch success criteria

- All launch-blocking items in `IMPLEMENTATION_PLAN.md` are accepted.
- Production PostgreSQL, mail, private file scanning, backups and web/worker processes are live and monitored.
- One controlled end-to-end transaction per enabled production route is reconciled.
- Legal/product owner approves terms, privacy, risk disclosures, hold structure, custody and physical fulfilment.
- WCAG 2.2 AA checks, responsive QA and both themes pass on critical flows.

## 8. Related documents

- `TECHNICAL_REQUIREMENTS.md`
- `APP_FLOW.md`
- `UI_UX_DESIGN_BRIEF.md`
- `BACKEND_SCHEMA.md`
- `FRONTEND_SCHEMA.md`
- `IMPLEMENTATION_PLAN.md`
- `PLATFORM_RULES.md` for detailed operational explanations

