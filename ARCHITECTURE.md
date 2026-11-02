# GoldSwap.app — Architecture & Editing Guide

> **Superseded preview-era document.** This file is retained for historical context and contains statements that no longer describe the implemented platform. For all new product, design and engineering work, start with the seven documents linked under **Product source of truth** in `README.md`, together with executable policy and migrations.

শেষ আপডেট: ৩০ অক্টোবর ২০২৬। এই নথি বর্তমান implementation-এর মানচিত্র; ভবিষ্যতের backend-কে বর্তমান সুবিধা হিসেবে বর্ণনা করে না।

## 1. বর্তমান পরিধি

React landing page, live spot-price feed, illustrative calculators, account-form preview, animated reviews and clearly labelled demo activity. Real authentication, custody, deposits, withdrawals, KYC, referrals, customer events and admin permissions are **not implemented**. Heroku deployment and domain changes have not been performed.

## 2. Stack ও data flow

```text
index.html → src/main.tsx → App.tsx
                           ├─ Assets.tsx: logos / review profiles / payment marks
                           ├─ Market.tsx: feed hook, ticker, Markets dropdown
                           ├─ Experience.tsx: reviews, activity panel, bottom toast
                           │                    └─ activity-profiles.ts
                           ├─ GoldScene.tsx: Three.js hero
                           └─ LiquidScene.tsx: Three.js review background

HTTP deployment: Browser → GET /api/markets → market-provider.mjs
                                              ├─ Gold API: XAU, BTC, ETH
                                              └─ Coinbase: USDT, TRX
Standalone HTML: Browser → same public providers directly (CORS)
```

Node 24 / Express 5 serves the Vite production build. TypeScript checks frontend code; shared provider code uses `.mjs` with `.d.mts` declarations. Fonts and visual assets are bundled locally.

## 3. File map

| File | Responsibility / edit here |
|---|---|
| `src/App.tsx` | Page sections, navigation, FAQ, five tiers, gold calculator, account and tier dialogs |
| `src/styles.css` | Original responsive layout and base design |
| `src/liquid.css` | Liquid-glass overrides, blobs, ticker/review animation, notification layout; imported **after** styles.css |
| `src/Assets.tsx` | Authentic crypto SVG imports, payment logos, four stock-photo review profiles, gold mark and tier seals |
| `src/activity-profiles.ts` | 24 fictional activity profiles across 22 countries; local flags and unique initials avatars |
| `src/Experience.tsx` | Review copy, carousel pause, sample event generation, notification timing, shuffled queue, verified-feed placeholder |
| `src/Market.tsx` | 30-second polling, quote states, ticker and market dropdown |
| `market-provider.mjs` | Provider URLs, parsing, metadata validation, freshness and ounce/gram conversion |
| `market-provider.d.mts` | Type declarations matching provider exports |
| `src/GoldScene.tsx` | Hero geometry, actual crypto-logo textures, liquid mesh, lighting, animation and disposal |
| `src/LiquidScene.tsx` | Decorative liquid meshes behind reviews |
| `server.mjs` | HTTP server, market cache, health and activity routes, static assets |
| `vite.config.ts` | Normal production build; separate Three.js chunk |
| `vite.preview.config.ts` | Single-file portable HTML build, including fonts and images |
| `Procfile`, `app.json` | Heroku process and buildpack setup |
| `THIRD_PARTY.md` | Asset sources and license notes |

## 4. Gold levels and calculations

| Level | Allocation | Five-day proposed payout |
|---|---|---|
| Silver | 0 < grams < 8 | 3% |
| Gold | 8 ≤ grams < 40 | 5% |
| Platinum | 40 ≤ grams < 80 | 7% |
| Diamond | 80 ≤ grams < 400 | 10% |
| Elite | 400 ≤ grams ≤ 800 | 12% |

Silver card shows 0–<8g as its membership band, but zero is not an actionable allocation. Other upper boundaries belong to the next tier, so ranges never overlap. These are fixed rounded gram thresholds derived from a captured reference of $129.33/g; they do not move with the live price. The payout scenario is `grams × rate / 100`, displayed to four decimals; it is not a real balance or assured return.

Edit `tiers` in App.tsx to change names, benefits, amounts and rates. Also update FAQ rate text and Trade terms, which currently contain explicit rate copies. Keep all holding-period text consistent. Purchase calculator: `crypto amount × USD spot`, less an illustrative 0.5% fee, divided by gold price per gram. Live execution must move financial arithmetic and validation to a server-side decimal ledger.

## 5. Price-feed contract

`GET /api/markets` returns `{ fetchedAt, quotes }`. Quotes are keyed by XAU/BTC/ETH/USDT/TRX and include status, price, unit, source, receivedAt and sourceUpdatedAt when supplied. Gold API prices are per troy ounce; divide by **31.1034768**, not the ordinary ounce weight.

Server cache: 30 seconds with a shared in-flight request. Provider timeout: 8 seconds. Client polling: 30 seconds; pauses fetching while the document is hidden and refreshes on return. A quote older than 180 seconds, invalid or unavailable must never show as live. Coinbase has no provider timestamp in this endpoint, so freshness uses receipt time. Existing last quotes can remain visible with the appropriate status. The historical chart is still illustrative, explicitly separate from the live spot number. Displayed spot references are not executable buy/sell quotes.

`GET /health` returns server health. `GET /api/activity` currently returns `{ events: [], connected: false }`.

## 6. Notifications and reviews

Activity countries cover Asia, Europe, Middle East, US, UK, Canada and Australia. Profiles are **fictional** and use generated initials avatars, not real account identities. Countries are presentation examples, not claims of local service availability.

`activityExamples` maps each profile to a sample action and gold weight. A Fisher–Yates shuffled queue shows each of the 24 people once before reshuffling. It avoids repeating the last person immediately across queue boundaries. Queue refs survive pause/open/close state changes. Reloading the page starts a new queue.

Timing in Experience.tsx: first toast after 7 seconds, subsequent interval 21 seconds, visible for 6.5 seconds. Notifications are suppressed when the panel is open, motion is paused, or the document is hidden. The checkbox turns sample notifications off. Reduced-motion users start with notifications disabled.

The toast is rendered through `createPortal(..., document.body)` so the header's backdrop filter cannot trap its fixed position. CSS in liquid.css: desktop `bottom: 28px`; mobile `bottom: calc(80px + env(safe-area-inset-bottom, 0px))`, leaving room for bottom navigation.

Reviews use four fictional profiles with stock photos, illustrative five-star ratings and visible demo labels. Keep each review's profile and text arrays aligned. Authentic customer reviews need consent, provenance and a verified record. Do not turn sample purchases or testimonials into apparent real endorsements by removing disclosure.

The Verified activity tab is only a connection-status placeholder: it does not yet render real events. To implement it, add a server-side, consent-aware event store, typed event schema, deduplication, pagination/streaming and a separate verified renderer. Never mix generated events into a real event feed. No real name, country or transaction should be publicly exposed by default.

## 7. Visuals and responsive behavior

Liquid surfaces, animated gradients and blobs are CSS. Hero gold/coins and review liquid shapes are Three.js with local SVG textures. WebGL failure has a static hero fallback. Three.js renders are paused when off-screen, hidden or globally paused; resources are disposed on unmount. `prefers-reduced-motion` disables decorative animation. Ticker and review carousel become manually scrollable in reduced-motion mode.

Global Pause motion control is in App.tsx; review-specific pause is in Experience.tsx. Mobile navigation lives at the viewport bottom. Test at 320, 390, 768, 1024 and 1440px after any layout edit. Keep text contrast, keyboard focus, Escape-to-close dialogs and safe-area spacing intact.

## 8. Build, run and package

```sh
npm ci
npm run dev
npm run build
npm start
npx vite build --config vite.preview.config.ts
```

Normal production output: `dist/`. Portable preview: `dist-preview/index.html`. The preview works as a local HTML file; internet is required only for live prices. `npm start` defaults to port 4173; Heroku supplies `PORT`. Heroku runs `heroku-postbuild`, then `web: npm start`.

Source delivery must include src/, public/, market-provider.mjs, market-provider.d.mts, server.mjs, package.json, package-lock.json, both Vite configs, tsconfig.json, index.html, Procfile, app.json and documentation. Do not ship node_modules, secrets or temporary test scripts. Refresh the standalone HTML and ZIP after every edit; editing source alone does not update the user's open preview.

## 9. Verification checklist

- Production build/type check passes.
- No page-level horizontal overflow on supported viewport sizes.
- Logo images/flags load and Three.js has no console errors.
- Each gram boundary belongs to exactly one tier; zero/negative/over-limit amounts are rejected.
- Gold 8g at 5% shows 0.4000g; Elite 400g at 12% shows 48.0000g.
- Offline/stale/invalid feeds are never labelled live.
- Notification queue visits 24 distinct people before repeating; flags match country data.
- Toast remains above the mobile bottom bar; close, disable and motion controls work.
- Verified activity remains empty until a real backend is connected.
- Sample reviews/activity remain clearly identified.

## 10. Next backend milestones

Authentication and sessions → KYC/provider integration → server-side quotes → deposit reconciliation → double-entry ledger and gold custody accounting → settlement and withdrawals → verified referrals → role-separated admin/super-admin with audit logs. None of these should rely on browser-only calculations or fabricated UI activity.

## Added pages and photo update
`src/Pages.tsx` defines About, Help, Terms information, Privacy information and Risk pages, navigated by `#page/about`, `#page/help`, `#page/terms`, `#page/privacy`, `#page/risk`. Hash routes work in standalone HTML and deployed builds. Unknown page routes have a return-home fallback. Footer navigation links to the pages. Legal pages describe the current non-transactional release, not finalized company contracts.

Notification profiles now import 24 distinct local JPEG portraits from `src/assets/activity/`; these replace initials avatars. Source: Random User portrait library, https://randomuser.me/ . Names and events remain fictional and visible labels say Illustrative. All image assets are embedded in the portable HTML build. Edit profile/name/flag/photo mappings in `activity-profiles.ts`.

## Responsive header and account form
`src/AccountForm.tsx` is lazy-loaded when the account dialog opens. Registration fields: country/region first, first name, last name, email, international phone and password. Country names come from Intl.DisplayNames; flag-icons assets are bundled. Search filters country names; selection displays a real flag and country name. Country is required for registration. Phone validation requires a plus sign, digits and optional spaces; this is basic format validation, not number ownership verification. Login retains email/password only. No form data is sent or persisted.

At widths <=680px, Get started and the notification trigger appear within the hamburger menu. The single ActivityCenter instance portals its trigger into the menu so timers are not duplicated. Its notification toast remains mounted separately. CSS clamp() scales text, hero art and horizontal spacing. Input font size is 16px on mobile to prevent focus zoom; very narrow registration forms stack the name fields.
