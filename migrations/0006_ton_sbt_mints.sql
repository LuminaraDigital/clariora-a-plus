-- TON Mastery SBT mint queue (oracle mints after verified exam pass)
CREATE TABLE IF NOT EXISTS ton_sbt_mints (
  mint_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  exam_code TEXT NOT NULL,
  scaled_score INTEGER NOT NULL,
  ledger_hash TEXT,
  recipient_wallet TEXT NOT NULL,
  attestation_id TEXT,
  collection_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  item_address TEXT,
  tx_hash TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ton_sbt_mints_user ON ton_sbt_mints(user_id);
CREATE INDEX IF NOT EXISTS idx_ton_sbt_mints_status ON ton_sbt_mints(status);
