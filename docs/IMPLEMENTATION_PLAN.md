# GoldSwap Implementation Plan

**Status:** Production-readiness roadmap  
**Version:** 1.0  
**Last updated:** 2 November 2026

This plan separates code-complete work from deployment, operational and legal acceptance. A green build alone does not make a financial platform ready for customer funds.

## 1. Current baseline

Implemented in the repository:

- React public/customer/staff experiences with light/dark themes;
- registration, sessions, verification flow, reset and Google identity capability;
- profile, session security and production staff MFA/reauthentication;
- RBAC, permission overrides, user restriction/archive/restore and audit;
- manual KYC, crypto deposit/withdrawal and private evidence;
- 8 assets across 22 route identities;
- platform gold inventory, buy/sell quotes, swaps and five-day holds;
- normal/physical withdrawal fee rules and fulfilment workflow;
- support, notifications, email outbox and transaction documents;
- PostgreSQL migrations, worker, production readiness, backup scripts and CI.

Not proven by code alone:

- live infrastructure/secrets, receiving-wallet ownership and route reconciliation;
- real sender-domain email delivery and private scanner connectivity;
- scheduled offsite backup and successful real restore drill;
- legal/regulatory approval, custody evidence, insurance or physical fulfilment capability.

## 2. Phase 0 — Source-of-truth freeze

- [x] Product and technical requirements.
- [x] Customer/staff application flows.
- [x] UI/UX brief.
- [x] Backend/frontend schema maps.
- [x] Versioned implementation plan.

Any fee, asset, route, role, hold rate/term, navigation or product-scope change must update shared code, tests and the relevant document in one change.

## 3. Phase 1 — Infrastructure (launch blocker)

- [ ] Provision Heroku app with `web`, `worker` and `release` processes.
- [ ] Provision production PostgreSQL with trusted TLS and reviewed pool limit.
- [ ] Configure `goldswap.app`, canonical redirect and valid ACM certificate.
- [ ] Generate and separately back up a stable upload-encryption key.
- [ ] Configure a verified-sender mail provider.
- [ ] Provision private/restricted malware scanning or a verified TLS gateway.
- [ ] Configure log drain, readiness/uptime monitoring and alerts.
- [ ] Schedule encrypted offsite PostgreSQL backups with retention.
- [ ] Restore a backup into a new disposable database and retain evidence.
- [ ] Turn on one web and one always-on worker; verify fresh heartbeat.

Exit: readiness remains healthy; database, worker, mail and scanner work; restore is evidenced; no secret is in Git/logs.

## 4. Phase 2 — Production configuration (launch blocker)

- [ ] Bootstrap `GoldSwap <app.goldswap@gmail.com>` once; remove bootstrap variables.
- [ ] Enrol Super Admin authenticator MFA and test recovery.
- [ ] Create least-privilege admin/moderator roles; test deny precedence.
- [ ] Confirm each production address, QR payload and XRP tag from an authorized source.
- [ ] Independently verify wallet ownership and provider support for each enabled route.
- [ ] Configure confirmations and withdrawal enablement per network.
- [ ] Record real gold inventory only with approved custody evidence.
- [ ] Fund/reconcile platform liquidity; never invent balances.
- [ ] Finalize support contact, announcement, registration and maintenance settings.

Exit: no demo value can be mistaken for production funds; two people verify each enabled address and staff-access policy.

## 5. Phase 3 — Legal, product and copy (launch blocker)

- [ ] Jurisdiction-specific review of crypto funding, gold sale/custody, five-day payout and physical delivery.
- [ ] Publish approved Terms, Privacy, Risk, AML/KYC, cancellation/refund and retention language.
- [ ] Verify registration, license/permission, custody and insurance claims before trust badges.
- [ ] Define support/processing expectations without instant promises.
- [ ] Replace preview-era public copy that conflicts with live capability.
- [ ] Remove fictional/sample reviews/activity from production credibility content.
- [ ] Confirm supported countries, restrictions, sanctions/PEP process and age policy.

Exit: product owner and qualified legal/compliance reviewer approve the exact live copy and operating model.

## 6. Phase 4 — Staging end-to-end verification (launch blocker)

With controlled low-value test funds:

- [ ] register → dashboard before verification → verify later;
- [ ] reset, profile/country flag, sessions and both themes;
- [ ] each KYC type: approve, more-info, reject, resubmit and history;
- [ ] deposit proof → approval → receipt/email;
- [ ] buy/sell expiry, insufficient inventory/liquidity and atomic success;
- [ ] swap expiry, precision rounding, liquidity rejection and success;
- [ ] hold creation/reserve and controlled-time exactly-once worker settlement;
- [ ] crypto withdrawal address/memo, fee, KYC, review, process, complete, receipt and explorer;
- [ ] physical 500/510 g and 1,000/1,020 g, dispatch/delivery/cancel;
- [ ] support attachment, assignment, conversation and transaction link;
- [ ] staff permission, deny override, MFA, reauthentication and audit;
- [ ] email retry/failure, notification deep link and document authorization;
- [ ] web/worker restart during pending operations to confirm idempotency.

Perform a controlled receiving/reconciliation test for every enabled route before public enablement.

## 7. Phase 5 — UI/UX and accessibility (launch blocker)

- [ ] Audit all public/customer/staff routes in light and dark.
- [ ] Verify default/hover/focus/active/selected/disabled/loading contrast—especially light hover.
- [ ] Validate desktop, tablet and 320–430 px mobile.
- [ ] Keyboard and screen-reader critical-flow audit.
- [ ] WCAG 2.2 AA automated scan plus manual contrast/focus/dialog review.
- [ ] Reduced-motion validation; content never depends on animation/haptic.
- [ ] Chrome, Edge, Safari and mobile smoke tests.
- [ ] Validate empty, loading, error, offline, forbidden and pending states.
- [ ] Check public LCP/CLS and lazy account/visual bundles.

Exit: QA matrix is green with no unreadable state or blocked keyboard action.

## 8. Phase 6 — Security/release review (launch blocker)

- [ ] Exact release commit passes install, builds/typechecks, unit/PostgreSQL tests, production smoke and production audit.
- [ ] Independent review of auth, RBAC, file access, financial idempotency and validation.
- [ ] Dependency, static and secret scan with findings reviewed.
- [ ] Verify cookies, CSP, HTTPS, HSTS, canonical host and private noindex.
- [ ] Test abuse/rate limits and safe error/log redaction.
- [ ] Review double-approval/settlement constraints under concurrency.
- [ ] Prepare incident runbooks for wallet compromise, wrong network, payout error, breach, worker outage and rollback.

Exit: no unresolved critical/high finding; rollback and incident owners are named.

## 9. Phase 7 — Controlled launch

- [ ] Deploy release commit; migrations run only in release phase.
- [ ] Run deployment check and read-only production smoke.
- [ ] Start with registration/financial switches controlled by settings.
- [ ] Internal staff pilot, then limited invited-customer rollout.
- [ ] Reconcile ledger, wallets and inventory daily during pilot.
- [ ] Monitor readiness, worker, mail, review backlog, failures and liquidity.
- [ ] Obtain explicit go/no-go approval before public financial submissions.

## 10. Ongoing operations

Daily: review queues/failed mail, reconcile chains/ledger/inventory, check readiness and suspicious activity.

Weekly: verify backups, access changes, audit anomalies, liquidity and stuck requests.

Monthly/quarterly: restore drill, access review, dependency updates, retention review, incident exercise and legal/copy review.

## 11. Definition of done

A future feature is done only when:

1. product rule and actor are documented;
2. API/database authorization and idempotency are implemented;
3. frontend covers responsive light/dark and all interaction states;
4. accessibility and reduced motion are verified;
5. unit/PostgreSQL/integration tests cover success and failure;
6. audit/notification/document behaviour is considered;
7. source-of-truth docs are updated; and
8. CI passes on the exact commit.

Follow `DEPLOYMENT.md` for concrete Heroku execution. This plan defines acceptance; the runbook defines deployment steps.

