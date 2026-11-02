import { installSeo } from './backend/seo.ts';
import { validateDeployment } from './backend/production.ts';
import { startJobs } from './backend/jobs.ts';
import { randomUUID } from 'node:crypto';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchMarketSnapshot } from './market-provider.mjs';
import { connectDatabase, migrate } from './backend/db.ts';
import { createApi } from './backend/api.ts';
validateDeployment();
const db = await connectDatabase();
if(process.env.NODE_ENV!=='production')await migrate(db);
const app = express();
const origin = process.env.APP_ORIGIN || 'http://localhost:' + (process.env.PORT || 4173);
const stopJobs=process.env.JOB_MODE==='external'?async()=>{}:startJobs(db,origin);
const parsedOrigin = new URL(origin);
if (parsedOrigin.origin !== origin || (process.env.NODE_ENV === 'production' && parsedOrigin.protocol !== 'https:')) throw new Error('APP_ORIGIN must be an exact origin; HTTPS is required in production.');
const root = path.dirname(fileURLToPath(import.meta.url));
const production=process.env.NODE_ENV==='production';
app.disable('x-powered-by');
app.set('trust proxy',Number(process.env.TRUST_PROXY_HOPS||0));
app.use((req,res,next)=>{
 const requestId=randomUUID();res.setHeader('X-Request-ID',requestId);
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
 res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');
 if(production){
  res.setHeader('Strict-Transport-Security','max-age=31536000');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  if(!req.secure&&!['/health','/ready'].includes(req.path))return res.redirect(308,origin+req.originalUrl);
 }
 res.on('finish',()=>{if(res.statusCode>=500)console.error(JSON.stringify({event:'http_error',requestId,status:res.statusCode}));});next();
});
app.get('/health',(_req,res)=>res.json({status:'ok'}));
app.get('/ready',async(_req,res)=>{try{
 await db.query('SELECT 1');
 const migrated=(await db.query("SELECT 1 FROM schema_migrations WHERE id='008_production'")).rows.length;
 const healthy=(await db.query("SELECT 1 FROM worker_health WHERE name='account-services' AND last_success_at>now()-interval '5 minutes'")).rows.length;
 if(!migrated||!healthy)return res.status(503).json({status:'not_ready'});
 res.json({status:'ready'});
}catch{res.status(503).json({status:'not_ready'});}});
app.use('/api/v1',(_req,res,next)=>{res.set('X-Robots-Tag','noindex, nofollow');next();},createApi(db,origin));
let marketCache = null;
let cacheTime = 0;
let pendingMarket = null;
app.get('/api/markets', async (_req, res) => {
  try {
    if (!marketCache || Date.now() - cacheTime >= 30000) {
      if (!pendingMarket) pendingMarket = fetchMarketSnapshot().then(result => { marketCache = result; cacheTime = Date.now(); return result; }).finally(() => { pendingMarket = null; });
      await pendingMarket;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json(marketCache);
  } catch { res.status(503).json({ error: 'Market feed is temporarily unavailable' }); }
});
// Real customer activity is never generated. Add a verified, consent-aware data source here.
app.get('/api/activity', (_req, res) => res.json({ events: [], connected: false }));
app.use('/api', (_req,res) => res.status(404).json({error:'API endpoint not found.'}));
app.use('/assets', express.static(path.join(root, 'dist/assets'), { maxAge: '1y', immutable: true }));
installSeo(app,root,origin);
app.use(express.static(path.join(root, 'dist'), { maxAge: 0,index:false }));
app.get('/{*path}', (_req, res) => res.status(404).set('X-Robots-Tag','noindex, nofollow').sendFile(path.join(root, 'dist/index.html')));
const port = Number(process.env.PORT) || 4173;
const server = app.listen(port, process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1', () => console.log(`GoldSwap preview: http://localhost:${port}`));
let closing=false;
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{if(closing)return;closing=true;
 const deadline=setTimeout(()=>process.exit(1),30000);deadline.unref();
 server.close(async()=>{await stopJobs();await db.close();clearTimeout(deadline);process.exit(0);});
});
