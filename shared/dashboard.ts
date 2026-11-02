export type DemoTrade={id:string;plan:string;gold:string;rate:number;startsAt:string;maturesAt:string;isDemo?:boolean;profit?:string};
export type DashboardTransaction={id:string;type:string;asset:string;amount:string;direction:'in'|'out';method:string;status:'pending'|'approved'|'completed'|'failed';createdAt:string};
export type DashboardData={
  isDemo:boolean;demoName?:string;financialServicesEnabled:boolean;serverTime:string;kycStatus:string;
  totals:{goldTotal:string;available:string;locked:string;reserved:string;portfolioUsd:string|null;payoutGold:string;pendingDeposits:number;pendingWithdrawals:number}|null;
  balances:{asset:string;amount:string;reserved?:string}[];activeTrades:DemoTrade[];transactions:DashboardTransaction[];
};
