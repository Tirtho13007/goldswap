export type MarketSymbol = 'XAU' | 'BTC' | 'ETH' | 'USDT' | 'USDC' | 'XRP' | 'TRX' | 'BNB' | 'SOL';
export type Quote = { symbol: MarketSymbol; status: 'ok'|'unavailable'; price?: number; currency?: string; unit?: string; source?: string; sourceUrl?: string; sourceUpdatedAt?: string|null; receivedAt?: string; };
export type Snapshot = { fetchedAt: string; quotes: Record<MarketSymbol, Quote> };
export const GRAMS_PER_TROY_OUNCE: number;
export const MARKET_SYMBOLS: MarketSymbol[];
export function quoteIsFresh(quote: Quote|undefined, now?: number): boolean;
export function fetchQuote(symbol: string, fetcher?: typeof fetch): Promise<Quote>;
export function fetchMarketSnapshot(fetcher?: typeof fetch): Promise<Snapshot>;
