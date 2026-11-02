export const PLATFORM_POLICY={
  version:'2026-11-01',depositMinimumUsd:'15',withdrawalMinimumUsd:'20',
  depositFeeBps:0,withdrawalFeeBps:150,physicalMinimumGrams:'500',physicalFeeBps:200,
  maximumUsd:null,
  processingNotice:'Deposits and withdrawals are manually reviewed. Processing can take some time; completion is not instant.',
  kycDocuments:['national_id','passport','birth_certificate'],
} as const;
export const GOLD_PRECISION=6;
export const HOLD_MILLISECONDS=5*24*60*60*1000;
export const TRADE_PLANS=[
  {id:'silver',name:'Silver',minGrams:'0',maxGrams:'8',rateBps:300},
  {id:'gold',name:'Gold',minGrams:'8',maxGrams:'40',rateBps:500},
  {id:'platinum',name:'Platinum',minGrams:'40',maxGrams:'80',rateBps:700},
  {id:'diamond',name:'Diamond',minGrams:'80',maxGrams:'400',rateBps:1000},
  {id:'elite',name:'Elite',minGrams:'400',maxGrams:'800',rateBps:1200},
] as const;
