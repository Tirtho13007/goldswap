import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { connectDatabase,migrate } from '../backend/db.js';
import { createApi } from '../backend/api.js';
import { validateAddress,transactionHash,atoms } from '../backend/crypto.js';
import { CRYPTO_ROUTES } from '../shared/crypto.js';
import { base58 } from '@scure/base';

test('all supplied networks retain canonical asset precision and native address/transaction formats',()=>{
  assert.equal(CRYPTO_ROUTES.length,22);
  assert.equal(CRYPTO_ROUTES.filter(r=>r.asset==='USDT').length,8);
  assert.equal(CRYPTO_ROUTES.filter(r=>r.asset==='USDC').length,6);
  for(const asset of ['USDT','USDC'])assert.ok(CRYPTO_ROUTES.filter(r=>r.asset===asset).every(r=>r.precision===6));
  const evm='0x1111111111111111111111111111111111111111';for(const r of CRYPTO_ROUTES.filter(r=>['bsc','arbitrum','mantle','avalanche','arc'].includes(r.chain)))validateAddress(r.id,evm);
  validateAddress('usdt-ton','UQBVk7xdMrQF5Y-9QpNp80NzrmE6TWOEChhYU5Bc2kGSrD5x');assert.throws(()=>validateAddress('usdt-ton','UQBVk7xdMrQF5Y-9QpNp80NzrmE6TWOEChhYU5Bc2kGSrD5y'));
  validateAddress('usdc-solana','BZXpWM3xbdYdBpZsEF6snJz98ATyyJfXfM5S9CWys1tG');assert.throws(()=>validateAddress('sol-solana','not a wallet'));
  const sig=base58.encode(new Uint8Array(64).fill(42));assert.equal(transactionHash(sig,'solana'),sig);assert.throws(()=>transactionHash('f'.repeat(64),'solana'));
  const tonHash=Buffer.alloc(32,42).toString('base64');assert.equal(transactionHash(tonHash,'ton'),'2a'.repeat(32));
  assert.equal(atoms('1.5',CRYPTO_ROUTES.find(r=>r.id==='usdt-bsc')!.precision),1500000n);
});

test('staff controls are permission scoped; users, access and website settings persist',async t=>{
  process.env.LOCAL_DATABASE_PATH=':memory:';process.env.UPLOAD_ENCRYPTION_KEY='74'.repeat(32);const db=await connectDatabase();await migrate(db);
  const server=createApi(db,'http://localhost:4173',{price:async()=>({usdE8:100000000n,receivedAt:new Date().toISOString(),source:'test fixture'})}).listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${(server.address() as any).port}`;
  const req=async(path:string,body?:object,cookie='',method?:string)=>{const r=await fetch(base+path,{method:method||(body?'POST':'GET'),headers:{Origin:'http://localhost:4173','Content-Type':'application/json',Cookie:cookie},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]||''};};
  const register=(email:string)=>req('/auth/register',{email,password:'staff-control-fixture-123',firstName:'Fixture',lastName:'User',country:'BD',phone:'+8801712345678'});
  try{
    const owner=await register('control-owner@example.test'),user=await register('control-user@example.test'),moderator=await register('control-mod@example.test');
    await db.query("INSERT INTO user_roles VALUES ($1,'super_admin')",[owner.data.user.id]);
    await t.test('staff overview has real counts and customer sessions cannot access controls',async()=>{
      assert.equal((await req('/staff/overview',undefined,user.cookie)).status,403);assert.equal((await req('/staff/trades',undefined,user.cookie)).status,403);assert.equal((await req('/staff/trades',undefined,owner.cookie)).status,200);
      const overview=await req('/staff/overview',undefined,owner.cookie);assert.equal(overview.status,200);assert.equal(overview.data.metrics.users,3);assert.equal(overview.data.metrics.pending_deposits,0);
      assert.equal((await req('/staff/users?search=control-user',undefined,owner.cookie)).data.total,1);
      assert.equal((await req('/staff/website-settings',undefined,user.cookie)).status,403);
      assert.equal((await req('/crypto/validate-address',{routeId:'usdt-bsc',address:'0x1111111111111111111111111111111111111111'},user.cookie)).status,200);assert.equal((await req('/crypto/validate-address',{routeId:'usdt-solana',address:'0x1111111111111111111111111111111111111111'},user.cookie)).status,400);
      const network={address:'0x1111111111111111111111111111111111111111',memo:'',enabled:false,withdrawalEnabled:true,confirmations:12};await req('/staff/crypto/usdt-bsc',network,owner.cookie,'PUT');assert.equal((await req('/staff/crypto/settings',undefined,owner.cookie)).data.methods.find((m:any)=>m.id==='usdt-bsc').address,network.address);assert.equal((await req('/crypto/methods',undefined,user.cookie)).data.methods.find((m:any)=>m.id==='usdt-bsc').address,null);
      await req('/staff/crypto/usdt-solana',{address:'BZXpWM3xbdYdBpZsEF6snJz98ATyyJfXfM5S9CWys1tG',memo:'',enabled:true,withdrawalEnabled:true,confirmations:32},owner.cookie,'PUT');const file=await req('/files',{name:'fixture.pdf',purpose:'deposit',data:Buffer.from('%PDF-1.4 TEST FIXTURE ONLY').toString('base64')},user.cookie);const deposit={routeId:'usdt-solana',amount:'15',txHash:base58.encode(new Uint8Array(64).fill(42)),proofId:file.data.file.id,idempotencyKey:randomUUID()};const submitted=await req('/deposits',deposit,user.cookie);assert.equal(submitted.status,201);assert.equal((await req('/deposits',deposit,user.cookie)).data.id,submitted.data.id);
    });
    await t.test('admin/moderator grants, explicit denies and staff removal apply on the next request',async()=>{
      assert.equal((await req('/admin/roles/moderator',{name:'Moderator',permissions:['users.view','users.restrict','kyc.view','kyc.review']},owner.cookie,'PUT')).status,200);
      assert.equal((await req('/admin/users/'+moderator.data.user.id+'/access',{roles:['moderator'],overrides:[{permission:'users.restrict',allowed:false}]},owner.cookie,'PUT')).status,200);
      assert.equal((await req('/staff/users',undefined,moderator.cookie)).status,200);
      assert.equal((await req('/staff/users/'+user.data.user.id+'/status',{status:'restricted',reason:'Denied fixture'},moderator.cookie,'PATCH')).status,403);
      const limited=(await req('/staff/overview',undefined,moderator.cookie)).data;assert.equal(limited.metrics.pending_kyc,0);assert.equal(limited.metrics.pending_deposits,undefined);
      assert.equal((await req('/admin/users/'+moderator.data.user.id+'/access',{roles:['user'],overrides:[]},owner.cookie,'PUT')).status,200);
      assert.equal((await req('/staff/users',undefined,moderator.cookie)).status,403);
    });
    await t.test('blocking and removing revoke sessions while preserving financial identity; owner is protected',async()=>{
      const id=user.data.user.id;
      assert.equal((await req('/staff/users/'+owner.data.user.id+'/status',{status:'restricted',reason:'Self block fixture'},owner.cookie,'PATCH')).status,403);
      assert.equal((await req('/staff/users/'+id+'/status',{status:'restricted',reason:'Fixture block'},owner.cookie,'PATCH')).status,200);
      assert.equal((await req('/me',undefined,user.cookie)).status,401);
      assert.equal((await req('/auth/login',{email:'control-user@example.test',password:'staff-control-fixture-123'})).status,401);
      assert.equal((await req('/staff/users/'+id+'/status',{status:'active',reason:'Fixture unblock'},owner.cookie,'PATCH')).status,200);
      assert.equal((await req('/staff/users/'+id,{reason:'Fixture removal'},owner.cookie,'DELETE')).status,200);
      assert.equal((await req('/staff/users?search=control-user',undefined,owner.cookie)).data.total,0);
      assert.equal((await req('/staff/users?removed=true&search=control-user',undefined,owner.cookie)).data.total,1);
      assert.equal((await db.query('SELECT id FROM users WHERE id=$1',[id])).rows.length,1);
      assert.equal((await req('/admin/users/'+id+'/restore',{},owner.cookie)).status,200);
      assert.equal((await req('/auth/login',{email:'control-user@example.test',password:'staff-control-fixture-123'})).status,200);
    });
    await t.test('request filtering and CSV exports enforce scope and neutralise spreadsheet formulas',async()=>{
      const pending=await req('/staff/operations/deposits?status=pending&search=control-user',undefined,owner.cookie);assert.equal(pending.status,200);assert.equal(pending.data.total,1);assert.equal(pending.data.requests.length,1);
      assert.equal((await req('/staff/operations/deposits?status=approved',undefined,owner.cookie)).data.total,0);
      await db.query('UPDATE users SET first_name=$1 WHERE id=$2',['=1+1',user.data.user.id]);
      const exportUser=await req('/auth/login',{email:'control-user@example.test',password:'staff-control-fixture-123'});const forbidden=await fetch(base+'/staff/export/users',{headers:{Cookie:exportUser.cookie}});assert.equal(forbidden.status,403);
      const exported=await fetch(base+'/staff/export/users',{headers:{Cookie:owner.cookie}});assert.equal(exported.status,200);assert.ok(exported.headers.get('content-type')?.includes('text/csv'));assert.ok((await exported.text()).includes("'=1+1"));
      await req('/admin/roles/export_only',{name:'Export only',permissions:['reports.export']},owner.cookie,'PUT');await req('/admin/users/'+moderator.data.user.id+'/access',{roles:['export_only'],overrides:[]},owner.cookie,'PUT');
      const noView=await fetch(base+'/staff/export/deposits',{headers:{Cookie:moderator.cookie}});assert.equal(noView.status,403);
    });
    await t.test('new staff gets a one-time private setup link and assigned role; privilege elevation is rejected',async()=>{
      const r=await req('/admin/staff',{name:'New Admin',email:'new-admin@example.test',roles:['admin']},owner.cookie);assert.equal(r.status,201);assert.match(r.data.setupUrl,/#account\/reset\?token=/);
      assert.equal((await req('/admin/staff',{name:'Bad Owner',email:'bad-owner@example.test',roles:['super_admin']},owner.cookie)).status,403);
      const token=r.data.setupUrl.split('token=')[1];assert.equal((await req('/auth/reset',{token,password:'new-admin-fixture-123'})).status,200);assert.equal((await req('/auth/reset',{token,password:'new-admin-fixture-123'})).status,400);
      const login=await req('/auth/login',{email:'new-admin@example.test',password:'new-admin-fixture-123'});assert.equal(login.status,200);assert.ok((await req('/me',undefined,login.cookie)).data.access.roles.includes('admin'));
    });
    await t.test('website controls update public content and enforce registration/maintenance switches',async()=>{
      const settings={platformName:'Fixture Gold',supportEmail:'support@example.test',announcement:'Fixture notice',heroTitle:'Fixture title',heroAccent:'Fixture accent',heroDescription:'Fixture description',registrationEnabled:false,maintenanceMode:true};
      assert.equal((await req('/staff/website-settings',settings,owner.cookie,'PUT')).status,200);
      assert.deepEqual((await req('/site-settings')).data.settings,settings);
      assert.equal((await register('closed-registration@example.test')).status,503);
      const login=await req('/auth/login',{email:'control-user@example.test',password:'staff-control-fixture-123'});
      assert.equal((await req('/gold/quote',{side:'buy',asset:'USDT',amount:'20'},login.cookie)).status,503);
      const events=(await req('/staff/audit',undefined,owner.cookie)).data.events;assert.ok(events.some((e:any)=>e.action==='website.settings_updated'));assert.ok(events.some((e:any)=>e.action==='user.removed'));
    });
  }finally{delete process.env.UPLOAD_ENCRYPTION_KEY;await new Promise<void>(r=>server.close(()=>r()));await db.close();}
});
