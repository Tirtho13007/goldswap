import { productionStaffGuard } from './production.js';
import { accountSecurity,verifyMfa,staffMfaAvailable } from './account-security.js';
import { queueIdentityEmail } from './mail.js';
import { customerServices } from './customer-services.js';
import { swapOperations,swapHistory } from './swap.js';
import { staffControl,siteSettings } from './staff-control.js';
import { goldOperations,goldDashboard } from './gold.js';
import { marketServices } from './pricing.js';
import type { Services } from './pricing.js';
import { operations, operationalDashboard } from './operations.js';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import type { Sql } from './db.js';
import { PERMISSIONS } from './db.js';
import { ApiError, checkPassword, digest, hashPassword, secret } from './security.js';
import { emptyDashboard } from './demo.js';

const passwordSchema = z.string().min(10).max(128);
const emailSchema = z.email().max(254).transform(s=>s.toLowerCase());
const text = z.string().trim().min(1).max(80);
const registerSchema = z.object({email: emailSchema, password: passwordSchema,
  firstName: text, lastName: text, country: z.string().regex(/^[A-Z]{2}$/),
  phone: z.string().regex(/^\+[1-9][0-9 ]{6,19}$/)}).strict();
const profileSchema = z.object({firstName:text.optional(), lastName:text.optional(),
  country:z.string().regex(/^[A-Z]{2}$/).optional(),phone:z.string().regex(/^\+[1-9][0-9 ]{6,19}$/).optional(),
  address:z.object({line1:z.string().max(200),line2:z.string().max(200).optional(),city:z.string().max(100),
    region:z.string().max(100).optional(),postalCode:z.string().max(30).optional()}).strict().optional(),
  theme:z.enum(['light','dark','system']).optional()}).strict();
type Principal = {id:string; roles:string[]; permissions:string[];staffVerified?:boolean};
type Authed = Request & {principal?:Principal};
const publicUser = (row:any) => ({id:row.id,email:row.email,firstName:row.first_name,lastName:row.last_name,
  country:row.country,phone:row.phone,address:row.address,theme:row.theme,emailVerified:row.email_verified,avatarSeed:digest(row.id).slice(0,16),isDemo:Boolean(row.is_demo)});

export function createApi(db:Sql, origin:string,services:Services=marketServices) {
  const app=express();
  const secure = origin.startsWith('https:');
  const cookieName=secure?'__Host-goldswap_session':'goldswap_session';
  const cookieOptions={httpOnly:true,secure,sameSite:'lax' as const,path:'/'};
  const cookies=(req:Request,name:string)=> (req.headers.cookie || '').split(';').map(s=>s.trim()).find(s=>s.startsWith(`${name}=`))?.slice(name.length+1) || '';
  const audit=async(tx:Sql,actor:string|null,action:string,target:string,details:object={})=>{
    await tx.query('INSERT INTO audit_events(id,actor_id,action,target_id,details) VALUES ($1,$2,$3,$4,$5)',[randomUUID(),actor,action,target,JSON.stringify(details)]);
  };
  async function access(id:string):Promise<Principal> {
    const {rows:roles}=await db.query('SELECT role_id FROM user_roles WHERE user_id=$1',[id]);
    const {rows:grants}=await db.query(`SELECT DISTINCT permission_id FROM role_permissions WHERE role_id IN (SELECT role_id FROM user_roles WHERE user_id=$1)`,[id]);
    const {rows:overrides}=await db.query('SELECT permission_id,allowed FROM permission_overrides WHERE user_id=$1',[id]);
    const roleIds=roles.map(r=>r.role_id);
    const perms=new Set<string>(roleIds.includes('super_admin')?PERMISSIONS:grants.map(r=>r.permission_id));
    for(const item of overrides) item.allowed?perms.add(item.permission_id):perms.delete(item.permission_id);
    return {id,roles:roleIds,permissions:[...perms].sort()};
  }
  async function startSession(req:Request,res:Response,id:string,mfaVerified=false) {
    const token=secret();
    await db.transaction(async tx=>{
      await tx.query('DELETE FROM sessions WHERE token_hash=$1 OR expires_at<=now()',[digest(cookies(req,cookieName))]);
      await tx.query("INSERT INTO sessions(token_hash,user_id,expires_at,user_agent,mfa_verified_at,reauthenticated_at) VALUES ($1,$2,now()+interval '7 days',$3,CASE WHEN $4 THEN now() END,CASE WHEN $4 THEN now() END)",[digest(token),id,(req.get('User-Agent')||'').slice(0,300),mfaVerified]);
    });
    res.cookie(cookieName,token,{...cookieOptions,maxAge:7*86400000});
  }
  async function issueEmail(tx:Sql,id:string,email:string,purpose:'verify'|'reset') {
    const token=secret();
    await tx.query('DELETE FROM account_tokens WHERE user_id=$1 AND purpose=$2',[id,purpose]);
    await tx.query("INSERT INTO account_tokens VALUES ($1,$2,$3,now()+interval '30 minutes')",[digest(token),id,purpose]);
    const link=`${origin}/#account/${purpose}?token=${token}`;
    await queueIdentityEmail(tx,id,email,purpose,link);
  }
  app.disable('x-powered-by');
  app.use((req,res,next)=>{
    res.set({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
    if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.get('Origin')!==origin) return next(new ApiError(403,'Invalid request origin.'));
    next();
  });
  app.use('/files',express.json({limit:'8mb'}));
  app.use(express.json({limit:'16kb'}));
  // Database-backed limits work across API processes; never persist raw emails/IPs here.
  const limit=(scope:string,max:number)=>(async(req:Request,_res:Response,next:NextFunction)=>{
    try {
      const keys=[`${scope}:ip:${req.ip}`];
      if(typeof req.body?.email==='string') keys.push(`${scope}:email:${req.body.email.toLowerCase()}`);
      for(const key of keys){
        const {rows}=await db.query(`INSERT INTO auth_attempts(key,count,expires_at) VALUES ($1,1,now()+interval '15 minutes')
          ON CONFLICT(key) DO UPDATE SET count=CASE WHEN auth_attempts.expires_at<=now() THEN 1 ELSE auth_attempts.count+1 END,
          expires_at=CASE WHEN auth_attempts.expires_at<=now() THEN now()+interval '15 minutes' ELSE auth_attempts.expires_at END RETURNING count`,[digest(key)]);
        if(rows[0].count>max) throw new ApiError(429,'Too many attempts. Try again later.');
      }
      next();
    } catch(error){next(error);}
  });
  const requireAuth=async(req:Authed,_res:Response,next:NextFunction)=>{
    try {
      const {rows}=await db.query(`SELECT u.id,s.mfa_verified_at,EXISTS(SELECT 1 FROM mfa_credentials m WHERE m.user_id=u.id AND m.enabled=true) AS mfa_enabled FROM sessions s JOIN users u ON u.id=s.user_id
        WHERE s.token_hash=$1 AND s.expires_at>now() AND u.status='active' AND (u.is_demo=false OR $2=true)`,[digest(cookies(req,cookieName)),process.env.NODE_ENV!=='production']);
      if(!rows.length) throw new ApiError(401,'Sign in to continue.');
      req.principal=await access(rows[0].id);req.principal.staffVerified=Boolean(rows[0].mfa_verified_at&&rows[0].mfa_enabled);await db.query("UPDATE sessions SET last_seen_at=now() WHERE token_hash=$1 AND last_seen_at<now()-interval '5 minutes'",[digest(cookies(req,cookieName))]);next();
    }catch(error){next(error);}
  };
  const permission=(name:string)=>(req:Authed,_res:Response,next:NextFunction)=>{
    next(req.principal?.permissions.includes(name)?undefined:new ApiError(403,'You do not have permission for this action.'));
  };
  const superOnly=(req:Authed,_res:Response,next:NextFunction)=>next(req.principal?.roles.includes('super_admin')?undefined:new ApiError(403,'Super Admin access required.'));
  app.get('/site-settings',async(_req,res)=>res.json({settings:await siteSettings(db)}));
  app.get('/health',async(_req,res)=>{await db.query('SELECT 1');res.json({status:'ok',phase:'platform-gold-and-crypto',transactionsEnabled:true});});
  app.post('/auth/register',limit('register',15),async(req,res)=>{
    if(!(await siteSettings(db)).registrationEnabled)throw new ApiError(503,'Registration is temporarily closed.');
    const input=registerSchema.parse(req.body);const id=randomUUID();const hash=await hashPassword(input.password);
    await db.transaction(async tx=>{
      const result=await tx.query(`INSERT INTO users(id,email,password_hash,first_name,last_name,country,phone) VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT(email) DO NOTHING RETURNING id`,[id,input.email,hash,input.firstName,input.lastName,input.country,input.phone]);
      if(!result.rows.length) throw new ApiError(409,'This email is already registered.');
      await tx.query("INSERT INTO user_roles VALUES ($1,'user')",[id]);
      await issueEmail(tx,id,input.email,'verify'); await audit(tx,id,'account.registered',id);
    });
    await startSession(req,res,id);res.status(201).json({user:publicUser((await db.query('SELECT * FROM users WHERE id=$1',[id])).rows[0]),message:'Account created. Email verification is pending.'});
  });
  app.post('/auth/login',limit('login',30),async(req,res)=>{
    const input=z.object({email:emailSchema,password:z.string().min(1).max(128),code:z.string().max(100).default('')}).parse(req.body);
    const {rows}=await db.query('SELECT * FROM users WHERE email=$1',[input.email]);const user=rows[0];
    if(!await checkPassword(input.password,user?.password_hash)||user?.status!=='active'||(user?.is_demo&&process.env.NODE_ENV==='production')) throw new ApiError(401,'Email or password is incorrect.');
    const verified=await db.transaction(async tx=>{await tx.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[user.id]);const verified=await verifyMfa(tx,user.id,input.code);await audit(tx,user.id,'security.signed_in',user.id);return verified;});await startSession(req,res,user.id,verified);res.json({user:publicUser(user)});
  });
  app.get('/auth/session',async(req,res)=>{
    const {rows}=await db.query(`SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.status='active' AND (u.is_demo=false OR $2=true)`,[digest(cookies(req,cookieName)),process.env.NODE_ENV!=='production']);
    res.json({user:rows[0]?publicUser(rows[0]):null,access:rows[0]?await access(rows[0].id):null,googleEnabled:Boolean(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET)});
  });
  app.post('/auth/logout',async(req,res)=>{await db.query('DELETE FROM sessions WHERE token_hash=$1',[digest(cookies(req,cookieName))]);res.clearCookie(cookieName,cookieOptions).sendStatus(204);});
  app.post('/auth/forgot-password',limit('reset',8),async(req,res)=>{
    const email=emailSchema.parse(req.body.email);const {rows}=await db.query('SELECT id FROM users WHERE email=$1',[email]);
    if(rows[0]) await db.transaction(tx=>issueEmail(tx,rows[0].id,email,'reset'));
    res.json({message:'If the account exists, a reset email has been queued.'});
  });
  for(const purpose of ['verify','reset'] as const){
    app.post(`/auth/${purpose}`,limit(purpose,20),async(req,res)=>{
      const token=z.string().min(32).max(128).parse(req.body.token);
      const hash=purpose==='reset'?await hashPassword(passwordSchema.parse(req.body.password)):null;
      await db.transaction(async tx=>{
        const {rows}=await tx.query('DELETE FROM account_tokens WHERE token_hash=$1 AND purpose=$2 AND expires_at>now() RETURNING user_id',[digest(token),purpose]);
        if(!rows.length) throw new ApiError(400,'This link has expired or was already used.');
        const id=rows[0].user_id;
        if(purpose==='verify') await tx.query('UPDATE users SET email_verified=true WHERE id=$1',[id]);
        else {await tx.query('UPDATE users SET password_hash=$1 WHERE id=$2',[hash,id]);await tx.query('DELETE FROM sessions WHERE user_id=$1',[id]);}
        await tx.query('UPDATE email_outbox SET expires_at=now() WHERE user_id=$1 AND kind=$2 AND sent_at IS NULL',[id,purpose]);
        await audit(tx,id,`account.${purpose}`,id);
      });res.json({message:purpose==='verify'?'Email verified.':'Password reset. Sign in again.'});
    });
  }
  app.post('/auth/resend-verification',requireAuth,limit('verification',5),async(req:Authed,res)=>{
    const user=(await db.query('SELECT * FROM users WHERE id=$1',[req.principal!.id])).rows[0];
    if(!user.email_verified) await db.transaction(tx=>issueEmail(tx,user.id,user.email,'verify'));
    res.json({message:'Verification email queued if needed.'});
  });
  const callback=`${origin}/api/v1/auth/google/callback`;
  const google=()=>{
    if(!process.env.GOOGLE_CLIENT_ID||!process.env.GOOGLE_CLIENT_SECRET) throw new ApiError(503,'Google sign-in is not configured.');
    return new OAuth2Client(process.env.GOOGLE_CLIENT_ID,process.env.GOOGLE_CLIENT_SECRET,callback);
  };
  app.get('/auth/google',limit('google',20),async(_req,res)=>{
    const client=google(),browser=secret(),state=secret(),verifier=secret(),nonce=secret();
    await db.query("INSERT INTO oauth_flows VALUES ($1,$2,$3,$4,now()+interval '10 minutes')",[digest(browser),state,verifier,nonce]);
    res.cookie('goldswap_oauth',browser,{...cookieOptions,maxAge:600000});
    const challenge=Buffer.from(digest(verifier),'hex').toString('base64url');
    res.redirect(client.generateAuthUrl({scope:['openid','email'],state,nonce,code_challenge:challenge,code_challenge_method:'S256' as any}));
  });
  app.get('/auth/google/callback',async(req,res)=>{
    try {
      const client=google();const state=z.string().parse(req.query.state);
      const {rows}=await db.query('DELETE FROM oauth_flows WHERE browser_hash=$1 AND state=$2 AND expires_at>now() RETURNING *',[digest(cookies(req,'goldswap_oauth')),state]);
      res.clearCookie('goldswap_oauth',cookieOptions);if(!rows.length) throw new Error('Invalid flow');
      const flow=rows[0],code=z.string().parse(req.query.code);
      const {tokens}=await client.getToken({code,codeVerifier:flow.verifier,redirect_uri:callback});
      const claims=(await client.verifyIdToken({idToken:tokens.id_token!,audience:process.env.GOOGLE_CLIENT_ID})).getPayload();
      if(!claims?.sub||!claims.email||!claims.email_verified||claims.nonce!==flow.nonce) throw new Error('Invalid identity');
      const id=await db.transaction(async tx=>{
        const identity=(await tx.query("SELECT user_id FROM identities WHERE provider='google' AND subject=$1",[claims.sub])).rows[0];
        if(identity) return identity.user_id;
        const userId=randomUUID();
        const created=await tx.query('INSERT INTO users(id,email,email_verified) VALUES ($1,$2,true) ON CONFLICT(email) DO NOTHING RETURNING id',[userId,claims.email!.toLowerCase()]);
        if(!created.rows.length) throw new Error('Use original sign-in method');
        await tx.query("INSERT INTO identities VALUES ('google',$1,$2)",[claims.sub,userId]);
        await tx.query("INSERT INTO user_roles VALUES ($1,'user')",[userId]);
        await audit(tx,userId,'account.google_registered',userId);return userId;
      });
      const user=(await db.query('SELECT status FROM users WHERE id=$1',[id])).rows[0];
      if(user.status!=='active') throw new Error('Restricted');
      if(await staffMfaAvailable(db,id)&&(await db.query('SELECT 1 FROM mfa_credentials WHERE user_id=$1 AND enabled=true',[id])).rows.length)throw new Error('Use password and authenticator sign-in');
      await startSession(req,res,id);res.redirect('/#account');
    } catch {res.redirect('/#account?error=google');}
  });
  app.use(requireAuth);
  app.use(['/staff','/admin'],productionStaffGuard(db,req=>digest(cookies(req,cookieName))));
  app.use(async(req:Authed,_res,next)=>{if(req.method!=='GET'&&!req.principal!.permissions.length&&/^\/(deposits|withdrawals|gold|kyc|swaps|crypto\/estimate)(\/|$)/.test(req.path)&&(await siteSettings(db)).maintenanceMode)return next(new ApiError(503,'The platform is under maintenance. Please try again later.'));next();});
  app.use('/security',(req,res,next)=>req.method==='GET'?next():limit('security',40)(req,res,next));
  app.use(accountSecurity(db,req=>digest(cookies(req,cookieName))));
  app.use(customerServices(db,permission,origin));
  app.use(operations(db,permission,services));
  app.use(goldOperations(db,permission,services));
  app.use(swapOperations(db,services));
  app.get('/me',async(req:Authed,res)=>res.json({user:publicUser((await db.query('SELECT * FROM users WHERE id=$1',[req.principal!.id])).rows[0]),access:req.principal}));
  app.patch('/me',async(req:Authed,res)=>{
    const input=profileSchema.parse(req.body),id=req.principal!.id;
    await db.transaction(async tx=>{
      const row=(await tx.query('SELECT * FROM users WHERE id=$1 FOR UPDATE',[id])).rows[0];
      const verified=(await tx.query("SELECT 1 FROM kyc_cases WHERE user_id=$1 AND status='approved' AND renewal_required=false AND (document_expires_on IS NULL OR document_expires_on>=current_date)",[id])).rows.length;
      if(verified&&((input.firstName!==undefined&&input.firstName!==row.first_name)||(input.lastName!==undefined&&input.lastName!==row.last_name)||(input.country!==undefined&&input.country!==row.country)||Object.entries(input.address||{}).some(([k,v])=>v!==(row.address[k]||''))))throw new ApiError(409,'Verified identity changes require a new KYC review.');
      await tx.query(`UPDATE users SET first_name=$1,last_name=$2,country=$3,phone=$4,address=$5,theme=$6 WHERE id=$7`,
        [input.firstName??row.first_name,input.lastName??row.last_name,input.country??row.country,input.phone??row.phone,JSON.stringify(input.address??row.address),input.theme??row.theme,id]);
      await audit(tx,id,'profile.updated',id,{fields:Object.keys(input)});
    });res.json({user:publicUser((await db.query('SELECT * FROM users WHERE id=$1',[id])).rows[0])});
  });
  app.get('/sessions',async(req:Authed,res)=>{
    const {rows}=await db.query('SELECT token_hash,created_at,expires_at FROM sessions WHERE user_id=$1 AND expires_at>now()',[req.principal!.id]);
    res.json({sessions:rows.map(r=>({id:r.token_hash,current:r.token_hash===digest(cookies(req,cookieName)),createdAt:r.created_at,expiresAt:r.expires_at}))});
  });
  app.delete('/sessions/:id',async(req:Authed,res)=>{const id=z.string().regex(/^[a-f0-9]{64}$/).parse(req.params.id);await db.transaction(async tx=>{const removed=await tx.query('DELETE FROM sessions WHERE token_hash=$1 AND user_id=$2 RETURNING user_id',[id,req.principal!.id]);if(removed.rows.length)await audit(tx,req.principal!.id,'security.session_revoked',req.principal!.id);});res.sendStatus(204);});
  app.get('/dashboard',async(req:Authed,res)=>{
    const {rows}=await db.query('SELECT d.snapshot FROM demo_snapshots d JOIN users u ON u.id=d.user_id WHERE u.id=$1 AND u.is_demo=true',[req.principal!.id]);
    if(process.env.NODE_ENV!=='production'&&rows[0])return res.json({...rows[0].snapshot,serverTime:new Date().toISOString()});
    const workflow=await operationalDashboard(db,req.principal!.id),gold=await goldDashboard(db,req.principal!.id);
    res.json({...emptyDashboard(),...workflow,balances:[...workflow.balances,{asset:'XAU',amount:gold.goldTotals.available,reserved:gold.goldTotals.reserved}],activeTrades:gold.activeTrades,transactions:[...workflow.transactions,...gold.goldTransactions,...await swapHistory(db,req.principal!.id)].sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()).slice(0,100),totals:{...workflow.totals,...gold.goldTotals,pendingWithdrawals:workflow.totals.pendingWithdrawals+gold.pendingPhysical},financialServicesEnabled:true});
  });
  app.get('/demo/users',async(_req,res)=>{
    if(process.env.NODE_ENV==='production')throw new ApiError(404,'Not available.');
    const {rows}=await db.query('SELECT u.* FROM users u JOIN demo_snapshots d ON d.user_id=u.id WHERE u.is_demo=true ORDER BY u.first_name');
    res.json({users:rows.map(publicUser)});
  });
  app.get('/demo/dashboard/:id',async(req,res)=>{
    if(process.env.NODE_ENV==='production')throw new ApiError(404,'Not available.');
    const id=z.uuid().parse(req.params.id);
    const {rows}=await db.query('SELECT d.snapshot FROM demo_snapshots d JOIN users u ON u.id=d.user_id WHERE u.id=$1 AND u.is_demo=true',[id]);
    if(!rows.length)throw new ApiError(404,'Demo account not found.');
    res.json({...rows[0].snapshot,serverTime:new Date().toISOString()});
  });
  app.use(staffControl(db,permission,superOnly,origin));
  app.get('/admin/permissions',superOnly,permission('roles.manage'),(_req,res)=>res.json({permissions:PERMISSIONS}));
  app.get('/admin/roles',superOnly,permission('roles.manage'),async(_req,res)=>{
    const {rows}=await db.query('SELECT * FROM roles ORDER BY id');const grants=(await db.query('SELECT * FROM role_permissions')).rows;
    res.json({roles:rows.map(r=>({...r,permissions:grants.filter(g=>g.role_id===r.id).map(g=>g.permission_id)}))});
  });
  app.put('/admin/roles/:id',superOnly,permission('roles.manage'),async(req:Authed,res)=>{
    const id=z.string().regex(/^[a-z][a-z0-9_]{1,39}$/).parse(req.params.id);
    if(id==='super_admin'||id==='user') throw new ApiError(403,'This system role cannot be changed.');
    const input=z.object({name:text,permissions:z.array(z.enum(PERMISSIONS as [string,...string[]])).max(PERMISSIONS.length)}).strict().parse(req.body);
    await db.transaction(async tx=>{
      await tx.query('INSERT INTO roles(id,name) VALUES ($1,$2) ON CONFLICT(id) DO UPDATE SET name=$2',[id,input.name]);
      await tx.query('DELETE FROM role_permissions WHERE role_id=$1',[id]);
      for(const p of new Set(input.permissions)) await tx.query('INSERT INTO role_permissions VALUES ($1,$2)',[id,p]);
      await audit(tx,req.principal!.id,'role.configured',id,input);
    });res.json({message:'Role updated.'});
  });
  app.put('/admin/users/:id/access',superOnly,permission('roles.manage'),async(req:Authed,res)=>{
    const id=z.uuid().parse(req.params.id);
    const input=z.object({roles:z.array(z.string()).min(1).max(20),overrides:z.array(z.object({permission:z.enum(PERMISSIONS as [string,...string[]]),allowed:z.boolean()})).max(PERMISSIONS.length)}).strict().parse(req.body);
    if(id===req.principal!.id||input.roles.includes('super_admin')) throw new ApiError(403,'Self changes and Super Admin elevation are not allowed here.');
    await db.transaction(async tx=>{
      const target=(await tx.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[id])).rows[0];
      if(!target) throw new ApiError(404,'User not found.');
      if((await tx.query("SELECT 1 FROM user_roles WHERE user_id=$1 AND role_id='super_admin'",[id])).rows.length) throw new ApiError(403,'Super Admin access cannot be changed here.');
      for(const role of input.roles) if(!(await tx.query('SELECT 1 FROM roles WHERE id=$1',[role])).rows.length) throw new ApiError(400,'Unknown role.');
      await tx.query('DELETE FROM user_roles WHERE user_id=$1',[id]);
      for(const role of new Set(input.roles)) await tx.query('INSERT INTO user_roles VALUES ($1,$2)',[id,role]);
      await tx.query('DELETE FROM permission_overrides WHERE user_id=$1',[id]);
      for(const o of input.overrides) await tx.query('INSERT INTO permission_overrides VALUES ($1,$2,$3)',[id,o.permission,o.allowed]);
      await audit(tx,req.principal!.id,'user.access_changed',id,input);
    });res.json({access:await access(id)});
  });
  app.get('/staff/audit',permission('audit.view'),async(req,res)=>{
    const page=z.coerce.number().int().min(1).max(100000).parse(req.query.page??1);
    res.json({events:(await db.query('SELECT * FROM audit_events ORDER BY created_at DESC,id LIMIT 25 OFFSET $1',[(page-1)*25])).rows,page});
  });
  app.use((_req,_res,next)=>next(new ApiError(404,'API endpoint not found.')));
  app.use((err:any,_req:Request,res:Response,_next:NextFunction)=>{
    if(err.code==='23505')return res.status(409).json({error:'This record or blockchain transfer has already been submitted.'});
    if(err instanceof z.ZodError) return res.status(400).json({error:'Check the submitted fields.',fields:err.issues.map(i=>({path:i.path.join('.'),message:i.message}))});
    if(err instanceof ApiError) return res.status(err.status).json({error:err.message,...(err.code?{code:err.code}:{})});
    if(err.type==='entity.parse.failed'||err.type==='entity.too.large') return res.status(400).json({error:'Invalid request body.'});
    console.error('API failure',err.code||err.name);res.status(500).json({error:'Unable to complete the request.'});
  });
  return app;
}
