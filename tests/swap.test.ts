import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { connectDatabase,migrate } from '../backend/db.js';
import { createApi } from '../backend/api.js';
test('account swaps use fresh owner-scoped quotes and funded treasury; confirmations are atomic and idempotent',async()=>{
  process.env.LOCAL_DATABASE_PATH=':memory:';const db=await connectDatabase();await migrate(db);
  const services={price:async(asset:string)=>({usdE8:asset==='ETH'?200000000000n:100000000n,receivedAt:new Date().toISOString(),source:'Isolated price fixture'})};
  const server=createApi(db,'http://localhost:4173',services).listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const base=`http://127.0.0.1:${(server.address() as any).port}`;
  const req=async(path:string,body?:object,cookie='')=>{const r=await fetch(base+path,{method:body?'POST':'GET',headers:{Origin:'http://localhost:4173','Content-Type':'application/json',Cookie:cookie},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]||''};};
  const register=(email:string)=>req('/auth/register',{email,password:'swap-fixture-password-123',firstName:'Fixture',lastName:'Only',country:'BD',phone:'+8801712345678'});
  try{
    const user=await register('swap-user@example.test'),other=await register('other-swap@example.test'),uid=user.data.user.id;
    // Initial money and liquidity are isolated fixtures, never inserted into the persistent app database.
    await db.query("INSERT INTO money_accounts(user_id,asset,available) VALUES ($1,'USDT',100000000)",[uid]);
    assert.equal((await req('/swaps/quote',{fromAsset:'USDT',toAsset:'USDT',amount:'1'},user.cookie)).status,400);
    assert.equal((await req('/swaps/quote',{fromAsset:'USD',toAsset:'ETH',amount:'1'},user.cookie)).status,400);
    const quote=await req('/swaps/quote',{fromAsset:'USDT',toAsset:'ETH',amount:'50'},user.cookie);assert.equal(quote.status,201);assert.equal(quote.data.output,'0.025');assert.equal(quote.data.fee,'0');
    const input={quoteId:quote.data.id,idempotencyKey:randomUUID()};
    assert.equal((await req('/swaps/confirm',input,other.cookie)).status,409);
    assert.equal((await req('/swaps/confirm',input,user.cookie)).status,409);
    assert.equal((await db.query("SELECT available FROM money_accounts WHERE user_id=$1 AND asset='USDT'",[uid])).rows[0].available,'100000000');
    await db.query("INSERT INTO treasury_accounts(asset,available) VALUES ('ETH',1000000000000000000) ON CONFLICT(asset) DO UPDATE SET available=EXCLUDED.available");
    const first=await req('/swaps/confirm',input,user.cookie);assert.equal(first.status,201);assert.equal((await req('/swaps/confirm',input,user.cookie)).data.id,first.data.id);
    assert.equal((await req('/swaps/confirm',{...input,idempotencyKey:randomUUID()},user.cookie)).status,409);
    const old=await req('/swaps/quote',{fromAsset:'USDT',toAsset:'ETH',amount:'1'},user.cookie);await db.query("UPDATE swap_quotes SET expires_at=now()-interval '1 second' WHERE id=$1",[old.data.id]);assert.equal((await req('/swaps/confirm',{quoteId:old.data.id,idempotencyKey:randomUUID()},user.cookie)).status,409);
    const tooMuch=await req('/swaps/quote',{fromAsset:'USDT',toAsset:'ETH',amount:'51'},user.cookie);assert.equal((await req('/swaps/confirm',{quoteId:tooMuch.data.id,idempotencyKey:randomUUID()},user.cookie)).status,409);
    const a=await req('/swaps/quote',{fromAsset:'USDT',toAsset:'ETH',amount:'40'},user.cookie),b=await req('/swaps/quote',{fromAsset:'USDT',toAsset:'ETH',amount:'40'},user.cookie);
    const attempts=await Promise.all([req('/swaps/confirm',{quoteId:a.data.id,idempotencyKey:randomUUID()},user.cookie),req('/swaps/confirm',{quoteId:b.data.id,idempotencyKey:randomUUID()},user.cookie)]);assert.deepEqual(attempts.map(r=>r.status).sort(),[201,409]);
    const balances=(await db.query('SELECT * FROM money_accounts WHERE user_id=$1',[uid])).rows;assert.equal(balances.find(b=>b.asset==='USDT')!.available,'10000000');assert.equal(balances.find(b=>b.asset==='ETH')!.available,'45000000000000000');
    const treasury=(await db.query('SELECT * FROM treasury_accounts')).rows;assert.equal(treasury.find(t=>t.asset==='ETH')!.available,'955000000000000000');assert.equal(treasury.find(t=>t.asset==='USDT')!.available,'90000000');
    assert.equal((await db.query('SELECT journal_id FROM money_lines GROUP BY journal_id HAVING sum(amount_atoms)<>0')).rows.length,0);
    const dashboard=(await req('/dashboard',undefined,user.cookie)).data;assert.equal(dashboard.transactions.filter((t:any)=>t.type==='Swap').length,2);
    await db.query('UPDATE users SET is_demo=true WHERE id=$1',[uid]);assert.equal((await req('/swaps/quote',{fromAsset:'USDT',toAsset:'ETH',amount:'1'},user.cookie)).status,403);
  }finally{await new Promise<void>(r=>server.close(()=>r()));await db.close();}
});
