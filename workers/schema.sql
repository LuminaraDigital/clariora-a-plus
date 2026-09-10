-- =====================================================================
-- Clariora Cloudflare D1 Database Schema
-- Domain: clariora.com.au
-- Database Name: clariora_edge_db
-- =====================================================================

-- 1. Users & Licensing
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    license_key TEXT,
    is_premium INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS magic_links (
    token TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    used INTEGER NOT NULL DEFAULT 0
);

-- 2. Learner Sync State (Cross-device continuity)
CREATE TABLE IF NOT EXISTS learner_sync_state (
    user_id TEXT PRIMARY KEY,
    revision INTEGER NOT NULL DEFAULT 1,
    state_blob TEXT NOT NULL, -- JSON encoded state (attempts, SRS cards, readiness, streak)
    device_name TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Item Telemetry & Crowd Analytics
CREATE TABLE IF NOT EXISTS item_telemetry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id TEXT NOT NULL,
    selected_option INTEGER,
    is_correct INTEGER NOT NULL,
    seconds_spent INTEGER NOT NULL,
    exam_type TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_telemetry_qid ON item_telemetry(question_id);

-- 4. Question Defect & Ambiguity Reports
CREATE TABLE IF NOT EXISTS item_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id TEXT NOT NULL,
    category TEXT NOT NULL, -- 'miskeyed', 'ambiguous', 'typo', 'outdated', 'distractor'
    details TEXT,
    user_email TEXT,
    status TEXT NOT NULL DEFAULT 'open', -- 'open', 'reviewed', 'fixed', 'dismissed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reports_qid ON item_reports(question_id);

-- 5. Computed Item Difficulty & Discrimination Cache
CREATE TABLE IF NOT EXISTS item_stats_cache (
    question_id TEXT PRIMARY KEY,
    sample_size INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    p_value REAL NOT NULL DEFAULT 0.70, -- % answering correctly
    point_biserial REAL DEFAULT 0.35,   -- item discrimination index
    distractor_spread TEXT,            -- JSON: {"0": 12, "1": 75, "2": 8, "3": 5}
    flagged_miskey INTEGER NOT NULL DEFAULT 0,
    last_computed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Telegram Mini App Users & Entitlements
CREATE TABLE IF NOT EXISTS telegram_users (
    telegram_id INTEGER PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    tier TEXT NOT NULL DEFAULT 'free', -- 'free', 'daily_pass', 'pro_monthly', 'lifetime'
    tier_expires_at INTEGER,           -- unix timestamp ms or NULL for lifetime
    trial_started_at INTEGER,          -- unix timestamp ms when user first launched TMA (for 14-day core trial)
    pro_preview_tokens_remaining INTEGER NOT NULL DEFAULT 3, -- 3 free Pro AI queries (NVIDIA/Ollama/OpenRouter)
    stars_spent INTEGER NOT NULL DEFAULT 0,
    ton_spent_nanoton TEXT DEFAULT '0',
    ton_wallet_address TEXT,
    free_ai_used_today INTEGER NOT NULL DEFAULT 0,
    free_ai_last_date TEXT,            -- 'YYYY-MM-DD'
    preferred_ai_provider TEXT DEFAULT 'groq', -- 'groq', 'nvidia', 'ollama', 'openrouter'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tg_users_trial ON telegram_users(trial_started_at);

-- 7. Telegram Stars Payment Transactions
CREATE TABLE IF NOT EXISTS stars_transactions (
    id TEXT PRIMARY KEY,               -- telegram_payment_charge_id
    telegram_id INTEGER NOT NULL,
    product_id TEXT NOT NULL,
    stars_amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'paid',
    invoice_payload TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stars_tx_user ON stars_transactions(telegram_id);

-- 8. TON Blockchain Transactions & Verified Subscriptions
CREATE TABLE IF NOT EXISTS ton_transactions (
    id TEXT PRIMARY KEY,               -- transaction hash or boc
    telegram_id INTEGER NOT NULL,
    product_id TEXT NOT NULL,
    amount_ton TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'TON', -- 'TON' or 'USDT'
    wallet_address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed',
    memo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ton_tx_user ON ton_transactions(telegram_id);

-- 9. Business AI Usage & Latency Audit Log
CREATE TABLE IF NOT EXISTS ai_usage_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER,
    tier TEXT NOT NULL,
    provider TEXT NOT NULL,            -- 'groq', 'nvidia', 'ollama', 'openrouter', 'workers_ai'
    model TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_log_user ON ai_usage_log(telegram_id);

-- 9b. Provider circuit breaker + async coach jobs / DLQ (AI production)
CREATE TABLE IF NOT EXISTS provider_circuit_state (
    provider TEXT PRIMARY KEY,
    state TEXT NOT NULL DEFAULT 'closed',
    failure_count INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    opened_at INTEGER,
    next_attempt_at INTEGER,
    last_error TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coach_jobs (
    id TEXT PRIMARY KEY,
    telegram_id INTEGER NOT NULL,
    tier TEXT NOT NULL,
    job_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    result_json TEXT,
    last_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    available_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_coach_jobs_user_status ON coach_jobs(telegram_id, status);

CREATE TABLE IF NOT EXISTS coach_job_dlq (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    telegram_id INTEGER NOT NULL,
    job_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    last_error TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Auth accounts (Firebase Google/email + Telegram) for gated product visibility
CREATE TABLE IF NOT EXISTS auth_accounts (
    uid TEXT PRIMARY KEY,
    provider TEXT NOT NULL,              -- 'google', 'email', 'telegram', 'telegram_tma'
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
    event TEXT NOT NULL,                 -- 'signup' | 'signin'
    provider TEXT NOT NULL,
    email TEXT,
    display_name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_events_uid ON auth_events(uid);
CREATE INDEX IF NOT EXISTS idx_auth_events_created ON auth_events(created_at);

