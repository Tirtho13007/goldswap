# GoldSwap Frontend Schema

**Status:** Current frontend architecture and extension contract  
**Version:** 1.0  
**Last updated:** 2 November 2026

## 1. Application surfaces

| Surface | Owner | Purpose |
|---|---|---|
| Public | `src/App.tsx`, `src/PublicExperience.tsx` | Marketing, education, market reference, levels, trust and guides. |
| Account shell | `src/AccountPage.tsx`, `src/CustomerExperience.tsx` | Auth-aware customer workspace/navigation. |
| Wallet | `src/WalletExperience.tsx` | Assets, deposit, buy/sell, swap and withdrawal. |
| Customer services | `src/CustomerExperience.tsx` | Notifications, support, security, KYC, documents and physical gold. |
| Staff | `src/StaffDashboard.tsx`, `src/OperationsPage.tsx` | RBAC-filtered dashboard and review queues. |
| API client | `src/api.ts` | Fetch/error contract, staff reauthentication and one safe retry. |

`src/main.tsx` mounts the application. The authenticated shell currently uses hash routes; public guides use browser paths and SEO metadata.

## 2. Page model

```text
Public App
├─ header / theme / navigation
├─ hero + lazy GoldScene
├─ how it works / market / trade levels / company / FAQ
├─ workspace showcase / reviews / optional community
└─ footer + mobile navigation

AccountPage
├─ CustomerExperience
│  ├─ header, verification reminder and responsive navigation
│  ├─ overview and WalletExperience flows
│  └─ transactions, KYC, physical gold, support, account and security
└─ StaffDashboard (staff only)
   ├─ permission-filtered navigation and overview
   ├─ OperationsPage queues/evidence
   └─ users, trades, inventory, networks, roles, settings, audit and service status
```

## 3. Shared domain contract

| Source | Contract |
|---|---|
| `shared/policy.ts` | Minimums, fees, KYC types, five-day duration and plan bands/rates. |
| `shared/crypto.ts` | Assets, route IDs, networks, memo/tag and precision. |
| `shared/site-settings.ts` | Website setting defaults/shape. |
| `shared/seo.ts` | Public page title, description and canonical metadata. |
| `shared/dashboard.ts` | Dashboard-facing shapes/helpers. |

Never hard-code a second fee/rate/network list in a new component. Refactor to shared data or add an equality test when temporary display duplication is unavoidable.

## 4. State ownership

- Server owns auth, balances, status, permissions, quote expiry, maturity and audit state.
- Components own input, route presentation, open/closed UI and active step.
- `localStorage` may store non-sensitive preferences such as theme; never session tokens, KYC, balances or staff assurance.
- After writes, fetch canonical state; do not permanently fake optimistic balance/status.
- Input changes invalidate dependent quote state.
- Timers display server-time offset and never settle a transaction in the browser.

## 5. API contract

`src/api.ts` is the authenticated request boundary.

- Parse the stable API error and optional `code`.
- `STAFF_REAUTH_REQUIRED` opens `StaffReauthentication`; successful assurance retries the blocked request once.
- Never retry an arbitrary financial POST after an unknown network outcome; query canonical/idempotent result instead.
- Use abort/disposed guards on unmount and route changes.
- Loading, empty, forbidden, recoverable and terminal error states are explicit.

## 6. Component contracts

Financial actions share:

```text
select/input -> validate -> quote/estimate -> review -> confirm -> result
```

They must provide actual available balance, icon/network, reserve-safe MAX, fee/net, quote countdown where relevant, submit lock, stale-quote invalidation and a transaction-detail result.

Cards/rows use semantic theme and status classes, never inline light-only hover colours. Displayed values are real API data unless the route is explicitly demo. Dialogs require labelled title, predictable close/Escape, focus management and exact amount/fee/impact confirmation.

## 7. Styling ownership

| Files | Responsibility |
|---|---|
| `styles.css`, `public-refresh.css`, `liquid.css` | Public base/polish and decorative scenes. |
| `dashboard.css`, `dashboard-color.css` | Shared dashboard layout and semantic accents. |
| `customer-experience.css`, `account.css` | Customer shell/service/account forms. |
| `wallet-experience.css`, `wallet-polish.css` | Wallet flows and premium cards. |
| `staff-dashboard.css`, `operations.css` | Staff workspace, metrics, queues and reviews. |
| `light-theme.css` | Light-theme corrections. |

Prefer shared custom properties and owning component classes. Do not add another broad “final override” file; fix the owning component/token to prevent cascade drift.

## 8. Interaction states and responsiveness

Every control covers:

```text
default -> hover -> focus-visible -> active -> selected
        -> disabled -> loading -> validation error
```

Both themes preserve text/icon/border contrast. Start at 320 px; critical touch targets are at least 44 px. Mobile description is 14–16 px. Multi-column cards collapse by priority, tables safely transform/scroll, and no permitted destination disappears when the sidebar becomes mobile navigation.

## 9. Adding a feature page

1. Confirm requirement and actor.
2. Add route/navigation only for eligible role/permission.
3. Reuse shared policy/crypto/site data.
4. Implement all async/interaction states.
5. Add both themes and mobile styles in the owning stylesheet.
6. Add labels, focus and reduced-motion handling.
7. Add API/integration tests and manual visual QA.
8. Update `APP_FLOW.md` and this schema if navigation/ownership changes.

## 10. Source-of-truth warning

Some old public preview copy may still say implemented financial services are unavailable. Before launch, reconcile all public text with actual production capability and approved legal language. Old screenshots and the preview-era root `ARCHITECTURE.md` are not current product truth; use this document set, executable shared policy and migrations.

