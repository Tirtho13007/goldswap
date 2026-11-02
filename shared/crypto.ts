export const CRYPTO_ROUTES=[
  {id:'btc-bitcoin',asset:'BTC',name:'Bitcoin',network:'Bitcoin',chain:'bitcoin',precision:8,memo:false},
  {id:'eth-ethereum',asset:'ETH',name:'Ethereum',network:'Ethereum',chain:'ethereum',precision:18,memo:false},
  {id:'usdc-ethereum',asset:'USDC',name:'USD Coin',network:'Ethereum · ERC20',chain:'ethereum',precision:6,memo:false},
  {id:'usdt-ethereum',asset:'USDT',name:'Tether',network:'Ethereum · ERC20',chain:'ethereum',precision:6,memo:false},
  {id:'usdt-tron',asset:'USDT',name:'Tether',network:'Tron · TRC20',chain:'tron',precision:6,memo:false},
  {id:'xrp-ledger',asset:'XRP',name:'XRP',network:'XRP Ledger',chain:'xrp',precision:6,memo:true},
  {id:'trx-tron',asset:'TRX',name:'TRON',network:'Tron',chain:'tron',precision:6,memo:false},
  {id:'usdt-bsc',asset:'USDT',name:'Tether',network:'BNB Smart Chain · BEP20',chain:'bsc',precision:6,memo:false},
  {id:'usdt-mantle',asset:'USDT',name:'Tether',network:'Mantle · USDT0',chain:'mantle',precision:6,memo:false},
  {id:'usdt-ton',asset:'USDT',name:'Tether',network:'TON · Jetton',chain:'ton',precision:6,memo:false},
  {id:'usdt-solana',asset:'USDT',name:'Tether',network:'Solana · SPL',chain:'solana',precision:6,memo:false},
  {id:'usdt-arbitrum',asset:'USDT',name:'Tether',network:'Arbitrum One · USDT0',chain:'arbitrum',precision:6,memo:false},
  {id:'usdt-avalanche',asset:'USDT',name:'Tether',network:'Avalanche C-Chain',chain:'avalanche',precision:6,memo:false},
  {id:'usdc-bsc',asset:'USDC',name:'USD Coin',network:'BNB Smart Chain · BEP20',chain:'bsc',precision:6,memo:false},
  {id:'usdc-solana',asset:'USDC',name:'USD Coin',network:'Solana · SPL',chain:'solana',precision:6,memo:false},
  {id:'usdc-arbitrum',asset:'USDC',name:'USD Coin',network:'Arbitrum One',chain:'arbitrum',precision:6,memo:false},
  {id:'usdc-avalanche',asset:'USDC',name:'USD Coin',network:'Avalanche C-Chain',chain:'avalanche',precision:6,memo:false},
  {id:'usdc-arc',asset:'USDC',name:'USD Coin',network:'Arc',chain:'arc',precision:6,memo:false},
  {id:'eth-arbitrum',asset:'ETH',name:'Ethereum',network:'Arbitrum One',chain:'arbitrum',precision:18,memo:false},
  {id:'eth-bsc',asset:'ETH',name:'Ethereum',network:'BNB Smart Chain · BEP20',chain:'bsc',precision:18,memo:false},
  {id:'bnb-bsc',asset:'BNB',name:'BNB',network:'BNB Smart Chain · BEP20',chain:'bsc',precision:18,memo:false},
  {id:'sol-solana',asset:'SOL',name:'Solana',network:'Solana',chain:'solana',precision:9,memo:false},
] as const;
export const CRYPTO_ASSETS=['BTC','ETH','USDC','USDT','XRP','TRX','BNB','SOL'] as const;
export type CryptoAsset=typeof CRYPTO_ASSETS[number];
