# GoldSwap UI/UX Design Brief

**Direction:** Premium gold wallet — clean, trustworthy, calm and operationally clear  
**Status:** Approved visual and interaction baseline  
**Version:** 1.0  
**Last updated:** 2 November 2026

## 1. Objective

GoldSwap should feel as simple and confident as a premium mobile wallet, while remaining an original GoldSwap interface. Reference products may inform interaction clarity, but their layout, copy, trademarks or identity must not be copied.

The interface must make four things immediately clear: what the customer owns and what is reserved; what action can be taken next; what is pending manual review; and what fee, risk or confirmation applies before submission.

## 2. Brand language

- Gold is the primary brand/accent colour.
- Neutral surfaces create a premium, quiet foundation.
- Green, red and amber are reserved mainly for success/up, failure/down and pending/warning.
- Blue, violet, rose and teal may distinguish actions/cards, not compete with gold as brand ownership.
- Avoid rainbow decoration, excessive glow, glass blur and saturated full-page backgrounds.
- Use the real supported asset/network icon when that identity matters.

## 3. Typography

- Primary UI font: DM Sans or the established bundled UI family; display font: Manrope where established.
- Desktop body: normally 15–16 px with comfortable line height.
- Mobile body/description: minimum 14 px, preferably 15–16 px. Shorten long copy instead of shrinking it.
- Metadata may use 12–13 px only with strong contrast and spacing.
- Use sentence case; avoid large uppercase blocks.
- Financial numerals use tabular figures where alignment matters.

## 4. Theme colour system

Use semantic tokens instead of component-specific hard-coded colours:

| Purpose | Light | Dark |
|---|---|---|
| Canvas | warm near-white | deep neutral/navy, not pure black |
| Surface | white or softly tinted | raised dark surface |
| Elevated | visible border + soft shadow | border + tonal lift |
| Primary text | deep ink | near-white |
| Secondary text | medium slate | light muted slate with AA contrast |
| Gold action | rich gold + dark text | controlled luminous gold + dark text |
| Border | low-contrast cool/warm line | visibly lighter than surface |
| Focus | high-contrast blue/gold ring | high-contrast blue/gold ring |

Default, hover, focus-visible, active, selected, disabled and loading states must be readable independently in both themes. A light-mode hover must never turn a card white while its text/icon also becomes white.

## 5. Layout and responsive system

- Desktop authenticated workspace: collapsible left navigation, compact top bar and fluid content grid.
- Mobile: app-like header plus bottom navigation or clear drawer; primary actions stay thumb-reachable.
- Use a consistent spacing scale: 4, 8, 12, 16, 24, 32, 48.
- Cards use consistent radius, border, header spacing and action placement.
- Dense tables become stacked transaction cards or safe horizontal lists on small screens.
- Keep page title and critical primary action visible without horizontal scrolling.
- Public order: Hero → How it works → Market → Trade levels → Company/Trust → FAQ → Dashboard showcase lower down.

## 6. Components

### Buttons

- Primary: gold fill, dark label, clear hover tone/lift, active press and focus ring.
- Secondary: tinted/outlined surface with strong text contrast.
- Destructive: red only for genuinely destructive actions.
- Minimum touch-critical size: 44 × 44 CSS px.
- Loading state keeps width, announces progress and blocks duplicate submission.
- Icon-only controls require accessible names and a tooltip where meaning is not universal.

### Cards and rows

- Summary card: icon badge, label, primary value and one supporting status; never fabricated percentages.
- Quick action: pastel semantic tint, coloured circular icon, concise action and helper text.
- Transaction row/card: asset icon, title, network/reference, time, amount and coloured status pill.
- Hover uses restrained translate/shadow/border/tint change. It never hides text or falsely implies selection.

### Status

| State | Intent |
|---|---|
| Pending / queued / processing | amber |
| Approved / completed / verified | green |
| Rejected / failed / blocked | red |
| Information / active | blue |
| Draft / neutral / cancelled | slate |

Never communicate status by colour alone; include a label and, when useful, an icon.

### Forms

- Labels remain visible; placeholders are examples, not labels.
- Country code is a searchable/selectable country dropdown with flag, country name and calling code.
- Asset/network selectors show icon, asset, network and available balance.
- Financial forms follow Amount → Details → Review → Result.
- Show fee and net receive before confirmation.
- Validation appears beside the field in plain language and does not clear valid input.

## 7. Page intent

### Public

- Hero uses short benefit-led copy and `Get started`/`Create account`, never `Open dashboard` for visitors.
- Market reference data is labelled accurately and cannot imply an executable quote.
- Only verified company evidence receives a verified indicator.
- Production must not present sample activity or reviews as real. A real verified review may use a green indicator; sample content belongs only in an explicit preview/demo.

### Customer overview

- Premium balance hero, allocation, quick actions and current status summary.
- Active five-day hold has a precise countdown and progress bar.
- Email verification is a lightweight banner/action and never hides navigation.
- Pending KYC/deposit/withdrawal is visible without dominating the page.

### Wallet actions

- Deposit, buy/sell, swap and withdraw share one predictable stepper and review sheet.
- Exact network and memo/tag warnings appear before copy/submission.
- Results provide a next action, transaction detail and receipt when available.

### Staff

- Show real counts/queues, compact needs-attention list and permission-filtered quick actions.
- Review screens order evidence, request details, timeline and decision controls clearly.
- Privileged/destructive actions state impact, require a reason where applicable and receive server confirmation.
- No customer wallet actions appear in staff navigation.

## 8. Motion and feedback

- Page/section transitions: subtle opacity and 4–12 px motion, normally 160–280 ms.
- Buttons show a slight press; cards use a restrained lift/tint/border transition.
- Countdown/number changes remain readable and do not constantly bounce.
- Skeletons indicate structure; do not use endless spinners for manual-review states.
- Haptic vibration is optional progressive enhancement after direct user actions only.
- No autoplay UI sound; the sound on/off menu item remains removed.
- Respect `prefers-reduced-motion` and provide equivalent non-motion feedback.

## 9. Accessibility acceptance

- Target WCAG 2.2 AA.
- Complete keyboard path, logical order and visible focus in both themes.
- Screen-reader names for icons, status, charts and controls.
- Dialog focus trap/return and Escape handling.
- Contrast verified for every state, including hover and disabled.
- Errors are announced, linked to inputs and not represented by colour alone.
- Critical flows work at 200% zoom and 320 px width without content loss.

## 10. Content rules

- Say `manual review`, not instant/automatic, for external deposits and payouts.
- Distinguish internal ledger balance from on-chain asset.
- Distinguish reference market price from executable server quote.
- Show the exact percentage and calculation for withdrawal and physical fees.
- Never claim guaranteed performance, independent custody, insurance, licensing or delivery capability without approved evidence.
- Empty states explain why the page is empty and provide a safe next action.

## 11. Consistency checklist

Before a UI change is complete, compare:

- light/dark; desktop/tablet/320–430 px mobile;
- default, hover, focus, active, selected, disabled, loading, error and empty states;
- customer and staff equivalents;
- icon family, radius, spacing, headings and status pills;
- reduced-motion and keyboard operation.

Run `node scripts/check-interaction-states.js` plus manual visual review. Screenshots are evidence, not the design source; this brief and the component tokens are the source.

