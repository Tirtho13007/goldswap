# GoldSwap SEO launch plan

## Implemented

Public routes include focused guides for gold price, buying digital gold and crypto/gold exchange. Price references have provider timestamps and stale/unavailable states; spot quotes are not executable retail prices. There are no fabricated historical returns, reserves, reviews or schema prices.

Each route has a distinct title, description, canonical URL, social metadata and crawlable HTML content. Public structured data describes Organization, WebSite, WebPage and guide breadcrumbs. Private accounts stay noindex. Public sitemap and robots remain disabled outside an explicitly enabled production launch.

## Keyword intent

- gold price / today gold price: /guides/gold-price, with USD per gram/troy ounce, units, purity, timestamps and limits.
- buy digital gold / gold investment: /guides/buy-digital-gold, with actual buying steps, claim ownership, fees and counterparty risks.
- crypto gold / gold exchange: /guides/crypto-gold-exchange, distinguishing internal buy/sell/swap from blockchain payouts.

Do not repeat keywords unnaturally or create near-duplicate location/keyword pages. Expand content only with useful original material and accountable author review.

## After deployment

1. Confirm HTTPS and APP_ORIGIN=https://goldswap.app; redirects must resolve to one canonical origin.
2. Complete production acceptance before setting SEO_INDEXING_ENABLED=true.
3. Verify the domain in the owner's Google Search Console, submit https://goldswap.app/sitemap.xml and inspect the three guide URLs.
4. Validate structured data and mobile Core Web Vitals on the deployed domain. Monitor indexing, 404s, search queries and conversions.
5. Publish reviewed company/service terms and expert-reviewed original educational content. Build legitimate citations/links from actual business relationships; do not buy ranking links.

Source readiness does not prove current indexing, performance or rank. Google ranking and rich-result display are not guaranteed.

References:
- https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- https://developers.google.com/search/docs/appearance/structured-data/sd-policies
