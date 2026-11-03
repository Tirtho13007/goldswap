import { createHash,timingSafeEqual } from 'node:crypto';
import { base58,base58xrp,bech32,bech32m } from '@scure/base';
import { CRYPTO_ROUTES } from '../shared/crypto.js';
import { ApiError } from './security.js';
export const routeFor=(id:string)=>{const route=CRYPTO_ROUTES.find(r=>r.id===id);if(!route)throw new ApiError(400,'Choose a supported crypto asset and network.');return route;};
export function atoms(value:string,precision:number){if(!/^\d{1,30}(\.\d+)?$/.test(value))throw new ApiError(400,'Enter a positive decimal amount.');const [whole,dec='']=value.split('.');if(dec.length>precision)throw new ApiError(400,`This asset supports up to ${precision} decimal places.`);const n=BigInt(whole)*10n**BigInt(precision)+BigInt(dec.padEnd(precision,'0'));if(n<=0n)throw new ApiError(400,'Amount must be above zero.');return n;}
export function decimal(value:string|bigint,precision:number){const n=BigInt(value),unit=10n**BigInt(precision);const fraction=(n%unit).toString().padStart(precision,'0').replace(/0+$/,'');return (n/unit).toString()+(fraction?'.'+fraction:'');}
function checked58(address:string,xrp=false){const decoded=Buffer.from((xrp?base58xrp:base58).decode(address));if(decoded.length<5)throw Error('Address');const data=decoded.subarray(0,-4),hash=createHash('sha256').update(createHash('sha256').update(data).digest()).digest().subarray(0,4);if(!timingSafeEqual(hash,decoded.subarray(-4)))throw Error('Checksum');return data;}
export function validateAddress(id:string,address:string,memo=''){
  const route=routeFor(id);try{
    if(['ethereum','bsc','arbitrum','mantle','avalanche','arc'].includes(route.chain)){if(!/^0x[0-9a-fA-F]{40}$/.test(address)||/^0x0{40}$/i.test(address))throw Error();}
    else if(route.chain==='solana'){if(base58.decode(address).length!==32)throw Error();}
    else if(route.chain==='ton'){if(!/^[EU][Qf][A-Za-z0-9_-]{46}$/.test(address))throw Error();const b=Buffer.from(address,'base64url');if(b.length!==36||![0x11,0x51].includes(b[0])||![0,255].includes(b[1]))throw Error();let crc=0;for(const byte of b.subarray(0,34)){crc^=byte<<8;for(let i=0;i<8;i++)crc=(crc&0x8000)?((crc<<1)^0x1021)&0xffff:(crc<<1)&0xffff;}if(b.readUInt16BE(34)!==crc)throw Error();}
    else if(route.chain==='tron'){const data=checked58(address);if(data.length!==21||data[0]!==0x41)throw Error();}
    else if(route.chain==='xrp'){const data=checked58(address,true);if(data.length!==21||data[0]!==0||!/^\d{1,10}$/.test(memo)||BigInt(memo)>4294967295n)throw Error();}
    else if(/^bc1/i.test(address)){const d=bech32.decodeUnsafe(address)||bech32m.decodeUnsafe(address);if(!d||d.prefix!=='bc'||!d.words.length)throw Error();const version=d.words[0];const program=bech32.fromWords(d.words.slice(1));if(version>16||program.length<2||program.length>40)throw Error();if(version===0){bech32.decode(address);if(![20,32].includes(program.length))throw Error();}else bech32m.decode(address);}
    else {const data=checked58(address);if(data.length!==21||![0,5].includes(data[0]))throw Error();}
  }catch{throw new ApiError(400,'Invalid mainnet address or required XRP destination tag.');}
}
export function transactionHash(value:string,chain?:string){
  if(chain==='solana'){try{if(base58.decode(value).length===64)return value;}catch{}throw new ApiError(400,'Enter a complete Solana transaction signature.');}
  if(chain==='ton'&&!/^(0x)?[a-fA-F0-9]{64}$/.test(value)){try{const b=Buffer.from(value,'base64url');if(b.length===32&&/^[A-Za-z0-9+/_-]{43}=?$/.test(value))return b.toString('hex');}catch{}}
  if(!/^(0x)?[a-fA-F0-9]{64}$/.test(value))throw new ApiError(400,'Enter a complete blockchain transaction hash.');return value.toLowerCase().replace(/^0x/,'');
}
