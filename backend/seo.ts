import type { Express } from 'express';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SEO_PAGES } from '../shared/seo.js';
import { escapeHtml as e } from './mail.js';
export function installSeo(app:Express,root:string,origin:string){
 const indexing=process.env.NODE_ENV==='production'&&process.env.SEO_INDEXING_ENABLED==='true';
 app.get('/robots.txt',(_req,res)=>res.type('text/plain').send(indexing?`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /account\nDisallow: /data/\nSitemap: ${origin}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n'));
 app.get('/sitemap.xml',(_req,res)=>res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${indexing?Object.keys(SEO_PAGES).map(p=>`<url><loc>${e(origin+p)}</loc></url>`).join(''):''}</urlset>`));
 app.get(['/', '/account','/guides/:slug'],async(req,res)=>{
  const path=req.path,privatePage=path==='/account',page=SEO_PAGES[path]||SEO_PAGES['/'],known=privatePage||Boolean(SEO_PAGES[path]),robots=indexing&&!privatePage&&known?'index,follow':'noindex,nofollow';
  let html=await readFile(join(root,'dist/index.html'),'utf8');
  html=html.replace(/<title>.*?<\/title>/s,`<title>${e(privatePage?'Your account | GoldSwap':page.title)}</title>`).replace(/<meta name="description"[^>]*>/,`<meta name="description" content="${e(page.description)}"/>`).replace(/<meta name="robots"[^>]*>/,`<meta name="robots" content="${robots}"/>`);
  const canonical=origin+(known?path:'/');
  const structured=JSON.stringify({'@context':'https://schema.org','@type':'WebSite',name:'GoldSwap',url:origin+'/'}).replace(/</g,'\\u003c');
  html=html.replace('</head>',`<link rel="canonical" href="${e(canonical)}"/><meta property="og:type" content="website"/><meta property="og:title" content="${e(page.title)}"/><meta property="og:description" content="${e(page.description)}"/><meta property="og:url" content="${e(canonical)}"/><meta name="twitter:card" content="summary"/>${privatePage?'':`<script type="application/ld+json">${structured}</script>`}</head>`);
  if(!privatePage)html=html.replace('<div id="root"></div>',`<div id="root"><header><a href="/">GoldSwap</a></header><main><h1>${e(known?page.title:'Page not found')}</h1><p>${e(page.description)}</p>${known?page.sections.map(([h,p])=>`<section><h2>${e(h)}</h2><p>${e(p)}</p></section>`).join(''):''}<nav aria-label="GoldSwap guides">${Object.entries(SEO_PAGES).filter(([p])=>p!=='/').map(([p,d])=>`<a href="${e(p)}">${e(d.title.split(' |')[0])}</a> `).join('')}</nav></main></div>`);
  res.status(known?200:404).set('X-Robots-Tag',robots).type('html').send(html);
 });
}
