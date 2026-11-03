import express from 'express';
import type { Request,RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Sql } from './db.js';
import type { Services } from './pricing.js';
import { feeAtoms,usdCheck } from './pricing.js';
import { atoms,decimal,routeFor,validateAddress } from './crypto.js';
import { audit,journal,financialUser,ownFiles } from './operations.js';
import { ApiError } from './security.js';
import { CRYPTO_ASSETS,CRYPTO_ROUTES } from '../shared/crypto.js';
import { GOLD_PRECISION,PLATFORM_POLICY,TRADE_PLANS } from '../shared/policy.js';

type Auth=Request&{principal?:{id:string;roles:string[];permissions:string[]}};
const uid=(req:Request)=>(req as Auth).principal!.id;
const idSchema=z.uuid();
const gram=(n:string|bigint)=>decimal(n,GOLD_PRECISION);
const precision=(asset:string)=>CRYPTO_ROUTES.find(r=>r.asset===asset)!.precision;
async function account(tx:Sql,user:string){
  await tx.query('INSERT INTO gold_accounts(user_id) VALUES ($1) ON CONFLICT DO NOTHING',[user]);
  return (await tx.query('SELECT * FROM gold_accounts WHERE user_id=$1 FOR UPDATE',[user])).rows[0];
}
async function stock(tx:Sql){return (await tx.query('SELECT * FROM gold_stock WHERE id=1 FOR UPDATE')).rows[0];}
async function treasury(tx:Sql,asset:string){
  await tx.query('INSERT INTO treasury_accounts(asset) VALUES ($1) ON CONFLICT DO NOTHING',[asset]);
  return (await tx.query('SELECT * FROM treasury_accounts WHERE asset=$1 FOR UPDATE',[asset])).rows[0];
}
async function approvedKyc(tx:Sql,user:string){if(!(await tx.query("SELECT 1 FROM kyc_cases WHERE user_id=$1 AND status='approved' AND renewal_required=false AND (document_expires_on IS NULL OR document_expires_on>=current_date)",[user])).rows.length)throw new ApiError(403,'Approved KYC is required.');}
function cryptoForGold(gold:bigint,goldPrice:bigint,coinPrice:bigint,p:number){return gold*goldPrice*10000000n*10n**BigInt(p)/(1000000n*311034768n*coinPrice);}
function goldForCrypto(coin:bigint,goldPrice:bigint,coinPrice:bigint,p:number){return coin*coinPrice*311034768n*1000000n/(10n**BigInt(p)*goldPrice*10000000n);}

export function goldOperations(db:Sql,permission:(name:string)=>RequestHandler,services:Services){
  const router=express.Router();
  router.get('/gold/account',async(req,res)=>{
    const [balance,settings,trades,orders,physical]=await Promise.all([
      db.query('SELECT * FROM gold_accounts WHERE user_id=$1',[uid(req)]),db.query('SELECT * FROM platform_gold_settings WHERE id=1'),
      db.query('SELECT * FROM gold_trades WHERE user_id=$1 ORDER BY starts_at DESC LIMIT 100',[uid(req)]),
      db.query('SELECT * FROM gold_orders WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',[uid(req)]),
      db.query('SELECT * FROM physical_gold_requests WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',[uid(req)]),
    ]);
    const b=balance.rows[0];res.json({serverTime:new Date().toISOString(),policy:PLATFORM_POLICY,settings:settings.rows[0],plans:TRADE_PLANS,
      balance:{available:gram(b?.available||'0'),locked:gram(b?.locked||'0'),reserved:gram(b?.reserved||'0')},
      trades:trades.rows.map(t=>({...t,gold:gram(t.principal_atoms),profit:gram(t.profit_atoms),rate:t.rate_bps/100})),
      orders:orders.rows.map(o=>({...o,input:decimal(o.input_atoms,o.side==='buy'?precision(o.asset):GOLD_PRECISION),output:decimal(o.output_atoms,o.side==='buy'?GOLD_PRECISION:precision(o.asset))})),
      physical:physical.rows.map(physicalRecord)});
  });
  router.post('/gold/quote',async(req,res)=>{
    const input=z.object({side:z.enum(['buy','sell','withdraw']).default('buy'),asset:z.enum(CRYPTO_ASSETS),amount:z.string(),routeId:z.string().optional()}).strict().parse(req.body);
    await financialUser(db,uid(req));
    const p=precision(input.asset),quantity=atoms(input.amount,input.side==='buy'?p:GOLD_PRECISION);
    const [metal,coin]=await Promise.all([services.price('XAU'),services.price(input.asset)]);
    const goldFee=input.side==='withdraw'?feeAtoms(quantity,PLATFORM_POLICY.withdrawalFeeBps):0n;
    if(quantity<=goldFee)throw new ApiError(400,'Amount is too small after fees.');
    const output=input.side==='buy'?goldForCrypto(quantity,metal.usdE8,coin.usdE8,p):cryptoForGold(quantity-goldFee,metal.usdE8,coin.usdE8,p);
    if(output<=0n)throw new ApiError(400,'Amount is too small.');
    const grossCrypto=input.side==='withdraw'?cryptoForGold(quantity,metal.usdE8,coin.usdE8,p):output;
    if(input.side==='withdraw'){
      const route=routeFor(input.routeId||'');if(route.asset!==input.asset)throw new ApiError(400,'Asset and network must match.');
      if(!(await db.query('SELECT 1 FROM crypto_settings WHERE route_id=$1 AND withdrawal_enabled=true',[route.id])).rows.length)throw new ApiError(503,'Withdrawals are not enabled on this network.');
      await usdCheck(services,input.asset,grossCrypto,p,PLATFORM_POLICY.withdrawalMinimumUsd);
    }
    const pricing={coinUsd:decimal(coin.usdE8,8),goldOunceUsd:decimal(metal.usdE8,8),coinSource:coin.source,goldSource:metal.source,receivedAt:metal.receivedAt,
      goldFeeAtoms:goldFee.toString(),goldFee:gram(goldFee),grossCryptoAtoms:grossCrypto.toString(),routeId:input.routeId||null,policyVersion:PLATFORM_POLICY.version};
    const id=randomUUID();const {rows}=await db.query("INSERT INTO gold_quotes(id,user_id,side,asset,input_atoms,output_atoms,pricing,expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7,now()+interval '30 seconds') RETURNING expires_at",[id,uid(req),input.side,input.asset,quantity.toString(),output.toString(),JSON.stringify(pricing)]);
    res.status(201).json({id,side:input.side,asset:input.asset,input:input.amount,output:decimal(output,input.side==='buy'?GOLD_PRECISION:p),goldFee:gram(goldFee),expiresAt:rows[0].expires_at,serverTime:new Date().toISOString(),pricing});
  });
  router.post('/gold/orders',async(req,res)=>{
    const input=z.object({quoteId:idSchema,idempotencyKey:idSchema}).strict().parse(req.body);
    const id=await db.transaction(async tx=>{
      await financialUser(tx,uid(req));
      const old=(await tx.query('SELECT * FROM gold_orders WHERE user_id=$1 AND idempotency_key=$2',[uid(req),input.idempotencyKey])).rows[0];
      if(old){if(old.quote_id!==input.quoteId)throw new ApiError(409,'Idempotency key already used.');return old.id;}
      const inventory=await stock(tx),g=await account(tx,uid(req));
      const q=(await tx.query('SELECT *,expires_at>now() valid FROM gold_quotes WHERE id=$1 AND user_id=$2 FOR UPDATE',[input.quoteId,uid(req)])).rows[0];
      if(!q||q.used||!q.valid||q.side==='withdraw')throw new ApiError(409,'Quote expired, used or unavailable. Request a fresh quote.');
      const t=await treasury(tx,q.asset);await tx.query('INSERT INTO money_accounts(user_id,asset) VALUES ($1,$2) ON CONFLICT DO NOTHING',[uid(req),q.asset]);
      const c=(await tx.query('SELECT * FROM money_accounts WHERE user_id=$1 AND asset=$2 FOR UPDATE',[uid(req),q.asset])).rows[0];
      const incoming=BigInt(q.input_atoms),outgoing=BigInt(q.output_atoms),id=randomUUID();
      if(q.side==='buy'){
        if(BigInt(c.available)<incoming)throw new ApiError(409,'Insufficient available crypto.');
        if(BigInt(inventory.available)<outgoing)throw new ApiError(409,'Platform gold inventory is insufficient. No funds were deducted.');
        await tx.query('UPDATE money_accounts SET available=available-$1 WHERE user_id=$2 AND asset=$3',[incoming.toString(),uid(req),q.asset]);
        await tx.query('UPDATE treasury_accounts SET available=available+$1 WHERE asset=$2',[incoming.toString(),q.asset]);
        await tx.query('UPDATE gold_stock SET available=available-$1 WHERE id=1',[outgoing.toString()]);
        await tx.query('UPDATE gold_accounts SET available=available+$1 WHERE user_id=$2',[outgoing.toString(),uid(req)]);
        await journal(tx,'buy:crypto:'+id,q.asset,'gold.buy',[[uid(req)+':available',-incoming],['treasury:'+q.asset,incoming]]);
        await journal(tx,'buy:gold:'+id,'XAU','gold.buy',[['platform:gold',-outgoing],[uid(req)+':gold:available',outgoing]]);
      }else{
        if(BigInt(g.available)<incoming)throw new ApiError(409,'Insufficient available gold.');
        if(BigInt(t.available)<outgoing)throw new ApiError(409,'Platform crypto liquidity is insufficient. No gold was deducted.');
        await tx.query('UPDATE gold_accounts SET available=available-$1 WHERE user_id=$2',[incoming.toString(),uid(req)]);
        await tx.query('UPDATE gold_stock SET available=available+$1 WHERE id=1',[incoming.toString()]);
        await tx.query('UPDATE treasury_accounts SET available=available-$1 WHERE asset=$2',[outgoing.toString(),q.asset]);
        await tx.query('UPDATE money_accounts SET available=available+$1 WHERE user_id=$2 AND asset=$3',[outgoing.toString(),uid(req),q.asset]);
        await journal(tx,'sell:gold:'+id,'XAU','gold.sell',[[uid(req)+':gold:available',-incoming],['platform:gold',incoming]]);
        await journal(tx,'sell:crypto:'+id,q.asset,'gold.sell',[['treasury:'+q.asset,-outgoing],[uid(req)+':available',outgoing]]);
      }
      await tx.query('UPDATE gold_quotes SET used=true WHERE id=$1',[q.id]);
      await tx.query('INSERT INTO gold_orders(id,user_id,quote_id,idempotency_key,side,asset,input_atoms,output_atoms) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',[id,uid(req),q.id,input.idempotencyKey,q.side,q.asset,q.input_atoms,q.output_atoms]);
      await audit(tx,uid(req),'gold.'+q.side,id,{quoteId:q.id,pricing:q.pricing});return id;
    });res.status(201).json({id,status:'completed'});
  });
  router.post('/gold/withdrawals',async(req,res)=>{
    const input=z.object({quoteId:idSchema,address:z.string().max(150),memo:z.string().max(30).default(''),idempotencyKey:idSchema}).strict().parse(req.body);
    const id=await db.transaction(async tx=>{
      await financialUser(tx,uid(req));await approvedKyc(tx,uid(req));
      const old=(await tx.query('SELECT * FROM withdrawals WHERE user_id=$1 AND idempotency_key=$2',[uid(req),input.idempotencyKey])).rows[0];
      if(old){if(old.quote_id!==input.quoteId||old.address!==input.address||old.memo!==input.memo)throw new ApiError(409,'Idempotency key already used.');return old.id;}
      await stock(tx);const g=await account(tx,uid(req));
      const q=(await tx.query('SELECT *,expires_at>now() valid FROM gold_quotes WHERE id=$1 AND user_id=$2 FOR UPDATE',[input.quoteId,uid(req)])).rows[0];
      if(!q||q.used||!q.valid||q.side!=='withdraw')throw new ApiError(409,'Request a fresh withdrawal quote.');
      const route=routeFor(q.pricing.routeId);validateAddress(route.id,input.address,input.memo);
      if(!(await tx.query('SELECT 1 FROM crypto_settings WHERE route_id=$1 AND withdrawal_enabled=true',[route.id])).rows.length)throw new ApiError(503,'Withdrawals disabled on this network.');
      const t=await treasury(tx,q.asset),gross=BigInt(q.input_atoms),netCrypto=BigInt(q.output_atoms),grossCrypto=BigInt(q.pricing.grossCryptoAtoms),cryptoFee=grossCrypto-netCrypto;
      if(BigInt(g.available)<gross)throw new ApiError(409,'Insufficient available gold.');
      if(BigInt(t.available)<netCrypto)throw new ApiError(409,'Platform crypto liquidity is insufficient.');
      const id=randomUUID();await tx.query('UPDATE gold_accounts SET available=available-$1,reserved=reserved+$1 WHERE user_id=$2',[gross.toString(),uid(req)]);
      await tx.query('UPDATE treasury_accounts SET available=available-$1,reserved=reserved+$1 WHERE asset=$2',[netCrypto.toString(),q.asset]);
      await tx.query("INSERT INTO withdrawals(id,user_id,route_id,chain,asset,amount_atoms,fee_atoms,address,memo,status,idempotency_key,funding_source,gold_atoms,gold_fee_atoms,quote_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10,'gold',$11,$12,$13)",[id,uid(req),route.id,route.chain,q.asset,grossCrypto.toString(),cryptoFee.toString(),input.address,input.memo,input.idempotencyKey,gross.toString(),q.pricing.goldFeeAtoms,q.id]);
      await tx.query('UPDATE gold_quotes SET used=true WHERE id=$1',[q.id]);
      await journal(tx,'gold-withdraw:reserve:'+id,'XAU','gold.withdrawal.reserve',[[uid(req)+':gold:available',-gross],[uid(req)+':gold:reserved',gross]]);
      await journal(tx,'gold-withdraw:liquidity:'+id,q.asset,'gold.withdrawal.reserve',[['treasury:'+q.asset,-netCrypto],['treasury:reserved:'+q.asset,netCrypto]]);
      await audit(tx,uid(req),'gold.withdrawal.requested',id,{quoteId:q.id,pricing:q.pricing});return id;
    });res.status(201).json({id,status:'pending'});
  });
  router.post('/gold/trades',async(req,res)=>{
    const input=z.object({amount:z.string(),plan:z.string(),idempotencyKey:idSchema,acceptTerms:z.literal(true)}).strict().parse(req.body),amount=atoms(input.amount,GOLD_PRECISION),plan=TRADE_PLANS.find(p=>p.id===input.plan);
    if(!plan)throw new ApiError(400,'Choose a valid trade level.');
    const min=plan.minGrams==='0'?0n:atoms(plan.minGrams,GOLD_PRECISION),max=atoms(plan.maxGrams,GOLD_PRECISION);
    if(amount<min||amount>max||(plan.id!=='elite'&&amount===max))throw new ApiError(400,'Gold amount does not match this trade level.');
    const profit=amount*BigInt(plan.rateBps)/10000n;if(profit<=0n)throw new ApiError(400,'Amount is too small.');
    const id=await db.transaction(async tx=>{
      await financialUser(tx,uid(req));
      const old=(await tx.query('SELECT * FROM gold_trades WHERE user_id=$1 AND idempotency_key=$2',[uid(req),input.idempotencyKey])).rows[0];
      if(old){if(old.plan!==plan.id||BigInt(old.principal_atoms)!==amount)throw new ApiError(409,'Idempotency key already used.');return old.id;}
      const settings=(await tx.query('SELECT * FROM platform_gold_settings WHERE id=1')).rows[0];
      if(!settings.trades_enabled||!settings.rates_confirmed)throw new ApiError(503,'Trade terms are not enabled.');
      const inventory=await stock(tx),g=await account(tx,uid(req));
      if(BigInt(g.available)<amount)throw new ApiError(409,'Insufficient available gold.');
      if(BigInt(inventory.available)<profit)throw new ApiError(409,'Platform profit reserve is insufficient. No gold was locked.');
      const id=randomUUID();await tx.query('UPDATE gold_accounts SET available=available-$1,locked=locked+$1 WHERE user_id=$2',[amount.toString(),uid(req)]);
      await tx.query('UPDATE gold_stock SET available=available-$1,reserved=reserved+$1 WHERE id=1',[profit.toString()]);
      await tx.query("INSERT INTO gold_trades(id,user_id,plan,principal_atoms,profit_atoms,rate_bps,policy_version,matures_at,idempotency_key) VALUES ($1,$2,$3,$4,$5,$6,$7,now()+interval '5 days',$8)",[id,uid(req),plan.id,amount.toString(),profit.toString(),plan.rateBps,PLATFORM_POLICY.version,input.idempotencyKey]);
      await journal(tx,'trade:lock:'+id,'XAU','trade.start',[[uid(req)+':gold:available',-amount],[uid(req)+':gold:locked',amount],['platform:gold',-profit],['platform:profit:reserved',profit]]);
      await audit(tx,uid(req),'trade.started',id,{plan:plan.id,gold:input.amount,profit:gram(profit),rateBps:plan.rateBps});return id;
    });res.status(201).json({id,status:'active'});
  });
  router.post('/gold/physical',async(req,res)=>{
    const input=z.object({kind:z.enum(['order','withdrawal']),amount:z.string(),idempotencyKey:idSchema,confirmDeliveryAddress:z.literal(true),recipient:z.object({name:z.string().trim().min(2).max(160),phone:z.string().min(7).max(30),address:z.string().trim().min(10).max(600),country:z.string().regex(/^[A-Z]{2}$/)}).strict()}).strict().parse(req.body),amount=atoms(input.amount,GOLD_PRECISION);
    const id=await db.transaction(async tx=>{
      await financialUser(tx,uid(req));await approvedKyc(tx,uid(req));
      const old=(await tx.query('SELECT * FROM physical_gold_requests WHERE user_id=$1 AND idempotency_key=$2',[uid(req),input.idempotencyKey])).rows[0];
      if(old){if(BigInt(old.gross_atoms)!==amount||old.kind!==input.kind||Object.entries(input.recipient).some(([key,value])=>old.recipient[key]!==value))throw new ApiError(409,'Idempotency key already used.');return old.id;}
      const settings=(await tx.query('SELECT * FROM platform_gold_settings WHERE id=1')).rows[0];if(settings.physical_fee_basis!=='additional_gold')throw new ApiError(503,'Physical order terms are not configured.');
      if(amount<atoms(PLATFORM_POLICY.physicalMinimumGrams,GOLD_PRECISION))throw new ApiError(400,'Minimum physical gold order or withdrawal is 500 g.');
      await stock(tx);const g=await account(tx,uid(req)),fee=feeAtoms(amount,PLATFORM_POLICY.physicalFeeBps),total=amount+fee;
      if(BigInt(g.available)<total)throw new ApiError(409,'Insufficient available gold including the 2% physical fee.');
      const id=randomUUID();await tx.query('UPDATE gold_accounts SET available=available-$1,reserved=reserved+$1 WHERE user_id=$2',[total.toString(),uid(req)]);
      await tx.query("INSERT INTO physical_gold_requests(id,user_id,kind,gross_atoms,fee_atoms,delivery_atoms,reserved_atoms,fee_basis,recipient,idempotency_key) VALUES ($1,$2,$3,$4,$5,$4,$6,'additional_gold',$7,$8)",[id,uid(req),input.kind,amount.toString(),fee.toString(),total.toString(),JSON.stringify(input.recipient),input.idempotencyKey]);
      await tx.query('UPDATE physical_gold_requests SET address_confirmed_at=now(),address_confirmed_by=$2 WHERE id=$1',[id,uid(req)]);await journal(tx,'physical:reserve:'+id,'XAU','physical.reserve',[[uid(req)+':gold:available',-total],[uid(req)+':gold:reserved',total]]);await audit(tx,uid(req),'physical.requested',id,{grams:input.amount,fee:gram(fee),total:gram(total)});return id;
    });res.status(201).json({id,status:'pending'});
  });
  router.post('/gold/physical/:id/cancel',async(req,res)=>{
    const id=idSchema.parse(req.params.id);await db.transaction(async tx=>{await financialUser(tx,uid(req));await stock(tx);await account(tx,uid(req));const row=(await tx.query('SELECT * FROM physical_gold_requests WHERE id=$1 AND user_id=$2 FOR UPDATE',[id,uid(req)])).rows[0];if(!row)throw new ApiError(404,'Request not found.');if(row.status==='cancelled')return;if(row.status!=='pending')throw new ApiError(409,'Only pending physical requests can be cancelled.');await releasePhysical(tx,row,uid(req),'cancelled','Cancelled by account holder');});res.json({status:'cancelled'});
  });
  router.get('/staff/gold',permission('configuration.manage'),async(_req,res)=>{
    res.json({settings:(await db.query('SELECT * FROM platform_gold_settings WHERE id=1')).rows[0],stock:(await db.query('SELECT * FROM gold_stock WHERE id=1')).rows.map(s=>({available:gram(s.available),reservedProfit:gram(s.reserved)}))[0],treasury:(await db.query('SELECT * FROM treasury_accounts')).rows.map(t=>({asset:t.asset,available:decimal(t.available,precision(t.asset)),reserved:decimal(t.reserved,precision(t.asset))}))});
  });
  router.put('/staff/gold/settings',permission('configuration.manage'),async(req:Auth,res)=>{
    if(!req.principal!.roles.includes('super_admin'))throw new ApiError(403,'Super Admin access required.');
    const input=z.object({tradesEnabled:z.boolean(),ratesConfirmed:z.literal(true),physicalFeeBasis:z.literal('additional_gold')}).strict().parse(req.body);
    await db.transaction(async tx=>{await tx.query("UPDATE platform_gold_settings SET trades_enabled=$1,rates_confirmed=true,physical_fee_basis='additional_gold',updated_at=now() WHERE id=1",[input.tradesEnabled]);await audit(tx,uid(req),'gold.terms_configured','1',input);});res.json({message:'Gold terms saved.'});
  });
  router.get('/staff/gold/adjustments',permission('adjustments.review'),async(req:Auth,res)=>{
    if(!req.principal!.roles.includes('super_admin'))throw new ApiError(403,'Super Admin access required.');
    const rows=(await db.query('SELECT a.*,u.email FROM inventory_adjustments a JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC,a.id LIMIT 100')).rows;
    res.json({adjustments:rows.map(r=>({...r,grams:gram(r.gold_atoms),balanceAfter:gram(r.balance_after)}))});
  });
  router.post('/staff/gold/adjustments',permission('adjustments.review'),async(req:Auth,res)=>{
    if(!req.principal!.roles.includes('super_admin'))throw new ApiError(403,'Super Admin access required.');
    const input=z.object({idempotencyKey:idSchema,direction:z.enum(['add','remove']),grams:z.string(),reference:z.string().trim().min(8).max(200),reason:z.string().trim().min(8).max(1000)}).strict().parse(req.body);
    const quantity=atoms(input.grams,GOLD_PRECISION);
    const result=await db.transaction(async tx=>{
      const current=await stock(tx);
      const previous=(await tx.query('SELECT * FROM inventory_adjustments WHERE id=$1',[input.idempotencyKey])).rows[0];
      if(previous){
        if(previous.actor_id!==uid(req)||previous.direction!==input.direction||BigInt(previous.gold_atoms)!==quantity||previous.reference!==input.reference||previous.reason!==input.reason)throw new ApiError(409,'Idempotency key already used for another adjustment.');
        return {id:previous.id,available:gram(previous.balance_after)};
      }
      if((await tx.query('SELECT 1 FROM inventory_adjustments WHERE reference=$1',[input.reference])).rows.length||(await tx.query('SELECT 1 FROM inventory_receipts WHERE reference=$1',[input.reference])).rows.length)throw new ApiError(409,'Inventory reference already recorded.');
      if(input.direction==='remove'&&quantity>BigInt(current.available))throw new ApiError(409,'Only unallocated company stock can be removed. Customer balances and reserved profit cannot be reduced.');
      const change=input.direction==='add'?quantity:-quantity,balance=BigInt(current.available)+change;
      await tx.query('UPDATE gold_stock SET available=$1 WHERE id=1',[balance.toString()]);
      await tx.query('INSERT INTO inventory_adjustments(id,actor_id,direction,gold_atoms,reference,reason,balance_after) VALUES ($1,$2,$3,$4,$5,$6,$7)',[input.idempotencyKey,uid(req),input.direction,quantity.toString(),input.reference,input.reason,balance.toString()]);
      await journal(tx,'inventory-adjustment:'+input.idempotencyKey,'XAU','inventory.'+input.direction,[['external:attested:gold',-change],['platform:gold',change]]);
      await audit(tx,uid(req),'gold.inventory_'+input.direction,input.idempotencyKey,{...input,balanceAfter:gram(balance),evidence:'Internal company stock attestation'});
      return {id:input.idempotencyKey,available:gram(balance)};
    });
    res.status(201).json({...result,message:'Company stock adjusted. Customer balances and reserved profit are unchanged.'});
  });
  router.post('/staff/gold/inventory',permission('adjustments.review'),async(req:Auth,res)=>{
    if(!req.principal!.roles.includes('super_admin'))throw new ApiError(403,'Super Admin access required.');
    const input=z.object({grams:z.string(),reference:z.string().trim().min(8).max(200),proofId:idSchema}).strict().parse(req.body),quantity=atoms(input.grams,GOLD_PRECISION);
    await db.transaction(async tx=>{await ownFiles(tx,uid(req),[input.proofId],'inventory');await stock(tx);if((await tx.query('SELECT 1 FROM inventory_adjustments WHERE reference=$1',[input.reference])).rows.length)throw new ApiError(409,'Inventory reference already recorded.');const id=randomUUID();await tx.query('INSERT INTO inventory_receipts(id,reference,gold_atoms,proof_id,actor_id) VALUES ($1,$2,$3,$4,$5)',[id,input.reference,quantity.toString(),input.proofId,uid(req)]);await tx.query('UPDATE gold_stock SET available=available+$1 WHERE id=1',[quantity.toString()]);await journal(tx,'inventory:'+input.reference,'XAU','inventory.recorded',[['external:documented:gold',-quantity],['platform:gold',quantity]]);await audit(tx,uid(req),'gold.inventory_recorded',id,{grams:input.grams,reference:input.reference,proofId:input.proofId});});res.status(201).json({message:'Documented platform inventory recorded. This is an operator attestation.'});
  });
  router.get('/staff/physical',permission('withdrawals.view'),async(_req,res)=>res.json({requests:(await db.query('SELECT p.*,u.email FROM physical_gold_requests p JOIN users u ON u.id=p.user_id ORDER BY p.created_at DESC LIMIT 100')).rows.map(physicalRecord)}));
  router.post('/staff/physical/:id/review',permission('withdrawals.review'),async(req,res)=>{
    const id=idSchema.parse(req.params.id),input=z.object({status:z.enum(['approved','rejected']),reason:z.string().trim().min(3).max(1000),addressConfirmed:z.boolean().optional(),allocationReference:z.string().trim().min(8).max(200).optional()}).strict().parse(req.body);
    await db.transaction(async tx=>{const row=await lockPhysical(tx,id,uid(req));if(row.status!=='pending')throw new ApiError(409,'Request already reviewed.');if(input.status==='rejected')await releasePhysical(tx,row,uid(req),'rejected',input.reason);else{if(!input.addressConfirmed||!input.allocationReference)throw new ApiError(400,'Confirm the delivery address and record the physical stock allocation reference.');await tx.query("UPDATE physical_gold_requests SET status='approved',reason=$1,reviewer_id=$2,allocation_reference=$4,address_confirmed_at=coalesce(address_confirmed_at,now()),address_confirmed_by=coalesce(address_confirmed_by,$2) WHERE id=$3",[input.reason,uid(req),id,input.allocationReference]);await audit(tx,uid(req),'physical.approved',id,input);}});res.json(input);
  });
  router.post('/staff/physical/:id/dispatch',permission('withdrawals.process'),async(req,res)=>{
    const id=idSchema.parse(req.params.id),input=z.object({tracking:z.string().trim().min(5).max(300),carrier:z.string().trim().min(2).max(100),trackingUrl:z.url().max(600).refine(v=>new URL(v).protocol==='https:','Use an HTTPS tracking URL.').optional(),proofId:idSchema}).strict().parse(req.body);
    await db.transaction(async tx=>{const row=await lockPhysical(tx,id,uid(req));if(row.status!=='approved')throw new ApiError(409,'Approve this physical request before dispatch.');await ownFiles(tx,uid(req),[input.proofId],'physical');await tx.query("UPDATE physical_gold_requests SET status='dispatched',tracking=$1,proof_id=$2,carrier=$4,tracking_url=$5 WHERE id=$3",[input.tracking,input.proofId,id,input.carrier,input.trackingUrl||null]);await audit(tx,uid(req),'physical.dispatched',id,input);});res.json({status:'dispatched'});
  });
  router.post('/staff/physical/:id/deliver',permission('withdrawals.process'),async(req,res)=>{
    const id=idSchema.parse(req.params.id),input=z.object({reference:z.string().trim().min(8).max(300)}).strict().parse(req.body);
    await db.transaction(async tx=>{const row=await lockPhysical(tx,id,uid(req));if(row.status!=='dispatched')throw new ApiError(409,'Only dispatched requests can be marked delivered.');const total=BigInt(row.reserved_atoms),fee=BigInt(row.fee_atoms),delivery=BigInt(row.delivery_atoms);await tx.query('UPDATE gold_accounts SET reserved=reserved-$1 WHERE user_id=$2',[total.toString(),row.user_id]);await tx.query('UPDATE gold_stock SET available=available+$1 WHERE id=1',[fee.toString()]);await journal(tx,'physical:delivered:'+id,'XAU','physical.delivered',[[row.user_id+':gold:reserved',-total],['external:delivered:gold',delivery],['platform:gold:physical_fee',fee]]);await tx.query("UPDATE physical_gold_requests SET status='delivered',delivered_at=now() WHERE id=$1",[id]);await audit(tx,uid(req),'physical.delivered',id,input);});res.json({status:'delivered'});
  });
  return router;
}
function physicalRecord(p:any){return {...p,grams:gram(p.delivery_atoms),fee:gram(p.fee_atoms),total:gram(p.reserved_atoms)};}
async function lockPhysical(tx:Sql,id:string,actor:string){const initial=(await tx.query('SELECT user_id FROM physical_gold_requests WHERE id=$1',[id])).rows[0];if(!initial)throw new ApiError(404,'Physical request not found.');if(initial.user_id===actor)throw new ApiError(403,'Self review or fulfilment is not allowed.');await financialUser(tx,initial.user_id);await stock(tx);await account(tx,initial.user_id);return (await tx.query('SELECT * FROM physical_gold_requests WHERE id=$1 FOR UPDATE',[id])).rows[0];}
async function releasePhysical(tx:Sql,row:any,actor:string,status:string,reason:string){const total=BigInt(row.reserved_atoms);await tx.query('UPDATE gold_accounts SET available=available+$1,reserved=reserved-$1 WHERE user_id=$2',[total.toString(),row.user_id]);await journal(tx,'physical:release:'+row.id,'XAU','physical.release',[[row.user_id+':gold:reserved',-total],[row.user_id+':gold:available',total]]);await tx.query('UPDATE physical_gold_requests SET status=$1,reason=$2,reviewer_id=$3 WHERE id=$4',[status,reason,actor,row.id]);await audit(tx,actor,'physical.'+status,row.id,{reason});}

export async function releaseGoldWithdrawal(tx:Sql,row:any){
  await stock(tx);await account(tx,row.user_id);await treasury(tx,row.asset);
  const gold=BigInt(row.gold_atoms),net=BigInt(row.amount_atoms)-BigInt(row.fee_atoms);
  await tx.query('UPDATE gold_accounts SET available=available+$1,reserved=reserved-$1 WHERE user_id=$2',[gold.toString(),row.user_id]);
  await tx.query('UPDATE treasury_accounts SET available=available+$1,reserved=reserved-$1 WHERE asset=$2',[net.toString(),row.asset]);
  await journal(tx,'gold-withdraw:release:'+row.id,'XAU','gold.withdrawal.release',[[row.user_id+':gold:reserved',-gold],[row.user_id+':gold:available',gold]]);
  await journal(tx,'gold-withdraw:liquidity-release:'+row.id,row.asset,'gold.withdrawal.release',[['treasury:reserved:'+row.asset,-net],['treasury:'+row.asset,net]]);
}
export async function completeGoldWithdrawal(tx:Sql,row:any){
  await stock(tx);await account(tx,row.user_id);await treasury(tx,row.asset);
  const gold=BigInt(row.gold_atoms),fee=BigInt(row.gold_fee_atoms),net=BigInt(row.amount_atoms)-BigInt(row.fee_atoms);
  await tx.query('UPDATE gold_accounts SET reserved=reserved-$1 WHERE user_id=$2',[gold.toString(),row.user_id]);
  await tx.query('UPDATE gold_stock SET available=available+$1 WHERE id=1',[gold.toString()]);
  await tx.query('UPDATE treasury_accounts SET reserved=reserved-$1 WHERE asset=$2',[net.toString(),row.asset]);
  await journal(tx,'gold-withdraw:paid:'+row.id,'XAU','gold.withdrawal.paid',[[row.user_id+':gold:reserved',-gold],['platform:gold',gold-fee],['platform:gold:withdrawal_fee',fee]]);
  await journal(tx,'gold-withdraw:crypto-paid:'+row.id,row.asset,'gold.withdrawal.paid',[['treasury:reserved:'+row.asset,-net],['external:'+row.asset,net]]);
}
export async function settleMatureTrades(db:Sql){
  const due=(await db.query("SELECT id,user_id FROM gold_trades WHERE status='active' AND matures_at<=now() ORDER BY matures_at LIMIT 100")).rows;
  let count=0;for(const item of due){await db.transaction(async tx=>{
    await tx.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[item.user_id]);await stock(tx);await account(tx,item.user_id);
    const t=(await tx.query("SELECT * FROM gold_trades WHERE id=$1 AND status='active' AND matures_at<=now() FOR UPDATE",[item.id])).rows[0];if(!t)return;
    const principal=BigInt(t.principal_atoms),profit=BigInt(t.profit_atoms);
    await tx.query('UPDATE gold_accounts SET locked=locked-$1,available=available+$1+$2 WHERE user_id=$3',[principal.toString(),profit.toString(),t.user_id]);
    await tx.query('UPDATE gold_stock SET reserved=reserved-$1 WHERE id=1',[profit.toString()]);
    await journal(tx,'trade:settled:'+t.id,'XAU','trade.settlement',[[t.user_id+':gold:locked',-principal],['platform:profit:reserved',-profit],[t.user_id+':gold:available',principal+profit]]);
    await tx.query("UPDATE gold_trades SET status='settled',settled_at=now() WHERE id=$1",[t.id]);await audit(tx,t.user_id,'trade.settled',t.id,{principal:gram(principal),profit:gram(profit),automatic:true});count++;
  });}return count;
}
export async function goldDashboard(db:Sql,user:string){
  const b=(await db.query('SELECT * FROM gold_accounts WHERE user_id=$1',[user])).rows[0];
  const trades=(await db.query("SELECT * FROM gold_trades WHERE user_id=$1 AND status='active' ORDER BY starts_at",[user])).rows;
  const orders=(await db.query('SELECT * FROM gold_orders WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',[user])).rows;
  const physical=(await db.query('SELECT * FROM physical_gold_requests WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',[user])).rows;
  const settled=(await db.query("SELECT * FROM gold_trades WHERE user_id=$1 AND status='settled' ORDER BY settled_at DESC LIMIT 100",[user])).rows;
  const pendingPhysical=(await db.query("SELECT count(*)::int n FROM physical_gold_requests WHERE user_id=$1 AND status IN('pending','approved','dispatched')",[user])).rows[0].n;
  const payout=(await db.query("SELECT coalesce(sum(profit_atoms),0) total FROM gold_trades WHERE user_id=$1 AND status='settled'",[user])).rows[0];
  const available=BigInt(b?.available||'0'),locked=BigInt(b?.locked||'0'),reserved=BigInt(b?.reserved||'0');
  const goldTransactions=[...orders.map(o=>({id:o.id,type:o.side==='buy'?'Gold purchase':'Gold sale',asset:'XAU',amount:gram(o.side==='buy'?o.output_atoms:o.input_atoms),direction:o.side==='buy'?'in':'out',method:o.asset+' · platform quote',status:'completed',createdAt:o.created_at})),...settled.map(t=>({id:t.id,type:'Holding profit',asset:'XAU',amount:gram(t.profit_atoms),direction:'in',method:'Five-day settlement',status:'completed',createdAt:t.settled_at})),...physical.map(p=>({id:p.id,type:'Physical gold',asset:'XAU',amount:gram(p.reserved_atoms),direction:'out',method:gram(p.delivery_atoms)+' g delivery + '+gram(p.fee_atoms)+' g fee',status:p.status==='delivered'?'completed':['rejected','cancelled'].includes(p.status)?'failed':p.status==='dispatched'?'approved':p.status,createdAt:p.created_at}))];
  return {pendingPhysical,goldTransactions,goldTotals:{goldTotal:gram(available+locked+reserved),available:gram(available),locked:gram(locked),reserved:gram(reserved),payoutGold:gram(payout.total)},activeTrades:trades.map(t=>({id:t.id,plan:TRADE_PLANS.find(p=>p.id===t.plan)?.name||t.plan,gold:gram(t.principal_atoms),rate:t.rate_bps/100,profit:gram(t.profit_atoms),startsAt:t.starts_at,maturesAt:t.matures_at,isDemo:false}))};
}
