# GoldSwap Design System

**Status:** Locked visual source of truth  
**Version:** 1.0  
**Quality baseline:** readable metadata uses at least 12px; shared controls use ActionButton with explicit pending state and Spinner. Public text is solid colour; illustrative social proof carries explicit illustrative provenance. Mobile targets are 44px minimum. Use “Illustrative” in all example-content labels; do not use “Demo” in UI copy. Review provenance stays on the red-dot tooltip and section introduction; omit the redundant bottom disclosure.
**Last updated:** 2 November 2026  
**Taste calibration:** BOLD 55/100 · MOTION 35/100 · DENSITY 58/100

3 November interaction refinement: sentence case for headings, action labels and supporting labels; retain proper brand names and uppercase asset/security abbreviations (BTC, USDT, KYC, USD). Use the existing colour tokens for hover/selected/focus states. Live-price breathing appears only on a fresh quote; request detail transitions run for 220ms and obey reduced motion. Review queues use a visible selection, loading/error/empty states, oldest-first ordering, explicit filters and adjacent proof/decision details. On narrow screens the queue and review stack. Shared refinements live in interaction-polish.css.

3 November public refinement: public surfaces share 22px cards, 24/32px padding, 14px controls and 15–16px body copy. Gold owns tier rates and primary actions; asset logos retain authentic colours. The live-price ticker intentionally scrolls continuously at the owner's request, with an explicit pause/play control, hover/focus pause and reduced-motion fallback. Public-specific refinements live in public-design.css and must not restyle staff controls.

Read this file before creating or modifying any UI. Approved product behaviour remains in `docs/PRODUCT_REQUIREMENTS.md`; detailed interaction guidance remains in `docs/UI_UX_DESIGN_BRIEF.md`. This file owns visual tokens and non-negotiable component rules.

## 1. Design character

GoldSwap is a premium gold-and-crypto wallet: calm, trustworthy, precise and operationally clear. Brand expression comes from warm gold, restrained depth, strong typography and carefully coloured status/action accents. It is not a neon exchange, generic SaaS template or playful fintech toy.

- **BOLD 55:** distinctive gold identity and colourful functional cards, without theatrical layouts in task surfaces.
- **MOTION 35:** smooth, short feedback; no constant bouncing, parallax noise or decorative delay.
- **DENSITY 58:** efficient wallet/admin information with deliberate whitespace and strong grouping.

## 2. Exact typography

| Role | Family | Weight | Size / line-height |
|---|---|---:|---|
| Display / public H1 | `Manrope Variable`, `DM Sans Variable`, sans-serif | 500–600 | `clamp(56px, 5.3vw, 78px)` / 1.09 |
| Page H1 | Manrope | 600 | `clamp(30px, 3.3vw, 46px)` / 1.2 |
| Workspace page title | DM Sans | 600 | 27px / 1.2 |
| Card title | DM Sans | 550–600 | 17–18px / 1.3 |
| Body | DM Sans | 400 | 15–16px / 1.6–1.75 |
| Mobile body/description | DM Sans | 400 | 14–16px / at least 1.55 |
| UI control | DM Sans | 600–650 | 12–14px / 1.2 |
| Metadata | DM Sans | 400–550 | 11–13px / at least 1.4 |

Use tabular numerals for aligned balances, fees, prices and countdowns. Do not introduce Inter or another font without an approved design-system change.

## 3. Exact colour tokens

### Public dark surface

```css
--public-canvas: #0d111a;
--public-canvas-deep: #080a0d;
--public-panel: #121410;
--public-text: #f4f3ef;
--public-muted: #a5a9b1;
--public-gold: #edc887;
--public-border: rgba(234, 234, 242, .13);
--public-blue: #83a6ff;
--public-green: #64d7a7;
--public-purple: #b899ff;
--public-amber: #f0c46f;
--public-rose: #ed97c2;
--public-teal: #70d6d0;
--public-red: #ff8999;
```

### Workspace light

```css
--canvas: #f4f7fb;
--surface: #ffffff;
--text: #192b42;
--muted: #52647e;
--border: #dce4ef;
--hover: #edf2fa;
--gold: #8b6017;
--input: #f6f8fc;
--field-border: #899bb4;
--primary: #946516;
--primary-text: #ffffff;
--disabled-bg: #e8edf4;
--disabled-text: #506078;
--green: #087547;
--green-soft: #e7f6ed;
--blue: #315fca;
--blue-soft: #edf2ff;
--purple: #7543bb;
--purple-soft: #f2edff;
--amber: #8b6017;
--amber-soft: #fff4dc;
--teal: #086b70;
--teal-soft: #e5f7f5;
--rose: #b23872;
--rose-soft: #fff0f7;
--red: #b82943;
--red-soft: #fff0f2;
```

### Workspace dark

```css
--canvas: #0d131d;
--surface: #171f2d;
--text: #f0f4fc;
--muted: #b2c0d5;
--border: #344158;
--hover: #233047;
--gold: #e5bd70;
--input: #101925;
--field-border: #637590;
--primary: #e2b96b;
--primary-text: #172232;
--disabled-bg: #253145;
--disabled-text: #bac7db;
--green: #74e1ae;
--green-soft: #18382d;
--blue: #9bbcff;
--blue-soft: #202f4e;
--purple: #c7acff;
--purple-soft: #302744;
--amber: #edc77d;
--amber-soft: #3b3020;
--teal: #89e0da;
--teal-soft: #173b3c;
--rose: #ffafd3;
--rose-soft: #3f2639;
--red: #ffafbc;
--red-soft: #432633;
```

Gold owns brand and primary CTA. Green/red/amber mainly communicate success/up, failure/down and pending/warning. Blue, violet, rose and teal distinguish functional cards/actions. Never use a generic purple-to-blue gradient headline.

## 4. Spacing, radius and shadow tokens

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 24px;
--space-6: 32px;
--space-7: 48px;

--radius-control: 10px;
--radius-button: 13px;
--radius-input: 11px;
--radius-icon: 13px;
--radius-card: 22px;
--radius-shell: 30px;
--radius-pill: 999px;

--shadow-card-light: 0 8px 28px #223c6510;
--shadow-card-dark: 0 10px 32px #0002;
--shadow-hover: 0 9px 20px color-mix(in srgb, var(--tone) 18%, transparent);
--shadow-modal: 0 20px 70px #07102240;
```

Do not create arbitrary spacing/radius values when a listed token fits. Cards are normally 22px; compact nested controls are 10–15px. Avoid excessive nested cards.

## 5. Component rules

### Buttons

- Primary CTA uses `--primary` with `--primary-text`; minimum height 49px for principal financial actions.
- Desktop controls have at least a 24×24px hit area; mobile touch targets are at least 44×44px.
- Hover: restrained colour/tint change plus at most `translateY(-2px)`.
- Active: at most `scale(.985)`; focus-visible uses a high-contrast 2px ring with offset.
- Disabled remains readable and clearly unavailable; it does not use low-opacity text alone.
- Every async action displays an explicit visible `<Spinner />`, retains its width, sets an accessible busy state and prevents duplicate submission.

### Cards

- Default card: semantic surface, 1px semantic border, 22px radius and approved shadow.
- Summary card contains an icon badge, label, one primary value and one supporting status.
- Quick action uses a soft semantic tint and clean Lucide/asset SVG icon; never an emoji tile.
- Hover must preserve text/icon contrast in both themes and cannot switch to unpaired white foreground/background.

### Status

- completed/approved/verified/up → green;
- pending/queued/processing/warning → amber;
- rejected/failed/blocked/down → red;
- active/information → blue;
- cancelled/draft/neutral → muted slate.

Every status includes text, never colour alone.

Company self-attestation uses a green BadgeCheck SVG and the exact label “Verified by GoldSwap INC”, with the visible qualifier “Internal company verification. Not an independent audit.” Keep it scoped to the custody statement; it is not a registry, regulator or independent-auditor badge.

Owner-requested public illustrative reviews/activity remain visible with explicit illustrative disclosure and red review provenance dots. They must never be described as live customer transactions or independently verified endorsements. The public workspace showcase is a single flat, responsive illustrative account card, without perspective, duplicate outline or overlapping orbit decoration.

### Forms and dialogs

- Labels remain visible. Financial forms follow Amount → Details → Review → Result.
- Display gross, fee and net before confirmation.
- Dialogs are labelled, trap/restore focus, support Escape and keep close controls within bounds.
- Country selector includes flag, country name and calling code.
- Asset/network selector includes icon, asset, network and available balance.

## 6. Motion tokens

```css
--motion-fast: 160ms;
--motion-standard: 220ms;
--motion-slow: 280ms;
--ease-standard: cubic-bezier(.2, .8, .2, 1);
--lift-small: -2px;
--lift-card: -3px;
```

Use motion for causality and feedback. No autoplay UI sound. Haptics are progressive enhancement after direct actions. Under `prefers-reduced-motion: reduce`, remove non-essential movement and smooth scrolling without removing information.

## 7. Density and layout

- Desktop workspace uses a 218px collapsible navigation region and fluid content.
- Critical page title/action remains visible without horizontal scrolling.
- Data-heavy tables paginate and transform safely on mobile.
- Start QA at 320px; mobile body remains 14–16px.
- Use the 4/8/12/16/24/32/48 spacing rhythm; do not compress task-critical controls to fit more cards.

## 8. Anti-slop prohibitions

- No generic purple-blue gradient text headline.
- No emoji icon tiles above feature titles.
- No invented metrics, balances, reviews, percentages or trust evidence.
- No excessive pills, nested cards, glass blur, glow or floating decorations.
- No low-contrast grey text on coloured cards.
- No duplicate token system inside one page/component.
- No animation that delays a financial or staff workflow.

## 9. Required verification

For every page or meaningful component update:

1. run Impeccable audit and polish for components, typography and background;
2. run the Vercel Web Design Guidelines review against changed UI files;
3. run the local interaction-state checker;
4. open the live localhost route with Playwright MCP;
5. exercise affected interactions at desktop and mobile widths in light and dark themes;
6. capture a real screenshot and check CTA/close-icon overflow, overlap, clipping, focus and loading states;
7. fix observed visual defects before completion.

Browser zoom must remain enabled. `user-scalable=no` and `maximum-scale=1` are forbidden.

