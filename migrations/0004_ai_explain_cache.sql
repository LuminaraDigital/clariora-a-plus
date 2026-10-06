-- AI cost controls: shared explanation cache and per-request cost attribution.
-- Applied to clariora_edge_db / clariora_edge_db_staging via wrangler d1 migrations.
-- Not re-runnable as a whole: ALTER TABLE ADD COLUMN fails if the column exists.

CREATE TABLE IF NOT EXISTS ai_explain_cache (
  cache_key TEXT PRIMARY KEY,
  qid TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  body TEXT NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_explain_cache_created ON ai_explain_cache(created_at);

ALTER TABLE ai_usage_log ADD COLUMN intent TEXT;
ALTER TABLE ai_usage_log ADD COLUMN cache_hit INTEGER DEFAULT 0;
ALTER TABLE ai_usage_log ADD COLUMN turns INTEGER DEFAULT 0;
ALTER TABLE ai_usage_log ADD COLUMN user_ref TEXT;

CREATE INDEX IF NOT EXISTS idx_ai_log_created ON ai_usage_log(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_log_user_ref ON ai_usage_log(user_ref, created_at);

-- APX holdout arm ('apx' or 'holdout') for the retention readout.
ALTER TABLE apx_events ADD COLUMN arm TEXT;
CREATE INDEX IF NOT EXISTS idx_apx_events_user_day ON apx_events(user_id, day);
