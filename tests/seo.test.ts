import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { mkdtemp,mkdir,writeFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installSeo } from '../backend/seo.js';
test('public SEO serves crawlable canonical content while account, preview and unknown pages stay unindexed',async()=>{
 const root=await mkdtemp(join(tmpdir(),'goldswap-seo-'));await mkdir(join(root,'dist'));await writeFile(join(root,'dist/index.html'),'<html><head><title>Original</title><meta name="description" content="original"/><meta name="robots" content="noindex,nofollow"/></head><body><div id="root"></div></body></html>');
 const old=process.env.NODE_ENV;process.env.NODE_ENV='production';process.env.SEO_INDEXING_ENABLED='true';const app=express();installSeo(app,root,'https://goldswap.example');const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const base='http://127.0.0.1:'+(server.address() as any).port;
 try{const r=await fetch(base+'/guides/fees?tracking=ignored'),html=await r.text();assert.equal(r.status,200);assert.match(html,/<h1>Fees and limits/);assert.match(html,/500 g delivery deducts 510 g/);assert.match(html,/href="https:\/\/goldswap.example\/guides\/fees"/);assert.match(html,/content="index,follow"/);assert.match(html,/application\/ld\+json/);const account=await fetch(base+'/account');assert.equal(account.headers.get('x-robots-tag'),'noindex,nofollow');assert.ok(!(await account.text()).includes('<nav'));const missing=await fetch(base+'/guides/does-not-exist');assert.equal(missing.status,404);const robots=await (await fetch(base+'/robots.txt')).text();assert.match(robots,/Disallow: \/account/);const sitemap=await(await fetch(base+'/sitemap.xml')).text();assert.match(sitemap,/\/guides\/fees/);assert.ok(!sitemap.includes('/account'));
 }finally{if(old===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=old;delete process.env.SEO_INDEXING_ENABLED;await new Promise<void>(r=>server.close(()=>r()));await rm(root,{recursive:true,force:true});}
});
