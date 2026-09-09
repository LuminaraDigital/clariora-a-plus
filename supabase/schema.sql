-- Clariora Exam Simulator
-- Optional cloud sync schema (Supabase / Postgres)
--
-- One row per user. Every device merges into the same row on sync.
-- Row Level Security ensures a signed-in user can only ever read, write,
-- or delete their OWN row. The anon key shipped in js/sync-config.js is
-- safe to expose publicly because these policies are the actual gate,
-- not the key.
--
-- Run this whole file once in the Supabase SQL editor (or via the CLI:
-- supabase db push) on a fresh project. Safe to re-run: every statement
-- is guarded with IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS.

create table if not exists public.learner_snapshots (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  device_id   text,
  snapshot    jsonb not null default '{}'::jsonb,
  key_times   jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),

  -- Size guard: keep individual rows small. 5 MB is generous headroom
  -- over a typical learner's exam history + SRS deck + ledger; this
  -- protects both the free-tier database quota and payload latency.
  constraint learner_snapshots_size_guard
    check (pg_column_size(snapshot) < 5 * 1024 * 1024)
);

comment on table public.learner_snapshots is
  'One row per learner. snapshot holds comptia_*/aplus3_* key-value pairs (never Groq keys, license keys, or telemetry). key_times holds a per-key last-changed timestamp used for client-side merge.';

alter table public.learner_snapshots enable row level security;

-- Read: only your own row.
drop policy if exists "learner_snapshots_select_own" on public.learner_snapshots;
create policy "learner_snapshots_select_own"
  on public.learner_snapshots
  for select
  using (auth.uid() = user_id);

-- Insert: only as yourself.
drop policy if exists "learner_snapshots_insert_own" on public.learner_snapshots;
create policy "learner_snapshots_insert_own"
  on public.learner_snapshots
  for insert
  with check (auth.uid() = user_id);

-- Update: only your own row, and it must remain yours.
drop policy if exists "learner_snapshots_update_own" on public.learner_snapshots;
create policy "learner_snapshots_update_own"
  on public.learner_snapshots
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Delete: only your own row ("Delete my cloud data" in the app).
drop policy if exists "learner_snapshots_delete_own" on public.learner_snapshots;
create policy "learner_snapshots_delete_own"
  on public.learner_snapshots
  for delete
  using (auth.uid() = user_id);

-- Keep updated_at current on every write, independent of what the client sends.
create or replace function public.learner_snapshots_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists learner_snapshots_set_updated_at on public.learner_snapshots;
create trigger learner_snapshots_set_updated_at
  before update on public.learner_snapshots
  for each row
  execute function public.learner_snapshots_touch_updated_at();

-- Lookups by user_id are already covered by the primary key; this index
-- speeds up any future admin/analytics queries ordered by recency.
create index if not exists learner_snapshots_updated_at_idx
  on public.learner_snapshots (updated_at desc);
