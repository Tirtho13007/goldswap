# Customer services — implementation and activation

Migration `007_customer_services.sql` adds support conversations, notifications, delivery queue state, MFA credentials, address book, KYC history and immutable transaction document snapshots. Migrations run at server start. Existing balances, wallet routes, fee rules and manual approval controls are preserved.

## Verification and account mail

Verification/reset messages have branded responsive HTML and text alternatives, an explicit purpose, one-use link and a 30-minute expiry. Resending invalidates the older token and expires the earlier queued message. Dashboard access and menu visibility remain available without email verification.

The sender is configured only on the server. No SMTP password or API key belongs in the browser or source archive. Choose one transport:

- **Resend:** set `RESEND_API_KEY` and a verified-domain `MAIL_FROM`, then `MAIL_DELIVERY_ENABLED=true`. A Gmail sender cannot be verified as your own domain in Resend. Configure domain DNS through the provider. See [Resend domains](https://resend.com/docs/dashboard/domains/introduction).
- **Gmail SMTP:** configure `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER`, an eligible Google account app password in `SMTP_PASSWORD`, and a permitted `MAIL_FROM`. Normal Gmail passwords are not used. SMTP on port 587 requires STARTTLS; port 465 uses TLS from connection start. See [Nodemailer SMTP](https://nodemailer.com/smtp) and [Google app passwords](https://support.google.com/accounts/answer/185833).

Until enabled/configured, the application explicitly reports preview mode. Users can preview only their own newly queued HTML in local development. Production **always disables the preview endpoint**, even if the mail provider is unconfigured; a signed-in browser cannot use this endpoint to bypass email ownership verification in production.

The server worker runs every 15 seconds. It leases pending messages, retries transient failures with increasing delay and stops automatic attempts after six. Expired verification/reset messages are not sent. Staff with configuration permission can inspect delivery counts and retry eligible unsent messages. Provider acceptance is labelled as acceptance, never inbox delivery. Resend requests use an idempotency key; SMTP uses a stable Message-ID. SMTP cannot guarantee exactly-once delivery if the provider accepts a message but the network response is lost. Bounce/complaint webhooks and delivery-after-acceptance tracking are not implemented. No live provider or real inbox delivery was tested without supplied credentials.

## Notifications and documents

KYC decisions, deposits, withdrawal changes, physical fulfilment, gold orders, settlements and security events create durable account notifications and queued transactional email. Financial mutation audits create document snapshots within the same database transaction. The notification worker consumes committed audit events idempotently; it does not fabricate old activity before the migration baseline.

`GET /transactions/:id` is owner scoped and exposes amounts, fee/net breakdown, review notes, recorded proofs, permitted timeline entries and a chain-specific explorer link where a known explorer exists. An explorer URL does not independently verify settlement. ARC has no guessed explorer link. Internal swaps have no blockchain hash.

Documents have stable unique numbers and immutable snapshots for each recorded transaction status. Pending deposits get request acknowledgements; approved deposits get separate deposit receipts. Withdrawal statements remain acknowledgements until payout completion; completed withdrawals get payout receipts. HTML and PDF downloads require the owning session and use no-store responses. The documents include account identity, exact recorded amounts and status at issuance. They are **platform statements/receipts, not tax invoices**, and do not invent a registered entity, tax number, physical address or custody proof. Email links open the authenticated detail/receipt page rather than publishing documents publicly.

## Support

Customers can open category-based tickets, optionally link an owned transaction, attach up to three private PNG/JPEG/PDF files, reply, resolve and reopen. Messages are plain text; attachment access is restricted to the account owner, the ticket customer for staff attachments and authorised support viewers. Uploads retain encryption and size/type limits.

Staff inbox access requires `support.view`; replying also requires `support.reply`; assignment, priority and status updates also require `support.assign`. Explicit permission denies prevent assignment to a staff member without reply access. Production staff activation remains gated pending full staff MFA/reauthentication rollout. Ticket/message rate and upload limits prevent unbounded submissions. Customer and assignment notifications link to the relevant account inbox.

## Account security

The security page lists owner-scoped active sessions, last activity, expiry and a bounded browser User-Agent label. Password change signs out other sessions and invalidates outstanding password resets. Sign-out-all revokes the current session too. Sensitive changes require the current password and an enabled authenticator/recovery code.

Optional authenticator MFA uses RFC 6238 SHA-1, six digits and 30-second periods, with limited clock drift and replay prevention. Setup secrets are AES-GCM encrypted with the same stable server encryption-key management as private files. Setup must be confirmed within ten minutes. Eight recovery codes are returned once; only hashes persist, and each code is consumed atomically. Enabling MFA signs out other devices. Password-based login enforces MFA; existing Google sign-in cannot bypass it. A Google-only account must first set an account password through recovery to enrol. User MFA does not automatically remove the separate production staff gate.

The withdrawal address book requires reauthentication and network-specific validation. It stores destination/tag per route, never wallet private keys. Saved destinations can be selected in withdrawal forms; the final quote and confirmation still require recipient/network checks. Saving an address is not a payout authorisation.

## KYC lifecycle

Submission supports an optional expiry date for documents with an expiry. Expired/renewal-required approvals do not satisfy withdrawal or physical-order KYC checks. Rejected, more-information and expired cases can be resubmitted. Reopening a valid approval explicitly pauses verified-only actions until a new approval. Identity fields can be edited after reopening. Submission/review snapshots preserve reviewer attribution and prior document references; customers can read their own history and permitted staff can read reviewer history.

Customers can request document deletion. A Super Admin with review permission must configure a reviewed retention period (`KYC_RETENTION_DAYS`, minimum 30 days), check legal holds and explicitly confirm content deletion. Valid current approvals and pending reviews block purge; the minimum period is measured from the last case update. Purge removes encrypted file content for that case's submissions, retaining audit/review metadata. No automatic deletion policy or jurisdiction-specific retention period is invented. Retention configuration and lawful basis still require the operator's decision. Files marked purged cannot be reused for a new KYC submission.

## Physical fulfilment

The customer explicitly confirms recipient and address on submission. Approval requires staff address confirmation plus a physical stock allocation reference. Dispatch records carrier, tracking, optional HTTPS tracking URL and private dispatch proof. Delivery requires evidence and consumes the existing reserved gold exactly once. The customer can acknowledge recorded delivery separately; acknowledgement does not deduct gold again. Pending cancellation and rejection release the original reserve. The 500 g + 2% additional gold rule is unchanged.

## Public SEO and accessibility

Public guides use crawlable `/guides/:slug` links. The Node server emits page-specific title/description, canonical URL, Open Graph metadata, WebSite structured data, initial public text and guide navigation. Robots/sitemap use the configured application origin, not an incoming Host header. Unknown guide routes return 404. Account/API/private document routes are excluded; account views use noindex. Preview environments remain unindexed. Production public indexing additionally requires `SEO_INDEXING_ENABLED=true`; final domain/legal content should be reviewed first. Search Console submission and ranking are not claimed. See [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

New forms have visible labels, keyboard-operable buttons, focus treatment, semantic fieldsets, live status/error text, reduced-motion support and a working dashboard skip link. Asset dialogs have accessible names. Status text retains written labels in addition to colour. Automated axe checks cover the touched account pages in light/dark states, supplemented by mobile overflow and keyboard checks. This is not a whole-site WCAG certification or a substitute for assistive-technology testing.

## Verification

`npm run build`, `npm run typecheck:backend`, and integration tests cover existing money rules plus owner-scoped mail/documents/support, immutable acknowledgements/receipts, PDF generation, notification idempotency, retries, KYC expiry/deletion safeguards, TOTP vectors/replay/recovery, session revocation and server SEO controls. All monetary test fixtures run in separate in-memory databases; no real customer funding, payout or privilege grant is needed for the checks.


## Wallet UI revision — 2 November 2026

The latest customer UI uses one light/dark palette across profile, notifications, physical delivery, security, support, KYC, wallet and staff cards. Text/field/icon tokens are shared; card surfaces use restrained blue, purple, teal and gold tints. Profile has a compact overview, personal/address cards and a separate appearance tab. Country fields in profile, KYC and physical delivery are flag-based searchable pickers with keyboard navigation; registration also searches country codes. Submitted API values remain the existing two-letter codes. Physical forms lock during submission and country changes reset their request key.

**This revision supersedes the customer MFA section above:** two-step verification is removed for personal customer accounts. Customer setup/enable/disable endpoints reject enrolment and existing customer enrolments are inactive under this policy; password/Google sign-in and sensitive account actions do not require a customer code. Staff authenticator support and the separate production staff activation gate remain intact. Staff login only shows a code field when challenged. No real account is promoted or granted permissions by this change.

Profile appearance changes stay consistent with the toolbar theme toggle. Cards/buttons include hover/press/focus transitions; reduced-motion preferences suppress them. Mobile and light/dark axe checks cover the revised customer screens. Existing financial rules, manual approval requirements and receipt semantics are preserved.


## Interaction consistency audit — 2 November 2026

A legacy hover rule made quick-action icon discs translucent while newer cards retained pale backgrounds. The shared finance, staff and wallet shortcut styles now preserve opaque accent discs and stable text colours in normal, hover, focus and active states. Disabled buttons use explicit surface/ink tokens instead of fading the whole control. Public/guest gold calls to action also retain readable brand colours on hover. Staff navigation includes a keyboard skip link.

`scripts/check-interaction-states.js` is a read-only browser audit function for representative visible control classes. It checks text contrast, Lucide icon contrast and opacity of action discs across interaction states. It does not submit forms or execute financial actions. SVG icon contrast is checked separately because a text-only axe scan did not detect the original fading icon. Staff preview checks use isolated read-only API fixtures, including populated review forms, without granting real account permissions. Keyboard skip links, modal country pickers, mobile overflow and normal-motion transitions are checked separately. These checks cover reviewed screens/states and do not assert that every possible UI state is defect-free.
