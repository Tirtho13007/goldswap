import type { Sql } from './db.js';
import { settleMatureTrades } from './gold.js';
import { processCustomerEvents } from './customer-services.js';
import { deliverMail } from './mail.js';
export function startJobs(db:Sql,origin:string){
 let running:Promise<void>|null=null;
 const tick=()=>{if(running)return running;running=(async()=>{
   try{
    await settleMatureTrades(db);
    await processCustomerEvents(db,origin);
    await deliverMail(db);
    await db.query('DELETE FROM auth_attempts WHERE expires_at<now()');
    await db.query('DELETE FROM oauth_flows WHERE expires_at<now()');
    await db.query('DELETE FROM sessions WHERE expires_at<now()');
    await db.query('DELETE FROM account_tokens WHERE expires_at<now()');
    await db.query("INSERT INTO worker_health(name,last_success_at) VALUES('account-services',now()) ON CONFLICT(name) DO UPDATE SET last_success_at=now()");
   }catch(error:any){console.error(JSON.stringify({event:'worker_failed',category:error.code||error.name||'Error'}));}
  })().finally(()=>{running=null;});return running;};
 void tick();const timer=setInterval(()=>void tick(),15000);timer.unref();
 return async()=>{clearInterval(timer);await running;};
}
