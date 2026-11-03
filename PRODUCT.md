# GoldSwap Product Context for Design Tools

This file is the short routing context expected by Impeccable and similar design skills. The complete product authority is `docs/PRODUCT_REQUIREMENTS.md`; when details conflict, that document and executable shared policy win.

## Product

GoldSwap is a crypto-funded gold account platform. Customers register, complete manual KYC, deposit supported crypto with proof, buy/sell platform gold, swap internal balances, place eligible gold into five-day holds, request crypto withdrawals and order physical gold.

## Positioning

A precise gold and crypto account for customers who need visible fees, balances and manual request tracking. GoldSwap is the counterparty.

## Operating Context

Customers use mobile and desktop; staff review evidence and manage permission-scoped queues. Production uses PostgreSQL, separate workers, configured email and screened private uploads.

## Evidence on Hand

Executable policy, API integration tests and local browser QA establish implementation behavior. Company registration, applicable permissions, custody evidence and final legal terms still require owner-supplied documentation.

## Product Principles

Use exact financial arithmetic, honest service status, visible fees and accessible controls. Preserve gold branding, consistent themes and short purposeful motion. Owner-requested illustrative reviews and activity are visible with explicit fictional/demo provenance; they never claim real customer transactions.

## Primary users

- Customers need a calm, understandable wallet with explicit balances, fees, status and next actions.
- Moderators/admins need permission-scoped review queues and evidence.
- Super Admin controls users, staff access, settings, networks, inventory and audit oversight.

## Experience priorities

1. Trustworthy financial clarity over decoration.
2. Consistent wallet interaction: Amount → Details → Review → Result.
3. Manual-review status and next action are always explicit.
4. Gold is the brand colour; semantic colours communicate status.
5. Premium but efficient light/dark interfaces on desktop and mobile.
6. WCAG 2.2 AA target with keyboard, screen-reader and reduced-motion support.

## Hard product constraints

- Crypto-only deposits/withdrawals across the approved 8 assets and 22 route identities.
- Deposit minimum $15, no deposit fee; withdrawal minimum $20, 1.5% fee.
- Physical order minimum 500 g with 2% additional gold charge.
- Five full days; Silver 3%, Gold 5%, Platinum 7%, Diamond 10%, Elite 12%.
- Email verification does not gate dashboard navigation.
- Customer authenticator MFA is not part of the approved product; production staff MFA is mandatory.
- Do not invent balances, reviews, custody, licensing, insurance or instant processing claims.

Read `DESIGN.md`, `docs/APP_FLOW.md` and the relevant requirements before UI work.

