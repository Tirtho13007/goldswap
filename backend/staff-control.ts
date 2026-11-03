import express from 'express';
import type { Request,RequestHandler } from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import type { Sql } from './db.js';
import { ApiError,digest,secret,hashPassword } from './security.js';
import { audit } from './operations.js';
import { decimal } from './crypto.js';
import { CRYPTO_ROUTES } from '../shared/crypto.js';
import { DEFAULT_SITE_SETTINGS } from '../shared/site-settings.js';
type Auth=Request&{principal?:{id:string;roles:string[];permissions:string[]}};
const uid=(r:Request)=>(r as Auth).principal!.id;
const idSchema=z.uuid();
export async function siteSettings(db:Sql){return {...DEFAULT_SITE_SETTINGS,...(await db.query('SELECT settings FROM website_settings WHERE id=1')).rows[0]?.settings};}
async function targetUser(tx:Sql,id:string,actor:string){
  if(id===actor)throw new ApiError(403,'You cannot block or remove your own account.');
  const user=(await tx.query('SELECT * FROM users WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!user)throw new ApiError(404,'User not found.');
  if((await tx.query("SELECT 1 FROM user_roles WHERE user_id=$1 AND role_id='super_admin'",[id])).rows.length)throw new ApiError(403,'Super Admin accounts are protected.');return user;
}
export function staffControl(db:Sql,permission:(name:string)=>RequestHandler,superOnly:RequestHandler,origin:string){
  const router=express.Router();
  router.get('/staff/export/:kind',permission('reports.export'),async(req:Auth,res)=>{
    const kind=z.enum(['users','kyc','deposits','withdrawals','trades']).parse(req.params.kind),required=kind==='kyc'?'kyc.view':kind+'.view';
    if(!req.principal!.permissions.includes(required))throw new ApiError(403,'The matching view permission is required to export this data.');
    let rows:any[];
    if(kind==='users')rows=(await db.query('SELECT id,email,first_name,last_name,status,created_at FROM users WHERE is_demo=false AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 5000')).rows;
    else if(kind==='kyc')rows=(await db.query('SELECT r.id,u.email,r.legal_name,r.country,r.status,r.reason,r.created_at FROM kyc_cases r JOIN users u ON u.id=r.user_id WHERE u.is_demo=false ORDER BY r.created_at DESC LIMIT 5000')).rows;
    else if(kind==='trades')rows=(await db.query('SELECT r.id,u.email,r.plan,r.principal_atoms,r.profit_atoms,r.rate_bps,r.status,r.starts_at,r.matures_at FROM gold_trades r JOIN users u ON u.id=r.user_id WHERE u.is_demo=false ORDER BY r.starts_at DESC LIMIT 5000')).rows.map(r=>({id:r.id,email:r.email,plan:r.plan,gold_grams:decimal(r.principal_atoms,6),profit_grams:decimal(r.profit_atoms,6),rate_percent:r.rate_bps/100,status:r.status,starts_at:r.starts_at,matures_at:r.matures_at}));
    else if(kind==='withdrawals')rows=(await db.query('SELECT r.*,u.email FROM withdrawals r JOIN users u ON u.id=r.user_id WHERE u.is_demo=false ORDER BY r.created_at DESC LIMIT 5000')).rows.map(r=>{const p=CRYPTO_ROUTES.find(x=>x.id===r.route_id)!.precision;return {id:r.id,email:r.email,funding_source:r.funding_source,asset:r.asset,network:r.route_id,crypto_gross_amount:decimal(r.amount_atoms,p),crypto_fee_amount:decimal(r.fee_atoms,p),crypto_net_payout:decimal(BigInt(r.amount_atoms)-BigInt(r.fee_atoms),p),gold_requested_grams:r.gold_atoms?decimal(r.gold_atoms,6):'',gold_fee_grams:r.gold_fee_atoms?decimal(r.gold_fee_atoms,6):'',status:r.status,transaction_hash:r.tx_hash||'',created_at:r.created_at};});
    else rows=(await db.query(`SELECT r.id,u.email,r.asset,r.route_id,r.amount_atoms,r.status,r.tx_hash,r.created_at FROM ${kind} r JOIN users u ON u.id=r.user_id WHERE u.is_demo=false ORDER BY r.created_at DESC LIMIT 5000`)).rows.map(r=>({id:r.id,email:r.email,asset:r.asset,network:r.route_id,amount:decimal(r.amount_atoms,CRYPTO_ROUTES.find(x=>x.id===r.route_id)!.precision),status:r.status,transaction_hash:r.tx_hash||'',created_at:r.created_at}));
    const columns=rows.length?Object.keys(rows[0]):['No records'];
    const cell=(value:unknown)=>{let s=value instanceof Date?value.toISOString():String(value??'');if(/^[=+\-@\t\r]/.test(s)||/^\d{16,}$/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
    const csv='\uFEFF'+[columns.map(cell).join(','),...rows.map(row=>columns.map(c=>cell(row[c])).join(','))].join('\r\n');
    await audit(db,uid(req),'report.exported',kind,{rows:rows.length,limit:5000});
    res.type('text/csv').set('Content-Disposition',`attachment; filename="GoldSwap-${kind}-${new Date().toISOString().slice(0,10)}.csv"`).send(csv);
  });
  router.get('/staff/overview',async(req:Auth,res)=>{
    const p=req.principal!,metrics:Record<string,number>={};
    if(!p.permissions.length&&!p.roles.some(r=>['admin','moderator','super_admin'].includes(r)))throw new ApiError(403,'Staff access required.');
    if(p.permissions.includes('users.view'))Object.assign(metrics,(await db.query("SELECT count(*) FILTER(WHERE deleted_at IS NULL)::int users,count(*) FILTER(WHERE deleted_at IS NULL AND status='active')::int active_users,count(*) FILTER(WHERE deleted_at IS NULL AND status='restricted')::int blocked_users,count(*) FILTER(WHERE created_at>=current_date AND deleted_at IS NULL)::int registered_today,count(*) FILTER(WHERE deleted_at IS NOT NULL)::int removed_users FROM users WHERE is_demo=false")).rows[0]);
    for(const [key,table,perm,status]of [['pending_kyc','kyc_cases','kyc.view',"status='pending'"],['pending_deposits','deposits','deposits.view',"status='pending'"],['pending_withdrawals','withdrawals','withdrawals.view',"status IN('pending','approved','processing')"],['pending_physical','physical_gold_requests','withdrawals.view',"status IN('pending','approved','dispatched')"],['active_trades','gold_trades','trades.view',"status='active'"]]){
      if(p.permissions.includes(perm))metrics[key]=(await db.query(`SELECT count(*)::int n FROM ${table} WHERE ${status}`)).rows[0].n;
    }
    const recentUsers=p.permissions.includes('users.view')?(await db.query('SELECT id,email,first_name,last_name,status,created_at FROM users WHERE is_demo=false AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 6')).rows:[];
    const fees=p.permissions.includes('reports.view')?(await db.query("SELECT j.asset,sum(l.amount_atoms) amount FROM money_lines l JOIN money_journals j ON j.id=l.journal_id WHERE l.account LIKE 'fees:%' OR l.account LIKE 'platform:gold:%fee' GROUP BY j.asset")).rows.map(r=>({asset:r.asset,amount:decimal(r.amount,r.asset==='XAU'?6:CRYPTO_ROUTES.find(x=>x.asset===r.asset)!.precision)})):[];
    res.json({metrics,recentUsers,fees,serverTime:new Date().toISOString()});
  });
  router.get('/staff/trades',permission('trades.view'),async(_req,res)=>res.json({trades:(await db.query('SELECT t.*,u.email FROM gold_trades t JOIN users u ON u.id=t.user_id WHERE u.is_demo=false ORDER BY t.starts_at DESC LIMIT 100')).rows.map(t=>({...t,gold:decimal(t.principal_atoms,6),profit:decimal(t.profit_atoms,6),rate:t.rate_bps/100}))}));
  router.get('/staff/users',permission('users.view'),async(req,res)=>{
    const page=z.coerce.number().int().min(1).max(100000).parse(req.query.page??1),search=z.string().max(160).parse(req.query.search||''),removed=req.query.removed==='true';
    const filter="u.is_demo=false AND (CASE WHEN $1::boolean THEN u.deleted_at IS NOT NULL ELSE u.deleted_at IS NULL END) AND ($2='' OR u.email ILIKE '%'||$2||'%' OR (u.first_name||' '||u.last_name) ILIKE '%'||$2||'%')";
    const users=(await db.query(`SELECT u.id,u.email,u.first_name,u.last_name,u.status,u.deleted_at,u.created_at,coalesce((SELECT jsonb_agg(role_id ORDER BY role_id) FROM user_roles WHERE user_id=u.id),'[]'::jsonb) roles FROM users u WHERE ${filter} ORDER BY u.created_at DESC,u.id LIMIT 25 OFFSET $3`,[removed,search,(page-1)*25])).rows;
    const total=(await db.query(`SELECT count(*)::int n FROM users u WHERE ${filter}`,[removed,search])).rows[0].n;res.json({users,page,total});
  });
  router.patch('/staff/users/:id/status',permission('users.restrict'),async(req,res)=>{
    const id=idSchema.parse(req.params.id),input=z.object({status:z.enum(['active','restricted']),reason:z.string().trim().min(3).max(500)}).strict().parse(req.body);
    await db.transaction(async tx=>{const user=await targetUser(tx,id,uid(req));if(user.deleted_at)throw new ApiError(409,'Restore a removed account before changing its status.');await tx.query('UPDATE users SET status=$1 WHERE id=$2',[input.status,id]);await tx.query('DELETE FROM sessions WHERE user_id=$1',[id]);await tx.query('DELETE FROM account_tokens WHERE user_id=$1',[id]);await audit(tx,uid(req),'user.'+(input.status==='restricted'?'blocked':'unblocked'),id,{reason:input.reason});});res.json({message:input.status==='restricted'?'User blocked and sessions revoked.':'User unblocked.'});
  });
  router.delete('/staff/users/:id',permission('users.delete'),async(req,res)=>{
    const id=idSchema.parse(req.params.id),input=z.object({reason:z.string().trim().min(3).max(500)}).strict().parse(req.body);
    await db.transaction(async tx=>{await targetUser(tx,id,uid(req));await tx.query("UPDATE users SET status='restricted',deleted_at=coalesce(deleted_at,now()) WHERE id=$1",[id]);await tx.query('DELETE FROM sessions WHERE user_id=$1',[id]);await tx.query('DELETE FROM account_tokens WHERE user_id=$1',[id]);await audit(tx,uid(req),'user.removed',id,{reason:input.reason,financialRecordsRetained:true});});res.json({message:'Account removed from active users. Financial and audit history retained.'});
  });
  router.post('/admin/users/:id/restore',superOnly,permission('users.delete'),async(req,res)=>{
    const id=idSchema.parse(req.params.id);await db.transaction(async tx=>{await targetUser(tx,id,uid(req));await tx.query("UPDATE users SET deleted_at=NULL,status='active' WHERE id=$1",[id]);await audit(tx,uid(req),'user.restored',id);});res.json({message:'Account restored. The user must sign in again.'});
  });
  router.get('/admin/users/:id/access',superOnly,permission('roles.manage'),async(req,res)=>{
    const id=idSchema.parse(req.params.id);res.json({roles:(await db.query('SELECT role_id FROM user_roles WHERE user_id=$1',[id])).rows.map(r=>r.role_id),overrides:(await db.query('SELECT permission_id permission,allowed FROM permission_overrides WHERE user_id=$1',[id])).rows});
  });
  router.post('/admin/staff',superOnly,permission('roles.manage'),async(req,res)=>{
    const input=z.object({email:z.email().max(254).transform(s=>s.toLowerCase()),name:z.string().trim().min(1).max(80),roles:z.array(z.string()).min(1).max(20)}).strict().parse(req.body);
    if(input.roles.some(r=>r==='super_admin'||r==='user'))throw new ApiError(403,'Choose admin, moderator or a configured staff role.');
    const token=secret(),id=randomUUID();await db.transaction(async tx=>{
      for(const role of input.roles)if(!(await tx.query('SELECT 1 FROM roles WHERE id=$1',[role])).rows.length)throw new ApiError(400,'Unknown role.');
      await tx.query('INSERT INTO users(id,email,first_name,password_hash) VALUES ($1,$2,$3,$4)',[id,input.email,input.name,await hashPassword(secret()+secret())]);
      for(const role of input.roles)await tx.query('INSERT INTO user_roles VALUES ($1,$2)',[id,role]);
      await tx.query("INSERT INTO account_tokens VALUES ($1,$2,'reset',now()+interval '24 hours')",[digest(token),id]);await audit(tx,uid(req),'staff.created',id,{email:input.email,roles:input.roles});
    });res.status(201).json({id,setupUrl:`${origin}/#account/reset?token=${token}`,message:'Private one-time setup link, valid 24 hours. No email has been sent.'});
  });
  router.get('/staff/website-settings',permission('configuration.manage'),async(_req,res)=>res.json({settings:await siteSettings(db)}));
  router.put('/staff/website-settings',permission('configuration.manage'),async(req,res)=>{
    const input=z.object({platformName:z.string().trim().min(1).max(40),supportEmail:z.email().max(254).or(z.literal('')),announcement:z.string().max(160),heroTitle:z.string().trim().min(1).max(80),heroAccent:z.string().trim().min(1).max(80),heroDescription:z.string().max(240),registrationEnabled:z.boolean(),maintenanceMode:z.boolean()}).strict().parse(req.body);
    await db.transaction(async tx=>{await tx.query('UPDATE website_settings SET settings=$1,updated_at=now() WHERE id=1',[JSON.stringify(input)]);await audit(tx,uid(req),'website.settings_updated','1',input);});res.json({settings:input,message:'Website settings saved.'});
  });
  return router;
}
