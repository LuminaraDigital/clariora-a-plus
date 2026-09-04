/**
 * docs/telemetry-worker.js
 *
 * Minimal sample Cloudflare Worker for collecting CompTIA A+ Master
 * telemetry uploads sent by js/telemetry.js. This is a reference
 * implementation, not wired into the app by default (upload is OFF until
 * you set js/telemetry-config.js and the user consents).
 *
 * Deploy with `wrangler deploy`. Requires a D1 database binding named DB
 * (see the SQL schema in docs/ANALYTICS.md) bound in wrangler.toml, e.g.:
 *
 *   [[d1_databases]]
 *   binding = "DB"
 *   database_name = "aplus_telemetry"
 *   database_id = "<your-d1-database-id>"
 *
 * Set ALLOWED_ORIGIN as a Worker environment variable / secret to the
 * exact origin the app is served from (e.g. "https://your-app.pages.dev").
 * Only that origin is allowed to POST; everything else is rejected.
 */

const MAX_BODY_BYTES = 64 * 1024; // 64 KB hard cap
const MAX_EVENTS_PER_REQUEST = 200; // sanity cap independent of client batchSize

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || '';
    const origin = request.headers.get('Origin') || '';

    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    // Only accept requests from the configured app origin.
    if (!allowedOrigin || origin !== allowedOrigin) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }

    // Enforce a hard body-size cap before touching the payload.
    const contentLength = Number(request.headers.get('Content-Length') || '0');
    if (contentLength && contentLength > MAX_BODY_BYTES) {
      return new Response('Payload too large', { status: 413, headers: corsHeaders });
    }

    let rawBody;
    try {
      rawBody = await request.text();
    } catch (err) {
      return new Response('Bad request', { status: 400, headers: corsHeaders });
    }

    if (!rawBody || rawBody.length > MAX_BODY_BYTES) {
      return new Response('Payload too large', { status: 413, headers: corsHeaders });
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (err) {
      return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
    }

    // Validate shape: { installId: string, events: [{t,n,p,s}, ...] }
    if (!payload || typeof payload !== 'object') {
      return new Response('Invalid payload', { status: 400, headers: corsHeaders });
    }
    const installId = payload.installId;
    const events = payload.events;

    if (typeof installId !== 'string' || installId.length === 0 || installId.length > 100) {
      return new Response('Invalid installId', { status: 400, headers: corsHeaders });
    }
    if (!Array.isArray(events) || events.length === 0 || events.length > MAX_EVENTS_PER_REQUEST) {
      return new Response('Invalid events array', { status: 400, headers: corsHeaders });
    }

    const rows = [];
    for (const evt of events) {
      if (!evt || typeof evt !== 'object') continue;
      const t = typeof evt.t === 'string' ? evt.t.slice(0, 40) : null;
      const n = typeof evt.n === 'string' ? evt.n.slice(0, 80) : null;
      const s = typeof evt.s === 'string' ? evt.s.slice(0, 100) : null;
      if (!t || !n || !s) continue;

      // Keep only flat primitive props; drop anything unexpected before
      // storing, mirroring the client-side sanitizer in js/telemetry.js.
      const cleanProps = {};
      if (evt.p && typeof evt.p === 'object') {
        for (const key of Object.keys(evt.p)) {
          const v = evt.p[key];
          const vt = typeof v;
          if (v === null || vt === 'boolean' || vt === 'number') {
            cleanProps[key] = v;
          } else if (vt === 'string') {
            cleanProps[key] = v.slice(0, 80);
          }
        }
      }

      rows.push({
        install_id: installId,
        session_id: s,
        event_time: t,
        event_name: n,
        props_json: JSON.stringify(cleanProps).slice(0, 2000),
        received_at: new Date().toISOString()
      });
    }

    if (rows.length === 0) {
      return new Response('No valid events', { status: 400, headers: corsHeaders });
    }

    try {
      if (env.DB) {
        const stmt = env.DB.prepare(
          `INSERT INTO telemetry_events (install_id, session_id, event_time, event_name, props_json, received_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        );
        const batch = rows.map((r) =>
          stmt.bind(r.install_id, r.session_id, r.event_time, r.event_name, r.props_json, r.received_at)
        );
        await env.DB.batch(batch);
      } else if (env.TELEMETRY_KV) {
        // Fallback KV storage: one key per event, namespaced by day for
        // easy manual export. Prefer D1 for real querying.
        const day = rows[0].event_time.slice(0, 10);
        const kvKey = `${day}/${installId}/${crypto.randomUUID()}`;
        await env.TELEMETRY_KV.put(kvKey, JSON.stringify(rows));
      }
    } catch (err) {
      // Never leak internals; just fail the request so the client retries
      // with backoff.
      return new Response('Storage error', { status: 500, headers: corsHeaders });
    }

    return new Response(null, { status: 204, headers: corsHeaders });
  }
};
