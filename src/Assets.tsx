import bnb from 'cryptocurrency-icons/svg/color/bnb.svg';
import sol from 'cryptocurrency-icons/svg/color/sol.svg';
import btc from 'cryptocurrency-icons/svg/color/btc.svg';
import eth from 'cryptocurrency-icons/svg/color/eth.svg';
import usdt from 'cryptocurrency-icons/svg/color/usdt.svg';
import trx from 'cryptocurrency-icons/svg/color/trx.svg';
import usdc from 'cryptocurrency-icons/svg/color/usdc.svg';
import xrp from 'cryptocurrency-icons/svg/color/xrp.svg';
import alex from './assets/portraits/alex.jpg';
import sophia from './assets/portraits/sophia.jpg';
import daniel from './assets/portraits/daniel.jpg';
import amara from './assets/portraits/amara.jpg';
import gb from 'flag-icons/flags/4x3/gb.svg';
import sg from 'flag-icons/flags/4x3/sg.svg';
import ae from 'flag-icons/flags/4x3/ae.svg';
import ca from 'flag-icons/flags/4x3/ca.svg';

export const brandAssets: Record<string,string> = { BTC:btc, ETH:eth, USDT:usdt, TRX:trx, USDC:usdc, XRP:xrp, BNB:bnb, SOL:sol };
export const profiles = [
  { name:'Alex Morgan', country:'United Kingdom', flag:gb, portrait:alex },
  { name:'Sophia Tan', country:'Singapore', flag:sg, portrait:sophia },
  { name:'Daniel Reed', country:'United Arab Emirates', flag:ae, portrait:daniel },
  { name:'Amara Lewis', country:'Canada', flag:ca, portrait:amara },
];
export function CryptoIcon({coin}:{coin:string}) { return <span className={`crypto-icon authentic ${coin.toLowerCase()}`}><img src={brandAssets[coin]} alt={`${coin} logo`} width="30" height="30"/></span>; }
export function GoldMark(){return <span className="bullion-mark" role="img" aria-label="Gold bullion"><i/><i/><i/></span>;}
export function TierEmblem({index,tone}:{index:number,tone:string}){return <div className={`membership-seal ${tone}`} aria-hidden="true"><span>{['I','II','III','IV','V'][index]}</span><i>GOLDSWAP</i></div>;}
export function PaymentMarks(){return <div className="payment-strip"><div><span className="tiny-label">CRYPTO-ONLY FUNDING</span></div><div className="payment-logos">{['BTC','ETH','USDC','USDT','XRP','TRX','BNB','SOL'].map(key=><span className={`payment-badge ${key.toLowerCase()}`} key={key} title={`${key} — check enabled networks in your account`}><img src={brandAssets[key]} alt={key}/><span>{key}</span></span>)}</div></div>;}
