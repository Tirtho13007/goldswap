# GoldSwap deployment — 2 November 2026

Target domain: **https://goldswap.app**. Source readiness and a real production acceptance test are separate gates. Do not label an installation live until the checks below pass on its actual infrastructure.

## Architecture

- Node 24 web service: `npm start`; serves the built React app and API.
- Separate always-on worker: `npm run worker`; settles mature holds, creates customer events and delivers email. `JOB_MODE=external` prevents duplicate web-process jobs. Operations remain idempotent and email uses database leases.
- Managed PostgreSQL with verified provider TLS. Local PGlite is development only. Encrypted private documents are stored in PostgreSQL, not ephemeral local disk.
- Private ClamAV `clamd` service, maintained signature database, port 3310 accessible only to the web service. Clean scans are required before uploads are encrypted/saved. Scanner outage rejects uploads; never disable screening to work around an outage.
- Transactional mail: verified `goldswap.app` sender through Resend **or** authenticated SMTP. No mailbox password belongs in GitHub source.

## Build and release

1. Provision the services and domain/HTTPS in your chosen hosting account. Hosting fees and resource creation require the owner's approval. Keep `SEO_INDEXING_ENABLED=false` while staging.
2. Set `NODE_ENV=production`, `APP_ORIGIN=https://goldswap.app`, `DATABASE_URL`, `UPLOAD_ENCRYPTION_KEY`, `JOB_MODE=external`, `TRUST_PROXY_HOPS`, `MAIL_DELIVERY_ENABLED=true`, `MAIL_FROM`, one provider's credentials, `CLAMAV_HOST` and optionally `CLAMAV_PORT`.
3. `TRUST_PROXY_HOPS` must match the actual trusted hosting proxy path; use 0 behind no proxy. Do not expose an alternate direct route around that proxy. Heroku's simple single-router topology uses 1; an extra CDN can change it. Do not set a blanket trust-all policy. Production redirects HTTP to the configured HTTPS origin and sets secure host-only session cookies.
4. Generate a new encryption key privately: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Store the result in hosting secrets and an independent secure backup. If migrating existing encrypted documents, retain their original key instead. Changing the key without a data migration makes old documents and staff MFA secrets unreadable.
5. Build with `npm ci` then `npm run build`. Run `npm run db:migrate` in a **release job** before web/worker startup. Production startup does not automatically migrate. Heroku's Procfile includes release/web/worker definitions; Docker deployments must run the same release command separately.
6. Bootstrap one owner using `BOOTSTRAP_EMAIL=app.goldswap@gmail.com` and a unique `BOOTSTRAP_PASSWORD` through a one-off `npm run admin:bootstrap`. Use the GoldSwap name in the profile. Remove bootstrap credentials before starting web/worker. Do not store them in deployment templates.
7. Sign in, enroll the staff authenticator, save recovery codes privately, then continue to staff overview. Customers have no MFA enrollment. Every production staff router requires MFA verified on the current session; sensitive staff writes require password + authenticator confirmation within five minutes. Enabling MFA revokes other sessions. Password resets revoke sessions and do not bypass MFA.
8. Start web and worker, verify `/health` and `/ready`, then run `npm run check:deployment`. `/health` is process liveness; `/ready` checks database/schema plus a worker success within five minutes. Alert on failures from an external monitor.

## Migrate existing local setup safely

The repository intentionally contains no users, wallet configuration, private documents, initial setup links, database or encryption key. Decide between a clean launch and a controlled migration. For a clean launch, bootstrap the owner and enter all 22 confirmed receiving routes through Coins & networks; independently verify every address, chain, token contract and XRP tag against the supplied Wallet folder. Never copy fixture addresses from tests. For a data migration, use a reviewed database export/restore procedure and preserve the original encryption key; validate counts, encrypted document reads and every gold/crypto journal before switching traffic. Never upload the local `data/` folder to GitHub.

## Mail acceptance

Verify domain ownership, SPF and DKIM with the provider and publish the reviewed DMARC policy. Send a verification email, password reset, deposit acknowledgement/approved receipt and withdrawal update to owner-controlled inboxes. Test expired and reused links, HTML/text rendering, provider failures and retry state. `sent_at` records provider acceptance, not inbox delivery. Investigate failed mail in the staff email panel. Set Google OAuth credentials and the exact callback `https://goldswap.app/api/v1/auth/google/callback` only if Google sign-in is enabled.

## Backups, monitoring and rollback

- Enable managed PostgreSQL daily backups/PITR with the provider; configure failure alerts and retention according to the actual business/legal requirements. Hosting UI configuration is not performed by source code.
- `npm run db:backup` uses `pg_dump` with credentials from environment variables. Put archives in private encrypted off-host storage; a local backup inside a disposable container is not a backup strategy. Use a PostgreSQL client version compatible with the server. Back up the encryption key separately. Never commit archives.
- Restore a backup to a new empty database named `goldswap_restore_<suffix>`. Set `RESTORE_DATABASE_URL` and `BACKUP_FILE`, then run `npm run db:restore-check`. This command refuses production/source targets by name/URL and does not erase existing data. Verify schema version, balanced journals, inventory, user totals and document decryption before accepting the drill.
- Keep an earlier application image/release and database backup. Current migration 008 is additive: a code rollback must leave the added columns intact. Do not drop financial records or reverse settled balances to roll back an interface release.
- Monitor readiness, worker failures, mail failures, request IDs/5xx, database capacity, gold stock and crypto liquidity. Logs exclude request bodies, tokens, addresses and document content.

## Required live acceptance before opening financial services

- CI must pass build, types, embedded tests, **native PostgreSQL tests**, production-mode server checks and dependency audit.
- On staging: fresh registration without verified email, customer/staff role separation, staff enrollment/login/reauthentication, proof visibility, KYC approval/rejection/resubmission, deposit approval exactly once, failed/cancelled withdrawals, actual manual payout evidence, gold inventory/liquidity gates, five-day settlement on restart, physical 500 g → 510 g and 1000 g → 1020 g, receipt PDF and support attachments.
- On the actual deployment: verified mainnet addresses/networks, minimal owner-controlled end-to-end transaction, restart/deploy continuity, mail delivery, scanner clean/infected/outage behavior, backup restore and monitoring alert.
- Confirm company identity, legal eligibility for target countries, gold custody/stock, physical delivery arrangements and disclosed five-day profit terms with appropriate professional review. Software tests do not certify reserves or legal permissions.
- Only after sign-off: disable maintenance, open registration as intended, enable public SEO indexing, verify canonical/sitemap/robots and submit the sitemap to the owner's search console.

No live hosting, DNS, mail sender, scanner service, real-wallet transfer or legal approval is implied by this source release. Record real acceptance evidence separately.

References: [Express proxy configuration](https://expressjs.com/en/guide/behind-proxies.html), [node-postgres transactions](https://node-postgres.com/features/transactions), [PostgreSQL backup](https://www.postgresql.org/docs/current/app-pgdump.html).
