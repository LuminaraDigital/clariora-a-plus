-- =====================================================================
-- 002_ai_production.sql
-- AI production readiness: budgets, circuits, async jobs / DLQ
-- =====================================================================

ALTER TABLE telegram_users ADD COLUMN ai_tokens_used_today INTEGER NOT NULL DEFAULT 0;
ALTER TABLE telegram_users ADD COLUMN ai_tokens_last_date TEXT;
ALTER TABLE telegram_users ADD COLUMN ai_tokens_used_month INTEGER NOT NULL DEFAULT 0;
ALTER TABLE telegram_users ADD COLUMN ai_tokens_month TEXT;
ALTER TABLE telegram_users ADD COLUMN ai_calls_used_today INTEGER NOT NULL DEFAULT 0;
ALTER TABLE telegram_users ADD COLUMN ai_calls_last_date TEXT;

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
