import { createServer } from 'node:net';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { connectDatabase,migrate } from '../backend/db.js';
import { createApi } from '../backend/api.js';
import { hashPassword } from '../backend/security.js';
import { totp } from '../backend/account-security.js';
import { validateDeployment } from '../backend/production.js';

test('production configuration fails closed without disclosing secrets',()=>{
 assert.throws(()=>validateDeployment({NODE_ENV:'production'}),/DATABASE_URL/);
 const env={NODE_ENV:'production',APP_ORIGIN:'https://goldswap.app',DATABASE_URL:'postgresql://localhost/goldswap',UPLOAD_ENCRYPTION_KEY:'a'.repeat(64),JOB_MODE:'external',TRUST_PROXY_HOPS:'1',MAIL_DELIVERY_ENABLED:'true',MAIL_FROM:'GoldSwap <accounts@goldswap.app>',RESEND_API_KEY:'isolated-test-key',CLAMAV_HOST:'127.0.0.1'};
 assert.doesNotThrow(()=>validateDeployment(env));
 assert.throws(()=>validateDeployment({...env,APP_ORIGIN:'https://goldswap.app/'}),/exact HTTPS/);
 assert.throws(()=>validateDeployment({...env,SMTP_HOST:'smtp.example.test'}),/exactly one/);
 assert.throws(()=>validateDeployment({...env,BOOTSTRAP_PASSWORD:'never-echo-me'}),e=>!(e as Error).message.includes('never-echo-me'));
});

test('production staff routes and evidence require session MFA and fresh reauthentication',async()=>{
 process.env.LOCAL_DATABASE_PATH=':memory:';
 const db=await connectDatabase();await migrate(db);
 const before=process.env.NODE_ENV,key=process.env.UPLOAD_ENCRYPTION_KEY;
 const scanner=createServer(socket=>{let input=Buffer.alloc(0);socket.on('data',b=>{input=Buffer.concat([input,typeof b==='string'?Buffer.from(b):b]);if(input.length>=14&&input.subarray(-4).equals(Buffer.alloc(4)))socket.end('stream: OK\0');});});await new Promise<void>(r=>scanner.listen(0,'127.0.0.1',r));process.env.CLAMAV_HOST='127.0.0.1';process.env.CLAMAV_PORT=String((scanner.address() as any).port);
 process.env.NODE_ENV='production';process.env.UPLOAD_ENCRYPTION_KEY='b'.repeat(64);
 const server=createApi(db,'https://goldswap.app').listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const base='http://127.0.0.1:'+(server.address() as any).port;
 const req=async(path:string,cookie='',body?:object,method?:string)=>{const r=await fetch(base+path,{method:method||(body?'POST':'GET'),headers:{Origin:'https://goldswap.app',...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,cookie:r.headers.get('set-cookie')?.split(';')[0]||'',data:await r.json()};};
 try{
  const id=randomUUID(),customer=randomUUID(),password='production-staff-test-123';
  await db.query('INSERT INTO users(id,email,password_hash) VALUES($1,$2,$3)',[id,'owner@production.test',await hashPassword(password)]);await db.query("INSERT INTO user_roles VALUES($1,'super_admin')",[id]);
  await db.query('INSERT INTO users(id,email,password_hash) VALUES($1,$2,$3)',[customer,'customer@production.test',await hashPassword(password)]);await db.query("INSERT INTO user_roles VALUES($1,'user')",[customer]);
  const c=(await req('/auth/login','',{email:'customer@production.test',password})).cookie;
  assert.equal((await req('/dashboard',c)).status,200);
  assert.equal((await req('/security/mfa/setup',c,{password})).status,403);
  const login=await req('/auth/login','',{email:'owner@production.test',password});const cookie=login.cookie;
  assert.match(cookie,/__Host-goldswap_session/);
  for(const path of ['/staff/overview','/admin/roles','/staff/support','/staff/gold','/staff/operations/deposits'])assert.equal((await req(path,cookie)).data.code,'STAFF_MFA_REQUIRED');
  const setup=await req('/security/mfa/setup',cookie,{password});assert.equal(setup.status,200);
  const enabled=await req('/security/mfa/enable',cookie,{code:totp(setup.data.secret)});assert.equal(enabled.status,200);
  assert.equal((await req('/staff/overview',cookie)).status,200);
  assert.equal((await req('/staff/support',cookie)).status,200);
  const upload=await req('/files',c,{name:'proof.pdf',purpose:'kyc',data:Buffer.from('%PDF-1.4\nfixture').toString('base64')});assert.equal(upload.status,201);const file=upload.data.file.id;
  await db.query("INSERT INTO kyc_cases(id,user_id,legal_name,country,document_type,document_ids,status) VALUES($1,$2,'Customer','BD','passport',$3,'pending')",[randomUUID(),customer,JSON.stringify([file])]);
  // The original setup session can review evidence; an unassured staff session cannot.
  const proof=await fetch(base+'/files/'+file,{headers:{Cookie:cookie}});assert.equal(proof.status,200);
  const unverified='unverified-production-session';const {digest}=await import('../backend/security.js');await db.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')",[digest(unverified),id]);
  assert.equal((await req('/files/'+file,'__Host-goldswap_session='+unverified)).status,403);
  await db.query("UPDATE sessions SET reauthenticated_at=now()-interval '6 minutes' WHERE user_id=$1",[id]);
  const roleBody={name:'Reviewer',permissions:['kyc.view']};
  const blocked=await req('/admin/roles/reviewer',cookie,roleBody,'PUT');assert.equal(blocked.data.code,'STAFF_REAUTH_REQUIRED');
  assert.equal((await db.query("SELECT 1 FROM roles WHERE id='reviewer'")).rows.length,0);
  assert.equal((await req('/security/reauth',cookie,{password:'wrong',code:enabled.data.recoveryCodes[0]})).status,401);
  assert.equal((await req('/security/reauth',cookie,{password,code:enabled.data.recoveryCodes[0]})).status,200);
  assert.equal((await req('/admin/roles/reviewer',cookie,roleBody,'PUT')).status,200);
  assert.equal((await req('/security/mfa/disable',cookie,{password,code:enabled.data.recoveryCodes[1]})).status,403);
  assert.equal((await req('/auth/login','',{email:'owner@production.test',password})).status,401);
  const fresh=await req('/auth/login','',{email:'owner@production.test',password,code:enabled.data.recoveryCodes[1]});assert.equal(fresh.status,200);assert.equal((await req('/admin/roles',fresh.cookie)).status,200);
  assert.equal((await req('/admin/roles',c)).status,403);
 }finally{server.close();scanner.close();delete process.env.CLAMAV_HOST;delete process.env.CLAMAV_PORT;await db.close();if(before===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=before;if(key===undefined)delete process.env.UPLOAD_ENCRYPTION_KEY;else process.env.UPLOAD_ENCRYPTION_KEY=key;}
});


test('document screening rejects infected files and fails closed on scanner outage',async()=>{
 const {scanUpload}=await import('../backend/upload-scan.js');
 const saved={NODE_ENV:process.env.NODE_ENV,CLAMAV_HOST:process.env.CLAMAV_HOST,CLAMAV_PORT:process.env.CLAMAV_PORT};
 process.env.NODE_ENV='production';delete process.env.CLAMAV_HOST;
 try{
  await assert.rejects(scanUpload(Buffer.from('fixture')),e=>(e as any).status===503);
  for(const [response,status] of [['stream: Eicar-Test-Signature FOUND\0',400],['stream: scan ERROR\0',503]] as const){
   const scanner=createServer(socket=>{socket.once('data',()=>socket.end(response));});await new Promise<void>(r=>scanner.listen(0,'127.0.0.1',r));
   process.env.CLAMAV_HOST='127.0.0.1';process.env.CLAMAV_PORT=String((scanner.address() as any).port);
   try{await assert.rejects(scanUpload(Buffer.from('isolated fixture')),e=>(e as any).status===status);}finally{await new Promise<void>(r=>scanner.close(()=>r()));}
  }
 }finally{for(const [k,v] of Object.entries(saved)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});
