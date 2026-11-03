const palettes=[['#e1f5ed','#62b995','#338568'],['#fff0dd','#edb473','#a97040'],['#f0e9ff','#ae8bdb','#7551a0'],['#e7f1ff','#83b5dc','#447ea8'],['#ffe8ed','#e69daa','#ad6477'],['#e8f6f3','#82c6bd','#46938a']];
export function Avatar({seed,name,className=''}:{seed:string;name:string;className?:string}){
  const hash=Array.from(seed||name).reduce((h,c)=>(Math.imul(h,31)+c.charCodeAt(0))>>>0,17);
  const animal=hash%6,[background,fur,dark]=palettes[Math.floor(hash/6)%palettes.length];
  const label=['bunny','cat','bear','fox','panda','owl'][animal];
  return <svg className={'cute-avatar '+className} viewBox="0 0 80 80" role="img" aria-label={name+' · '+label+' avatar'}><rect width="80" height="80" rx="40" fill={background}/><circle cx="65" cy="16" r="3" fill="white" opacity=".8"/><path d="m13 22 2-4 2 4 4 2-4 2-2 4-2-4-4-2z" fill="white" opacity=".7"/>
    {animal===0?<><ellipse cx="29" cy="24" rx="8" ry="18" fill={fur} transform="rotate(-12 29 24)"/><ellipse cx="52" cy="24" rx="8" ry="18" fill={fur} transform="rotate(12 52 24)"/><ellipse cx="29" cy="24" rx="3.5" ry="12" fill="#ffdadb"/><ellipse cx="52" cy="24" rx="3.5" ry="12" fill="#ffdadb"/></>:animal===1||animal===3?<><path d="M17 42 18 17 37 33M43 33 64 17 65 44" fill={fur}/><path d="m22 30 1-7 8 8m21 0 8-8 1 8" fill="#ffdadb"/></>:<><circle cx="23" cy="29" r="12" fill={animal===4?dark:fur}/><circle cx="57" cy="29" r="12" fill={animal===4?dark:fur}/><circle cx="23" cy="29" r="6" fill={background}/><circle cx="57" cy="29" r="6" fill={background}/></>}
    <ellipse cx="40" cy="72" rx="24" ry="17" fill={fur}/><rect x="15" y="27" width="50" height="39" rx="20" fill={animal===4?'#fffcf5':fur}/>
    {animal===3&&<path d="M17 42q12-6 23 8 12-14 23-8-1 22-23 22S18 58 17 42" fill="#fff6e6"/>}
    {animal===5&&<><circle cx="29" cy="45" r="12" fill={background}/><circle cx="51" cy="45" r="12" fill={background}/></>}
    {animal===4&&<><ellipse cx="29" cy="45" rx="8" ry="10" fill={dark} transform="rotate(20 29 45)"/><ellipse cx="51" cy="45" rx="8" ry="10" fill={dark} transform="rotate(-20 51 45)"/></>}
    <ellipse cx="29" cy="44" rx="2.5" ry="3.4" fill={animal===4?'#fff':dark}/><ellipse cx="51" cy="44" rx="2.5" ry="3.4" fill={animal===4?'#fff':dark}/><circle cx="29.7" cy="43" r=".8" fill="white"/><circle cx="51.7" cy="43" r=".8" fill="white"/>
    <ellipse cx="23" cy="51" rx="5" ry="3" fill="#ee8c9a" opacity=".38"/><ellipse cx="57" cy="51" rx="5" ry="3" fill="#ee8c9a" opacity=".38"/>
    <path d="m37 51 3 3 3-3" fill={dark} stroke={dark} strokeWidth="1.5" strokeLinejoin="round"/><path d="M40 54v2m0 0q-4 4-7 0m7 0q4 4 7 0" fill="none" stroke={dark} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="m34 68 6 4 6-4v8l-6-4-6 4z" fill="white" opacity=".85"/>
  </svg>;
}
