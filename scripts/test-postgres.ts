// Never point this destructive test suite at production. Each file gets its own database.
import { Pool } from 'pg';
import { spawnSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
if(!process.env.TEST_DATABASE_URL)throw Error('Set TEST_DATABASE_URL for a disposable PostgreSQL server with CREATE DATABASE permission.');
if(process.env.NODE_ENV==='production')throw Error('Tests must not run in production.');
const admin=new Pool({connectionString:process.env.TEST_DATABASE_URL});
try{
 for(const file of [...(await readdir('tests')).filter(p=>p.endsWith('.test.ts')),'production-smoke']){
  const name='goldswap_test_'+randomBytes(8).toString('hex');
  await admin.query(`CREATE DATABASE "${name}"`);
  try{
   const url=new URL(process.env.TEST_DATABASE_URL);url.pathname='/'+name;
   if(file==='production-smoke'){const release=spawnSync(process.execPath,['--import','tsx','backend/cli.ts','migrate'],{stdio:'inherit',env:{...process.env,DATABASE_URL:url.toString(),NODE_ENV:'test'}});if(release.status!==0)throw Error('Smoke database migration failed.');}
   const args=file==='production-smoke'?['--import','tsx','scripts/smoke-production.ts']:['--import','tsx','--test','tests/'+file];
   const result=spawnSync(process.execPath,args,{stdio:'inherit',env:{...process.env,DATABASE_URL:url.toString(),NODE_ENV:'test'}});
   if(result.status!==0)throw Error('PostgreSQL suite failed: '+file);
  }finally{await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);}
 }
}finally{await admin.end();}
