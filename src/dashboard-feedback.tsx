import { useEffect, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent } from 'react';
import { Volume2, Vibrate, Sparkles } from 'lucide-react';
type Preferences={sound:boolean;haptics:boolean;motion:boolean};
export function useDashboardFeedback(userId:string){
  const storageKey=`goldswap.interactions.${userId}`;
  const [preferences,setPreferences]=useState<Preferences>(()=>{
    try{const stored=JSON.parse(localStorage.getItem(storageKey)||'{}');return {sound:typeof stored.sound==='boolean'?stored.sound:true,haptics:typeof stored.haptics==='boolean'?stored.haptics:true,motion:typeof stored.motion==='boolean'?stored.motion:true};}
    catch{return {sound:true,haptics:true,motion:true};}
  });
  const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible,setVisible]=useState(!document.hidden);
  const audio=useRef<AudioContext|null>(null);
  useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(media.matches),visibility=()=>setVisible(!document.hidden);media.addEventListener('change',update);document.addEventListener('visibilitychange',visibility);return()=>{media.removeEventListener('change',update);document.removeEventListener('visibilitychange',visibility);void audio.current?.close().catch(()=>{});};},[]);
  const reducedMotion=reduced||!preferences.motion||!visible;
  const feedback=(override?:Preferences)=>{
    const prefs=override||preferences;
    if(prefs.haptics&&typeof navigator.vibrate==='function'){try{navigator.vibrate(8);}catch{/* Visual feedback remains available. */}}
    if(!prefs.sound||document.hidden)return;
    try{
      const context=audio.current??(audio.current=new AudioContext());
      const play=()=>{const tone=context.createOscillator(),gain=context.createGain(),now=context.currentTime;tone.type='sine';tone.frequency.setValueAtTime(640,now);tone.frequency.exponentialRampToValueAtTime(440,now+.055);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.035,now+.006);gain.gain.exponentialRampToValueAtTime(.0001,now+.065);tone.connect(gain);gain.connect(context.destination);tone.start(now);tone.stop(now+.07);tone.onended=()=>{tone.disconnect();gain.disconnect();};};
      if(context.state==='suspended')void context.resume().then(play).catch(()=>{});else if(context.state==='running')play();
    }catch{/* Audio may be unavailable or blocked by the browser. */}
  };
  const update=(key:keyof Preferences,value:boolean)=>{
    const next={...preferences,[key]:value};setPreferences(next);
    try{localStorage.setItem(storageKey,JSON.stringify(next));}catch{/* Private browsing can block storage. */}
    // Enabling sound gives immediate confirmation; turning sound off stays silent.
    feedback(next);
  };
  const onClickCapture=(event:MouseEvent<HTMLDivElement>)=>{
    const button=(event.target as Element).closest('button,[role=button]');
    if(button&&!(button instanceof HTMLButtonElement&&button.disabled)&&!button.closest('[data-feedback-control]'))feedback();
  };
  const onPointerDownCapture=(event:PointerEvent<HTMLDivElement>)=>{
    const button=(event.target as Element).closest('button,[role=button]');
    if(!(button instanceof HTMLButtonElement)||button.disabled||reducedMotion)return;
    button.animate([{transform:'scale(1)'},{transform:'scale(.955)'},{transform:'scale(1)'}],{duration:240,easing:'cubic-bezier(.2,.8,.2,1)'});
  };
  return {preferences,update,reducedMotion,onClickCapture,onPointerDownCapture};
}
export function InteractionSettings({feedback}:{feedback:ReturnType<typeof useDashboardFeedback>}){
  return <section className="interaction-settings" aria-label="Interaction preferences" data-feedback-control><h2>Make it feel like you.</h2><p>Small details. A smoother experience.</p>{([
    {key:'sound',title:'Interface sounds',description:'Soft tones when you tap and switch.',icon:Volume2},
    {key:'haptics',title:'Touch feedback',description:'A light tap on supported devices.',icon:Vibrate},
    {key:'motion',title:'Fluid animations',description:'Smooth transitions and ambient movement.',icon:Sparkles},
  ] as const).map(({key,title,description,icon:Icon})=><div className="interaction-setting" key={key}><Icon size={18}/><div><strong>{title}</strong><small>{description}</small></div><button role="switch" aria-label={title} aria-checked={feedback.preferences[key]} onClick={()=>feedback.update(key,!feedback.preferences[key])}><span/></button></div>)}<small className="interaction-footnote">Saved on this device. System reduced-motion preferences are always respected.</small></section>;
}
