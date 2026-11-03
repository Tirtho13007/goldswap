import { brandAssets } from './Assets';
export function PaymentBrand({name}:{name:string}){return <span className="payment-brand payment-brand-crypto">{brandAssets[name]?<img src={brandAssets[name]} alt={name+' logo'}/>:<><img src={brandAssets.BTC} alt="Bitcoin"/><img src={brandAssets.ETH} alt="Ethereum"/><img src={brandAssets.USDT} alt="Tether"/></>}</span>;}
