CREATE TABLE inventory_adjustments (
 id uuid PRIMARY KEY,
 actor_id uuid NOT NULL REFERENCES users(id),
 direction text NOT NULL CHECK(direction IN ('add','remove')),
 gold_atoms numeric(78,0) NOT NULL CHECK(gold_atoms>0),
 reference text NOT NULL UNIQUE,
 reason text NOT NULL,
 balance_after numeric(78,0) NOT NULL CHECK(balance_after>=0),
 created_at timestamptz NOT NULL DEFAULT now()
);
