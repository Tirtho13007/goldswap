# GoldSwap Technical Requirements

**Status:** Engineering baseline  
**Version:** 1.0  
**Last updated:** 2 November 2026

## 1. Runtime and architecture

| Layer | Required technology / contract |
|---|---|
| Web client | React 19, TypeScript 5.9, Vite 7; responsive SPA with semantic HTML. |
| API | Node.js 24, Express 5, JSON API under `/api/v1`. |
| Database | PostgreSQL in production; PGlite is development/test only. |
| Worker | Separate always-on Node process for settlement, mail and cleanup jobs. |
| Hosting target | Heroku-compatible `web`, `worker` and `release` process model. |
| Files | Encrypted private evidence, malware-scanned before persistence. |
| Mail | SMTP or Resend-compatible delivery through the outbox/worker. |

Production data flow:

```text
Browser -> HTTPS web/API -> PostgreSQL
                        -> encrypted private files
Worker  -> PostgreSQL   -> email provider
Admin   -> permission + MFA + recent reauthentication -> staff API
```

## 2. Engineering invariants

- **TR-DATA-01:** Financial amounts use integer atoms. Gold uses micrograms (6 decimals); asset precision comes from `shared/crypto.ts`. JavaScript floating point must not update balances.
- **TR-DATA-02:** Every balance-changing operation is a single database transaction with balanced journal entries.
- **TR-DATA-03:** Quote confirmation, deposit approval, withdrawal completion, hold settlement and mail/event processing are idempotent.
- **TR-DATA-04:** Locked/reserved funds cannot be included in available balance or MAX.
- **TR-DATA-05:** Server time is authoritative for quote expiry, hold maturity and security windows.
- **TR-DATA-06:** Schema changes are append-only numbered migrations. Never edit an applied migration.
- **TR-DATA-07:** Production migration runs in the release phase, not concurrently in web and worker startup.

## 3. API requirements

- Cookie-based session authentication; session tokens are stored only as hashes.
- JSON request bodies are size-limited and validated with Zod.
- Auth, reset, verification and security operations are rate-limited.
- API error shape is stable: `{ "error": string, "code"?: string }`.
- Financial POST operations require an idempotency mechanism or unique consumed quote/request constraint.
- Staff endpoints require runtime permission checks; production staff routes additionally require MFA and sensitive writes require recent reauthentication.
- Customer/private endpoints emit `X-Robots-Tag: noindex, nofollow`.
- Private file endpoints authorize the owner or the smallest matching staff permission and log access where required.

## 4. Security and privacy

- HTTPS canonical origin and HSTS are mandatory in production.
- CSP, frame denial, MIME-sniff protection, referrer and permissions policies remain enabled.
- `UPLOAD_ENCRYPTION_KEY` is a stable private 64-character hexadecimal key and must be backed up separately from the database.
- Remote PostgreSQL TLS certificate verification stays enabled; supply a trusted CA when required.
- Passwords are slow-hashed; reset/verification/setup tokens are single-use, hashed and expire.
- Production staff MFA is mandatory; recovery codes are one-use. Sensitive write assurance expires after five minutes.
- Customer authenticator MFA is out of scope by product decision.
- File scanner failure is fail-closed in production. Do not expose an unauthenticated ClamAV socket publicly.
- Secrets, wallet databases, upload content, logs and generated backups must never enter Git.
- KYC content has retention, deletion, legal-hold and audit rules; deletion removes content, not required audit metadata.
- Account deletion is an archive, preserving financial and audit integrity.

## 5. Reliability and jobs

- Web and worker are separate always-on processes in production (`JOB_MODE=external`).
- Worker ticks at approximately 15 seconds and prevents overlapping local execution.
- Database constraints/leases provide cross-worker idempotency.
- `/health` is liveness; `/ready` verifies database migration and recent worker heartbeat.
- Graceful shutdown stops jobs and closes database connections within the platform deadline.
- Email outbox uses bounded retry/backoff and exposes failed/queued counts to authorized staff.
- Backup uses PostgreSQL custom format; restore verification must target a newly created, explicitly prefixed disposable database.
- Production monitoring must alert on readiness failure, stale worker, repeated mail failure, 5xx spike and database capacity.

## 6. Performance targets

- Initial public route should render useful content without waiting for Three.js or account bundles.
- Non-critical visual modules remain lazy-loaded.
- Immutable built assets receive long cache headers; HTML/API do not.
- Normal API reads target p95 below 500 ms excluding third-party providers.
- Critical writes return a clear pending state rather than keeping the UI blocked during manual processing.
- Lists use server pagination; exports are permission-gated and capped at 5,000 rows.
- Database pool size is explicitly configured for hosting limits.

## 7. Accessibility and interaction

- Target WCAG 2.2 AA for public and authenticated critical flows.
- Every action is keyboard operable with visible focus and correct label/name/state.
- Dialogs trap focus, restore focus and close predictably.
- Text/background, icon/background and all hover/focus/disabled states pass contrast in both themes.
- `prefers-reduced-motion` removes non-essential movement; content never depends on animation.
- Haptic feedback uses supported browser APIs only as progressive enhancement.
- UI sound is not a navigation control and must not autoplay. The menu contains theme, not sound, controls.

## 8. SEO and public/private separation

- Public pages have unique title, description, canonical URL, crawlable copy and correct social metadata.
- Account, staff, API, verification and reset views are `noindex`.
- Sitemap/robots include only approved public routes.
- Structured data must describe only verified organization/product facts.
- Financial/risk copy must match the product and legal source of truth; no placeholder credibility claims may ship.

## 9. Quality gates

Every merge to `main` must pass:

```text
npm ci
npm run typecheck:backend
npm run build
npm test
npm run test:postgres
npm audit --omit=dev
```

Production candidates additionally require:

- production web/worker smoke test;
- migration and rollback/restore plan review;
- no uncommitted generated or secret files;
- responsive/theme/accessibility manual QA;
- controlled staging reconciliation of deposits, trades, holds and payouts.

## 10. Configuration contract

Required production groups (exact names and validation live in `.env.example` and `backend/production.ts`):

- origin/runtime: `NODE_ENV`, `APP_ORIGIN`, `JOB_MODE`, `TRUST_PROXY_HOPS`;
- database: `DATABASE_URL`, optional trusted `DATABASE_CA_CERT`, `DB_POOL_MAX`;
- files: `UPLOAD_ENCRYPTION_KEY`, scanner host/port and optional verified TLS client settings;
- mail: `MAIL_DELIVERY_ENABLED`, `MAIL_FROM`, and exactly one configured mail provider;
- optional identity: reviewed Google OAuth credentials;
- bootstrap: one-time Super Admin setup variables, removed immediately after use.

Do not copy production secrets into documentation, issues, screenshots or chat.

