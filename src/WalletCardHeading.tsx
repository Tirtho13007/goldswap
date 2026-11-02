import type { LucideIcon } from 'lucide-react';
export function WalletCardHeading({icon:Icon,title,subtitle,tone='blue'}:{icon:LucideIcon;title:string;subtitle?:string;tone?:string}){return <div className="wallet-section-heading" data-tone={tone}><span className="wallet-section-icon"><Icon size={21}/></span><div><h3>{title}</h3>{subtitle&&<p>{subtitle}</p>}</div></div>;}
