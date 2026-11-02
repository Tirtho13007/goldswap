export type AccountUser={avatarSeed:string;isDemo:boolean;id:string;email:string;firstName:string;lastName:string;country:string;phone:string;theme:'light'|'dark'|'system';emailVerified:boolean;address:{line1?:string;line2?:string;city?:string;region?:string;postalCode?:string}};
let reauthentication:Promise<boolean>|null=null;
export async function api<T=any>(path:string,body?:unknown,method?:string,retried=false):Promise<T>{
  if(location.protocol==='file:') throw new Error('Open the running GoldSwap server to use account services.');
  const response=await fetch(`/api/v1${path}`,{method:method??(body?'POST':'GET'),credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
  if(response.status===204)return undefined as T;
  const data=await response.json();if(!retried&&data.code==='STAFF_REAUTH_REQUIRED'){if(!reauthentication)reauthentication=new Promise<boolean>(resolve=>window.dispatchEvent(new CustomEvent('goldswap:reauth',{detail:{resolve}}))).finally(()=>{reauthentication=null;});if(await reauthentication)return api<T>(path,body,method,true);throw new Error('Staff confirmation cancelled. No action was taken.');}if(!response.ok)throw new Error(data.error||'Request failed.');return data;
}
