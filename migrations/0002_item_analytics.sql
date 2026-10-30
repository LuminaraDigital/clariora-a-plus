-- Migration 0002: ability proxy for discrimination + question neighbor cache
-- Privacy: ability_proxy is an anonymous 0..1 session estimate (no user id).

ALTER TABLE item_telemetry ADD COLUMN ability_proxy REAL;

CREATE TABLE IF NOT EXISTS question_neighbors (
    question_id TEXT PRIMARY KEY,
    neighbor_ids TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_item_telemetry_qid_ability
  ON item_telemetry(question_id, ability_proxy);
