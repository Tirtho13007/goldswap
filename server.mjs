import { installSeo } from './backend/seo.ts';
import { processCustomerEvents } from './backend/customer-services.ts';
import { deliverMail } from './backend/mail.ts';
import { settleMatureTrades } from './backend/gold.ts';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchMarketSnapshot } from './market-provider.mjs';
import { connectDatabase, migrate } from './backend/db.ts';
import { createApi } from './backend/api.ts';
const db = await connectDatabase();
await migrate(db);
let settling = false;
const settle = async () => { if(settling)return;settling=true;try{await settleMatureTrades(db);}catch(error){console.error('Gold settlement failed',error.code||error.name);}finally{settling=false;} };
await settle();
const settlementTimer=setInterval(()=>void settle(),15000);
settlementTimer.unref();
const app = express();
const origin = process.env.APP_ORIGIN || 'http://localhost:' + (process.env.PORT || 4173);
let servicing=false;
const service=async()=>{if(servicing)return;servicing=true;try{await processCustomerEvents(db,origin);await deliverMail(db);}catch(error){console.error('Account service worker failed',error.code||error.name);}finally{servicing=false;}};
await service();const serviceTimer=setInterval(()=>void service(),15000);serviceTimer.unref();
const parsedOrigin = new URL(origin);
if (parsedOrigin.origin !== origin || (process.env.NODE_ENV === 'production' && parsedOrigin.protocol !== 'https:')) throw new Error('APP_ORIGIN must be an exact origin; HTTPS is required in production.');
app.use('/api/v1',(_req,res,next)=>{res.set('X-Robots-Tag','noindex, nofollow');next();}, createApi(db, origin));
const root = path.dirname(fileURLToPath(import.meta.url));
app.disable('x-powered-by');
app.use((_req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin'); next(); });
app.get('/health', (_req, res) => res.json({ status: 'ok', mode: 'backend-foundation' }));
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
for (const signal of ['SIGTERM','SIGINT']) process.on(signal, () => {clearInterval(settlementTimer);clearInterval(serviceTimer);server.close(async () => { await db.close(); process.exit(0); });});
