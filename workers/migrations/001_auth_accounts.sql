-- Additive auth audit tables for gated product (safe to re-run)
CREATE TABLE IF NOT EXISTS auth_accounts (
    uid TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    email TEXT,
    display_name TEXT,
    photo_url TEXT,
    telegram_id INTEGER,
    signup_at TIMESTAMP,
    last_signin_at TIMESTAMP,
    signin_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_accounts_signin ON auth_accounts(last_signin_at);
CREATE INDEX IF NOT EXISTS idx_auth_accounts_provider ON auth_accounts(provider);

CREATE TABLE IF NOT EXISTS auth_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT NOT NULL,
    event TEXT NOT NULL,
    provider TEXT NOT NULL,
    email TEXT,
    display_name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_events_uid ON auth_events(uid);
CREATE INDEX IF NOT EXISTS idx_auth_events_created ON auth_events(created_at);
