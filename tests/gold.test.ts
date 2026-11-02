import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { connectDatabase,migrate } from '../backend/db.js';
import { createApi } from '../backend/api.js';
import { settleMatureTrades } from '../backend/gold.js';

test('platform gold orders, reserved five-day profit, gold payouts and physical delivery',async t=>{
  process.env.LOCAL_DATABASE_PATH=':memory:';process.env.UPLOAD_ENCRYPTION_KEY='63'.repeat(32);
  const db=await connectDatabase();await migrate(db);await migrate(db);
  const services={price:async(asset:string)=>({usdE8:asset==='XAU'?311034768000n:asset==='ETH'?300000000000n:100000000n,receivedAt:new Date().toISOString(),source:'Isolated test fixture'})};
  const server=createApi(db,'http://localhost:4173',services).listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${(server.address() as any).port}`;
  const req=async(path:string,body?:object,cookie='',method?:string)=>{
    const r=await fetch(base+path,{method:method||(body?'POST':'GET'),headers:{Origin:'http://localhost:4173','Content-Type':'application/json',Cookie:cookie},body:body?JSON.stringify(body):undefined});
    return {status:r.status,data:r.headers.get('content-type')?.includes('application/json')?await r.json():await r.text(),cookie:r.headers.get('set-cookie')?.split(';')[0]||''};
  };
  const register=(email:string)=>req('/auth/register',{email,password:'gold-fixture-password-123',firstName:'Fixture',lastName:'User',country:'BD',phone:'+8801712345678'});
  const proof=async(cookie:string,purpose:string)=>(await req('/files',{name:'fixture.pdf',purpose,data:Buffer.from('%PDF-1.4\nISOLATED TEST ONLY').toString('base64')},cookie)).data.file.id;
  const address='0x1111111111111111111111111111111111111111';
  const recipient='0x2222222222222222222222222222222222222222';
  try{
    const user=await register('gold-user@example.test'),staff=await register('gold-owner@example.test');
    await db.query("INSERT INTO user_roles VALUES ($1,'super_admin')",[staff.data.user.id]);
    const userId=user.data.user.id;
    const depositProof=await proof(user.cookie,'deposit');
    await req('/staff/crypto/usdt-ethereum',{address,memo:'',enabled:true,withdrawalEnabled:true,confirmations:6},staff.cookie,'PUT');
    await req('/staff/crypto/eth-ethereum',{address,memo:'',enabled:true,withdrawalEnabled:true,confirmations:6},staff.cookie,'PUT');
    const kyc=await req('/kyc',{legalName:'Fixture User',country:'BD',documentType:'birth_certificate',documentIds:[await proof(user.cookie,'kyc')]},user.cookie);
    assert.equal(kyc.status,201);await req('/staff/kyc/'+kyc.data.id+'/review',{status:'approved',reason:'Fixture documents reviewed'},staff.cookie);
    await t.test('USD minimums, crypto QR, free deposits and exact percentage withdrawal fee',async()=>{
      const small=await req('/deposits',{routeId:'eth-ethereum',amount:'0.004999',txHash:'c'.repeat(64),proofId:depositProof,idempotencyKey:randomUUID()},user.cookie);assert.equal(small.status,400);
      assert.equal((await req('/deposits',{routeId:'eth-ethereum',amount:'0.005',txHash:'d'.repeat(64),proofId:depositProof,idempotencyKey:randomUUID()},user.cookie)).status,201);
      assert.equal((await req('/withdrawals',{routeId:'eth-ethereum',amount:'0.006',address:recipient,idempotencyKey:randomUUID()},user.cookie)).status,400);
      const svg=await req('/crypto/methods/usdt-ethereum/qr',undefined,user.cookie);assert.equal(svg.status,200);assert.match(svg.data,/<svg/);
      assert.equal((await req('/kyc',{legalName:'Fixture',country:'BD',documentType:'driving_license',documentIds:[depositProof]},user.cookie)).status,400);
      const deposit=await req('/deposits',{routeId:'usdt-ethereum',amount:'100000',txHash:'e'.repeat(64),proofId:depositProof,idempotencyKey:randomUUID()},user.cookie);
      assert.equal(deposit.status,201);
      assert.equal((await req('/staff/deposits/'+deposit.data.id+'/review',{status:'approved',reason:'Fixture receipt verified',confirmedAmount:'100000',verification:{reference:'Isolated deposit evidence',confirmations:6,receivedAddress:address,memo:'',transferIndex:0}},staff.cookie)).status,200);
      assert.equal((await db.query('SELECT available FROM money_accounts WHERE user_id=$1 AND asset=$2',[userId,'USDT'])).rows[0].available,'100000000000');
    });
    await t.test('a buy cannot mint gold; inventory evidence, quote expiry and order idempotency are enforced',async()=>{
      assert.equal((await req('/files',{name:'test.pdf',purpose:'inventory',data:Buffer.from('%PDF-test').toString('base64')},user.cookie)).status,403);
      const q=await req('/gold/quote',{asset:'USDT',amount:'100000',side:'buy'},user.cookie);assert.equal(q.status,201);assert.equal(q.data.output,'1000');
      const input={quoteId:q.data.id,idempotencyKey:randomUUID()};assert.equal((await req('/gold/orders',input,user.cookie)).status,409);
      const evidence=await proof(staff.cookie,'inventory');const stock={grams:'2000',reference:'TEST-INVENTORY-0001',proofId:evidence};
      assert.equal((await req('/staff/gold/inventory',stock,staff.cookie)).status,201);assert.equal((await req('/staff/gold/inventory',stock,staff.cookie)).status,409);
      assert.equal((await req('/gold/orders',input,user.cookie)).status,201);assert.equal((await req('/gold/orders',input,user.cookie)).status,201);
      assert.equal((await req('/gold/orders',{...input,idempotencyKey:randomUUID()},user.cookie)).status,409);
      const expired=await req('/gold/quote',{asset:'USDT',amount:'10',side:'sell'},user.cookie);await db.query("UPDATE gold_quotes SET expires_at=now()-interval '1 second' WHERE id=$1",[expired.data.id]);assert.equal((await req('/gold/orders',{quoteId:expired.data.id,idempotencyKey:randomUUID()},user.cookie)).status,409);
      const g=(await req('/gold/account',undefined,user.cookie)).data;assert.equal(g.balance.available,'1000');
      assert.equal((await db.query('SELECT available FROM gold_stock WHERE id=1')).rows[0].available,'1000000000');
    });
    await t.test('five-day maturity credits principal plus pre-reserved profit exactly once across concurrent workers',async()=>{
      assert.equal((await req('/staff/gold/settings',{tradesEnabled:true,ratesConfirmed:true,physicalFeeBasis:'additional_gold'},staff.cookie,'PUT')).status,200);
      const input={amount:'100',plan:'diamond',acceptTerms:true,idempotencyKey:randomUUID()};
      const started=await req('/gold/trades',input,user.cookie);assert.equal(started.status,201);assert.equal((await req('/gold/trades',input,user.cookie)).data.id,started.data.id);
      assert.equal((await req('/gold/trades',{amount:'8',plan:'silver',acceptTerms:true,idempotencyKey:randomUUID()},user.cookie)).status,400);
      assert.equal((await db.query('SELECT reserved FROM gold_stock WHERE id=1')).rows[0].reserved,'10000000');
      const trade=(await db.query('SELECT * FROM gold_trades WHERE id=$1',[started.data.id])).rows[0];assert.equal(new Date(trade.matures_at).getTime()-new Date(trade.starts_at).getTime(),5*86400000);
      assert.equal(await settleMatureTrades(db),0);
      await db.query("UPDATE gold_trades SET matures_at=now()-interval '1 second' WHERE id=$1",[started.data.id]);
      const counts=await Promise.all([settleMatureTrades(db),settleMatureTrades(db)]);assert.equal(counts.reduce((a,b)=>a+b,0),1);assert.equal(await settleMatureTrades(db),0);
      const g=(await req('/gold/account',undefined,user.cookie)).data;assert.equal(g.balance.available,'1010');assert.equal(g.balance.locked,'0');assert.equal(g.trades[0].status,'settled');
      assert.equal((await req('/dashboard',undefined,user.cookie)).data.totals.payoutGold,'10');
    });
    await t.test('physical 500g reserves 510g; rejection/cancellation release once and delivery consumes the correct amounts',async()=>{
      const physical=(amount:string)=>({kind:'order',amount,confirmDeliveryAddress:true,idempotencyKey:randomUUID(),recipient:{name:'Fixture Recipient',phone:'+8801712345678',address:'Isolated test address only',country:'BD'}});
      assert.equal((await req('/gold/physical',physical('499'),user.cookie)).status,400);
      // Additional balance is an isolated test fixture, never production inventory.
      await db.query('UPDATE gold_accounts SET available=available+1000000000 WHERE user_id=$1',[userId]);
      const kilo=await req('/gold/physical',physical('1000'),user.cookie);assert.equal(kilo.status,201);const kiloRow=(await db.query('SELECT * FROM physical_gold_requests WHERE id=$1',[kilo.data.id])).rows[0];assert.equal(kiloRow.fee_atoms,'20000000');assert.equal(kiloRow.reserved_atoms,'1020000000');await req('/gold/physical/'+kilo.data.id+'/cancel',{},user.cookie);await db.query('UPDATE gold_accounts SET available=available-1000000000 WHERE user_id=$1',[userId]);
      const input=physical('500'),first=await req('/gold/physical',input,user.cookie);assert.equal(first.status,201);assert.equal((await req('/gold/physical',input,user.cookie)).data.id,first.data.id);
      let g=(await req('/gold/account',undefined,user.cookie)).data;assert.equal(g.balance.available,'500');assert.equal(g.balance.reserved,'510');assert.equal(g.physical[0].grams,'500');assert.equal(g.physical[0].fee,'10');
      assert.equal((await req('/gold/physical/'+first.data.id+'/cancel',{},user.cookie)).status,200);assert.equal((await req('/gold/physical/'+first.data.id+'/cancel',{},user.cookie)).status,200);
      const rejected=await req('/gold/physical',physical('500'),user.cookie);assert.equal((await req('/staff/physical/'+rejected.data.id+'/review',{status:'rejected',reason:'Fixture rejected'},staff.cookie)).status,200);
      const sent=await req('/gold/physical',physical('500'),user.cookie),id=sent.data.id;
      assert.equal((await req('/staff/physical/'+id+'/dispatch',{tracking:'TEST-TRACKING',carrier:'Fixture carrier',proofId:depositProof},staff.cookie)).status,409);
      assert.equal((await req('/staff/physical/'+id+'/review',{status:'approved',reason:'Fixture approved',addressConfirmed:true,allocationReference:'Fixture stock allocation'},staff.cookie)).status,200);
      const dispatchProof=await proof(staff.cookie,'physical');assert.equal((await req('/staff/physical/'+id+'/dispatch',{tracking:'TEST-TRACKING-ONLY',carrier:'Fixture carrier',proofId:dispatchProof},staff.cookie)).status,200);
      assert.equal((await req('/gold/physical/'+id+'/cancel',{},user.cookie)).status,409);
      assert.equal((await req('/staff/physical/'+id+'/deliver',{reference:'Isolated actual-delivery fixture'},staff.cookie)).status,200);assert.equal((await req('/staff/physical/'+id+'/deliver',{reference:'Isolated duplicate fixture'},staff.cookie)).status,409);assert.equal((await req('/gold/physical/'+id+'/acknowledge',{received:true},user.cookie)).status,200);assert.equal((await req('/gold/physical/'+id+'/acknowledge',{received:true},user.cookie)).status,200);
      g=(await req('/gold/account',undefined,user.cookie)).data;assert.equal(g.balance.available,'500');assert.equal(g.balance.reserved,'0');
      assert.equal((await req('/files/'+dispatchProof,undefined,user.cookie)).status,200);
    });
    await t.test('gold withdrawal deducts 1.5% from gold and reserves funded crypto, with exact release and payout',async()=>{
      const quote=async()=>req('/gold/quote',{side:'withdraw',asset:'USDT',routeId:'usdt-ethereum',amount:'100'},user.cookie);
      const q=await quote();assert.equal(q.status,201);assert.equal(q.data.goldFee,'1.5');assert.equal(q.data.output,'9850');
      const input={quoteId:q.data.id,address:recipient,memo:'',idempotencyKey:randomUUID()};const w=await req('/gold/withdrawals',input,user.cookie);assert.equal(w.status,201);assert.equal((await req('/gold/withdrawals',input,user.cookie)).data.id,w.data.id);
      assert.equal((await req('/withdrawals/'+w.data.id+'/cancel',{},user.cookie)).status,200);assert.equal((await req('/withdrawals/'+w.data.id+'/cancel',{},user.cookie)).status,200);
      const q2=await quote(),w2=await req('/gold/withdrawals',{...input,quoteId:q2.data.id,idempotencyKey:randomUUID()},user.cookie),id=w2.data.id;
      assert.equal((await req('/staff/withdrawals/'+id+'/review',{status:'approved',reason:'Fixture approved'},staff.cookie)).status,200);assert.equal((await req('/staff/withdrawals/'+id+'/process',{},staff.cookie)).status,200);
      const complete={txHash:'f'.repeat(64),proofId:await proof(staff.cookie,'payout'),confirmedNetAmount:'9850',verification:{reference:'Isolated payout verification',confirmations:6,receivedAddress:recipient,memo:'',transferIndex:0}};
      assert.equal((await req('/staff/withdrawals/'+id+'/complete',complete,staff.cookie)).status,200);assert.equal((await req('/staff/withdrawals/'+id+'/complete',complete,staff.cookie)).status,409);
      const csv=await fetch(base+'/staff/export/withdrawals',{headers:{Cookie:staff.cookie}});assert.equal(csv.status,200);const csvText=await csv.text();assert.ok(csvText.includes('crypto_net_payout'));assert.ok(csvText.includes('9850'));
      const g=(await req('/gold/account',undefined,user.cookie)).data;assert.equal(g.balance.available,'400');assert.equal(g.balance.reserved,'0');
      const quoteSell=await req('/gold/quote',{asset:'USDT',amount:'10',side:'sell'},user.cookie);assert.equal((await req('/gold/orders',{quoteId:quoteSell.data.id,idempotencyKey:randomUUID()},user.cookie)).status,201);
      assert.equal((await req('/gold/account',undefined,user.cookie)).data.balance.available,'390');
      assert.equal((await db.query('SELECT journal_id FROM money_lines GROUP BY journal_id HAVING sum(amount_atoms)<>0')).rows.length,0);
      assert.equal((await db.query('SELECT available FROM money_accounts WHERE user_id=$1 AND asset=$2',[userId,'USDT'])).rows[0].available,'1000000000');
    });
  }finally{delete process.env.UPLOAD_ENCRYPTION_KEY;await new Promise<void>(r=>server.close(()=>r()));await db.close();}
});
