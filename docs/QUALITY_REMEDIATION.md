# Quality remediation — 3 November 2026

## Implemented

- Fixed first-owner bootstrap audit INSERT: UUID actor and text target use distinct SQL parameters.
- Added an integration regression test through the official bootstrap CLI.
- Shared ActionButton/Spinner now handles pending state, accessible busy status and duplicate-click prevention. Existing form busy state is passed explicitly.
- Raised legacy sub-13px CSS type to 13px; public body is 16px.
- Enforced 24px control minimum, 44px mobile minimum and 49px primary actions.
- Removed public gradient text, automatic ticker movement, ornamental glow and excessive surface blur.
- Corrected public contrast and tablet hero collision; flattened calculator and showcase nested surfaces.
- Owner-requested illustrative reviews and activity are visible with explicit fictional/demo provenance; they never claim real customer transactions.
- Replaced incorrect blanket statements that financial endpoints do not exist with accurate manual-review/inventory/eligibility descriptions.
- Updated PRODUCT.md context sections.

## Verification

- Production frontend build: pass.
- Backend type-check: pass.
- Automated tests: 41 pass, including bootstrap regression and financial/security integration tests.
- Interaction-state checker: pass.
- Impeccable homepage detector: zero findings after remediation.
- Browser checks at 390px and 1440px across customer overview, wallet, deposit, buy/sell, swap, withdrawal, KYC, account, security, notifications, support, physical and transaction routes: no document overflow. Mobile button targets rechecked after account content loaded.
- Ten public guide routes checked at 390px: no document overflow or undersized buttons.
- Light/dark controls exercised and browser screenshots captured.

## Design review limits

Taste Skill's strict gallery-site inspector still rejects product-specific choices including functional asset/rate labels, outlined wallet cards, icons and a three-dimensional gold hero instead of stock photographs/video. The approved GoldSwap brief explicitly requires colourful functional cards, real asset icons, a wallet experience and restrained gold branding. These choices are preserved rather than applying a different brand or removing useful financial labels to satisfy a detector. Its remaining output is not a clean pass and must not be reported as one.

## Requires owner information / deployment acceptance

3 November interaction polish: unified sentence case, purposeful navigation icons, hover/focus feedback and tabular figures. Fresh-price animation and FAQ/detail transitions obey motion preferences and pause controls. Staff queues now guard against stale async results, distinguish loading/error/no-results, provide filter reset and highlight/focus the selected request. Proof preview can be hidden without re-fetching; staff destinations survive reload. Shared asynchronous buttons use a synchronous in-flight guard to block duplicate clicks before React renders the busy state. Browser-only illustrative queue fixtures exercise selection/loading without creating or approving financial records.

3 November copy and bug cleanup: review red-dot text is “Illustrative feedback”; fictional-profile disclosure remains visible. Shortened market, workspace and level copy, and replaced obsolete preview terms with the confirmed hold/fee rules. Failed activity requests now show unavailable rather than implying a disconnected source. SEO 404s retain their requested URL, show not-found metadata and omit structured data; private account social metadata uses the account title. Added regression assertions. At 380px and below, Log in moves into the mobile menu to prevent header crowding. Build, backend type-check, interaction checks and 42 tests pass; browser checks cover the review tooltip and narrow header.

Company name, Dubai/UAE operating location, registered office, licence 802467 and LEI 984500B80CECC46U0482 were supplied on 3 November 2026 and are now in the transparency section and crawlable About content. GLEIF reports entity ACTIVE and LEI registration LAPSED as of that check. Source links and separate status labels are preserved. Supported service jurisdictions, GoldSwap custody/backing evidence, platform permissions and final approved legal documents remain pending.

Live Heroku PostgreSQL, mail delivery, private scanner, backups/restore, worker operation and a reconciled real transaction per enabled network still require deployment acceptance. Local tests do not certify those external services.
