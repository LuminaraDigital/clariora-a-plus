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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
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
    stars_spent INTEGER NOT NULL DEFAULT 0,
    free_ai_used_today INTEGER NOT NULL DEFAULT 0,
    free_ai_last_date TEXT,            -- 'YYYY-MM-DD'
    preferred_ai_provider TEXT DEFAULT 'groq', -- 'groq', 'nvidia', 'ollama', 'openrouter'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

-- 8. Business AI Usage & Latency Audit Log
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

