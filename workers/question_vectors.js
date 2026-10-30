/**
 * Question bank embeddings via Workers AI + Vectorize (optional).
 * Offline fallback: ASSETS similar_neighbors.json served to clients; this
 * module powers /api/v1/items/similar and coach retrieve_similar_items.
 */

const EMBED_MODEL = '@cf/baai/bge-small-en-v1.5';
const DEFAULT_K = 5;
const MAX_K = 10;

/**
 * @param {any} env
 * @param {string|string[]} text
 * @returns {Promise<number[]|null>}
 */
export async function embedText(env, text) {
  if (!env || !env.AI) return null;
  const inputs = Array.isArray(text) ? text : [String(text || '')];
  const cleaned = inputs.map((t) => String(t || '').slice(0, 1500)).filter(Boolean);
  if (!cleaned.length) return null;
  try {
    const resp = await env.AI.run(EMBED_MODEL, { text: cleaned });
    const data = resp && (resp.data || resp);
    if (Array.isArray(data) && data[0] && Array.isArray(data[0])) return data[0];
    if (data && Array.isArray(data.data) && Array.isArray(data.data[0])) return data.data[0];
    return null;
  } catch (err) {
    console.warn('embedText failed:', err && err.message);
    return null;
  }
}

/**
 * Query Vectorize for similar question ids.
 * @param {any} env
 * @param {{qid?: string, text?: string, k?: number}} opts
 */
export async function findSimilarQuestionIds(env, opts) {
  const k = Math.min(MAX_K, Math.max(1, Number(opts && opts.k) || DEFAULT_K));
  const qid = opts && opts.qid ? String(opts.qid).slice(0, 64) : '';
  const text = opts && opts.text ? String(opts.text).slice(0, 1500) : '';

  if (env && env.VECTORIZE) {
    try {
      let vector = null;
      if (text) {
        vector = await embedText(env, text);
      } else if (qid) {
        // Prefer metadata filter + query by embedding the id string as weak fallback;
        // production path embeds question text from caller.
        vector = await embedText(env, qid);
      }
      if (vector && vector.length) {
        const matches = await env.VECTORIZE.query(vector, {
          topK: k + (qid ? 3 : 0),
          returnMetadata: true
        });
        const ids = [];
        const rows = (matches && matches.matches) || [];
        for (let i = 0; i < rows.length; i++) {
          const id = String((rows[i].id != null ? rows[i].id : (rows[i].metadata && rows[i].metadata.question_id)) || '');
          if (!id || id === qid) continue;
          if (ids.indexOf(id) === -1) ids.push(id);
          if (ids.length >= k) break;
        }
        if (ids.length) {
          return { ok: true, source: 'vectorize', ids };
        }
      }
    } catch (err) {
      console.warn('VECTORIZE query failed:', err && err.message);
    }
  }

  // D1 neighbor cache (populated by index job / build script import)
  if (env && env.DB && qid) {
    try {
      const row = await env.DB.prepare(
        'SELECT neighbor_ids FROM question_neighbors WHERE question_id = ?'
      ).bind(qid).first();
      if (row && row.neighbor_ids) {
        let ids = [];
        try {
          ids = JSON.parse(String(row.neighbor_ids));
        } catch (_) {
          ids = [];
        }
        if (Array.isArray(ids) && ids.length) {
          return {
            ok: true,
            source: 'd1',
            ids: ids.map(String).filter((id) => id && id !== qid).slice(0, k)
          };
        }
      }
    } catch (_) {
      /* table may not exist yet */
    }
  }

  // Static neighbors file shipped with the web dist (offline map).
  if (env && env.ASSETS && qid) {
    try {
      const assetRes = await env.ASSETS.fetch(
        new Request('https://assets.local/similar_neighbors.json')
      );
      if (assetRes && assetRes.ok) {
        const payload = await assetRes.json();
        const map =
          payload && payload.neighbors && typeof payload.neighbors === 'object'
            ? payload.neighbors
            : payload;
        const row = map && map[qid];
        let ids = [];
        if (Array.isArray(row)) ids = row;
        else if (row && Array.isArray(row.ids)) ids = row.ids;
        if (ids.length) {
          return {
            ok: true,
            source: 'assets',
            ids: ids.map(String).filter((id) => id && id !== qid).slice(0, k)
          };
        }
      }
    } catch (_) {
      /* ignore */
    }
  }

  return { ok: true, source: 'none', ids: [] };
}

/**
 * Upsert vectors for a batch of {id, text, metadata}.
 * @param {any} env
 * @param {Array<{id:string,text:string,metadata?:object}>} items
 */
export async function upsertQuestionVectors(env, items) {
  if (!env || !env.AI || !env.VECTORIZE) {
    return { ok: false, upserted: 0, error: 'AI_OR_VECTORIZE_MISSING' };
  }
  const list = Array.isArray(items) ? items.slice(0, 64) : [];
  if (!list.length) return { ok: true, upserted: 0 };

  const texts = list.map((it) => String(it.text || '').slice(0, 1500));
  let vectors;
  try {
    const resp = await env.AI.run(EMBED_MODEL, { text: texts });
    vectors = resp && (resp.data || resp);
    if (vectors && vectors.data) vectors = vectors.data;
  } catch (err) {
    return { ok: false, upserted: 0, error: err && err.message };
  }
  if (!Array.isArray(vectors) || vectors.length !== list.length) {
    return { ok: false, upserted: 0, error: 'EMBED_LENGTH_MISMATCH' };
  }

  const payload = list.map((it, i) => ({
    id: String(it.id).slice(0, 64),
    values: vectors[i],
    metadata: Object.assign({ question_id: String(it.id).slice(0, 64) }, it.metadata || {})
  }));

  await env.VECTORIZE.upsert(payload);
  return { ok: true, upserted: payload.length };
}
