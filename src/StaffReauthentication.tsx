import { ActionButton } from './ActionButton';
import { useEffect,useRef,useState } from 'react';
import { api } from './api';
export default function StaffReauthentication(){
 const [request,setRequest]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),dialog=useRef<HTMLDialogElement>(null),prior=useRef<HTMLElement|null>(null);
 useEffect(()=>{const receive=(e:Event)=>{prior.current=document.activeElement as HTMLElement;setError('');setRequest((e as CustomEvent).detail);};window.addEventListener('goldswap:reauth',receive);return()=>window.removeEventListener('goldswap:reauth',receive);},[]);
 useEffect(()=>{if(request)dialog.current?.showModal();},[request]);
 const finish=(ok:boolean)=>{request?.resolve(ok);dialog.current?.close();setRequest(null);prior.current?.focus();};
 return <dialog ref={dialog} className="staff-reauth-dialog" aria-labelledby="staff-reauth-title" onCancel={e=>{e.preventDefault();if(!busy)finish(false);}}><form onSubmit={async e=>{e.preventDefault();const form=e.currentTarget,values=Object.fromEntries(new FormData(form));setBusy(true);setError('');try{await api('/security/reauth',values);form.reset();finish(true);}catch(err){setError((err as Error).message);}finally{setBusy(false);}}}><h2 id="staff-reauth-title">Confirm your identity</h2><p>Protect this staff action. Confirmation lasts five minutes on this device.</p><fieldset disabled={busy}><label>Current password<input name="password" type="password" autoComplete="current-password" maxLength={128} required autoFocus/></label><label>Authenticator or recovery code<input name="code" autoComplete="one-time-code" maxLength={100} required/></label><p role="alert">{error}</p><ActionButton type="submit" className="ops-primary">{busy?'Checking…':'Confirm & continue'}</ActionButton><ActionButton type="button" onClick={()=>finish(false)}>Cancel</ActionButton></fieldset></form></dialog>;
}
