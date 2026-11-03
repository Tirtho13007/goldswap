import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { connectDatabase,migrate } from '../backend/db.js';
import { createApi } from '../backend/api.js';
import { atoms,decimal,validateAddress } from '../backend/crypto.js';

test('exact crypto units and network address validation',()=>{
  assert.equal(decimal(atoms('1.000000000000000001',18),18),'1.000000000000000001');
  assert.throws(()=>atoms('0.0000001',6));assert.throws(()=>atoms('-1',8));assert.throws(()=>atoms('1e8',8));
  validateAddress('btc-bitcoin','1BoatSLRHtKNngkdXEeobR76b53LETtpyT');
  assert.throws(()=>validateAddress('btc-bitcoin','1BoatSLRHtKNngkdXEeobR76b53LETtpyU'));
  validateAddress('xrp-ledger','rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh','123');
  assert.throws(()=>validateAddress('xrp-ledger','rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',''));
  assert.throws(()=>validateAddress('paypal','anything'));
});

test('manual operations preserve access rules, idempotency and balanced money journals',async t=>{
  process.env.LOCAL_DATABASE_PATH=':memory:';process.env.UPLOAD_ENCRYPTION_KEY='42'.repeat(32);
  const db=await connectDatabase();await migrate(db);
  const server=createApi(db,'http://localhost:4173',{price:async()=>({usdE8:300000000000n,receivedAt:new Date().toISOString(),source:'Isolated test fixture'})}).listen(0,'127.0.0.1');
  await new Promise<void>(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${(server.address() as any).port}`;
  const request=async(path:string,body?:object,cookie='',method?:string)=>{
    const response=await fetch(base+path,{method:method||(body?'POST':'GET'),headers:{Origin:'http://localhost:4173','Content-Type':'application/json',Cookie:cookie},body:body?JSON.stringify(body):undefined});
    const data=response.headers.get('content-type')?.includes('application/json')?await response.json():await response.arrayBuffer();
    return {status:response.status,data,cookie:response.headers.get('set-cookie')?.split(';')[0]||''};
  };
  const register=async(email:string)=>request('/auth/register',{email,password:'operations-password-123',firstName:'Fixture',lastName:'Account',country:'BD',phone:'+8801712345678'});
  const fixtureAddress='0x1111111111111111111111111111111111111111';
  const fixtureRecipient='0x2222222222222222222222222222222222222222';
  const proof=async(cookie:string,purpose:string)=>request('/files',{name:'fixture.pdf',purpose,data:Buffer.from('%PDF-1.4\nTEST FIXTURE ONLY').toString('base64')},cookie);
  try{
    const user=await register('funds@example.test'),other=await register('other@example.test'),staff=await register('reviewer@example.test');
    assert.equal(user.status,201);await db.query("INSERT INTO user_roles VALUES ($1,'super_admin')",[staff.data.user.id]);
    let kycId='',depositId='',proofId='';
    await t.test('documents are encrypted and inaccessible to other users; KYC approval needs permission',async()=>{
      const file=await proof(user.cookie,'kyc');assert.equal(file.status,201);proofId=file.data.file.id;
      assert.ok(!Buffer.from((await db.query('SELECT encrypted FROM private_files WHERE id=$1',[proofId])).rows[0].encrypted).includes(Buffer.from('%PDF-')));
      assert.equal((await request('/files/'+proofId,undefined,other.cookie)).status,403);
      const submitted=await request('/kyc',{legalName:'Fixture Account',country:'BD',documentType:'passport',documentIds:[proofId]},user.cookie);assert.equal(submitted.status,201);kycId=submitted.data.id;
      assert.equal((await request('/staff/kyc/'+kycId+'/review',{status:'approved',reason:'Verified fixture'},other.cookie)).status,403);
      assert.equal((await request('/staff/kyc/'+kycId+'/review',{status:'approved',reason:'Verified fixture'},staff.cookie)).status,200);
      assert.equal((await request('/me',{firstName:'Changed'},user.cookie,'PATCH')).status,409);
      assert.equal((await request('/me',{theme:'light'},user.cookie,'PATCH')).status,200);
      assert.equal((await request('/dashboard',undefined,user.cookie)).status,200); // Email still unverified.
    });
    await t.test('only configured crypto can be deposited; pending proofs never credit balances',async()=>{
      const methods=(await request('/crypto/methods',undefined,user.cookie)).data.methods;
      assert.deepEqual([...new Set(methods.map((m:any)=>m.asset))],['BTC','ETH','USDC','USDT','XRP','TRX','BNB','SOL']);
      assert.ok(methods.every((m:any)=>!m.depositEnabled));
      assert.equal((await request('/gold/quote',{asset:'PayPal',amount:'1'},user.cookie)).status,400);
      const file=await proof(user.cookie,'deposit');proofId=file.data.file.id;
      const input={routeId:'eth-ethereum',amount:'10',txHash:'a'.repeat(64),proofId,idempotencyKey:randomUUID()};
      assert.equal((await request('/deposits',input,user.cookie)).status,503);
      assert.equal((await request('/staff/crypto/eth-ethereum',{address:fixtureAddress,memo:'',enabled:true,withdrawalEnabled:true,confirmations:6,minimum:'0.1',fee:'0.1'},staff.cookie,'PUT')).status,200);
      const submitted=await request('/deposits',input,user.cookie);assert.equal(submitted.status,201);depositId=submitted.data.id;
      assert.equal((await request('/deposits',input,user.cookie)).data.id,depositId);
      assert.equal((await request('/deposits',{...input,idempotencyKey:randomUUID()},user.cookie)).status,409);
      assert.equal((await db.query('SELECT * FROM money_accounts')).rows.length,0);
      const verification={reference:'Fixture receipt verification',confirmations:6,receivedAddress:fixtureAddress,memo:'',transferIndex:0};
      assert.equal((await request('/staff/deposits/'+depositId+'/review',{status:'approved',reason:'Fixture verified',confirmedAmount:'9',verification},staff.cookie)).status,400);
      const decision={status:'approved',reason:'Fixture verified',confirmedAmount:'10',verification};
      assert.equal((await request('/staff/deposits/'+depositId+'/review',decision,staff.cookie)).status,200);
      assert.equal((await request('/staff/deposits/'+depositId+'/review',decision,staff.cookie)).status,409);
      assert.equal((await db.query('SELECT available FROM money_accounts WHERE user_id=$1',[user.data.user.id])).rows[0].available,'10000000000000000000');
    });
    const withdrawal=(amount:string,key=randomUUID())=>({routeId:'eth-ethereum',amount,address:fixtureRecipient,memo:'',idempotencyKey:key});
    await t.test('withdrawal reservation prevents overspending; cancel/reject release once',async()=>{
      assert.equal((await request('/withdrawals',withdrawal('1'),other.cookie)).status,403);
      const input=withdrawal('7');const attempts=await Promise.all([request('/withdrawals',input,user.cookie),request('/withdrawals',withdrawal('7'),user.cookie)]);assert.deepEqual(attempts.map(r=>r.status).sort(),[201,409]);const first=attempts.find(r=>r.status===201)!;
      assert.equal((await request('/withdrawals',input,user.cookie)).data.id,first.data.id);
      assert.equal((await request('/withdrawals',withdrawal('7'),user.cookie)).status,409);
      assert.equal((await request('/withdrawals/'+first.data.id+'/cancel',{},user.cookie)).status,200);
      assert.equal((await request('/withdrawals/'+first.data.id+'/cancel',{},user.cookie)).status,200);
      const rejected=await request('/withdrawals',withdrawal('2'),user.cookie);
      assert.equal((await request('/staff/withdrawals/'+rejected.data.id+'/review',{status:'rejected',reason:'Fixture rejected'},staff.cookie)).status,200);
      assert.equal((await db.query('SELECT available,reserved FROM money_accounts WHERE user_id=$1',[user.data.user.id])).rows[0].reserved,'0');
    });
    await t.test('payout completion needs approval, proof, exact recipient and confirmed net payment',async()=>{
      const payout=await request('/withdrawals',withdrawal('2'),user.cookie),id=payout.data.id;
      assert.equal((await request('/staff/withdrawals/'+id+'/process',{},staff.cookie)).status,409);
      assert.equal((await request('/staff/withdrawals/'+id+'/review',{status:'approved',reason:'Fixture approved'},staff.cookie)).status,200);
      assert.equal((await request('/withdrawals/'+id+'/cancel',{},user.cookie)).status,409);
      assert.equal((await request('/staff/withdrawals/'+id+'/process',{},staff.cookie)).status,200);
      const file=await proof(staff.cookie,'payout');
      const completed={txHash:'b'.repeat(64),proofId:file.data.file.id,confirmedNetAmount:'1.97',verification:{reference:'Fixture payout verification',confirmations:6,receivedAddress:fixtureRecipient,memo:'',transferIndex:0}};
      assert.equal((await request('/staff/withdrawals/'+id+'/complete',{...completed,confirmedNetAmount:'2'},staff.cookie)).status,400);
      assert.equal((await request('/staff/withdrawals/'+id+'/complete',completed,staff.cookie)).status,200);
      assert.equal((await request('/staff/withdrawals/'+id+'/complete',completed,staff.cookie)).status,409);
      assert.equal((await request('/files/'+file.data.file.id,undefined,user.cookie)).status,200);
      assert.equal((await request('/files/'+file.data.file.id,undefined,other.cookie)).status,403);
      const balance=(await db.query('SELECT * FROM money_accounts WHERE user_id=$1',[user.data.user.id])).rows[0];assert.equal(balance.available,'8000000000000000000');assert.equal(balance.reserved,'0');
      const unbalanced=await db.query('SELECT journal_id FROM money_lines GROUP BY journal_id HAVING sum(amount_atoms)<>0');assert.equal(unbalanced.rows.length,0);
      await db.query('UPDATE users SET is_demo=true WHERE id=$1',[user.data.user.id]);
      assert.equal((await request('/withdrawals',withdrawal('1'),user.cookie)).status,403);
      process.env.NODE_ENV='production';assert.equal((await request('/staff/operations/deposits',undefined,staff.cookie)).status,403);delete process.env.NODE_ENV;
    });
  }finally{delete process.env.NODE_ENV;delete process.env.UPLOAD_ENCRYPTION_KEY;await new Promise<void>(r=>server.close(()=>r()));await db.close();}
});
