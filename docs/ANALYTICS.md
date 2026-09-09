# Telemetry and Analytics

This document describes what the Clariora app collects, what it
never collects, where the data lives, how to turn on optional upload, and
how to compute the four core product KPIs.

The implementation lives in `js/telemetry.js` (collector) and
`js/telemetry-config.js` (upload configuration). Both are plain scripts
with no build step, safe to open directly via `file://`, and both fail
silently rather than ever throwing or blocking the UI.

## What is collected

Every event is a small flat object:

```
{ t: "<ISO timestamp>", n: "<event name>", p: { ...flat primitive props... }, s: "<session id>" }
```

- `t` - event time, ISO 8601 string.
- `n` - event name (see list below).
- `p` - a flat object of string/number/boolean/null values only. Strings
  are truncated to 80 characters. Nested objects, arrays, and functions
  passed as props are dropped, never serialized.
- `s` - a random session id generated fresh on every page load.

An anonymous, randomly generated install id (UUID v4, `telemetry_install_id`)
identifies a device/browser profile across sessions. It is not derived from
and does not contain any personal or hardware-identifying information.

### Event list and fields

| Event | Fields | Trigger |
|---|---|---|
| `session_start` | `platform` (`desktop`\|`pwa`\|`web`), `version`, `width` (`xs`\|`sm`\|`md`\|`lg`\|`xl` viewport bucket) | Page load |
| `session_end` | `seconds` (active seconds since last resume) | `pagehide`, or `visibilitychange` to hidden |
| `exam_started` | `examType`, `count` (question count), `minutes`, `mode` | bus `exam:started` |
| `exam_finished` | `examType`, `total`, `rawCorrect`, `scaledScore`, `passed`, `seconds`, `flagged` | bus `exam:finished` |
| `diagnostic_started` | (module-defined flat props only) | bus `onboarding:diagnostic_started`, or direct `APlus.telemetry.track('diagnostic_started', {...})` |
| `diagnostic_completed` | (module-defined flat props only) | bus `onboarding:diagnostic_completed`, or direct `APlus.telemetry.track(...)` |
| `today_session_started` | (module-defined flat props only) | direct `APlus.telemetry.track('today_session_started', {...})`, or bus `today:session:started` if emitted |
| `feature_opened` | `feature` | bus `feature:opened` |
| `error` | `message` (truncated to 160 chars), `source` (basename only, no path), `line` | `window.onerror`, `unhandledrejection` |

Any module may also call `APlus.telemetry.track(name, props)` directly for
custom events; the same sanitization rules apply.

## What is never collected

- Names, emails, or any account/profile identifiers.
- Question text, answer text, or any exam content.
- Free-form user input of any kind.
- Full file paths (error `source` is reduced to a basename, e.g. `app.js`).
- IP address, precise geolocation, device fingerprints, or ad identifiers.
- Anything nested (objects/arrays passed as event props are dropped, not
  stringified) - this is enforced in code, not just by convention.

## Where it is stored locally

All events live in a capped ring buffer (max 500 events, oldest evicted
first) under the storage key **`telemetry_events`**, written through
`APlus.storage` (falls back to raw `localStorage` if that module hasn't
loaded yet), namespaced with the app's existing `aplus3_` prefix -
e.g. `aplus3_telemetry_events` in `localStorage`.

Related local-only keys:

- `telemetry_install_id` - the anonymous UUID v4 install id.
- `telemetry_consent` - boolean, whether the user has opted in to upload.

Users can inspect exactly what has been collected at any time via
`APlus.telemetry.exportJson()`, which returns a deep copy of the current
buffer. This is the transparency mechanism: nothing is hidden from the
user, and nothing leaves the device without both the operator enabling
upload and the user consenting.

## How to enable upload

Upload is off by default. To turn it on:

1. Deploy a collector - `docs/telemetry-worker.js` is a ready-to-adapt
   Cloudflare Worker sample (validates shape, caps request bodies at
   64 KB, restricts CORS to one origin, writes to D1 or KV, returns 204).
2. Edit `js/telemetry-config.js`:

   ```js
   window.APLUS_TELEMETRY_CONFIG = {
     endpoint: 'https://your-worker.your-subdomain.workers.dev',
     enabled: true,
     flushIntervalMs: 60000,
     batchSize: 50
   };
   ```

   Upload only ever happens when **all** of the following are true:
   - `enabled` is `true`.
   - `endpoint` starts with `https://`.
   - The user has consented (`telemetry_consent === true`, set via
     `APlus.telemetry.setConsent(true)`).
   - The browser reports it is online (`navigator.onLine`).

3. Uploads POST `{ installId, events: [...] }` as JSON, preferring
   `navigator.sendBeacon` and falling back to `fetch(..., { keepalive: true })`.
   Successfully sent events are removed from the local buffer; failed
   sends are kept and retried with exponential backoff. Upload never
   throws and never blocks the UI.

## Wiring the consent toggle

The UI team renders a "Share anonymous usage data" switch. It should call:

```js
// On toggle:
APlus.telemetry.setConsent(true);  // or false
```

To read the current state when rendering the toggle:

```js
const isOn = APlus.telemetry.getConsent(); // boolean
```

No other wiring is required - `js/telemetry.js` handles scheduling
flushes once consent is granted and stops sending immediately once it is
revoked.

## Computing the four core KPIs

All four are also available locally, computed purely from the on-device
buffer, via `APlus.telemetry.metrics()`:

```js
const m = APlus.telemetry.metrics();
// {
//   sessionsTotal, diagnosticCompletionRate,
//   day7Return: { returned, rollingWeeksFraction },
//   examsFinished, meanScaledScoreLast5, errorsLast7Days
// }
```

The same KPIs, computed server-side from the D1 schema below (see
`docs/telemetry-worker.js` for the ingestion side that populates this
table):

```sql
CREATE TABLE IF NOT EXISTS telemetry_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  install_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  event_time TEXT NOT NULL,   -- ISO 8601, from the client
  event_name TEXT NOT NULL,
  props_json TEXT NOT NULL,   -- flat JSON object, string
  received_at TEXT NOT NULL   -- ISO 8601, server-assigned
);

CREATE INDEX IF NOT EXISTS idx_telemetry_install_time
  ON telemetry_events (install_id, event_time);
CREATE INDEX IF NOT EXISTS idx_telemetry_name_time
  ON telemetry_events (event_name, event_time);
```

### 1. Session count

```sql
SELECT COUNT(*) AS session_count
FROM telemetry_events
WHERE event_name = 'session_start';
```

### 2. Diagnostic completion rate

```sql
SELECT
  (SELECT COUNT(*) FROM telemetry_events WHERE event_name = 'diagnostic_completed') * 1.0
  / NULLIF((SELECT COUNT(*) FROM telemetry_events WHERE event_name = 'diagnostic_started'), 0)
  AS diagnostic_completion_rate;
```

### 3. Day-7 return rate

Fraction of installs whose second-or-later `session_start` lands 6-8 days
after their first `session_start`:

```sql
WITH first_session AS (
  SELECT install_id, MIN(event_time) AS first_time
  FROM telemetry_events
  WHERE event_name = 'session_start'
  GROUP BY install_id
),
returned AS (
  SELECT DISTINCT f.install_id
  FROM telemetry_events e
  JOIN first_session f ON f.install_id = e.install_id
  WHERE e.event_name = 'session_start'
    AND julianday(e.event_time) - julianday(f.first_time) BETWEEN 6 AND 8
)
SELECT
  (SELECT COUNT(*) FROM returned) * 1.0
  / NULLIF((SELECT COUNT(*) FROM first_session), 0)
  AS day7_return_rate;
```

### 4. Crash rate (errors per session)

```sql
SELECT
  (SELECT COUNT(*) FROM telemetry_events WHERE event_name = 'error') * 1.0
  / NULLIF((SELECT COUNT(*) FROM telemetry_events WHERE event_name = 'session_start'), 0)
  AS crash_rate_per_session;
```

Restrict any of the above to a trailing window (e.g. last 7 days) by
adding `AND event_time >= datetime('now', '-7 days')`.

## Testing

`tools/test_telemetry.js` is a dependency-free Node test that stubs out
`window`, `localStorage`, and `APlus`, loads `js/telemetry-config.js` then
`js/telemetry.js` into a `vm` sandbox, fires fake bus events and DOM
events, and asserts on buffer contents, the 500-event cap, prop
sanitization, the derived-metrics math, and that upload is skipped
without consent (and with a non-https endpoint). Run it with:

```
node tools/test_telemetry.js
```
