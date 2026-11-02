import { createConnection } from 'node:net';
import { ApiError } from './security.js';
// Use a private, firewalled clamd endpoint; documents never go to a public scanning API.
export async function scanUpload(bytes:Buffer){
 const host=process.env.CLAMAV_HOST;
 if(!host){if(process.env.NODE_ENV==='production')throw new ApiError(503,'Document screening is temporarily unavailable.');return;}
 await new Promise<void>((resolve,reject)=>{
  const socket=createConnection({host,port:Number(process.env.CLAMAV_PORT||3310)});let response='',finished=false;
  const fail=(error:Error)=>{if(finished)return;finished=true;socket.destroy();reject(error);};
  socket.setTimeout(15000,()=>fail(new ApiError(503,'Document screening is temporarily unavailable.')));
  socket.on('error',()=>fail(new ApiError(503,'Document screening is temporarily unavailable.')));
  socket.on('connect',()=>{socket.write(Buffer.from('zINSTREAM\0'));for(let offset=0;offset<bytes.length;offset+=65536){const chunk=bytes.subarray(offset,offset+65536),size=Buffer.alloc(4);size.writeUInt32BE(chunk.length);socket.write(size);socket.write(chunk);}socket.write(Buffer.alloc(4));});
  socket.on('data',b=>{response+=b.toString();if(response.length>4096)return fail(new ApiError(503,'Document screening is temporarily unavailable.'));if(!response.includes('\0'))return;if(response.trim().replace(/\0/g,'')==='stream: OK'){finished=true;socket.destroy();resolve();}else fail(new ApiError(response.includes('FOUND')?400:503,response.includes('FOUND')?'This file failed document screening. Choose a clean file.':'Document screening is temporarily unavailable.'));});
  socket.on('close',()=>{if(!finished)fail(new ApiError(503,'Document screening is temporarily unavailable.'));});
 });
}
