import { ActionButton } from './ActionButton';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from './Avatar';
import { api } from './api';
import type { AccountUser } from './api';
import type { DashboardData } from '../shared/dashboard';
export function DemoPreview({data,onSelect}:{data:DashboardData|null;onSelect:(data:DashboardData)=>void}){
  const [users,setUsers]=useState<AccountUser[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const initialized=useRef(false);
  useEffect(()=>{void api('/demo/users').then(d=>setUsers(d.users)).catch(()=>{});},[]);
  useEffect(()=>{if(initialized.current||!data||!users.length)return;initialized.current=true;const name=new URLSearchParams(location.search).get('demo');const selected=users.find(u=>u.firstName.toLowerCase()===name?.toLowerCase());if(selected)void api<DashboardData>(`/demo/dashboard/${selected.id}`).then(onSelect).catch(e=>setError(e.message));},[users,data,onSelect]);
  if(!users.length)return null;
  const choose=async(id:string)=>{if(busy)return;setBusy(true);setError('');try{onSelect(await api(id?`/demo/dashboard/${id}`:'/dashboard'));const url=new URL(location.href);const selected=users.find(u=>u.id===id);if(selected)url.searchParams.set('demo',selected.firstName.toLowerCase());else url.searchParams.delete('demo');history.replaceState(null,'',url);}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  return <aside className="demo-preview" aria-label="Illustrative data preview"><div><span className="demo-label">ILLUSTRATIVE STUDIO</span><strong>{data?.isDemo?'Sample data · '+data.demoName:'See your dashboard come to life.'}</strong><p>{data?.isDemo?'Illustrative balances and trades. No real funds or payouts.':'Explore four sample portfolios without changing your account.'}</p></div><div className="demo-users">{users.map(user=><ActionButton key={user.id} pending={busy} disabled={busy} aria-label={'Preview '+user.firstName+' illustrative profile'} aria-pressed={data?.demoName===user.firstName+' '+user.lastName} onClick={()=>void choose(user.id)}><Avatar seed={user.avatarSeed} name={user.firstName}/><span>{user.firstName}</span></ActionButton>)}{data?.isDemo&&<ActionButton className="demo-exit" pending={busy} disabled={busy} onClick={()=>void choose('')}>My data</ActionButton>}</div>{error&&<p role="alert">{error}</p>}</aside>;
}
