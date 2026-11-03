import { randomUUID } from 'node:crypto';
import nodemailer from 'nodemailer';
import type { Sql } from './db.js';
export const escapeHtml=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function emailTemplate(input:{title:string;message:string;label?:string;url?:string;rows?:[string,string][]}){
  const e=escapeHtml;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f3f5f4;font-family:Arial,sans-serif;color:#172435"><div style="display:none;max-height:0;overflow:hidden">${e(input.message)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:32px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;margin:auto;background:white;border:1px solid #e0e5e8;border-radius:20px"><tr><td style="padding:32px"><div style="font-size:25px;font-weight:700">GoldSwap<span style="color:#b78324">.</span></div><p style="color:#9d6b16;font-size:11px;letter-spacing:2px;margin-top:24px">YOUR GOLD. YOUR ACCOUNT.</p><h1 style="font-size:26px;line-height:1.3">${e(input.title)}</h1><p style="font-size:16px;line-height:1.7;color:#536176">${e(input.message)}</p>${input.rows?`<table width="100%" cellpadding="10" style="font-size:14px;background:#f7f8fa;border-radius:12px">${input.rows.map(([a,b])=>`<tr><td style="color:#657184">${e(a)}</td><td style="text-align:right;word-break:break-all">${e(b)}</td></tr>`).join('')}</table>`:''}${input.url?`<p style="margin:28px 0"><a href="${e(input.url)}" target="_blank" rel="noreferrer" style="display:inline-block;background:#b78324;color:#fff;text-decoration:none;border-radius:10px;padding:15px 24px;font-weight:bold">${e(input.label||'Open your account')}</a></p><p style="font-size:12px;color:#657184;word-break:break-all">Button not working? Open this address:<br>${e(input.url)}</p>`:''}<hr style="border:0;border-top:1px solid #e5e9ee;margin-top:30px"><p style="font-size:12px;line-height:1.7;color:#657184">GoldSwap will never ask for your password, wallet seed phrase or recovery codes by email. If you did not request this action, review your account security.</p><p style="font-size:12px;color:#657184">GoldSwap · Account services</p></td></tr></table></td></tr></table></body></html>`;
}
export async function queueEmail(tx:Sql,input:{userId:string;to:string;subject:string;title:string;message:string;url?:string;label?:string;rows?:[string,string][];key?:string;kind?:string;expiresAt?:Date}){
  const id=randomUUID(),body=[input.message,...(input.rows||[]).map(([a,b])=>`${a}: ${b}`),...(input.url?[input.url]:[])].join('\n');
  await tx.query('INSERT INTO email_outbox(id,user_id,recipient,subject,body,html,event_key,kind,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(event_key) DO NOTHING',[id,input.userId,input.to,input.subject,body,emailTemplate(input),input.key||null,input.kind||'transactional',input.expiresAt||null]);return id;
}
export async function queueIdentityEmail(tx:Sql,id:string,email:string,purpose:'verify'|'reset',link:string){
  await tx.query("UPDATE email_outbox SET expires_at=now() WHERE user_id=$1 AND kind=$2 AND sent_at IS NULL",[id,purpose]);
  return queueEmail(tx,{userId:id,to:email,subject:purpose==='verify'?'Verify your GoldSwap email':'Reset your GoldSwap password',title:purpose==='verify'?'Welcome to GoldSwap.':'Reset your password.',message:purpose==='verify'?'Confirm your email address to keep account updates within reach. This link expires in 30 minutes. You can continue using your dashboard while verification is pending.':'Use the secure link below to choose a new password. This link expires in 30 minutes and can be used once. If you did not request a reset, you can ignore this email.',url:link,label:purpose==='verify'?'Verify email address':'Choose new password',kind:purpose,expiresAt:new Date(Date.now()+30*60000)});
}
export function mailMode(){return process.env.MAIL_DELIVERY_ENABLED==='true'&&(process.env.SMTP_HOST||process.env.RESEND_API_KEY)?'live':'preview';}
export async function deliverMail(db:Sql,sendOverride?:(mail:any)=>Promise<string>){
  if(!sendOverride&&mailMode()!=='live')return {accepted:0};
  let accepted=0;
  for(let i=0;i<10;i++){
    const mail=await db.transaction(async tx=>{const row=(await tx.query("SELECT * FROM email_outbox WHERE sent_at IS NULL AND html<>'' AND attempts<6 AND next_attempt_at<=now() AND (expires_at IS NULL OR expires_at>now()) AND (lease_until IS NULL OR lease_until<now()) ORDER BY created_at,id LIMIT 1 FOR UPDATE SKIP LOCKED")).rows[0];if(!row)return null;await tx.query("UPDATE email_outbox SET attempts=attempts+1,lease_until=now()+interval '2 minutes' WHERE id=$1",[row.id]);return row;});
    if(!mail)break;
    try{
      const from=process.env.MAIL_FROM;
      if(!sendOverride&&!from)throw Error('sender_not_configured');
      let providerId='';
      if(sendOverride)providerId=await sendOverride(mail);
      else if(process.env.RESEND_API_KEY){const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':mail.id},body:JSON.stringify({from,to:[mail.recipient],subject:mail.subject,html:mail.html,text:mail.body}),signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('provider_http_'+r.status);providerId=(await r.json() as any).id;}
      else{const port=Number(process.env.SMTP_PORT||587),transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port,secure:port===465,requireTLS:port!==465,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD},connectionTimeout:15000,socketTimeout:20000});try{const result=await transport.sendMail({from,to:mail.recipient,subject:mail.subject,text:mail.body,html:mail.html,messageId:`<${mail.id}@${new URL(process.env.APP_ORIGIN||'http://localhost').hostname}>`,disableFileAccess:true,disableUrlAccess:true});if(!result.accepted?.length)throw Error('smtp_not_accepted');providerId=result.messageId;}finally{transport.close();}}
      await db.query('UPDATE email_outbox SET sent_at=now(),provider_id=$2,last_error=NULL,lease_until=NULL WHERE id=$1',[mail.id,providerId]);accepted++;
    }catch(error:any){const category=/^(provider_http_\d+|sender_not_configured|smtp_not_accepted)$/.test(error.message)?error.message:'delivery_failed';await db.query("UPDATE email_outbox SET lease_until=NULL,last_error=$2,next_attempt_at=now()+($3*interval '1 second') WHERE id=$1",[mail.id,category,Math.min(3600,30*2**mail.attempts)]);}
  }return {accepted};
}
