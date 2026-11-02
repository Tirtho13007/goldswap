CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY, email text NOT NULL UNIQUE, password_hash text,
  first_name text NOT NULL DEFAULT '', last_name text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '',
  address jsonb NOT NULL DEFAULT '{}', theme text NOT NULL DEFAULT 'system',
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','restricted')),
  email_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id),
  expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE TABLE IF NOT EXISTS roles (id text PRIMARY KEY, name text NOT NULL);
CREATE TABLE IF NOT EXISTS permissions (id text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id text REFERENCES roles(id), permission_id text REFERENCES permissions(id),
  PRIMARY KEY(role_id,permission_id)
);
CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid REFERENCES users(id), role_id text REFERENCES roles(id),
  PRIMARY KEY(user_id,role_id)
);
CREATE TABLE IF NOT EXISTS permission_overrides (
  user_id uuid REFERENCES users(id), permission_id text REFERENCES permissions(id),
  allowed boolean NOT NULL, PRIMARY KEY(user_id,permission_id)
);
CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY, actor_id uuid REFERENCES users(id), action text NOT NULL,
  target_id text NOT NULL, details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS account_tokens (
  token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id),
  purpose text NOT NULL CHECK(purpose IN ('verify','reset')), expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS email_outbox (
  id uuid PRIMARY KEY, recipient text NOT NULL, subject text NOT NULL, body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz
);
CREATE TABLE IF NOT EXISTS oauth_flows (
  browser_hash text PRIMARY KEY, state text NOT NULL, verifier text NOT NULL,
  nonce text NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS identities (
  provider text NOT NULL, subject text NOT NULL, user_id uuid NOT NULL REFERENCES users(id),
  PRIMARY KEY(provider,subject)
);
CREATE TABLE IF NOT EXISTS auth_attempts (
  key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL
);
