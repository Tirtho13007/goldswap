export type AccountUser={avatarSeed:string;isDemo:boolean;id:string;email:string;firstName:string;lastName:string;country:string;phone:string;theme:'light'|'dark'|'system';emailVerified:boolean;address:{line1?:string;line2?:string;city?:string;region?:string;postalCode?:string}};
export async function api<T=any>(path:string,body?:unknown,method?:string):Promise<T>{
  if(location.protocol==='file:') throw new Error('Open the running GoldSwap server to use account services.');
  const response=await fetch(`/api/v1${path}`,{method:method??(body?'POST':'GET'),credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
  if(response.status===204)return undefined as T;
  const data=await response.json();if(!response.ok)throw new Error(data.error||'Request failed.');return data;
}
