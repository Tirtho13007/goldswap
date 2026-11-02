# Local demo users and avatars

Four local-only users are seeded with illustrative portfolios. In the signed-in dashboard, **Demo Studio** previews a selected portfolio without changing the current account. **My data** restores the signed-in account's own data. Direct link: `http://localhost:4180/?demo=mila#account` (requires an existing session).

| User | Email | Gold | Trade |
|---|---|---|---|
| Mila Rahman | mila@demo.goldswap.test | 52.7500 g | Platinum, 40 g |
| Arif Hasan | arif@demo.goldswap.test | 18.4000 g | Gold, 8 g |
| Noor Ahmed | noor@demo.goldswap.test | 125.8000 g | Diamond, 80 g |
| Leo Chen | leo@demo.goldswap.test | 6.2500 g | Silver, 4 g |

Local demo password: `GoldSwapDemo!2026`. These are development-only sample accounts with the ordinary user role. No default Admin/Super Admin account is seeded.

Each sample has available/locked/reserved gold, illustrative USD valuation, crypto holdings, a five-day trade and 12 transactions covering pending/approved/completed/failed states. Records are stored in a separate `demo_snapshots` table, not a real ledger. Trades do not execute and maturity never credits real funds. USD totals are illustrative snapshots, not live revaluations or financial statements. Live market reference quotes remain separate.

## Seed

Stop the web server if using the embedded local database, then run `npm run demo:seed` and restart the server. The seed is idempotent: it preserves existing demo snapshots/passwords and refuses to overwrite a conflicting real email account. Migration `002_demo` adds an explicit demo-user flag and the isolated snapshot table.

Seeding, demo preview endpoints, demo login and existing demo sessions are disabled in production. Ordinary accounts get empty financial data; viewing a demo never mutates their account. Only authenticated users can inspect the local demo gallery. No endpoint lets a normal user promote themselves or mark their account as demo.

## Default avatars

All password and Google registrations automatically receive a stable animal avatar seed derived from the generated user ID. Existing accounts receive the same deterministic fallback. Original inline SVG artwork includes bunny, cat, bear, fox, panda and owl styles with pastel palettes; no avatar service, external image request or email-based URL is used.

The avatar remains consistent after login/reload and is shown in the sidebar, toolbar and My Account. It is an initial default illustration, not an uploaded profile photo or a claim about the user's identity.

## Checks

- Seed twice: four demo users and four snapshots, no duplicates.
- Normal registration remains non-demo, with empty financial records.
- Avatar seed persists across sessions.
- Demo previews cannot read arbitrary real users' data.
- Production rejects demo seed, routes, login and sessions.
- Browser: portfolio switching, ticking trade countdown, transaction filters/pagination, wallet balances, responsive layouts and default avatars.
