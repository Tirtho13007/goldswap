# Backend setup — updated 1 November 2026

## Run locally

From this directory's parent (the React project root):

```powershell
npm ci
Copy-Item .env.example .env
npm run db:migrate
npm run build
npm start
```

Open http://localhost:4173. Registration and login now persist data. My Account allows profile/address edits and saved Light/Dark/System preferences. Access it after login or at `/#account`.

Email verification does not block dashboard access or hide navigation. Unverified users see all sections with a non-blocking Verify email / Later reminder; verification remains available in My Account after dismissal. Sections not implemented yet display an availability message rather than a verification lock.

Without DATABASE_URL, development uses persistent embedded PostgreSQL-compatible PGlite under `data/goldswap.pglite`. This is a single-process local development option, not a production database. Do not run the CLI against the embedded directory while the web process is using it; stop the web process first. The test suite uses an isolated in-memory database.

For managed PostgreSQL set DATABASE_URL with the provider-required verified TLS connection parameters. Production refuses the embedded fallback and requires an HTTPS APP_ORIGIN. Actual external PostgreSQL deployment has not yet been verified in this workspace.

If using Vite separately, start the API on 4173 and set APP_ORIGIN to the Vite browser origin (normally http://localhost:5173). Vite proxies `/api` to the API. For the regular built app, APP_ORIGIN is http://localhost:4173. Exact Origin checks protect mutations; no wildcard CORS is enabled.

## Initial Super Admin

Stop the local embedded-database server first. Set BOOTSTRAP_EMAIL and a unique BOOTSTRAP_PASSWORD (at least 14 characters) in the local `.env`, then run:

```powershell
npm run admin:bootstrap
```

Remove BOOTSTRAP_PASSWORD afterwards. Bootstrap works only when no Super Admin exists and never promotes an existing email implicitly. There are no shipped/default admin credentials. The initial account is not automatically marked email-verified.

Staff APIs support roles, explicit permission overrides and audit history in development. **Production staff endpoints are deliberately disabled until staff MFA and sensitive-action reauthentication are implemented.** The dashboard Operations centre provides KYC, deposit and withdrawal review queues, plus Super Admin network configuration. Role/permission administration is currently available through the admin API.

## Verification/reset email

Registration and reset requests queue messages in email_outbox in the same transaction as the account token. Tokens expire after 30 minutes and are one-use. Reset invalidates existing sessions.

Email delivery worker/provider is not implemented yet: messages are queued, not sent. For local testing only, stop the embedded server and run `npm run dev:mail`; open the desired link after restarting the server. This command exposes local test verification links intentionally and is disabled in production. No browser mailbox endpoint exists.

## Google sign-in

Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET. Register the exact callback:

`http://localhost:4173/api/v1/auth/google/callback`

Use the actual HTTPS origin in deployment. OAuth uses browser-bound state, PKCE and nonce checking. Existing password accounts are not linked by matching email. Google-only users complete missing profile fields after login. Live OAuth exchange has not been tested without credentials.

## API inventory

All paths below are under `/api/v1`:

| Method | Path | Purpose |
|---|---|---|
| GET | /health | Database readiness and foundation status |
| POST | /auth/register, /auth/login, /auth/logout | Account sessions |
| GET | /auth/session | Current user, effective permissions, Google availability |
| POST | /auth/verify, /auth/resend-verification | Email verification |
| POST | /auth/forgot-password, /auth/reset | Password recovery |
| GET | /auth/google, /auth/google/callback | Google OAuth |
| GET/PATCH | /me | Own profile and appearance |
| GET | /sessions | Own active sessions |
| DELETE | /sessions/:id | Revoke own session |
| GET | /dashboard | Own crypto balances, KYC status, request history and pending counts |
| GET | /admin/permissions, /admin/roles | Super Admin permission configuration |
| PUT | /admin/roles/:id | Configure custom/staff roles |
| PUT | /admin/users/:id/access | Assign roles and explicit allow/deny overrides |
| GET | /staff/users | Permission-gated paginated directory |
| GET | /staff/audit | Permission-gated audit history |

Mutations require Origin matching APP_ORIGIN. Privilege fields in profile updates are rejected. Effective permissions are loaded on each authenticated request. Explicit deny wins over role grants. Self elevation and changes to Super Admin access are rejected by the general role API.

## Verification performed

- `npm test`: registration, origin protection, password hashing/login, one-use verification, profile validation, access denial, role assignment, deny precedence, immediate revocation, rollback, audit, session ownership, password reset/session invalidation, logout and rate limits.
- `npm run typecheck:backend` and `npm run build`.
- Browser: registration, profile save/reload, login/logout, account/home navigation, persisted light theme, desktop/mobile overflow and console errors.

The database tests run on PGlite's PostgreSQL engine, not a networked PostgreSQL server. Live Google and email delivery need configured external services.

## Remaining architecture milestones

Staff MFA/reauthentication; complete admin/moderator UI; profile-photo uploads; verified identity change reviews; KYC; durable email worker; support; ledger and reservations; deposit proofs; manual payment approvals; buy/sell; withdrawals; trade countdown/settlement; referrals; reporting; recovery and full reconciliation. None of these are presented as active financial services in this milestone.

Production hardening also includes proxy-aware distributed rate-limit policy, token/outbox retention and cleanup, email content protection, migration release workflow and actual PostgreSQL integration validation.

The authoritative plan is `../../../BACKEND_ARCHITECTURE.md` relative to this document. This implementation is phase 1 plus an initial My Account screen, not completion of that plan.

## Dashboard UI reference update — 31 October 2026
The dashboard now follows the supplied light/dark fintech references: framed desktop workspace, slim sidebar, gold balance artwork, monthly trade calendar, portfolio/trade/team cards and transaction-history table. Mobile uses a drawer sidebar. Theme toggle persists through `/me`; calendar navigation, search/status controls, notifications and menu navigation are interactive. Balances are unavailable placeholders and transaction history is empty until the ledger/financial modules exist; no fabricated customer transactions are displayed. Email verification remains non-blocking.

## GoldSwap overview and interaction update
The overview now shows gold available/locked/reserved balances, a trade monitor, pending deposit/withdrawal cards, portfolio/settled-payout summaries, next actions, team/support shortcuts and an interactive world reference map. These remain honest empty states until financial modules are connected. The optional countdown preview is explicitly illustrative and never posts transactions or credits balances.

Interface feedback includes press animation, page/card transitions, ambient gold/map loops and a synthesized soft tap sound. Sound, haptics and motion toggles are saved per user on this device. OS reduced motion overrides ambient animation; hidden tabs pause animation and countdown rendering. Sound starts only after user interaction and can be muted; vibration is best-effort on supported hardware. Browser tests instrumented vibration calls; physical-device vibration is not verified.

The map was removed at the user’s request. The menu bar exposes light/dark mode; interaction preferences, including sound, remain in Settings.

## Color and map revision — user direction
The map was removed at the user's request, along with world-atlas/d3-geo/topojson dependencies. Overview now uses colorful action tiles and semantic blue/green/amber/purple summary accents. The wallet and market tables use bundled asset icons. Green/red quote movements represent changes between actual received quotes during the current session, not fabricated 24h performance. Unavailable/stale quotes do not show a live movement. Status guide chips explain Pending, Approved, Successful and Failed; they are explanatory, not fake customer transactions. Buttons have color-changing hover, icon motion, press feedback and visible keyboard focus; reduced-motion behavior remains supported.

## Public frontend refresh — 31 October 2026
The landing page keeps its black/gold identity with blue, green, purple, rose and teal feature accents. Buttons have color-changing hover, icon movement and press feedback; cards and navigation have consistent hover/focus states. Public sound can be muted; Pause motion and OS reduced-motion settings pause decorative movement. Dashboard-specific styling remains scoped.

New routes: `#page/getting-started`, `#page/payment-methods`, `#page/fees`, `#page/security`, `#page/status`. Navigation includes an Explore menu, a dashboard showcase, resource cards and footer/mobile links. Crypto network activation depends on configured receiving wallets, fees in the public calculator are illustrative, and the status page performs point-in-time account/feed checks rather than claiming historical uptime. Email verification remains optional for dashboard access. Unsupported Google login is disabled with a clear availability label. The unauthenticated `#account` route now includes a direct login/register form.

Verified with production builds and browser flows: desktop/mobile navigation, all guide routes, fee calculator, method-category selection, status refresh, account login, real hover color change, reduced motion and no page overflow at 320/390/768/1024/1440px.

## Hero simplification
Hero now uses “Digital gold. Made simple.”, one short description and Get started / How it works actions. Removed duplicate status badges, secondary paragraph and feature chips. The hero never displays Open dashboard. For guests Get started opens registration; for signed-in users it opens the getting-started guide. Verified CTA behavior and no page overflow at 320/390/768/1024/1440px.

## Brand hierarchy and mobile readability
Core landing order is Hero -> How it works -> Market -> Trade levels -> Company/Trust -> FAQ. The dashboard showcase and review layouts follow below; the duplicate benefits block was removed, team information is a compact expandable section, and guide links stay in navigation/footer rather than another landing section. Gold is the primary CTA/hover/rate color; colorful feature icons remain, with red/green/amber used for status meaning. Mobile primary paragraphs use 14–15px and supporting labels/terms were enlarged.

Review cards no longer display the words “Sample review”. A red dot identifies fictional demo content through an accessible label, title, focus/hover tooltip and tap interaction. A green indicator is supported only for genuinely verified review records; all currently bundled profiles remain red. A visible disclosure explains the colors. No fictional record was converted to a customer endorsement. Ratings alone are illustrative, as described in the review disclosure.

Latest mobile refinement: review cards use a manual, snap-aligned swipe row with full-card readability; the duplicated auto-scroll set is hidden on mobile. Desktop retains the controlled carousel. Review-marker tooltips remain available by hover, focus and tap. No real review verification data has been supplied, so all current markers remain red.

Payment Methods page now displays the six supported crypto assets and their network requirements. Earlier fiat/card/mobile gateway cards were removed by the 1 November crypto-only update.

## Crypto-only operations

See [OPERATIONS.md](OPERATIONS.md) for manual KYC, encrypted uploads, receiving network configuration, deposit approval and withdrawal processing. Only BTC, ETH, USDC, USDT, XRP and TRX are accepted; no fiat/card/gateway methods are offered. GoldSwap is now the counterparty; orders require recorded company gold inventory and funded crypto liquidity. See [PLATFORM_RULES.md](PLATFORM_RULES.md) for the confirmed business rules and new gold workflows.


## Light theme refinement — 1 November 2026

The public light theme now uses a warm neutral canvas, white cards, dark readable text and restrained gold accents. Dark section gradients and ambient colour blobs are removed in light mode. Calculators, trade ranges, reviews, menus, forms, mobile navigation and notification portals use matching light surfaces. The extra payment-strip sentence was removed. Dashboard light-theme muted text was strengthened. Styles are maintained in `src/light-theme.css`; dark styling retains its existing palette. Frontend builds and desktop/mobile browser checks validate this presentation change.


## Confirmed owner and gold workflows

The local owner account is GoldSwap / app.goldswap@gmail.com. Its private initial password setup link is in ignored `data/GoldSwap-admin-setup.txt` (24-hour one-time token). No public/default password exists. All 22 supplied wallet routes across eight coins were configured locally; wallet settings are database state and do not ship as source defaults.

Migration 004 adds company gold inventory, user gold balances, crypto treasury liquidity, expiring gold quotes/orders, five-day trades, physical requests and gold-funded crypto withdrawals. The server processes mature holds at startup and every 15 seconds. Test coverage includes exactly-once settlement across concurrent workers, quote expiry, inventory/liquidity gates, gold fee arithmetic, physical dispatch/delivery and reserve release. Full confirmed rules: [PLATFORM_RULES.md](PLATFORM_RULES.md).


## Staff administration

Accounts with Super Admin/admin/moderator roles or explicit staff permissions enter the dedicated StaffDashboard after sign-in. Regular customers retain the personal dashboard. Super Admin can configure roles, per-user overrides, create staff setup links, remove staff duties, block/remove/restore users and edit website settings. Use Users for existing-account access; Staff & permissions for role templates and new staff accounts. Wallet settings preserve disabled receiving details for staff editing, while disabled addresses remain hidden from customers.

Migration 005 adds website settings, archived-user state and BNB/SOL accounting support. Staff APIs: `GET /staff/overview`, `GET /staff/users`, `PATCH /staff/users/:id/status`, `DELETE /staff/users/:id`, `POST /admin/users/:id/restore`, `GET /admin/users/:id/access`, `POST /admin/staff`, `GET/PUT /staff/website-settings`, `GET /staff/crypto/settings`. Existing role/access, KYC, deposit, withdrawal and audit endpoints remain permission protected. Public `GET /site-settings` exposes only display and availability settings.


Wallet refinement: `WalletExperience.tsx` connects buy/sell, internal swaps and payouts to the existing account APIs. Staff queues now accept `status`, `search` and `page`; `GET /staff/export/:kind` requires scoped export/view permissions. See PLATFORM_RULES.md for migration 006, precision, liquidity and validation details.


## Customer services activation

Verification/reset HTML mail, SMTP/Resend queue and retries, customer/staff support, notifications, owner-scoped transaction details and PDF receipts, optional authenticator MFA/session controls, withdrawal address book, KYC history/expiry/deletion safeguards, physical shipment/acknowledgement and public SEO routes are implemented. See [CUSTOMER_SERVICES.md](CUSTOMER_SERVICES.md). Live email requires sender credentials; production mail previews are disabled. Public indexing remains off until the production flag is explicitly enabled.
