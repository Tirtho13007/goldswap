// Local preview uses its own database and never connects to production.
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
process.chdir(resolve(dirname(fileURLToPath(import.meta.url)),'..'));
Object.assign(process.env,{
  NODE_ENV:'development',
  PORT:'4180',
  APP_ORIGIN:'http://localhost:4180',
  LOCAL_DATABASE_PATH:'./data/local-preview.pglite',
  JOB_MODE:'external',
  MAIL_DELIVERY_ENABLED:'false',
  SEO_INDEXING_ENABLED:'false',
});
delete process.env.DATABASE_URL;
await import('../server.mjs');
