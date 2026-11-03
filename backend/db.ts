import { readFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Pool } from 'pg';

export interface Sql {
  query<T = Record<string, any>>(sql: string, params?: any[]): Promise<{rows: T[]}>;
  transaction<T>(work: (sql: Sql) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
export async function connectDatabase(): Promise<Sql> {
  if (process.env.DATABASE_URL) {
    const connection=new URL(process.env.DATABASE_URL);
    const verifiedTls=process.env.NODE_ENV==='production'&&!['localhost','127.0.0.1','[::1]'].includes(connection.hostname);
    if(verifiedTls)for(const option of ['sslmode','sslrootcert','sslcert','sslkey'])connection.searchParams.delete(option);
    const pool = new Pool({connectionString: connection.toString(), ...(verifiedTls?{ssl:{rejectUnauthorized:true,ca:process.env.DATABASE_CA_CERT||undefined}}:{}), max: Number(process.env.DB_POOL_MAX || 5), connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000});
    pool.on('error',()=>console.error('Database pool connection failed'));
    const wrap = (client: any): Sql => ({
      query: (sql, params) => client.query(sql, params),
      transaction: async work => {
        if(client !== pool) throw new Error('Nested database transactions are not supported; use the current transaction client.');
        const conn = await pool.connect();
        try { await conn.query('BEGIN'); const result = await work(wrap(conn)); await conn.query('COMMIT'); return result; }
        catch (error) { await conn.query('ROLLBACK'); throw error; }
        finally { conn.release(); }
      }, close: () => pool.end()
    });
    return wrap(pool);
  }
  if (process.env.NODE_ENV === 'production') throw new Error('DATABASE_URL is required in production.');
  const { PGlite } = await import('@electric-sql/pglite');
  const location = process.env.LOCAL_DATABASE_PATH === ':memory:' ? undefined : process.env.LOCAL_DATABASE_PATH || './data/goldswap.pglite';
  if(location) await mkdir(dirname(location),{recursive:true});
  const embedded = new PGlite(location);
  const wrap = (client: any): Sql => ({
    query: (sql, params) => client.query(sql, params),
    transaction: work => embedded.transaction(tx => work(wrap(tx))),
    close: () => embedded.close()
  });
  return wrap(embedded);
}
export const PERMISSIONS = [
  'users.view','users.restrict','users.delete','kyc.view','kyc.review','deposits.view','deposits.review',
  'withdrawals.view','withdrawals.review','withdrawals.process','trades.view','settlements.review',
  'support.view','support.reply','support.assign','reports.view','reports.export',
  'configuration.manage','roles.manage','audit.view','adjustments.review'
];
export async function migrate(db: Sql) {
  await db.transaction(async tx => {
    await tx.query('SELECT pg_advisory_xact_lock(784102)');
    await tx.query('CREATE TABLE IF NOT EXISTS schema_migrations (id text PRIMARY KEY, applied_at timestamptz DEFAULT now())');
    for(const migration of ['001_identity','002_demo','003_operations','004_platform_gold','005_staff_control','006_wallet_swap','007_customer_services','008_production','009_inventory_adjustments']){
    const {rows} = await tx.query('SELECT id FROM schema_migrations WHERE id=$1', [migration]);
    if (!rows.length) {
      const script = await readFile(new URL(`../database/migrations/${migration}.sql`, import.meta.url), 'utf8');
      for (const statement of script.split(';').map(s=>s.trim()).filter(Boolean)) await tx.query(statement);
      await tx.query('INSERT INTO schema_migrations(id) VALUES ($1)', [migration]);
    }
    }
    for (const id of PERMISSIONS) await tx.query('INSERT INTO permissions(id) VALUES ($1) ON CONFLICT DO NOTHING',[id]);
    for (const id of ['user','moderator','admin','super_admin']) {
      await tx.query('INSERT INTO roles(id,name) VALUES ($1,$2) ON CONFLICT DO NOTHING',[id,id.replaceAll('_',' ')]);
    }
  });
}
