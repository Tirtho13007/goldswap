ALTER TABLE users ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
CREATE TABLE demo_snapshots (
  user_id uuid PRIMARY KEY REFERENCES users(id),
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
