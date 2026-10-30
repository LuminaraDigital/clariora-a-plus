/**
 * Clariora Exam Simulator
 * sync-config.js - Optional cloud sync configuration (NOT product identity)
 * File: js/sync-config.js
 *
 * Product authentication is Firebase Auth + Telegram (Worker HttpOnly session).
 * Supabase Auth below is ONLY an optional secondary sync plane for learner
 * snapshots. Keep enabled:false unless you deliberately run a separate sync
 * project. Do not treat Supabase as the app login provider.
 *
 * Cloud sync is entirely OPTIONAL. This app is local-first by default:
 * all exam history, SRS decks, and ledger data lives on this device
 * unless a learner explicitly signs in to sync.
 *
 * To enable sync:
 *  1. Create a free Supabase project (see docs/SYNC_SUPABASE.md).
 *  2. Run supabase/schema.sql in the Supabase SQL editor.
 *  3. Paste your project URL and anon (public) key below.
 *  4. Set enabled to true.
 *
 * The anon key is safe to ship in client code: Row Level Security (RLS)
 * policies in schema.sql ensure a signed-in user can only ever read or
 * write their own row. See docs/SYNC_SUPABASE.md for details.
 */
window.APLUS_SYNC_CONFIG = window.APLUS_SYNC_CONFIG || {
  enabled: false,
  identityPlane: 'firebase', // product auth; Supabase here is sync-only
  supabaseUrl: '',
  supabaseAnonKey: '',
  table: 'learner_snapshots',
  debounceMs: 4000
};
