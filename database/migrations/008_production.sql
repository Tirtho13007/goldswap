ALTER TABLE sessions ADD COLUMN mfa_verified_at timestamptz;
ALTER TABLE sessions ADD COLUMN reauthenticated_at timestamptz;
CREATE TABLE worker_health (name text PRIMARY KEY, last_success_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX auth_attempts_expiry_idx ON auth_attempts(expires_at);
