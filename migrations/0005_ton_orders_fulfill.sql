-- TON order fulfillment columns used by /api/v1/billing/ton/verify
-- Safe to apply on staging and production D1.

ALTER TABLE ton_orders ADD COLUMN tx_hash TEXT;
ALTER TABLE ton_orders ADD COLUMN updated_at TIMESTAMP;
