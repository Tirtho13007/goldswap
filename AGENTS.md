# GoldSwap Agent Rules

These instructions apply to the entire repository.

## UI source of truth

Before creating or modifying any UI component, read these files completely:

1. `DESIGN.md`
2. `docs/UI_UX_DESIGN_BRIEF.md`
3. the relevant flow in `docs/APP_FLOW.md`
4. the relevant product rule in `docs/PRODUCT_REQUIREMENTS.md`

`DESIGN.md` owns exact visual tokens. Do not introduce a conflicting colour, type, spacing, radius, shadow or motion system. A direct user request may change the system, but update `DESIGN.md` in the same change.

## Required design skills

For frontend work, use the installed skills when applicable:

- `awesome-design-md` for DESIGN.md grounding and selective reference research;
- `impeccable` for design direction, audit and polish;
- `taste-skill` for BOLD/MOTION/DENSITY calibration;
- `web-design-guidelines` for UX/accessibility review.

External design systems are references only. Never copy another brand's identity, trademarks, copy or full visual language.

## Non-negotiable engineering rules

- Never use generic purple-to-blue gradient headline text.
- Never use emoji icon tiles for feature/action headings; use the established Lucide or authentic asset SVG system.
- Gold is the brand/primary-action colour. Green, red and amber primarily communicate status.
- Interactive targets are at least 24×24px and mobile touch targets at least 44×44px.
- Do not disable browser zoom; `user-scalable=no` and `maximum-scale=1` are forbidden.
- Every pending async form/action button shows a visible `<Spinner />`, exposes a busy state and blocks duplicate submission.
- Preserve readable hover/focus/active/disabled states in both themes. Light-mode hover may never erase text/icon contrast.
- Respect `prefers-reduced-motion`; UI sound does not belong in navigation and must not autoplay.
- Do not invent financial values, reviews, status, custody evidence or trust claims for visual completeness.

## UI completion gate

After building or updating a page or meaningful component:

1. run Impeccable audit and polish across components, typography and backgrounds;
2. run Web Design Guidelines review and `node scripts/check-interaction-states.js`;
3. build/type-check/test in proportion to the change;
4. start/open the live localhost page with Playwright MCP;
5. click the affected controls in both light and dark themes and at desktop/mobile sizes;
6. take a browser screenshot and verify no CTA, close icon, dialog, tooltip or text overlaps, clips or overflows;
7. fix every observed regression before declaring completion.

If Playwright/browser QA is unavailable, report the exact blocker; do not claim visual verification.

## Change control

Fees, routes, hold rules, roles, navigation and product scope must update their shared executable source, tests and relevant source-of-truth document in the same change. Old screenshots and preview-era `ARCHITECTURE.md` are not product authority.

