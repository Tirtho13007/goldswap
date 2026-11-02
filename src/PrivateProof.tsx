import { useEffect,useState } from 'react';
export default function PrivateProof({id}:{id:string}){
  const [url,setUrl]=useState(''),[message,setMessage]=useState(''),[loading,setLoading]=useState(false);
  useEffect(()=>()=>{if(url)URL.revokeObjectURL(url);},[url]);
  const preview=async()=>{setLoading(true);setMessage('');try{const r=await fetch('/api/v1/files/'+id,{credentials:'same-origin'});if(!r.ok)throw Error('Document access is unavailable.');const b=await r.blob();if(!b.type.startsWith('image/')){setMessage('PDF document: use Download to review it in your PDF viewer.');return;}setUrl(URL.createObjectURL(b));}catch(e){setMessage((e as Error).message);}finally{setLoading(false);}};
  return <div className="proof-preview"><button type="button" disabled={loading} onClick={()=>void preview()}>{loading?'Loading proof…':'View proof / document'}</button><a href={'/api/v1/files/'+id}>Download</a>{url&&<img src={url} alt="Private request evidence for staff review"/>}{message&&<p role="status">{message}</p>}</div>;
}
