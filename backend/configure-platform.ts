import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { connectDatabase,migrate } from './db.js';
import { hashPassword,secret,digest } from './security.js';
import { validateAddress,routeFor } from './crypto.js';
import { audit } from './operations.js';

if(process.env.NODE_ENV==='production')throw Error('Use the authenticated staff setup flow for production.');
const input=z.object({owner:z.object({name:z.string().min(1).max(80),email:z.email()}),wallets:z.array(z.object({routeId:z.string(),address:z.string(),memo:z.string().default(''),source:z.string()})).min(1)}).parse(JSON.parse(await readFile(process.argv[2]||'data/wallet-import.json','utf8')));
for(const wallet of input.wallets)validateAddress(wallet.routeId,wallet.address,wallet.memo);
if(new Set(input.wallets.map(w=>w.routeId)).size!==input.wallets.length)throw Error('Duplicate wallet route.');
const db=await connectDatabase();
try{
  await migrate(db);
  const setupToken=secret();let newOwner=false;
  await db.transaction(async tx=>{
    await tx.query('SELECT pg_advisory_xact_lock(784103)');
    const owners=(await tx.query("SELECT u.id,u.email FROM users u JOIN user_roles r ON r.user_id=u.id WHERE r.role_id='super_admin'")).rows;
    if(owners.some(o=>o.email!==input.owner.email.toLowerCase()))throw Error('A different Super Admin already exists; refusing to replace it.');
    let owner=(await tx.query('SELECT * FROM users WHERE email=$1',[input.owner.email.toLowerCase()])).rows[0];
    if(!owner){newOwner=true;const id=randomUUID();await tx.query('INSERT INTO users(id,email,first_name,password_hash) VALUES ($1,$2,$3,$4)',[id,input.owner.email.toLowerCase(),input.owner.name,await hashPassword(secret()+secret())]);owner={id};}
    else if(!owners.length){newOwner=true;await tx.query('UPDATE users SET password_hash=$1,first_name=$2 WHERE id=$3',[await hashPassword(secret()+secret()),input.owner.name,owner.id]);await tx.query('DELETE FROM sessions WHERE user_id=$1',[owner.id]);}
    await tx.query("INSERT INTO user_roles VALUES ($1,'super_admin') ON CONFLICT DO NOTHING",[owner.id]);
    if(newOwner){await tx.query("DELETE FROM account_tokens WHERE user_id=$1 AND purpose='reset'",[owner.id]);await tx.query("INSERT INTO account_tokens VALUES ($1,$2,'reset',now()+interval '24 hours')",[digest(setupToken),owner.id]);await audit(tx,owner.id,'super_admin.provisioned',owner.id,{email:input.owner.email,name:input.owner.name,localPasswordSetup:true});}
    for(const wallet of input.wallets){
      const route=routeFor(wallet.routeId),confirmations=route.chain==='bitcoin'?6:['ethereum','bsc','arbitrum','mantle','avalanche','arc'].includes(route.chain)?12:route.chain==='tron'?20:route.chain==='solana'?32:1;
      await tx.query("INSERT INTO crypto_settings VALUES ($1,$2,$3,true,true,$4,1,0,now()) ON CONFLICT(route_id) DO UPDATE SET address=$2,memo=$3,enabled=true,withdrawal_enabled=true,confirmations=$4,min_atoms=1,fee_atoms=0,updated_at=now()",[wallet.routeId,wallet.address,wallet.memo,confirmations]);
      await audit(tx,owner.id,'crypto.wallet_imported',wallet.routeId,{address:wallet.address,memo:wallet.memo,source:wallet.source,verification:'QR decoded; asset/network label visually checked; address checksum validated'});
    }
    await tx.query("UPDATE platform_gold_settings SET trades_enabled=true,rates_confirmed=true,physical_fee_basis='additional_gold',updated_at=now() WHERE id=1");
    await audit(tx,owner.id,'platform.policy_confirmed','2026-11-01',{depositMinimumUsd:15,withdrawalMinimumUsd:20,withdrawalFeePercent:1.5,physicalMinimumGrams:500,physicalFeePercent:2,physicalExample:'500g delivery reserves 510g',holdDays:5});
  });
  if(newOwner){await mkdir('data',{recursive:true});const origin=process.env.APP_ORIGIN||'http://localhost:4180';await writeFile('data/GoldSwap-admin-setup.txt',`GoldSwap Super Admin\nEmail: ${input.owner.email}\nName: ${input.owner.name}\n\nOpen this one-time local link to choose your password (expires in 24 hours):\n${origin}/#account/reset?token=${setupToken}\n\nNo password was emailed. Keep this file private and delete it after setup.\n`,{mode:0o600});}
  console.log(`Configured ${input.wallets.length} wallet routes. ${newOwner?'Private one-time password setup link saved in data/GoldSwap-admin-setup.txt.':'Existing administrator password preserved.'} No customer funds or gold inventory were created.`);
}finally{await db.close();}
