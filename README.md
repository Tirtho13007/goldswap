# GoldSwap.app

## Product source of truth

Future product, design and engineering work must start with these versioned documents:

- [Product Requirements](docs/PRODUCT_REQUIREMENTS.md)
- [Technical Requirements](docs/TECHNICAL_REQUIREMENTS.md)
- [Application Flow](docs/APP_FLOW.md)
- [UI/UX Design Brief](docs/UI_UX_DESIGN_BRIEF.md)
- [Backend Schema](docs/BACKEND_SCHEMA.md)
- [Frontend Schema](docs/FRONTEND_SCHEMA.md)
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)

If screenshots, old preview copy or older architecture notes conflict with this set, these documents plus executable shared policy and migrations take precedence.

GoldSwap customer and staff platform built with React, TypeScript, Node 24 and PostgreSQL.

## Deployment

Read [the deployment runbook](docs/DEPLOYMENT.md) before deploying. Production requires a managed PostgreSQL database, HTTPS domain, stable encryption key, live email provider, a private document scanner and an always-on account worker. The repository contains source code only; local wallet settings, user data and secrets are excluded.

```text
npm ci
npm run typecheck:backend
npm run build
npm test
npm run db:migrate
npm start
```

Use `npm run worker` as a separate service with `JOB_MODE=external`. Apply migrations in the release job. Heroku Procfile and a non-root Dockerfile are included. CI also runs isolated native PostgreSQL tests using `npm run test:postgres`.

## Current behavior

- Customer registration/login, optional email verification reminder and account profiles.
- Separate permission-controlled staff workspace: KYC/deposit/withdrawal review, user management, roles, networks, inventory and audit.
- Crypto-only gold buy/sell, internal swaps, manually reviewed deposits/payouts and five-day holds with pre-reserved profit.
- Support conversations, notifications, branded email queue/retries, transaction details and PDF receipts.
- Physical delivery minimum 500 g with 2% extra gold charge. Normal gold withdrawal fee 1.5%; deposit fee 0%; deposit minimum $15 and withdrawal minimum $20.
- Production staff MFA and five-minute reauthentication; customers have no MFA enrollment.
- Encrypted, owner/permission-scoped documents screened before storage in production.

## Local development

Copy `.env.example` to `.env` and set local-only values. Without `DATABASE_URL`, development uses persistent PGlite under ignored `data/`. Do not open that same embedded database from two processes. Run the CLI while the local web process is stopped, or use managed PostgreSQL.

```text
npm run build
npm start
```

Default development origin: `http://localhost:4173`. For another port, set both `PORT` and `APP_ORIGIN`. `npm run dev` serves the frontend separately and proxies API requests to 4173.

## Documentation

- [Deployment and live acceptance](docs/DEPLOYMENT.md)
- [Confirmed platform rules](docs/PLATFORM_RULES.md)
- [Customer services](docs/CUSTOMER_SERVICES.md)
- [UI consistency QA](docs/UI_CONSISTENCY_QA.md)
- [Earlier backend setup notes](docs/BACKEND_SETUP.md)

The deployment runbook supersedes older activation notes. No hosting/DNS changes or actual customer funds are deployed by committing this repository. Historical charts and marked fictional reviews remain illustrative; production readiness does not verify business reserves, legal authorisation or proposed returns.
