import { randomUUID } from 'node:crypto';
import type { Sql } from './db.js';
import { hashPassword } from './security.js';
import type { DashboardData } from '../shared/dashboard.js';
export const DEMO_PASSWORD='GoldSwapDemo!2026';
export const demoProfiles=[
  {id:'d0000000-0000-4000-8000-000000000001',first:'Mila',last:'Rahman',email:'mila@demo.goldswap.test',country:'BD',gold:52.75,locked:40,reserved:2,payout:2.1,kyc:'approved'},
  {id:'d0000000-0000-4000-8000-000000000002',first:'Arif',last:'Hasan',email:'arif@demo.goldswap.test',country:'BD',gold:18.4,locked:8,reserved:1,payout:.4,kyc:'under_review'},
  {id:'d0000000-0000-4000-8000-000000000003',first:'Noor',last:'Ahmed',email:'noor@demo.goldswap.test',country:'AE',gold:125.8,locked:80,reserved:5,payout:8,kyc:'approved'},
  {id:'d0000000-0000-4000-8000-000000000004',first:'Leo',last:'Chen',email:'leo@demo.goldswap.test',country:'SG',gold:6.25,locked:4,reserved:.5,payout:.12,kyc:'not_started'},
];
export function emptyDashboard():DashboardData{return {isDemo:false,financialServicesEnabled:false,totals:null,balances:[],activeTrades:[],transactions:[],kycStatus:'not_started',serverTime:new Date().toISOString()};}
export async function seedDemo(db:Sql){
  if(process.env.NODE_ENV==='production')throw new Error('Demo seeding is disabled in production.');
  const now=Date.now(),hash=await hashPassword(DEMO_PASSWORD);
  await db.transaction(async tx=>{
    for(const [index,p] of demoProfiles.entries()){
      const existing=(await tx.query('SELECT id,is_demo FROM users WHERE email=$1',[p.email])).rows[0];
      if(existing&&(!existing.is_demo||existing.id!==p.id))throw new Error('Demo email collision; existing account was not modified.');
      await tx.query(`INSERT INTO users(id,email,password_hash,first_name,last_name,country,phone,is_demo,email_verified)
        VALUES ($1,$2,$3,$4,$5,$6,$7,true,true) ON CONFLICT(id) DO NOTHING`,[p.id,p.email,hash,p.first,p.last,p.country,'+8801700000000']);
      await tx.query("INSERT INTO user_roles VALUES ($1,'user') ON CONFLICT DO NOTHING",[p.id]);
      const snapshot:DashboardData={...emptyDashboard(),isDemo:true,demoName:p.first+' '+p.last,kycStatus:p.kyc,
        totals:{goldTotal:p.gold.toFixed(4),available:(p.gold-p.locked-p.reserved).toFixed(4),locked:p.locked.toFixed(4),reserved:p.reserved.toFixed(4),portfolioUsd:(p.gold*125+850+index*150).toFixed(2),payoutGold:p.payout.toFixed(4),pendingDeposits:1,pendingWithdrawals:1},
        balances:[{asset:'XAU',amount:p.gold.toFixed(4)},{asset:'BTC',amount:(.014+index*.002).toFixed(6)},{asset:'ETH',amount:(.12+index*.03).toFixed(4)},{asset:'USDT',amount:(850+index*150).toFixed(2)},{asset:'TRX',amount:(300+index*100).toFixed(2)}],
        activeTrades:[{id:'DEMO-TR-'+(index+1),plan:['Platinum','Gold','Diamond','Silver'][index],gold:p.locked.toFixed(4),rate:[7,5,10,3][index],startsAt:new Date(now-(54+index*9)*3600000).toISOString(),maturesAt:new Date(now+(66-index*9)*3600000).toISOString()}],
        transactions:Array.from({length:12},(_,i)=>({id:`DEMO-${index+1}-${String(i+1).padStart(3,'0')}`,type:['Deposit','Gold purchase','Trade payout','Withdrawal'][i%4],asset:i%4===0||i%4===3?'USDT':'XAU',amount:i%4===0?'500.00':i%4===1?'8.0000':i%4===2?p.payout.toFixed(4):'125.00',direction:i%4===1||i%4===3?'out':'in',method:['Crypto · TRC20','Gold allocation','Five-day trade','Crypto · TRC20'][i%4],status:i===0?'pending':i===3?'approved':i===7?'failed':'completed',createdAt:new Date(now-(i*7+index)*3600000).toISOString()}))};
      await tx.query('INSERT INTO demo_snapshots(user_id,snapshot) VALUES ($1,$2) ON CONFLICT(user_id) DO NOTHING',[p.id,JSON.stringify(snapshot)]);
    }
    await tx.query("INSERT INTO audit_events(id,action,target_id,details) VALUES ($1,'demo.seeded','local-demo',$2)",[randomUUID(),JSON.stringify({count:demoProfiles.length})]);
  });
}
