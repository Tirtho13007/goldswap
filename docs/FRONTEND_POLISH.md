# Public and customer UI refinement — 3 November 2026

## Direction

Preserve the owner's premium GoldSwap wallet identity: gold actions/rates, authentic crypto SVGs, colourful functional icons, visible status badges and purposeful feedback. The 3D gold hero remains the primary visual. Stock photography and fictional testimonials are not required to fill space.

## Changes

- Scoped public-design.css aligns public typography, spacing, card padding/radius, field styling, icons, badges, footer and guide surfaces.
- Hero adds purposeful wallet/gold/fee icons and an authentic funding-logo row.
- Market ticker includes all eight supported crypto assets plus gold-per-gram/per-ounce. It scrolls at the owner's explicit request, refreshes data independently, pauses on hover/focus and has a labelled pause/play control.
- CSS reduced-motion removes scrolling and exposes horizontal manual scrolling. Global motion preferences can also pause the ticker.
- Tablet steps use two columns; narrow market/company layouts stack. Mobile tier/card headings align left.
- Public reveal motion uses a small translation with full opacity, avoiding temporarily invisible light-mode sections.
- Customer overview improves labelled section icons, quick-action spacing, icon hover feedback, metric numerals, timeline icons and mobile transaction search layout. Existing asset logos and account avatars remain genuine UI assets.
- “Personal vault” changed to “Gold account” to match the approved claim-based ownership model.

## Browser evidence

Tested 320, 390, 768 and 1440 CSS-pixel widths; no document horizontal overflow on inspected public states. Inspected customer overview on mobile/desktop and light/dark states. Registration close button stays within the dialog. Build, interaction-state script and diff whitespace check pass.

Ticker position was observed changing; pause held its transform constant across successive checks and play resumed running state. Reduced-motion switched animation to none and made the strip manually scrollable.

Impeccable/Taste results are heuristic checks, not an accessibility certificate. Their generic objections to icon cards, badges, outlined fields and marquee do not supersede the owner's explicit brand and scrolling requirements. Keep financial labels readable and never add fabricated price movement or live reviews.
