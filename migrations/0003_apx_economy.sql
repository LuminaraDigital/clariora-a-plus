-- APX economy telemetry mirror (soft currency events; not a chain of custody for money).
-- Applied to clariora_edge_db / clariora_edge_db_staging via wrangler d1 migrations.

CREATE TABLE IF NOT EXISTS apx_daily_counters (
  user_id TEXT NOT NULL,
  day TEXT NOT NULL,
  minted INTEGER NOT NULL DEFAULT 0,
  burned INTEGER NOT NULL DEFAULT 0,
  practice_minted INTEGER NOT NULL DEFAULT 0,
  side_minted INTEGER NOT NULL DEFAULT 0,
  cap_hits INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, day)
);

CREATE TABLE IF NOT EXISTS apx_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  day TEXT,
  source TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  capped INTEGER NOT NULL DEFAULT 0,
  item TEXT,
  balance_after INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_apx_events_user_day ON apx_events(user_id, day);
CREATE INDEX IF NOT EXISTS idx_apx_events_created ON apx_events(created_at);

CREATE TABLE IF NOT EXISTS apx_holdout (
  user_id TEXT PRIMARY KEY,
  holdout INTEGER NOT NULL DEFAULT 0,
  assigned_at TEXT NOT NULL DEFAULT (datetime('now'))
);
