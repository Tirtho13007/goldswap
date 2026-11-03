import { ActionButton } from './ActionButton';
import { useEffect,useState } from 'react';
import { Eye,EyeOff,Download } from 'lucide-react';
export default function PrivateProof({id}:{id:string}){
  const [url,setUrl]=useState(''),[message,setMessage]=useState(''),[loading,setLoading]=useState(false);
  useEffect(()=>()=>{if(url)URL.revokeObjectURL(url);},[url]);
  const preview=async()=>{if(url){setUrl('');return;}setLoading(true);setMessage('');try{const r=await fetch('/api/v1/files/'+id,{credentials:'same-origin'});if(!r.ok)throw Error('Document access is unavailable.');const b=await r.blob();if(!b.type.startsWith('image/')){setMessage('PDF document: use Download to review it in your PDF viewer.');return;}setUrl(URL.createObjectURL(b));}catch(e){setMessage((e as Error).message);}finally{setLoading(false);}};
  return <div className="proof-preview"><ActionButton type="button" pending={loading} disabled={loading} onClick={()=>void preview()}>{url?<EyeOff size={16}/>:<Eye size={16}/>} {loading?'Loading proof…':url?'Hide proof':'View proof'}</ActionButton><a href={'/api/v1/files/'+id}><Download size={16}/>Download document</a>{url&&<img src={url} alt="Private request evidence for staff review"/>}{message&&<p role="status">{message}</p>}</div>;
}
