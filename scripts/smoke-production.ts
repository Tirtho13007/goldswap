import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import assert from 'node:assert/strict';
// Invoked only by the isolated native PostgreSQL test runner.
if(process.env.NODE_ENV!=='test'||!process.env.DATABASE_URL||!new URL(process.env.DATABASE_URL).pathname.startsWith('/goldswap_test_'))throw Error('Use the isolated PostgreSQL runner.');
const socket=createServer();await new Promise<void>(r=>socket.listen(0,'127.0.0.1',r));const port=(socket.address() as any).port;await new Promise<void>(r=>socket.close(()=>r()));
const env={...process.env,NODE_ENV:'production',PORT:String(port),APP_ORIGIN:'https://goldswap.app',UPLOAD_ENCRYPTION_KEY:'c'.repeat(64),JOB_MODE:'external',TRUST_PROXY_HOPS:'1',MAIL_DELIVERY_ENABLED:'true',MAIL_FROM:'GoldSwap <accounts@goldswap.app>',RESEND_API_KEY:'isolated-smoke-key',CLAMAV_HOST:'127.0.0.1'};
const web=spawn(process.execPath,['--import','tsx','server.mjs'],{env,stdio:['ignore','pipe','pipe']});
const worker=spawn(process.execPath,['--import','tsx','worker.mjs'],{env,stdio:['ignore','pipe','pipe']});
let logs='';web.stdout?.on('data',b=>{logs+=b.toString();});web.stderr?.on('data',b=>{logs+=b.toString();});worker.stderr?.on('data',b=>{logs+=b.toString();});
try{
 const base='http://127.0.0.1:'+port;let ready=false;
 for(let i=0;i<100;i++){try{if((await fetch(base+'/ready')).ok){ready=true;break;}}catch{}if(web.exitCode!==null||worker.exitCode!==null)break;await new Promise(r=>setTimeout(r,100));}
 assert.ok(ready,'Production web/worker did not become ready; check isolated service logs.');
 const redirect=await fetch(base+'/',{redirect:'manual'});assert.equal(redirect.status,308);assert.equal(redirect.headers.get('location'),'https://goldswap.app/');
 const home=await fetch(base+'/',{redirect:'manual',headers:{'X-Forwarded-Proto':'https','X-Forwarded-Host':'goldswap.app'}});assert.equal(home.status,200);assert.match(home.headers.get('content-security-policy')||'',/frame-ancestors 'none'/);assert.equal(home.headers.get('x-frame-options'),'DENY');assert.match(home.headers.get('strict-transport-security')||'',/31536000/);assert.ok(home.headers.get('x-request-id'));assert.match(await home.text(),/https:\/\/goldswap.app/);
 const robots=await fetch(base+'/robots.txt',{redirect:'manual',headers:{'X-Forwarded-Proto':'https','X-Forwarded-Host':'goldswap.app'}});assert.match(await robots.text(),/Disallow: \//);
 console.log('Production web/worker readiness, HTTPS redirect, security headers and canonical checks passed.');
}finally{
 const stop=async(p:typeof web)=>{if(p.exitCode!==null)return;const exit=new Promise<void>(r=>p.once('exit',()=>r()));p.kill('SIGTERM');const deadline=setTimeout(()=>p.kill('SIGKILL'),5000);try{await exit;}finally{clearTimeout(deadline);}};
 await Promise.all([stop(web),stop(worker)]);
}
