export const GRAMS_PER_TROY_OUNCE = 31.1034768;
export const MARKET_SYMBOLS = ['XAU', 'BTC', 'ETH', 'USDT', 'USDC', 'XRP', 'TRX', 'BNB', 'SOL'];

export function quoteIsFresh(quote, now = Date.now()) {
  if (!quote || quote.status !== 'ok') return false;
  const time = Date.parse(quote.sourceUpdatedAt || quote.receivedAt);
  return Number.isFinite(time) && now - time >= -60000 && now - time <= 180000;
}

export async function fetchQuote(symbol, fetcher = fetch) {
  if (!MARKET_SYMBOLS.includes(symbol)) throw new Error('Unsupported symbol');
  const isGoldApi = ['XAU', 'BTC', 'ETH'].includes(symbol);
  const url = isGoldApi ? `https://api.gold-api.com/price/${symbol}` : `https://api.coinbase.com/v2/prices/${symbol}-USD/spot`;
  const response = await fetcher(url, { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Price source returned ${response.status}`);
  const data = await response.json();
  const price = Number(isGoldApi ? data.price : data.data?.amount);
  if (!Number.isFinite(price) || price <= 0) throw new Error('Invalid quote');
  if (isGoldApi && (data.symbol !== symbol || data.currency !== 'USD' || !Number.isFinite(Date.parse(data.updatedAt)))) throw new Error('Invalid quote metadata');
  if (!isGoldApi && (data.data?.base !== symbol || data.data?.currency !== 'USD')) throw new Error('Invalid quote metadata');
  return { symbol, price, currency: 'USD', unit: symbol === 'XAU' ? 'troy oz' : 'coin', source: isGoldApi ? 'Gold API' : 'Coinbase', sourceUrl: isGoldApi ? 'https://gold-api.com' : 'https://www.coinbase.com', sourceUpdatedAt: isGoldApi ? data.updatedAt : null, receivedAt: new Date().toISOString(), status: 'ok' };
}

export async function fetchMarketSnapshot(fetcher = fetch) {
  const results = await Promise.allSettled(MARKET_SYMBOLS.map(s => fetchQuote(s, fetcher)));
  return { fetchedAt: new Date().toISOString(), quotes: Object.fromEntries(results.map((r, i) => [MARKET_SYMBOLS[i], r.status === 'fulfilled' ? r.value : { symbol: MARKET_SYMBOLS[i], status: 'unavailable' }])) };
}
