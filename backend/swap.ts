import express from 'express';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Sql } from './db.js';
import type { Services } from './pricing.js';
import { atoms,decimal } from './crypto.js';
import { financialUser,journal,audit } from './operations.js';
import { ApiError } from './security.js';
import { CRYPTO_ASSETS,CRYPTO_ROUTES } from '../shared/crypto.js';
const precision=(asset:string)=>CRYPTO_ROUTES.find(r=>r.asset===asset)!.precision;
const uid=(r:Request)=>(r as Request&{principal:{id:string}}).principal.id;
export function swapOperations(db:Sql,services:Services){
  const router=express.Router();
  router.post('/swaps/quote',async(req,res)=>{
    const input=z.object({fromAsset:z.enum(CRYPTO_ASSETS),toAsset:z.enum(CRYPTO_ASSETS),amount:z.string()}).strict().parse(req.body);
    if(input.fromAsset===input.toAsset)throw new ApiError(400,'Choose two different assets.');
    await financialUser(db,uid(req));const quantity=atoms(input.amount,precision(input.fromAsset));
    const [from,to]=await Promise.all([services.price(input.fromAsset),services.price(input.toAsset)]);
    const output=quantity*from.usdE8*10n**BigInt(precision(input.toAsset))/(10n**BigInt(precision(input.fromAsset))*to.usdE8);
    if(output<=0n)throw new ApiError(400,'Amount is too small to exchange.');
    const id=randomUUID(),pricing={fromUsd:decimal(from.usdE8,8),toUsd:decimal(to.usdE8,8),fromSource:from.source,toSource:to.source,fromReceivedAt:from.receivedAt,toReceivedAt:to.receivedAt,fee:'0',execution:'platform_balance_exchange'};
    const q=(await db.query("INSERT INTO swap_quotes(id,user_id,from_asset,to_asset,input_atoms,output_atoms,pricing,expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7,now()+interval '30 seconds') RETURNING expires_at",[id,uid(req),input.fromAsset,input.toAsset,quantity.toString(),output.toString(),JSON.stringify(pricing)])).rows[0];
    res.status(201).json({id,fromAsset:input.fromAsset,toAsset:input.toAsset,input:input.amount,output:decimal(output,precision(input.toAsset)),fee:'0',expiresAt:q.expires_at,serverTime:new Date().toISOString(),pricing});
  });
  router.post('/swaps/confirm',async(req,res)=>{
    const input=z.object({quoteId:z.uuid(),idempotencyKey:z.uuid()}).strict().parse(req.body);
    const id=await db.transaction(async tx=>{
      await financialUser(tx,uid(req));const old=(await tx.query('SELECT * FROM swap_orders WHERE user_id=$1 AND idempotency_key=$2',[uid(req),input.idempotencyKey])).rows[0];
      if(old){if(old.quote_id!==input.quoteId)throw new ApiError(409,'Idempotency key already used.');return old.id;}
      const q=(await tx.query('SELECT *,expires_at>now() valid FROM swap_quotes WHERE id=$1 AND user_id=$2 FOR UPDATE',[input.quoteId,uid(req)])).rows[0];
      if(!q||q.used||!q.valid)throw new ApiError(409,'Quote expired or already used. Request a new quote.');
      // Stable ordering prevents cross-asset swaps from locking treasury rows in opposite orders.
      for(const asset of [q.from_asset,q.to_asset].sort()){
        await tx.query('INSERT INTO treasury_accounts(asset) VALUES ($1) ON CONFLICT DO NOTHING',[asset]);await tx.query('SELECT asset FROM treasury_accounts WHERE asset=$1 FOR UPDATE',[asset]);
        await tx.query('INSERT INTO money_accounts(user_id,asset) VALUES ($1,$2) ON CONFLICT DO NOTHING',[uid(req),asset]);
      }
      const source=(await tx.query('SELECT * FROM money_accounts WHERE user_id=$1 AND asset=$2 FOR UPDATE',[uid(req),q.from_asset])).rows[0];
      const target=(await tx.query('SELECT * FROM treasury_accounts WHERE asset=$1',[q.to_asset])).rows[0];
      const quantity=BigInt(q.input_atoms),output=BigInt(q.output_atoms);
      if(BigInt(source.available)<quantity)throw new ApiError(409,'Insufficient available balance.');
      if(BigInt(target.available)<output)throw new ApiError(409,'The receive asset does not have enough platform liquidity. No balance was changed.');
      await tx.query('UPDATE money_accounts SET available=available-$1 WHERE user_id=$2 AND asset=$3',[quantity.toString(),uid(req),q.from_asset]);
      await tx.query('UPDATE treasury_accounts SET available=available+$1 WHERE asset=$2',[quantity.toString(),q.from_asset]);
      await tx.query('UPDATE treasury_accounts SET available=available-$1 WHERE asset=$2',[output.toString(),q.to_asset]);
      await tx.query('UPDATE money_accounts SET available=available+$1 WHERE user_id=$2 AND asset=$3',[output.toString(),uid(req),q.to_asset]);
      const id=randomUUID();await journal(tx,'swap:source:'+id,q.from_asset,'crypto.swap',[[uid(req)+':available',-quantity],['treasury:'+q.from_asset,quantity]]);
      await journal(tx,'swap:target:'+id,q.to_asset,'crypto.swap',[['treasury:'+q.to_asset,-output],[uid(req)+':available',output]]);
      await tx.query('INSERT INTO swap_orders(id,user_id,quote_id,idempotency_key,from_asset,to_asset,input_atoms,output_atoms) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',[id,uid(req),q.id,input.idempotencyKey,q.from_asset,q.to_asset,q.input_atoms,q.output_atoms]);
      await tx.query('UPDATE swap_quotes SET used=true WHERE id=$1',[q.id]);await audit(tx,uid(req),'crypto.swapped',id,{fromAsset:q.from_asset,toAsset:q.to_asset,input:decimal(quantity,precision(q.from_asset)),output:decimal(output,precision(q.to_asset)),pricing:q.pricing});return id;
    });res.status(201).json({id,status:'completed'});
  });
  return router;
}

export async function swapHistory(db:Sql,user:string){return (await db.query('SELECT * FROM swap_orders WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',[user])).rows.map(o=>({id:o.id,type:'Swap',asset:o.to_asset,amount:decimal(o.output_atoms,precision(o.to_asset)),direction:'in',method:decimal(o.input_atoms,precision(o.from_asset))+' '+o.from_asset+' to '+o.to_asset,status:'completed',createdAt:o.created_at}));}
