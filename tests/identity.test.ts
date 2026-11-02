import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { connectDatabase, migrate } from '../backend/db.js';
import { createApi } from '../backend/api.js';
import { hashPassword } from '../backend/security.js';

test('identity, recovery, permissions and audit integration',async t=>{
  process.env.LOCAL_DATABASE_PATH=':memory:';
  const db=await connectDatabase();await migrate(db);await migrate(db);
  const app=createApi(db,'http://localhost:4173');
  const server=app.listen(0,'127.0.0.1');
  await new Promise<void>(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${(server.address() as any).port}`;
  const request=async(path:string,body?:object,cookie='',method?:string,origin='http://localhost:4173')=>{
    const response=await fetch(base+path,{method:method||(body?'POST':'GET'),headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});
    return {status:response.status,cookie:response.headers.get('set-cookie')?.split(';')[0]||'',data:response.status===204?null:await response.json()};
  };
  try{
    const registration={email:'person@example.test',password:'correct-password-123',firstName:'Test',lastName:'User',country:'BD',phone:'+8801712345678'};
    let userCookie='',userId='';
    await t.test('registration persists profile, hashes credentials and rejects foreign origin',async()=>{
      assert.equal((await request('/auth/register',registration,'',undefined,'https://wrong.example')).status,403);
      const result=await request('/auth/register',registration);assert.equal(result.status,201);userCookie=result.cookie;userId=result.data.user.id;
      assert.equal(result.data.user.country,'BD');assert.equal(result.data.user.password_hash,undefined);
      const stored=(await db.query('SELECT * FROM users WHERE id=$1',[userId])).rows[0];assert.notEqual(stored.password_hash,registration.password);
      assert.equal((await request('/auth/register',registration)).status,409);
      assert.equal((await request('/auth/login',{email:registration.email,password:'wrong'})).status,401);
      assert.equal((await request('/me',undefined,userCookie)).status,200);
      assert.equal(result.data.user.emailVerified,false);
      assert.equal((await request('/dashboard',undefined,userCookie)).status,200);
      const login=await request('/auth/login',{email:registration.email,password:registration.password});
      assert.equal(login.status,200);
      assert.equal(login.data.user.emailVerified,false);
      assert.equal((await request('/dashboard',undefined,login.cookie)).status,200);
    });
    await t.test('email verification is one-use and invalid input rolls back',async()=>{
      const mail=(await db.query("SELECT body FROM email_outbox WHERE recipient=$1 AND subject='Verify your GoldSwap email'",[registration.email])).rows[0];
      const token=mail.body.split('token=')[1];
      assert.equal((await request('/auth/verify',{token})).status,200);
      assert.equal((await request('/auth/verify',{token})).status,400);
      assert.equal((await request('/me',undefined,userCookie)).data.user.emailVerified,true);
    });
    await t.test('profile updates are scoped, validated and do not accept privilege fields',async()=>{
      assert.equal((await request('/me',{theme:'light',address:{line1:'Road 1',city:'Dhaka'}},userCookie,'PATCH')).status,200);
      assert.equal((await request('/me',{roles:['super_admin']},userCookie,'PATCH')).status,400);
      assert.equal((await request('/me',undefined,userCookie)).data.user.theme,'light');
      assert.equal((await request('/staff/users',undefined,userCookie)).status,403);
      assert.equal((await request('/admin/roles',undefined,userCookie)).status,403);
      assert.equal((await request('/dashboard',undefined,userCookie)).data.financialServicesEnabled,true);
    });
    const ownerId=randomUUID();
    await db.query('INSERT INTO users(id,email,password_hash) VALUES ($1,$2,$3)',[ownerId,'owner@example.test',await hashPassword('owner-password-123')]);
    await db.query("INSERT INTO user_roles VALUES ($1,'super_admin')",[ownerId]);
    const ownerCookie=(await request('/auth/login',{email:'owner@example.test',password:'owner-password-123'})).cookie;
    await t.test('Super Admin assigns roles, explicit deny wins and revocation is immediate',async()=>{
      assert.equal((await request('/admin/roles/reviewer',{name:'Reviewer',permissions:['users.view','kyc.review']},ownerCookie,'PUT')).status,200);
      assert.equal((await request(`/admin/users/${userId}/access`,{roles:['user','reviewer'],overrides:[{permission:'kyc.review',allowed:false}]},ownerCookie,'PUT')).status,200);
      const access=(await request('/me',undefined,userCookie)).data.access;
      assert.ok(access.permissions.includes('users.view'));assert.ok(!access.permissions.includes('kyc.review'));
      assert.equal((await request('/staff/users',undefined,userCookie)).status,200);
      assert.equal((await request(`/admin/users/${userId}/access`,{roles:['super_admin'],overrides:[]},ownerCookie,'PUT')).status,403);
      assert.equal((await request(`/admin/users/${ownerId}/access`,{roles:['user'],overrides:[]},ownerCookie,'PUT')).status,403);
      assert.equal((await request(`/admin/users/${userId}/access`,{roles:['unknown'],overrides:[]},ownerCookie,'PUT')).status,400);
      assert.equal((await request('/staff/users',undefined,userCookie)).status,200);
      await request(`/admin/users/${userId}/access`,{roles:['user'],overrides:[]},ownerCookie,'PUT');
      assert.equal((await request('/staff/users',undefined,userCookie)).status,403);
      const events=await request('/staff/audit',undefined,ownerCookie);assert.ok(events.data.events.some((e:any)=>e.action==='user.access_changed'));
    });
    await t.test('sessions are owner-scoped and reset revokes existing sessions',async()=>{
      const ownerSession=(await request('/sessions',undefined,ownerCookie)).data.sessions[0];
      await request(`/sessions/${ownerSession.id}`,undefined,userCookie,'DELETE');
      assert.equal((await request('/me',undefined,ownerCookie)).status,200);
      await request('/auth/forgot-password',{email:registration.email});
      const token=(await db.query("SELECT body FROM email_outbox WHERE recipient=$1 AND subject='Reset your GoldSwap password'",[registration.email])).rows[0].body.split('token=')[1];
      assert.equal((await request('/auth/reset',{token,password:'replacement-password-123'})).status,200);
      assert.equal((await request('/me',undefined,userCookie)).status,401);
      assert.equal((await request('/auth/login',{email:registration.email,password:registration.password})).status,401);
      const login=await request('/auth/login',{email:registration.email,password:'replacement-password-123'});assert.equal(login.status,200);
      await request('/auth/logout',{},login.cookie);assert.equal((await request('/me',undefined,login.cookie)).status,401);
    });
    await t.test('unknown endpoints and auth abuse return controlled errors',async()=>{
      assert.equal((await request('/unknown',undefined,ownerCookie)).status,404);
      let status=0;for(let i=0;i<9;i++) status=(await request('/auth/forgot-password',{email:'missing@example.test'})).status;
      assert.equal(status,429);
    });
  }finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));await db.close();}
});
