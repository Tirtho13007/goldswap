# GoldSwap.app

প্রিমিয়াম, মোবাইল-ফার্স্ট React ল্যান্ডিং পেজ। React 19, TypeScript, Vite, Three.js ও Node.js/Express দিয়ে তৈরি।

## দ্রুত দেখা

`GoldSwap-preview.html` ফাইলটি ব্রাউজারে খুললেই landing page-এর ইন্টারঅ্যাকটিভ প্রিভিউ দেখা যাবে। কোনো ইনস্টলেশনের প্রয়োজন নেই। কিছু ব্রাউজার স্থানীয় ফাইলে WebGL সীমিত করলে Node.js দিয়ে প্রিভিউ চালান।

## ডেভেলপমেন্ট

Node.js 24 ব্যবহার করুন।

```sh
npm ci
npm run dev
```

## প্রোডাকশন সার্ভার

```sh
npm run build
npm start
```

ডিফল্ট ঠিকানা: http://localhost:4173। সার্ভার Heroku-এর `PORT` ব্যবহার করে এবং `0.0.0.0`-এ শোনে। `/health` পরীক্ষা করা যায়।

## Heroku

এই ফোল্ডারের `package.json`, `package-lock.json`, `Procfile`, `server.mjs`, `index.html`, `src/`, `public/`, `tsconfig.json` ও Vite কনফিগারেশন একই অ্যাপের মূল ডিরেক্টরিতে রাখুন। `node_modules/` আপলোড করবেন না।

বিদ্যমান Heroku অ্যাপের সঙ্গে এই সোর্স যুক্ত করে deploy করুন। `heroku-postbuild` React build তৈরি করবে; `web: npm start` সেই build পরিবেশন করবে। এই ডেলিভারিতে কোনো Heroku অ্যাকাউন্টে লগইন, deployment বা GoldSwap.app DNS পরিবর্তন করা হয়নি।

Official references: https://devcenter.heroku.com/articles/nodejs-support and https://devcenter.heroku.com/articles/deploying-nodejs

## প্রিভিউতে যা কাজ করে

- আসল Three.js গোল্ড বার, কয়েন, মাউস-প্রতিক্রিয়া ও ভাসমান অ্যানিমেশন
- মোবাইল নেভিগেশন, মেনু ও section navigation
- BTC/ETH/USDC/USDT/XRP/TRX দিয়ে গোল্ড কেনার নমুনা হিসাব ও validation
- চারটি timeframe-এর নমুনা চার্ট
- Silver 3%, Gold 5%, Platinum 7%, Diamond 10%, Elite 12% — প্রতিটিতে ৫ দিন
- Trade scenario calculator ও allocation range validation
- Login/Register form preview, FAQ, terms ও document details dialogs
- Team/referral section ও review placeholder
- কম অ্যানিমেশন পছন্দের সমর্থন, motion pause, keyboard dialog navigation
- স্থানীয়ভাবে bundled fonts; stock imagery বা বাইরের image URL-এর ওপর নির্ভরতা নেই

## প্রিভিউ বনাম বাস্তব সেবা

এটি শুধু landing-page design। দাম/চার্ট demo। Return rates কোম্পানির প্রস্তাবিত; নিশ্চিত বা যাচাইকৃত লাভ নয়। কোনো অর্থ, KYC document বা login তথ্য server-এ পাঠানো হয় না। Wallet addresses, crypto deposits, trades, withdrawals, referral rewards, dashboard বা admin backend তৈরি করা হয়নি।

Live launch-এর আগে গোল্ডের legal structure/custody, license scope, payout source, eligibility, exact fees, early exit/loss rules, real pricing, payment networks, KYC, authentication, ledger, documents, privacy/terms ও support ব্যবস্থা যুক্ত করতে হবে। Search indexing ইচ্ছাকৃতভাবে বন্ধ রাখা হয়েছে (`noindex,nofollow`); চূড়ান্ত public launch-এর সময় প্রস্তুত কনটেন্ট অনুযায়ী পরিবর্তন করতে হবে।

## কোথায় পরিবর্তন করবেন

- `src/App.tsx`: content, tiers, demo rates and UI interactions
- `src/GoldScene.tsx`: original 3D gold scene
- `src/styles.css`: responsive styling and animation
- `server.mjs`: Heroku-compatible static production server

## Standalone preview পুনরায় তৈরি

```sh
npx vite build --config vite.preview.config.ts
```

`dist-preview/index.html` standalone preview। Production-এর জন্য সাধারণ `npm run build` ব্যবহার করুন।

## Liquid glass update

Live spot feeds: Gold API (XAU/BTC/ETH) and Coinbase (USDT/TRX), refreshed every 30 seconds. Server caches requests; standalone preview uses public CORS endpoints. Internet is required for live prices. Stale/unavailable feeds are labelled, never relabelled live. Historical charts remain illustrative.

Gold levels: Silver 0–<8g, Gold 8–<40g, Platinum 40–<80g, Diamond 80–<400g, Elite 400–800g. Rounded using the captured reference $129.33/g; these fixed gram thresholds do not fluctuate with spot prices. All terms are 5 days. Payout scenarios are expressed in gold grams.

New features: liquid-glass cards, Three.js liquid shapes, animated ticker, authentic BTC/ETH/USDT/TRX SVGs, photo review carousel, Markets dropdown, Team navigation and payment logos. Reviews and activity examples are explicitly fictional. Verified activity has no connected customer source; /api/activity returns an empty feed. Payment logos are planned-method previews, not active integrations.

Deployment requires market-provider.mjs alongside server.mjs. No Heroku deployment was performed.


## Backend foundation
Account authentication, profiles, sessions and role/permission APIs are now connected. See [backend setup](docs/BACKEND_SETUP.md) for local database, migrations, bootstrap, email outbox, endpoints and remaining milestones. Financial operations are disabled.


## Backend এবং crypto-only update — 1 November 2026

Account, KYC, deposit/withdrawal এবং private upload-এর জন্য Node server চালাতে হবে; standalone HTML শুধু frontend preview। Local setup এবং প্রথম Super Admin তৈরির নিয়ম: [docs/BACKEND_SETUP.md](docs/BACKEND_SETUP.md)। Network configuration ও manual review: [docs/OPERATIONS.md](docs/OPERATIONS.md)।

Deposit এবং withdrawal শুধু BTC, ETH, USDC, USDT, XRP ও TRX। Deposit proof upload ও manual approval, KYC submission/review, withdrawal reserve/reject/cancel/complete, permission checks এবং audit records implemented locally। Wallet address না দেওয়া পর্যন্ত networks disabled। Gold custody/provider quotes ও trade execution এখনো connected নয়।

Production-এ DATABASE_URL, HTTPS APP_ORIGIN এবং স্থায়ী UPLOAD_ENCRYPTION_KEY প্রয়োজন। External PostgreSQL deployment/live blockchain payment পরীক্ষা হয়নি। Staff MFA চালু না হওয়া পর্যন্ত production review endpoints blocked। Local database/keys/.env source package-এ অন্তর্ভুক্ত নয়।


## Confirmed platform gold — 1 November 2026

বর্তমান নিয়ম ও activation state: [docs/PLATFORM_RULES.md](docs/PLATFORM_RULES.md)। Deposit minimum $15, withdrawal minimum $20, deposit fee 0%, normal gold withdrawal fee 1.5%, physical delivery minimum 500g + 2% extra charge। KYC: NID/passport/birth certificate। Five-day rates আগের level অনুযায়ী; profit আগে company stock থেকে reserve হয় এবং maturity-তে principal সহ automatically credit হয়। GoldSwap company inventory ও funded crypto liquidity ছাড়া gold orders execute হয় না। পূর্বের external gold-provider assumption এখন platform-supplied gold model দ্বারা superseded।

লোকাল receiving wallet ও owner setup state database/ignored data folder-এ আছে; source ZIP-এ private setup link, wallet import manifest, database, encryption key অন্তর্ভুক্ত নয়। Production setup-এর জন্য staff MFA, actual company inventory/custody evidence, deployment/backups ও operational reconciliation প্রয়োজন।


## Staff control update

Super Admin/admin/moderator এখন পৃথক staff dashboard পাবে; personal deposit/withdraw/trade form সেখানে নেই। User counts, request approval, role/permission, block/remove, website settings, wallets ও audit backend-connected। Wallet folder-এর সব ২২টি coin/network route এখন আছে; USDT-তে ৮টি, USDC-তে ৬টি এবং ETH-তে ৩টি network। BNB/SOL-ও যুক্ত। Physical fee সাইজের সঙ্গে 2% হারে হিসাব হয়—1000g order-এ 1020g কাটে।


## Wallet and control panel refinement

Buy/Sell/Swap and withdrawals use amount, review and result screens with searchable asset selection, available-balance MAX, expiring quotes, destination validation and explicit fee/net amounts. Swaps are internal account exchanges against funded platform treasury, with atomic and idempotent settlement. Staff summaries and permission-scoped quick actions use soft coloured cards, queue status/search filters, FIFO pagination, CSV export and inventory/liquidity attention checks. See docs/PLATFORM_RULES.md for exact behaviour and constraints.


## Customer services update

Verification/reset HTML mail, SMTP/Resend queue and retries, customer/staff support, notifications, owner-scoped transaction details and PDF receipts, optional authenticator MFA/session controls, withdrawal address book, KYC history/expiry/deletion safeguards, physical shipment/acknowledgement and public SEO routes are implemented. See [CUSTOMER_SERVICES.md](docs/CUSTOMER_SERVICES.md). For the setup document, use the sibling CUSTOMER_SERVICES.md. Live email requires sender credentials; production mail previews are disabled. Public indexing remains off until the production flag is explicitly enabled.
