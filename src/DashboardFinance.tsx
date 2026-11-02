import { useEffect, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ArrowUp, ArrowDown, Minus, Coins, ArrowLeftRight, ShieldCheck, Headphones, Clock3, CircleCheck, CircleX, Wallet, ArrowRight } from 'lucide-react';
import { CryptoIcon, GoldMark } from './Assets';
import { useMarket, quoteIsFresh, GRAMS_PER_TROY_OUNCE, usdFormat } from './Market';
import type { MarketSymbol } from '../market-provider.mjs';
type Go=(page:string)=>void;
const assets:[MarketSymbol,string][]=[['XAU','Gold'],['BTC','Bitcoin'],['ETH','Ethereum'],['USDT','Tether'],['USDC','USD Coin'],['XRP','XRP'],['TRX','TRON'],['BNB','BNB'],['SOL','Solana']];
export function QuickActions({go}:{go:Go}){
  return <section className="dash-card finance-actions"><div className="finance-heading"><h2>Quick actions</h2><span>YOUR NEXT MOVE</span></div><div className="finance-action-grid">{[
    {id:'deposit',label:'Deposit',note:'Add funds',icon:ArrowDownLeft,tone:'green'},
    {id:'withdraw',label:'Withdraw',note:'Request a payout',icon:ArrowUpRight,tone:'purple'},
    {id:'buy-sell',label:'Buy / Sell Gold',note:'Your next allocation',icon:Coins,tone:'amber'},
    {id:'trades',label:'My Trades',note:'Hold & track',icon:Clock3,tone:'blue'},
    {id:'swap',label:'Swap',note:'Exchange balances',icon:ArrowLeftRight,tone:'rose'},
    {id:'support',label:'Support',note:'Get a little help',icon:Headphones,tone:'teal'},
  ].map(({id,label,note,icon:Icon,tone})=><button key={id} className={'finance-action tone-'+tone} onClick={()=>go(id)}><span className="action-disc"><Icon size={22}/></span><strong>{label}</strong><small>{note}</small></button>)}</div></section>;
}
const states=[
  {id:'pending',label:'Pending',icon:Clock3,detail:'Your request has been received and is waiting for review.',tone:'amber'},
  {id:'approved',label:'Approved',icon:ShieldCheck,detail:'A reviewer has approved the request. Payment or settlement may still be processing.',tone:'blue'},
  {id:'completed',label:'Successful',icon:CircleCheck,detail:'The transaction has completed and its accounting entry is confirmed.',tone:'green'},
  {id:'failed',label:'Failed',icon:CircleX,detail:'The operation could not complete. Check the reason or contact support before retrying.',tone:'red'},
];
export function StatusCentre({go}:{go:Go}){
  const [selected,setSelected]=useState('pending');const current=states.find(s=>s.id===selected)!;
  return <section className="dash-card finance-status"><div className="finance-heading"><h2>Transaction status</h2><span>HOW IT WORKS</span></div><div className="status-guide">{states.map(({id,label,icon:Icon,tone})=><button key={id} className={'status-guide-row tone-'+tone} aria-pressed={id===selected} onClick={()=>setSelected(id)}><span className="status-disc"><Icon size={18}/></span><strong>{label}</strong><span className={'finance-badge tone-'+tone}>{id==='completed'?'Completed':id==='approved'?'Reviewed':id==='failed'?'Needs attention':'Under review'}</span></button>)}</div><div className={'status-explanation tone-'+current.tone}><strong>{current.label}</strong><p>{current.detail}</p></div><button className="finance-view-link" onClick={()=>go('transactions')}>View my transactions <ArrowRight size={14}/></button></section>;
}
export function AssetWatch({go,holdings=false,balances=[]}:{go:Go;holdings?:boolean;balances?:{asset:string;amount:string;reserved?:string}[]}){
  const market=useMarket();
  const previous=useRef<Partial<Record<MarketSymbol,{price:number;time:string}>>>({});
  const [movements,setMovements]=useState<Partial<Record<MarketSymbol,number>>>({});
  useEffect(()=>{
    setMovements(old=>{const next={...old};for(const [symbol] of assets){const quote=market.quotes[symbol],prior=previous.current[symbol];if(!quoteIsFresh(quote,Date.now())||!quote.price)continue;
      const time=quote.receivedAt||market.fetchedAt;if(prior&&prior.time!==time)next[symbol]=(quote.price-prior.price)/prior.price*100;
      previous.current[symbol]={price:quote.price,time};
    }return next;});
  },[market.fetchedAt,market.quotes]);
  return <section className="dash-card finance-assets"><div className="finance-heading"><div><h2>{holdings?'My assets':'Gold & crypto market'}</h2><p>Spot references · refreshed every 30 seconds</p></div><button aria-label="Open wallet" onClick={()=>go('wallet')}><Wallet size={18}/></button></div><div className="finance-table-scroll"><table><thead><tr><th>Asset</th>{holdings&&<><th>Available</th><th>Reserved</th></>}<th>Price / USD</th><th>Price movement</th><th>Feed</th></tr></thead><tbody>{assets.map(([symbol,name])=>{
    const quote=market.quotes[symbol],fresh=quoteIsFresh(quote,market.now),change=fresh?movements[symbol]:undefined,tone=change===undefined||change===0?'neutral':change>0?'green':'red',ChangeIcon=change===undefined||change===0?Minus:change>0?ArrowUp:ArrowDown;
    return <tr key={symbol}><td><div className={'finance-asset-name asset-'+symbol.toLowerCase()}><span className="finance-asset-icon">{symbol==='XAU'?<GoldMark/>:<CryptoIcon coin={symbol}/>}</span><span><strong>{name}</strong><small>{symbol==='XAU'?'XAU · per gram':symbol}</small></span></div></td>{holdings&&<><td>{balances.find(b=>b.asset===symbol)?.amount||'0'}</td><td>{balances.find(b=>b.asset===symbol)?.reserved||'0'}</td></>}<td className="asset-price">{quote.price?usdFormat(quote.price/(symbol==='XAU'?GRAMS_PER_TROY_OUNCE:1),symbol==='TRX'?4:2):'—'}</td><td><span className={'asset-movement tone-'+tone}><ChangeIcon size={14}/>{change===undefined?'Awaiting update':`${change>0?'+':''}${change.toFixed(2)}%`}</span></td><td><span className={'finance-badge tone-'+(fresh?'green':'amber')}>{fresh?'Live':market.loading?'Loading':quote.price?'Last quote':'Unavailable'}</span></td></tr>;
  })}</tbody></table></div><div className="finance-market-note"><span className="movement-key"><span className="tone-green"><ArrowUp size={12}/>Price up</span><span className="tone-red"><ArrowDown size={12}/>Price down</span></span><span>Change since previous received quote, not a 24h return.</span></div></section>;
}
