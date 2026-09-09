# Optional cloud sync (Supabase)

The Clariora Exam Simulator is **local-first**: exam history, missed
question pools, SRS decks, and the APX ledger all live on the device by
default, with no server involved. Cloud sync is an **opt-in** feature that
lets a learner sign in with an email magic link (or a 6-digit code on
desktop) to sync that same progress across two or more devices. Nothing is
uploaded unless a learner explicitly signs in, and the feature is entirely
disabled unless this project is configured with a Supabase URL and anon key.

## 1. Create a Supabase project

1. Go to <https://supabase.com>, sign in, and create a new project (the free
   tier is sufficient, see cost estimate below).
2. Wait for provisioning to finish, then open **Project Settings > API**.
   You will need the **Project URL** and the **anon / public** key later.

## 2. Run the schema

1. Open the **SQL Editor** in the Supabase dashboard.
2. Paste the entire contents of [`supabase/schema.sql`](../supabase/schema.sql)
   and run it. It is safe to re-run if you ever need to reapply it.
3. This creates one table, `learner_snapshots`, with Row Level Security
   (RLS) enabled and policies that restrict every select/insert/update/delete
   to `auth.uid() = user_id`.

## 3. Enable email sign-in

1. In the dashboard, go to **Authentication > Providers** and make sure
   **Email** is enabled.
2. Go to **Authentication > Email Templates** and confirm the "Magic Link"
   template is active (the default template works fine).
3. Go to **Authentication > URL Configuration**:
   - **Site URL**: your production URL, e.g. your Cloudflare Pages domain
     (`https://your-app.pages.dev`).
   - **Redirect URLs**: add every origin the app is served from, your
     Cloudflare Pages domain, any preview deployment domains, and
     `http://localhost:PORT` if you test locally in a browser. You do not
     need to add anything for the desktop build; it never redirects (see
     "Magic link vs. code" below).

## 4. Configure the app

Open `js/sync-config.js` and fill in your project's URL and anon key:

```js
window.APLUS_SYNC_CONFIG = {
  enabled: true,
  supabaseUrl: 'https://YOUR-PROJECT-REF.supabase.co',
  supabaseAnonKey: 'YOUR-ANON-PUBLIC-KEY',
  table: 'learner_snapshots',
  debounceMs: 4000
};
```

Leaving `enabled: false` (the shipped default) turns the whole feature off:
no script is ever loaded, no network request is ever made, and the app
behaves exactly as it did before sync existed.

## Why the anon key is safe to ship

The anon key is meant to be public, it identifies your Supabase project,
not a user. It has no special privileges by itself. Every request Supabase
receives is additionally checked against the **Row Level Security policies**
in `schema.sql`, which key everything off `auth.uid()`, the ID embedded in
the caller's own signed session token, issued only after they prove control
of their email address. A caller with only the anon key and no session can
select, insert, update, or delete nothing (RLS defaults to deny). A caller
with a valid session can only ever touch the one row where `user_id` equals
their own ID. Committing the anon key to a public repository is normal and
expected for Supabase apps; never commit the **service_role** key (this
project never uses it).

## Magic link vs. 6-digit code

The app tries a redirect-based magic link first, because it is the smoother
flow for most learners in a normal browser tab. On desktop, detected as
`window.electronAPI` being present, or the page being loaded from a
`file://` URL, auth redirects cannot complete (there is no HTTPS origin to
redirect back to), so the app instead requests a 6-digit one-time code via
email and verifies it inline with `supabase.auth.verifyOtp`. Both paths use
the same `signInWithOtp` call under the hood; only the redirect option
differs.

## What is synced, and what is excluded

Synced (per key, newest change wins unless noted):

- Exam history (`comptia_a_plus_history`, including profile-scoped copies):
  merged as a union of attempts, deduplicated by attempt id (or a content
  fingerprint when no id is present), sorted newest first.
- Missed / weak question pools (`comptia_a_plus_missed`): merged as a set
  union of question ids.
- SRS spaced-repetition decks (any key matching `srs`, e.g.
  `comptia_memory_srs_v1`, `aplus3_srs_deck`): merged per flashcard. The
  newer `lastReviewed`/`due` timestamp wins per card, and cards unique to
  either device are kept.
- Everything else under the `comptia_*` / `aplus3_*` namespace (theme,
  tutor mode, profiles metadata, the APX ledger, objectives checklist,
  study plan, readiness cache, etc.): plain last-write-wins by per-key
  timestamp.

Never synced, regardless of configuration:

- Any key matching `/groq|license|telemetry|api_key/i`. Groq API keys,
  license keys, and telemetry buffers stay on the device that has them.
- The local database engine's own master blob
  (`comptia_database_master_v3` and anything starting with
  `comptia_database_master`). This is a local storage-tier artifact, not
  learner data, and must never be treated as a normal key (see the note at
  the top of `js/database_memory_engine.js` about the self-nesting bug that
  was fixed there).
- The sync module's own bookkeeping keys (device id, last-synced time,
  remembered email). Device-local by design.

## Conflict rules

Every synced key carries its own last-changed timestamp, tracked
independently of the others. When two devices have both changed the same
piece of data since the last sync:

- Simple settings (theme, tutor mode, active profile, etc.): the device
  with the more recent change wins outright.
- Exam history, missed pools, and SRS decks: nothing is thrown away. Both
  devices' entries are combined (list union, id union, or per-card merge
  respectively), so an exam taken offline on a laptop and one taken on a
  phone both survive the next sync.

Merging is a pure, deterministic function (`APlus.sync.merge`, tested in
`tools/test_sync_merge.js`) and is idempotent: merging the same two states
twice, or merging a state into itself, produces the same result.

## Deleting your data

From the sync panel, a signed-in learner can choose **Delete my cloud
data**. This deletes their row from `learner_snapshots` entirely; it does
not touch anything stored on the device itself. A learner can also delete
their account (and therefore their row, via the `on delete cascade` foreign
key to `auth.users`) from the Supabase dashboard's Authentication panel, or
you can wire up self-service account deletion later using
`supabase.auth.admin.deleteUser` from a server-side context if desired.

## Cost estimate (free tier)

Supabase's free tier includes 500 MB of database storage and 5 GB of
bandwidth per month, which is enormous relative to this workload: each
learner's row is a small JSON blob (exam history, a few hundred SRS cards,
and a ledger), realistically a few hundred KB even for a heavy user, well
under the 5 MB per-row guard enforced by the schema's check constraint.
500 MB of storage comfortably fits many thousands of learners. Free-tier
projects pause after a week of inactivity and wake automatically on the
next request (with a brief cold-start delay), which is a non-issue for an
app that is not queried server-side on a schedule. For a shipped product
with real usage, budget for the paid plan mainly once you need the project
to never pause, or once monthly active users climb into the low thousands
and you want to keep bandwidth headroom.
