import { ActionButton } from './ActionButton';
import ProfileWallet from './ProfileWallet';
import { AccountLinkPage } from './CustomerExperience';
import StaffDashboard from './StaffDashboard';
import './account.css';
import DashboardLayout from './DashboardLayout';
import { lazy, Suspense, useEffect, useState } from 'react';
const AccountForm=lazy(()=>import('./AccountForm'));
import { api } from './api';
import type { AccountUser } from './api';

export default function AccountPage(){
  const [user,setUser]=useState<AccountUser|null>(null),[message,setMessage]=useState('Loading account…'),[roles,setRoles]=useState<string[]>([]),[permissions,setPermissions]=useState<string[]>([]),[busy,setBusy]=useState(false);
  const [register,setRegister]=useState(false);
  const route=location.hash;
  const operation=route.startsWith('#account/verify')?'verify':route.startsWith('#account/reset')?'reset':null;
  const token=new URLSearchParams(route.split('?')[1]||'').get('token');
  useEffect(()=>{
    if(operation&&token){setMessage('Choose a strong password to finish account setup.');return;}
    let disposed=false;
    const load=()=>void api('/me').then(data=>{if(disposed)return;setUser(data.user);setRoles(data.access.roles);setPermissions(data.access.permissions);setMessage('');}).catch(error=>{if(disposed)return;setMessage(error.message);if(error.message==='Sign in to continue.'){setUser(null);setRoles([]);setPermissions([]);}});
    load();const timer=setInterval(()=>{if(!document.hidden)load();},30000);return()=>{disposed=true;clearInterval(timer);};
  },[operation,token]);
  useEffect(()=>{if(!user)return;const media=matchMedia('(prefers-color-scheme: dark)');const update=()=>document.documentElement.dataset.accountTheme=user.theme==='system'?(media.matches?'dark':'light'):user.theme;update();media.addEventListener('change',update);return()=>{media.removeEventListener('change',update);delete document.documentElement.dataset.accountTheme;};},[user?.theme]);
  const act=async(work:()=>Promise<void>)=>{setBusy(true);setMessage('');try{await work();}catch(error){setMessage((error as Error).message);}finally{setBusy(false);}};
  if(operation&&token)return <AccountLinkPage purpose={operation} token={token}/>;
  if(!user)return <main className="account-shell guest-account-page"><a href="#home" className="guest-back">← Back to GoldSwap</a><section className="guest-account-card"><a className="guest-brand" href="#home">GoldSwap<span>.</span></a><p className="account-eyebrow">Your gold workspace</p><h1>{register?'Your next chapter.':'Welcome back.'}</h1><p className="account-muted">{register?'Create your account and make it yours.':'Sign in to your gold workspace.'}</p>{message==='Loading account…'?<p role="status">Loading your account…</p>:<><div className="guest-account-tabs"><ActionButton aria-pressed={!register} onClick={()=>setRegister(false)}>Log in</ActionButton><ActionButton aria-pressed={register} onClick={()=>setRegister(true)}>Create account</ActionButton></div><Suspense fallback={<p>Loading form…</p>}><AccountForm key={register?'register':'login'} register={register}/></Suspense></>}<p className="guest-account-note">Email verification can be completed after you enter your dashboard.</p></section></main>;
  if(roles.some(r=>['super_admin','admin','moderator'].includes(r))||permissions.length>0)return <StaffDashboard user={user} roles={roles} permissions={permissions} onTheme={theme=>void act(async()=>{const result=await api('/me',{theme},'PATCH');setUser(result.user);})}/>;
  return <main className="account-shell"><header><a href="#home">GoldSwap<span>.</span></a><ActionButton pending={busy} disabled={busy} onClick={()=>void act(async()=>{await api('/auth/logout',{});location.hash='home';location.reload();})}>Sign out</ActionButton></header><DashboardLayout permissions={permissions} user={user} busy={busy} onTheme={theme=>void act(async()=>{const result=await api('/me',{theme},'PATCH');setUser(result.user);})} onVerify={()=>void act(async()=>setMessage((await api('/auth/resend-verification',{})).message))}><ProfileWallet user={user} roles={roles} busy={busy} message={message} onVerify={()=>void act(async()=>setMessage((await api('/auth/resend-verification',{})).message))} onSave={async data=>{await act(async()=>{const result=await api('/me',data,'PATCH');setUser(result.user);setMessage('Profile saved.');});}}/></DashboardLayout><p role="status" aria-live="polite">{message}</p></main>;
}
