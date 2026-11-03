import { randomUUID } from 'node:crypto';
import { connectDatabase, migrate } from './db.js';
import { hashPassword } from './security.js';
import { z } from 'zod';
import { seedDemo } from './demo.js';
const db=await connectDatabase();
try {
  await migrate(db);
  const command=process.argv[2];
  if(command==='bootstrap'){
    const email=z.email().parse(process.env.BOOTSTRAP_EMAIL).toLowerCase();
    const password=z.string().min(14).max(128).parse(process.env.BOOTSTRAP_PASSWORD);
    const hash=await hashPassword(password);
    await db.transaction(async tx=>{
      await tx.query('SELECT pg_advisory_xact_lock(784103)');
      if((await tx.query("SELECT 1 FROM user_roles WHERE role_id='super_admin'")).rows.length) throw new Error('Super Admin already exists. Bootstrap is one-time only.');
      const id=randomUUID();
      await tx.query("INSERT INTO users(id,email,password_hash,first_name) VALUES ($1,$2,$3,'Owner')",[id,email,hash]);
      await tx.query("INSERT INTO user_roles VALUES ($1,'super_admin')",[id]);
      await tx.query("INSERT INTO audit_events(id,actor_id,action,target_id) VALUES ($1,$2,'super_admin.bootstrapped',$3)",[randomUUID(),id,id]);
    });console.log('Super Admin created. Enroll staff authenticator protection after sign-in before using production staff controls. Remove BOOTSTRAP_PASSWORD from your environment.');
  } else if(command==='mail'){
    if(process.env.NODE_ENV==='production') throw new Error('Local mailbox is disabled in production.');
    const {rows}=await db.query('SELECT recipient,subject,body,created_at FROM email_outbox WHERE sent_at IS NULL ORDER BY created_at DESC LIMIT 20');
    console.log(JSON.stringify(rows,null,2));
  } else if(command==='seed-demo'){await seedDemo(db);console.log('Four local demo accounts and sample snapshots created. See docs/DEMO.md.');}
  else if(command==='migrate') console.log('Database migrations applied.');
  else throw new Error('Usage: backend/cli.ts migrate | bootstrap | mail');
} finally {await db.close();}
