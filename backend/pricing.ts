import { fetchQuote,quoteIsFresh } from '../market-provider.mjs';
import type { MarketSymbol } from '../market-provider.mjs';
import { ApiError } from './security.js';
import { atoms,decimal } from './crypto.js';

export type Price={usdE8:bigint;receivedAt:string;source:string};
export type Services={price:(asset:MarketSymbol)=>Promise<Price>};
const cache=new Map<string,{price:Price;expires:number}>();
export const marketServices:Services={price:async asset=>{
  const old=cache.get(asset);if(old&&old.expires>Date.now())return old.price;
  try{
    const quote=await fetchQuote(asset);
    if(!quoteIsFresh(quote)||!quote.price)throw Error('Stale quote');
    const result={usdE8:atoms(quote.price.toFixed(8),8),receivedAt:quote.receivedAt!,source:quote.source!};
    cache.set(asset,{price:result,expires:Date.now()+30000});return result;
  }catch{throw new ApiError(503,'A fresh price is unavailable. Please try again before submitting.');}
}};
export const feeAtoms=(amount:bigint,bps:number)=>(amount*BigInt(bps)+9999n)/10000n;
export async function usdCheck(services:Services,asset:MarketSymbol,amount:bigint,precision:number,minimum:string){
  const price=await services.price(asset),usdE8=amount*price.usdE8/10n**BigInt(precision);
  if(usdE8<atoms(minimum,8))throw new ApiError(400,`Minimum amount is $${minimum} USD equivalent at submission.`);
  return {usdValue:decimal(usdE8,8),priceUsd:decimal(price.usdE8,8),priceReceivedAt:price.receivedAt,priceSource:price.source};
}
