import { test } from 'node:test';
import assert from 'node:assert/strict';
import { connectDatabase,migrate } from '../backend/db.js';
import { createApi } from '../backend/api.js';
import { demoProfiles,DEMO_PASSWORD,seedDemo } from '../backend/demo.js';
test('demo records stay isolated and avatar seeds persist across account sessions',async()=>{
  process.env.LOCAL_DATABASE_PATH=':memory:';const db=await connectDatabase();await migrate(db);
  await seedDemo(db);await seedDemo(db);
  assert.equal((await db.query('SELECT * FROM users WHERE is_demo=true')).rows.length,4);
  assert.equal((await db.query('SELECT * FROM demo_snapshots')).rows.length,4);
  const app=createApi(db,'http://localhost:4173'),server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${(server.address() as any).port}`;
  const req=async(path:string,body?:object,cookie='')=>{const r=await fetch(base+path,{method:body?'POST':'GET',headers:{Origin:'http://localhost:4173','Content-Type':'application/json',Cookie:cookie},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]||''};};
  try{
    assert.equal((await req('/demo/users')).status,401);
    const registered=await req('/auth/register',{email:'fresh@example.test',password:'fresh-password-123',firstName:'Fresh',lastName:'Account',country:'BD',phone:'+8801712345678'});
    assert.equal(registered.status,201);assert.match(registered.data.user.avatarSeed,/^[0-9a-f]{16}$/);assert.equal(registered.data.user.isDemo,false);
    const normal=await req('/dashboard',undefined,registered.cookie);assert.equal(normal.data.isDemo,false);assert.equal(normal.data.totals.goldTotal,'0');assert.deepEqual(normal.data.balances,[{asset:'XAU',amount:'0',reserved:'0'}]);assert.deepEqual(normal.data.transactions,[]);
    const users=await req('/demo/users',undefined,registered.cookie);assert.equal(users.data.users.length,4);assert.ok(users.data.users.every((u:any)=>u.isDemo&&u.avatarSeed));
    const preview=await req('/demo/dashboard/'+demoProfiles[0].id,undefined,registered.cookie);assert.equal(preview.data.isDemo,true);assert.equal(preview.data.activeTrades.length,1);assert.equal(preview.data.transactions.length,12);assert.equal(preview.data.financialServicesEnabled,false);
    assert.equal((await req('/dashboard',undefined,registered.cookie)).data.isDemo,false);
    assert.equal((await req('/demo/dashboard/'+registered.data.user.id,undefined,registered.cookie)).status,404);
    const login=await req('/auth/login',{email:'fresh@example.test',password:'fresh-password-123'});assert.equal(login.data.user.avatarSeed,registered.data.user.avatarSeed);
    const demo=await req('/auth/login',{email:demoProfiles[0].email,password:DEMO_PASSWORD});assert.equal(demo.status,200);assert.equal((await req('/dashboard',undefined,demo.cookie)).data.demoName,'Mila Rahman');
    process.env.NODE_ENV='production';
    assert.equal((await req('/demo/users',undefined,login.cookie)).status,404);
    assert.equal((await req('/demo/dashboard/'+demoProfiles[0].id,undefined,login.cookie)).status,404);
    assert.equal((await req('/dashboard',undefined,demo.cookie)).status,401);
    assert.equal((await req('/auth/login',{email:demoProfiles[0].email,password:DEMO_PASSWORD})).status,401);
    await assert.rejects(seedDemo(db),/disabled in production/);
  }finally{delete process.env.NODE_ENV;await new Promise<void>(r=>server.close(()=>r()));await db.close();}
});
