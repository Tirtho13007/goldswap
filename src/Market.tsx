import { ActionButton } from './ActionButton';
import { useEffect, useState } from 'react';
import { Pause, Play, ArrowUpRight } from 'lucide-react';
import { fetchMarketSnapshot, quoteIsFresh, GRAMS_PER_TROY_OUNCE } from '../market-provider.mjs';
import type { Quote, Snapshot, MarketSymbol } from '../market-provider.mjs';
import { CryptoIcon, GoldMark } from './Assets';
export { quoteIsFresh, GRAMS_PER_TROY_OUNCE };
const empty = Object.fromEntries(['XAU','BTC','ETH','USDT','USDC','XRP','TRX','BNB','SOL'].map(symbol=>[symbol,{symbol,status:'unavailable'}])) as Record<MarketSymbol,Quote>;
export function useMarket(){
  const [snapshot,setSnapshot]=useState<Snapshot>({fetchedAt:'',quotes:empty});
  const [loading,setLoading]=useState(true);
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{let disposed=false;let running=false;
    const refresh=async()=>{if(running||document.hidden)return;running=true;try{
      let data:Snapshot;
      if(location.protocol==='file:')data=await fetchMarketSnapshot();
      else {try {const r=await fetch('/api/markets',{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Feed unavailable');data=await r.json();if(!data.quotes)throw Error('Invalid feed');}catch{data=await fetchMarketSnapshot();}}
      if(!disposed)setSnapshot(prev=>({...data,quotes:Object.fromEntries(Object.entries(data.quotes).map(([key,q])=>[key,q.status==='ok'?q:{...prev.quotes[key as MarketSymbol],status:'unavailable'}])) as Record<MarketSymbol,Quote>}));
    }catch{if(!disposed)setSnapshot(prev=>({...prev,quotes:Object.fromEntries(Object.entries(prev.quotes).map(([k,q])=>[k,{...q,status:'unavailable'}])) as Record<MarketSymbol,Quote>}));}
    finally{running=false;if(!disposed){setLoading(false);setNow(Date.now());}}};
    void refresh();const poll=setInterval(refresh,30000);const clock=setInterval(()=>setNow(Date.now()),10000);const visible=()=>{if(!document.hidden)void refresh();};document.addEventListener('visibilitychange',visible);
    return()=>{disposed=true;clearInterval(poll);clearInterval(clock);document.removeEventListener('visibilitychange',visible);};
  },[]);
  return {...snapshot,loading,now};
}
export type MarketState = ReturnType<typeof useMarket>;
export const usdFormat=(n:number,digits=2)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:digits,maximumFractionDigits:digits}).format(n);
export function priceStatus(quote:Quote|undefined,now:number){return quoteIsFresh(quote,now)?'Live':quote?.price?'Last quote':'Unavailable';}
export function PriceTicker({market}:{market:MarketState}){
  const [stopped,setStopped]=useState(false);
  const items:[MarketSymbol,string,number][]=[['XAU','Gold / gram',GRAMS_PER_TROY_OUNCE],['XAU','Gold / troy oz',1],['BTC','Bitcoin',1],['ETH','Ethereum',1],['USDT','Tether',1],['USDC','USD Coin',1],['XRP','XRP',1],['TRX','TRON',1],['BNB','BNB',1],['SOL','Solana',1]];
  return <div className="news-ticker" data-paused={stopped} aria-label="Automatically refreshed gold and crypto prices"><div className="ticker-live"><span className={quoteIsFresh(market.quotes.XAU,market.now)?'status-dot':'status-dot offline'}/><strong>{market.loading?'Connecting':quoteIsFresh(market.quotes.XAU,market.now)?'Market live':'Market feed'}</strong><span>Refreshes every 30s</span></div><div className="ticker-window" tabIndex={0} role="region" aria-label="Gold and crypto market prices"><div className="ticker-track">{[0,1].map(copy=><div className="ticker-set" key={copy} aria-hidden={copy===1}>{items.map(([symbol,name,divisor])=>{const q=market.quotes[symbol],fresh=quoteIsFresh(q,market.now);return <div className="news-quote" key={name} title={`${q.source||'Price feed'} · ${q.sourceUpdatedAt||q.receivedAt||'waiting for data'}`}>{symbol==='XAU'?<GoldMark/>:<CryptoIcon coin={symbol}/>}<div><span>{name}</span><strong>{q.price?usdFormat(q.price/divisor,symbol==='TRX'?4:2):'—'}</strong></div><small className={fresh?'fresh':'stale'}>{market.loading?'Loading':priceStatus(q,market.now)}</small></div>;})}</div>)}</div></div><ActionButton className="ticker-end" onClick={()=>setStopped(!stopped)} aria-label={stopped?'Play market ticker':'Pause market ticker'} aria-pressed={stopped}>{stopped?<Play size={16}/>:<Pause size={16}/>}</ActionButton></div>;
}
export function MarketMenu({market,onChoose}:{market:MarketState,onChoose:()=>void}){const [open,setOpen]=useState(false);return <div className="market-menu" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}} onKeyDown={e=>{if(e.key==='Escape')setOpen(false);}}><ActionButton className="nav-market-button" onClick={()=>setOpen(!open)} aria-expanded={open} aria-controls="markets-dropdown">Markets <span className="status-dot"/></ActionButton>{open&&<div id="markets-dropdown" className="market-dropdown"><div className="dropdown-label">MARKET WATCH <span>USD</span></div>{(['XAU','BTC','ETH','USDT','USDC','XRP','TRX','BNB','SOL'] as MarketSymbol[]).map(symbol=><ActionButton key={symbol} onClick={()=>{setOpen(false);onChoose();}}>{symbol==='XAU'?<GoldMark/>:<CryptoIcon coin={symbol}/>}<span>{symbol==='XAU'?'Gold / gram':symbol}</span><strong>{market.quotes[symbol].price?usdFormat(market.quotes[symbol].price!/(symbol==='XAU'?GRAMS_PER_TROY_OUNCE:1),symbol==='TRX'?4:2):'—'}</strong><ArrowUpRight size={13}/></ActionButton>)}<a href="https://gold-api.com" target="_blank" rel="noreferrer">Gold API · Spot reference, not an execution quote</a></div>}</div>;}
