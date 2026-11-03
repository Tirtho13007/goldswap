# Assets and dependencies

The gold bar, coin scene, logo geometry, chart shapes and network illustration were authored for this project using code. No stock photographs or third-party customer portraits are used.

- React and React DOM: MIT
- Three.js and its examples utilities: MIT
- Lucide icons: ISC
- DM Sans and Manrope typefaces: SIL Open Font License; locally bundled via Fontsource
- Express: MIT
- Vite, TypeScript and build dependencies: respective licenses in their npm packages

Dependency versions are pinned by package-lock.json. Package license texts are distributed with the corresponding npm packages.

Update assets: cryptocurrency-icons (CC0), https://github.com/spothq/cryptocurrency-icons ; payment brand assets from https://github.com/activemerchant/payment_icons ; flags from flag-icons (MIT). Brand marks remain their respective owners’ trademarks.
Stock portraits are from Unsplash images photo-1500648767791-00dcc994a43e, photo-1438761681033-6461ffad8d80, photo-1506794778202-cad84cf45f1d, photo-1531123897727-8f129e1688ce. All pictured profiles and review text are fictional examples, not endorsements.
Market source documentation: https://gold-api.com/docs and https://gold-api.com/faqs .

Activity photos: https://randomuser.me/api/portraits/men/10.jpg through the selected even IDs to 32, and women/11.jpg through selected odd IDs to 33. Portraits are presentation placeholders for fictional profiles, never actual customer endorsements.

Historical note: the world map and its world-atlas/d3-geo/topojson dependencies were removed in the subsequent colorful dashboard revision. They are no longer bundled.

Payment brand artwork update: Payoneer, Skrill, Western Union and SSLCOMMERZ assets were fetched from the respective brand websites. PayPal/Stripe use the ActiveMerchant payment-icons library; existing Visa/Mastercard assets are from that library. bKash/Nagad artwork comes from the Logotyp archive as the official sites blocked automated retrieval; these are archive-sourced brand representations, not newly drawn icons. SVG whitespace framing was tightened for bKash/Nagad without changing the artwork. Full asset URLs are recorded in src/assets/brands/sources.json. Marks retain their owners' trademarks; logo display does not assert partnership or service activation.

Crypto-only update: BTC, ETH, USDC, USDT, XRP and TRX use bundled cryptocurrency-icons artwork (CC0). Historical fiat brand files remain in source provenance but are not offered or bundled as active payment methods. Address encoding/checksum helpers use @scure/base (MIT), distributed through npm.

Receiving-address QR codes are rendered with qrcode (MIT), using database-configured user-supplied addresses. Wallet screenshots were processed locally for import and are not bundled in the source package.

Additional network reference: TON friendly-address validation follows the 36-byte CRC16 address format described in ton-core Address.ts (MIT): https://github.com/ton-org/ton-core/blob/master/src/address/Address.ts . Mantle USDT0 labels follow the supplied wallet cards and Bybit's official USDT0/Mantle announcement. BNB/SOL marks use the same bundled cryptocurrency-icons artwork.
