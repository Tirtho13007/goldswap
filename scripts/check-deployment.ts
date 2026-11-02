import { validateDeployment } from '../backend/production.js';
import { connectDatabase } from '../backend/db.js';
try{
 validateDeployment();
 if(process.env.NODE_ENV!=='production')throw Error('Run with NODE_ENV=production against the intended production configuration.');
 const db=await connectDatabase();
 try{
  if(!(await db.query("SELECT 1 FROM schema_migrations WHERE id='008_production'")).rows.length)throw Error('Apply database migrations first.');
  if(!(await db.query("SELECT 1 FROM users u JOIN user_roles r ON r.user_id=u.id WHERE r.role_id='super_admin' AND u.status='active' AND u.is_demo=false")).rows.length)throw Error('Bootstrap the real Super Admin.');
  if(!(await db.query("SELECT 1 FROM worker_health WHERE name='account-services' AND last_success_at>now()-interval '5 minutes'")).rows.length)throw Error('Start the account worker and inspect its health.');
  console.log('Configuration, schema, owner and worker checks passed. Complete the live service acceptance checklist in docs/DEPLOYMENT.md.');
 }finally{await db.close();}
}catch(error:any){console.error(error.message?.startsWith('Deployment configuration:')?error.message:'Deployment check failed. Check database access, migrations, owner and worker setup; no credentials have been printed.');process.exitCode=1;}
