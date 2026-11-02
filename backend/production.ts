import type { Sql } from './db.js';
import { ApiError } from './security.js';

export function validateDeployment(env:NodeJS.ProcessEnv=process.env){
  if(env.NODE_ENV!=='production')return;
  const errors:string[]=[];
  try{const u=new URL(env.APP_ORIGIN||'');if(u.protocol!=='https:'||u.origin!==env.APP_ORIGIN||u.username||u.password)throw Error();}catch{errors.push('APP_ORIGIN must be an exact HTTPS origin');}
  if(!env.DATABASE_URL?.match(/^postgres(?:ql)?:\/\//))errors.push('DATABASE_URL is required');
  if(!/^[a-f\d]{64}$/i.test(env.UPLOAD_ENCRYPTION_KEY||''))errors.push('UPLOAD_ENCRYPTION_KEY must contain 64 hex characters');
  if(env.DB_POOL_MAX&&(!/^\d+$/.test(env.DB_POOL_MAX)||Number(env.DB_POOL_MAX)<1||Number(env.DB_POOL_MAX)>50))errors.push('DB_POOL_MAX must be 1–50');
  if(env.BOOTSTRAP_PASSWORD)errors.push('Remove BOOTSTRAP_PASSWORD from the web/worker environment after bootstrap');
  if(!['embedded','external'].includes(env.JOB_MODE||''))errors.push('JOB_MODE must be embedded or external');
  if(!/^\d+$/.test(env.TRUST_PROXY_HOPS||'')||Number(env.TRUST_PROXY_HOPS)>5)errors.push('TRUST_PROXY_HOPS must be 0–5 for your actual proxy topology');
  if(env.MAIL_DELIVERY_ENABLED!=='true')errors.push('Enable transactional mail before production startup');
  if(!env.CLAMAV_HOST)errors.push('CLAMAV_HOST is required for private document screening');
  if(!env.MAIL_FROM||/[\r\n]/.test(env.MAIL_FROM))errors.push('MAIL_FROM is required');
  if(Boolean(env.RESEND_API_KEY)===Boolean(env.SMTP_HOST))errors.push('Configure exactly one mail provider (Resend or SMTP)');
  if(env.SMTP_HOST&&(!env.SMTP_USER||!env.SMTP_PASSWORD))errors.push('SMTP credentials are required');
  if(errors.length)throw Error('Deployment configuration: '+errors.join('; '));
}

// Applied before every router, including downloads, support and financial queues.
// A newly promoted staff account must authenticate again; old customer sessions never inherit assurance.
export function productionStaffGuard(db:Sql,currentHash:(req:any)=>string){
  return async(req:any,_res:any,next:any)=>{
    if(process.env.NODE_ENV!=='production')return next();
    try{
      const s=(await db.query(`SELECT s.mfa_verified_at,s.reauthenticated_at,m.enabled
        FROM sessions s LEFT JOIN mfa_credentials m ON m.user_id=s.user_id
        WHERE s.token_hash=$1 AND s.user_id=$2 AND s.expires_at>now()`,[currentHash(req),req.principal.id])).rows[0];
      if(!s?.enabled||!s.mfa_verified_at)throw new ApiError(403,'Set up staff authenticator protection in Account security, then sign in again.','STAFF_MFA_REQUIRED');
      if(!['GET','HEAD','OPTIONS'].includes(req.method)&&(!s.reauthenticated_at||Date.now()-new Date(s.reauthenticated_at).getTime()>5*60000))throw new ApiError(403,'Confirm your staff identity to continue.','STAFF_REAUTH_REQUIRED');
      next();
    }catch(error){next(error);}
  };
}
