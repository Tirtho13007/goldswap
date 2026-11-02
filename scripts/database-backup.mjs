import { spawnSync } from 'node:child_process';
import { mkdir,stat } from 'node:fs/promises';
import { resolve } from 'node:path';
const mode=process.argv[2];
if(!['backup','restore-check'].includes(mode))throw Error('Use backup or restore-check.');
const raw=mode==='backup'?process.env.DATABASE_URL:process.env.RESTORE_DATABASE_URL;
if(!raw)throw Error('Set the database URL in environment settings.');
const url=new URL(raw),database=decodeURIComponent(url.pathname.slice(1));
if(mode==='restore-check'&&!/^goldswap_restore_[a-z0-9_]+$/.test(database))throw Error('Restore target must be a disposable database named goldswap_restore_…');
if(mode==='restore-check'&&raw===process.env.DATABASE_URL)throw Error('Restore verification cannot target the source database.');
const env={...process.env,PGHOST:url.hostname,PGPORT:url.port||'5432',PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGDATABASE:database,PGSSLMODE:url.searchParams.get('sslmode')||process.env.PGSSLMODE||'verify-full'};
// Credentials are supplied through environment variables, never command arguments or logs.
let file;
if(mode==='backup'){
 const directory=resolve(process.env.BACKUP_DIRECTORY||'backups');await mkdir(directory,{recursive:true});
 file=resolve(directory,'goldswap-'+new Date().toISOString().replace(/[:.]/g,'-')+'.dump');
 const r=spawnSync('pg_dump',['--format=custom','--no-owner','--no-acl','--file',file],{env,stdio:'pipe'});
 if(r.status!==0)throw Error('Database backup failed. Check PostgreSQL tools, TLS and permissions.');
 if((await stat(file)).size===0)throw Error('Backup archive is empty.');
 console.log('Backup archive created:',file);
}else{
 if(!process.env.BACKUP_FILE)throw Error('Set BACKUP_FILE to a previously created backup archive.');
 file=resolve(process.env.BACKUP_FILE);await stat(file);
 const r=spawnSync('pg_restore',['--no-owner','--no-acl','--exit-on-error','--dbname',database,file],{env,stdio:'pipe'});
 if(r.status!==0)throw Error('Restore verification failed. Use a new empty disposable database and inspect database/tool configuration.');
 console.log('Archive restored into the disposable database. Verify migrations, ledger and document decryption before recording the recovery drill as passed.');
}
