# UI interaction consistency — 2 November 2026

## Fixed

- Staff/customer action cards no longer combine a pale hover surface with translucent white icon discs. Accent discs remain opaque; foreground colours use the shared on-accent token.
- Finance actions and wallet shortcuts keep readable text/captions on hover, focus and press. Generic form-button hover rules exclude these specialised cards.
- Disabled buttons/fields use explicit background/foreground tokens instead of fading the entire control. Native widgets use the matching colour scheme; autofill text/backgrounds use the field tokens.
- Public/guest primary buttons retain readable brand colours on hover. Light-mode navigation/footer links, guide back links, review controls, terms notes, review country captions and step numbers no longer inherit pale dark-theme colours or reduced text opacity.
- Signup close icons use the current theme. Rating graphics have an accessible image role. The market ticker is keyboard-focusable and pauses while focused. Staff navigation has a working skip link.

## Verification matrix

| Surface | Coverage |
| --- | --- |
| Staff overview, user management, review queues, physical queue, holdings, inventory, networks, roles, settings, audit, support | Light/dark checks of representative control classes; review queues include read-only populated KYC/deposit/withdrawal fixtures. |
| Customer overview, wallet, deposit, buy/sell, swap, withdrawal, trades, physical gold, transactions, team, profile, security, notifications, settings, KYC, support | Light/dark interaction checks. Text/icon colours checked in normal, hover, focus, active and applicable disabled/disabled-hover states. |
| Public home and guide surfaces | Home and fee-guide interaction checks in both themes; payment/getting-started guide checks in light mode. Full home axe checks in light/dark returned no findings for the selected WCAG A/AA rule tags after fixes. |
| Signup modal | Normal/hover/focus/disabled checks in both themes. Modal press tests are intentionally omitted to avoid backdrop clicks closing the dialog. |
| Responsive layout | Staff overview and profile spot checks at 320, 390, 768 and 1440 pixels: no document-level horizontal overflow. |

The reusable browser function in `scripts/check-interaction-states.js` groups representative visible control styles, measures text and Lucide-icon contrast against computed/composited backgrounds and rejects translucent action-icon discs. It does not submit forms or execute financial actions. Keyboard-only skip links and native/modal behaviours are checked separately. It fails if no controls are found, so an unloaded screen cannot silently count as a pass.

A negative regression probe temporarily restored the old translucent-white icon style. The checker detected it; removing the probe returned zero findings. The probe was removed immediately and was never written into the application styles.

Normal-motion sampling of the staff deposit-review icon at hover entry, about 80 ms and after another 300 ms showed an unchanged solid `rgb(8,117,71)` disc, white glyph and opacity 1. This supplements reduced-motion state checks and verifies the original disappearance does not recur during the transition.

Staff previews used isolated, read-only browser response fixtures. No actual role assignment, account privilege change, funding or payout was performed. All browser fixtures were cleared after verification. This report covers the listed reviewed screens/states; it is not a whole-product WCAG certification.

Validation: production frontend build and standalone preview build passed; the browser audit script passed its JavaScript syntax check. Financial/backend code was unchanged by this revision.
