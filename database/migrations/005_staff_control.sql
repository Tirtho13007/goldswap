ALTER TABLE money_accounts DROP CONSTRAINT money_accounts_asset_check;
ALTER TABLE money_accounts ADD CONSTRAINT money_accounts_asset_check CHECK(asset IN('BTC','ETH','USDC','USDT','XRP','TRX','BNB','SOL'));
ALTER TABLE users ADD COLUMN deleted_at timestamptz;
CREATE TABLE website_settings(id integer PRIMARY KEY CHECK(id=1),settings jsonb NOT NULL DEFAULT '{}',updated_at timestamptz NOT NULL DEFAULT now());
INSERT INTO website_settings(id) VALUES (1);
