async (page) => {
  // Evaluate this function with the connected preview browser on the currently open page.
  // Does not submit forms, click actions, or change account permissions/data.
  // Keyboard-only skip links are tested separately; they are intentionally offscreen until focused.
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(() => {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    const rgba=value=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=value;ctx.fillRect(0,0,1,1);return Array.from(ctx.getImageData(0,0,1,1).data).map((n,i)=>i===3?n/255:n);};
    const mix=(a,b)=>[0,1,2].map(i=>a[i]*a[3]+b[i]*(1-a[3])).concat(1);
    const backgrounds=(el,depth=0)=>{
      if(!el||depth>18)return [[255,255,255,1]];
      const s=getComputedStyle(el),c=rgba(s.backgroundColor);
      let base=c[3]>.999?[c]:backgrounds(el.parentElement,depth+1).map(b=>mix(c,b));
      if(s.backgroundImage!=='none'){
        const stops=s.backgroundImage.match(/rgba?\([^)]*\)|color\([^)]*\)|oklch\([^)]*\)|oklab\([^)]*\)/g)||[];
        if(stops.length)base=stops.flatMap(stop=>base.map(b=>mix(rgba(stop),b))).slice(0,12);
      }
      return base;
    };
    const luminance=c=>{const v=c.slice(0,3).map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;});return v[0]*.2126+v[1]*.7152+v[2]*.0722;};
    const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
    window.__goldswapInteractionCheck=(root,state)=>{
      const failures=[],text=(root.innerText||root.getAttribute('aria-label')||root.tagName).trim().slice(0,65);
      const inspect=(el,kind,min)=>{
        const s=getComputedStyle(el);if(s.visibility==='hidden'||s.display==='none'||!el.getClientRects().length)return;
        const foreground=rgba(s.color),bg=backgrounds(el);
        const ratio=Math.min(...bg.map(b=>contrast(mix(foreground,b),b)));
        if(ratio+0.04<min)failures.push({state,control:text,kind,ratio:Number(ratio.toFixed(2)),expected:min,foreground:s.color,backgrounds:bg.map(b=>b.slice(0,3).map(Math.round)),className:root.className});
      };
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),seen=new Set();let node;
      while(node=walker.nextNode()){if(!node.textContent.trim())continue;const el=node.parentElement;if(!el||el.closest('svg')||seen.has(el)||el.closest('[aria-hidden=true]'))continue;seen.add(el);const s=getComputedStyle(el);const large=parseFloat(s.fontSize)>=24||(parseFloat(s.fontSize)>=18.66&&Number(s.fontWeight)>=700);inspect(el,'text',large?3:4.5);}
      for(const svg of root.querySelectorAll('svg.lucide'))inspect(svg,'icon',3);
      for(const disc of root.querySelectorAll('.action-disc,.wallet-shortcut>span'))if(rgba(getComputedStyle(disc).backgroundColor)[3]<.99)failures.push({state,control:text,kind:'translucent accent icon',className:root.className});
      return failures;
    };
  });
  const dialogs=page.getByRole('dialog'),inDialog=await dialogs.count()>0;
  const scope=inDialog?dialogs.last():await page.locator('.dashboard-frame').count()?page.locator('.dashboard-frame'):await page.locator('.site').count()?page.locator('.site'):page.locator('main');
  await scope.waitFor({state:'visible'});
  const candidates=scope.locator('button:visible,a[href]:visible:not(.skip-link),input:visible:not([aria-hidden=true]),select:visible,textarea:visible');
  const chosen=[];const groups=new Set();
  for(let i=0;i<await candidates.count();i++){
    const info=await candidates.nth(i).evaluate(el=>({tag:el.tagName,classes:el.className,type:el.type||'',disabled:!!el.disabled,region:el.closest('.dash-nav')?'nav':el.closest('.dash-toolbar')?'toolbar':'content',tone:el.className.match(/tone-\w+/)?.[0]||''}));
    const group=info.region==='content'?info.tag+'|'+info.classes+'|'+info.type+'|'+info.disabled:info.region+'|'+info.tag;
    if(groups.has(group))continue;groups.add(group);chosen.push(i);
  }
  if(!chosen.length)throw new Error('No visible controls found; wait for the intended screen before auditing.');
  let states=0;const failures=[];
  for(const index of chosen){
    const el=candidates.nth(index);await el.scrollIntoViewIfNeeded();
    const disabled=await el.isDisabled();
    await page.mouse.move(2,2);await el.evaluate(e=>e.blur());
    failures.push(...await el.evaluate((e,state)=>window.__goldswapInteractionCheck(e,state),disabled?'disabled':'normal'));states++;
    if(disabled){await el.hover({timeout:2500});failures.push(...await el.evaluate(e=>window.__goldswapInteractionCheck(e,'disabled-hover')));states++;continue;}
    await el.hover({timeout:2500});await page.waitForTimeout(15);failures.push(...await el.evaluate(e=>window.__goldswapInteractionCheck(e,'hover')));states++;
    await page.mouse.move(2,2);await page.keyboard.press('Tab');await el.focus();
    failures.push(...await el.evaluate(e=>window.__goldswapInteractionCheck(e,'focus')));states++;
    const box=await el.boundingBox();if(!inDialog&&box&&await el.evaluate(e=>['BUTTON','A'].includes(e.tagName))){await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();try{failures.push(...await el.evaluate(e=>window.__goldswapInteractionCheck(e,'active')));states++;}finally{await page.mouse.move(2,2);await page.mouse.up();}}
    await el.evaluate(e=>e.blur());
  }
  await page.mouse.move(2,2);
  return {url:page.url(),theme:await page.evaluate(()=>document.documentElement.dataset.accountTheme||document.querySelector('.site')?.getAttribute('data-theme')||'default'),controls:chosen.length,states,failures};
}
