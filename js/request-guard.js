/**
 * Clariora Exam Simulator
 * request-guard.js - Tier 1 client-side self-defense for network traffic.
 *
 * This layer exists to stop the application attacking itself: double-clicked
 * checkout buttons, a paywall sheet re-rendered into a second invoice request,
 * a keystroke handler firing one lookup per character, and retry loops that
 * hammer an endpoint which has already said no.
 *
 * It is NOT a security control. Everything enforced here is enforced again at
 * the edge (Cloudflare rulesets) and on the server (dual-key limiter + token
 * budgets). A client guard only protects honest users from accidental spend.
 *
 * Exposes window.APlus.guard.
 */
(function (window) {
  'use strict';

  var APlus = window.APlus = window.APlus || {};

  /* ---------------------------------------------------------------------
   * Tunables
   * ------------------------------------------------------------------ */

  var DEFAULT_DEBOUNCE_MS = 350;     // spec band: 300-500ms
  var DEFAULT_TIMEOUT_MS = 30000;
  var STREAM_TIMEOUT_MS = 120000;    // SSE coach turns legitimately run long
  var MAX_ATTEMPTS_CEILING = 2;      // hard cap: initial try + at most one retry
  var BASE_BACKOFF_MS = 400;
  var MAX_BACKOFF_MS = 4000;

  // 4xx is a verdict, not a blip. Retrying it converts a client bug into a
  // volumetric attack on our own origin, and retrying 429 specifically is how
  // a rate limit turns into an outage.
  var RETRYABLE_STATUS = [408, 425, 500, 502, 503, 504];

  /* ---------------------------------------------------------------------
   * In-flight registries
   * ------------------------------------------------------------------ */

  var inflight = Object.create(null);      // dedupe key -> { promise, controller }
  var actionLocks = Object.create(null);   // action key -> true while running

  function now() {
    return Date.now();
  }

  function hasAbort() {
    return typeof window.AbortController === 'function';
  }

  function jitter(ms) {
    // Full jitter: without it, every client that failed on the same upstream
    // blip retries in the same millisecond and rebuilds the spike.
    return Math.floor(Math.random() * ms);
  }

  function backoffFor(attempt) {
    var raw = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * Math.pow(2, Math.max(0, attempt - 1)));
    return jitter(raw);
  }

  function sleep(ms) {
    return new Promise(function (resolve) { window.setTimeout(resolve, ms); });
  }

  function isRetryableStatus(status) {
    return RETRYABLE_STATUS.indexOf(Number(status)) !== -1;
  }

  function clampAttempts(value) {
    var n = Number(value);
    if (!isFinite(n) || n < 1) return 1;
    return Math.min(MAX_ATTEMPTS_CEILING, Math.floor(n));
  }

  /* ---------------------------------------------------------------------
   * Rate-limit awareness
   *
   * The server returns X-RateLimit-* on every response and Retry-After on 429.
   * Caching the reset time lets the UI refuse to dispatch a request we already
   * know will be rejected, which is the cheapest possible 429.
   * ------------------------------------------------------------------ */

  var limitState = Object.create(null); // scope -> { limit, remaining, resetAt, blockedUntil }

  function scopeOf(url) {
    try {
      return new URL(String(url), window.location.href).pathname;
    } catch (_) {
      return String(url).split('?')[0];
    }
  }

  function readLimitHeaders(res, scope) {
    if (!res || !res.headers || typeof res.headers.get !== 'function') return null;

    var limit = Number(res.headers.get('X-RateLimit-Limit'));
    var remaining = Number(res.headers.get('X-RateLimit-Remaining'));
    var reset = Number(res.headers.get('X-RateLimit-Reset'));
    var retryAfter = Number(res.headers.get('Retry-After'));

    var state = limitState[scope] || {};
    if (isFinite(limit) && limit > 0) state.limit = limit;
    if (isFinite(remaining) && remaining >= 0) state.remaining = remaining;
    // X-RateLimit-Reset is a UTC epoch in SECONDS per the server contract.
    if (isFinite(reset) && reset > 0) state.resetAt = reset * 1000;

    if (res.status === 429) {
      state.remaining = 0;
      var waitMs = isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 60000;
      state.blockedUntil = now() + waitMs;
    } else if (state.blockedUntil && now() >= state.blockedUntil) {
      delete state.blockedUntil;
    }

    limitState[scope] = state;
    return state;
  }

  function limitStatus(url) {
    var state = limitState[scopeOf(url)];
    if (!state) return { blocked: false, remaining: null, limit: null, resetAt: null, retryAfterMs: 0 };
    var blocked = !!(state.blockedUntil && now() < state.blockedUntil);
    return {
      blocked: blocked,
      remaining: typeof state.remaining === 'number' ? state.remaining : null,
      limit: typeof state.limit === 'number' ? state.limit : null,
      resetAt: state.resetAt || null,
      retryAfterMs: blocked ? (state.blockedUntil - now()) : 0
    };
  }

  /* ---------------------------------------------------------------------
   * guard.fetch - single-flight, abortable, backoff-limited fetch
   * ------------------------------------------------------------------ */

  /**
   * opts  - a normal fetch init.
   * guardOpts:
   *   dedupeKey   - string. Concurrent calls sharing a key share one response.
   *                 Defaults to "METHOD url" for GET/HEAD, null otherwise.
   *   supersede   - bool. Abort any in-flight request with the same dedupeKey
   *                 and replace it. For search-as-you-type; never mutations.
   *   maxAttempts - 1 or 2. Default 1 for mutations, 2 for idempotent reads.
   *   timeoutMs   - abort after this long.
   *   signal      - caller's AbortSignal, honoured alongside the timeout.
   *   stream      - true for SSE; disables retry and widens the timeout.
   */
  function guardedFetch(url, opts, guardOpts) {
    opts = opts || {};
    guardOpts = guardOpts || {};

    var method = String(opts.method || 'GET').toUpperCase();
    var idempotent = method === 'GET' || method === 'HEAD';
    var scope = scopeOf(url);

    var dedupeKey = guardOpts.dedupeKey !== undefined
      ? guardOpts.dedupeKey
      : (idempotent ? method + ' ' + String(url) : null);

    // Pre-emptive local 429: we were told to back off and the window has not
    // elapsed. Dispatching anyway spends a Worker invocation to be told again.
    var pre = limitStatus(url);
    if (pre.blocked && !guardOpts.ignoreLocalBackoff) {
      var blockedErr = new Error('Rate limited locally; retry in ' + Math.ceil(pre.retryAfterMs / 1000) + 's');
      blockedErr.name = 'RateLimitedError';
      blockedErr.rateLimited = true;
      blockedErr.retryAfterMs = pre.retryAfterMs;
      blockedErr.local = true;
      return Promise.reject(blockedErr);
    }

    if (dedupeKey && inflight[dedupeKey]) {
      if (guardOpts.supersede) {
        try { inflight[dedupeKey].controller && inflight[dedupeKey].controller.abort(); } catch (_) {}
        delete inflight[dedupeKey];
      } else {
        // Sibling callers asking for the same thing at the same time get the
        // same network round trip rather than one each.
        return inflight[dedupeKey].promise;
      }
    }

    var isStream = guardOpts.stream === true;
    var maxAttempts = isStream
      ? 1
      : clampAttempts(guardOpts.maxAttempts !== undefined ? guardOpts.maxAttempts : (idempotent ? 2 : 1));
    var timeoutMs = Number(guardOpts.timeoutMs) > 0
      ? Number(guardOpts.timeoutMs)
      : (isStream ? STREAM_TIMEOUT_MS : DEFAULT_TIMEOUT_MS);

    var controller = hasAbort() ? new window.AbortController() : null;

    if (controller && guardOpts.signal) {
      if (guardOpts.signal.aborted) {
        controller.abort();
      } else if (typeof guardOpts.signal.addEventListener === 'function') {
        guardOpts.signal.addEventListener('abort', function () {
          try { controller.abort(); } catch (_) {}
        }, { once: true });
      }
    }

    var promise = (async function run() {
      var lastError = null;

      for (var attempt = 1; attempt <= maxAttempts; attempt++) {
        var timer = null;
        try {
          var init = Object.assign({}, opts);
          if (controller) {
            init.signal = controller.signal;
            timer = window.setTimeout(function () {
              try { controller.abort(); } catch (_) {}
            }, timeoutMs);
          }

          var res = await window.fetch(url, init);
          if (timer) window.clearTimeout(timer);

          readLimitHeaders(res, scope);

          if (res.status === 429) {
            var rlErr = new Error('Too many requests');
            rlErr.name = 'RateLimitedError';
            rlErr.rateLimited = true;
            rlErr.status = 429;
            rlErr.response = res;
            rlErr.retryAfterMs = limitStatus(url).retryAfterMs;
            // Explicitly terminal. Auto-retrying a 429 is the exact failure
            // mode this module exists to prevent.
            throw rlErr;
          }

          if (!res.ok && isRetryableStatus(res.status) && attempt < maxAttempts) {
            lastError = new Error('Upstream ' + res.status);
            lastError.status = res.status;
            lastError.response = res;
            await sleep(backoffFor(attempt));
            continue;
          }

          // Every other outcome, success or 4xx, is returned to the caller
          // as-is. 4xx is never retried.
          return res;
        } catch (e) {
          if (timer) window.clearTimeout(timer);
          if (e && (e.name === 'AbortError' || e.rateLimited)) throw e;

          lastError = e;
          if (attempt < maxAttempts) {
            await sleep(backoffFor(attempt));
            continue;
          }
          throw e;
        }
      }

      throw lastError || new Error('Request failed');
    })();

    function cleanup() {
      if (dedupeKey && inflight[dedupeKey] && inflight[dedupeKey].promise === promise) {
        delete inflight[dedupeKey];
      }
    }

    if (dedupeKey) {
      inflight[dedupeKey] = { promise: promise, controller: controller, startedAt: now() };
      promise.then(cleanup, cleanup);
    }

    return promise;
  }

  /* ---------------------------------------------------------------------
   * guard.action - submission lock around any async trigger
   * ------------------------------------------------------------------ */

  /**
   * Runs fn at most once at a time per key. A second call while the first is
   * still pending resolves to { skipped: true } rather than firing a duplicate
   * mutation. This is the double-click guard for checkout, activation, and
   * every other non-idempotent trigger.
   */
  function action(key, fn, actionOpts) {
    actionOpts = actionOpts || {};
    key = String(key);

    if (actionLocks[key]) {
      return Promise.resolve({ skipped: true, reason: 'IN_FLIGHT', key: key });
    }

    actionLocks[key] = true;
    var released = false;

    function release() {
      if (released) return;
      released = true;
      delete actionLocks[key];
    }

    function scheduleRelease() {
      // An optional cooldown keeps a rapid "click, fail, click, fail" loop from
      // becoming its own traffic source.
      if (Number(actionOpts.cooldownMs) > 0) {
        window.setTimeout(release, Number(actionOpts.cooldownMs));
      } else {
        release();
      }
    }

    var result;
    try {
      result = Promise.resolve(fn());
    } catch (err) {
      release();
      return Promise.reject(err);
    }

    return result.then(function (value) {
      scheduleRelease();
      return value;
    }, function (err) {
      scheduleRelease();
      throw err;
    });
  }

  function isLocked(key) {
    return !!actionLocks[String(key)];
  }

  /* ---------------------------------------------------------------------
   * guard.button - lock + visible pending state
   * ------------------------------------------------------------------ */

  /**
   * Wraps an async handler so the triggering element is disabled and visibly
   * pending for the whole life of the promise. A disabled button that still
   * looks clickable just teaches users to click harder.
   */
  function button(el, fn, buttonOpts) {
    buttonOpts = buttonOpts || {};
    var node = typeof el === 'string' ? document.getElementById(el) : el;
    var key = buttonOpts.key
      || (node && (node.id || node.getAttribute('data-guard-key')))
      || ('btn_' + Math.random().toString(36).slice(2));

    return action(key, function () {
      var originalText = null;

      if (node) {
        node.disabled = true;
        node.setAttribute('aria-busy', 'true');
        node.setAttribute('data-guard-pending', '1');
        if (buttonOpts.pendingText) {
          originalText = node.textContent;
          node.textContent = buttonOpts.pendingText;
        }
      }

      function restore() {
        if (!node) return;
        node.disabled = false;
        node.removeAttribute('aria-busy');
        node.removeAttribute('data-guard-pending');
        if (originalText !== null) node.textContent = originalText;
      }

      return Promise.resolve()
        .then(fn)
        .then(function (value) { restore(); return value; },
              function (err) { restore(); throw err; });
    }, buttonOpts);
  }

  /**
   * Recovers the element handling the current click. Inline onclick handlers
   * (which this codebase uses heavily) are not passed the element, so we read
   * it off the live event instead of threading it through every call site.
   */
  function currentTarget() {
    var ev = window.event;
    if (!ev) return null;
    return ev.currentTarget || ev.target || null;
  }

  /* ---------------------------------------------------------------------
   * guard.debounce / guard.throttle
   * ------------------------------------------------------------------ */

  function debounce(fn, waitMs) {
    var wait = Number(waitMs) > 0 ? Number(waitMs) : DEFAULT_DEBOUNCE_MS;
    var timer = null;
    var pendingController = null;

    function debounced() {
      var args = Array.prototype.slice.call(arguments);
      var self = this;

      if (timer) window.clearTimeout(timer);
      // A superseded lookup should not keep burning an upstream request.
      if (pendingController) {
        try { pendingController.abort(); } catch (_) {}
        pendingController = null;
      }

      timer = window.setTimeout(function () {
        timer = null;
        if (hasAbort()) {
          pendingController = new window.AbortController();
          args.push(pendingController.signal);
        }
        fn.apply(self, args);
      }, wait);
    }

    debounced.cancel = function () {
      if (timer) window.clearTimeout(timer);
      timer = null;
      if (pendingController) {
        try { pendingController.abort(); } catch (_) {}
        pendingController = null;
      }
    };

    return debounced;
  }

  function throttle(fn, intervalMs) {
    var interval = Number(intervalMs) > 0 ? Number(intervalMs) : DEFAULT_DEBOUNCE_MS;
    var last = 0;
    var trailingTimer = null;

    return function () {
      var args = Array.prototype.slice.call(arguments);
      var self = this;
      var elapsed = now() - last;

      if (elapsed >= interval) {
        last = now();
        fn.apply(self, args);
        return;
      }
      if (trailingTimer) return;
      trailingTimer = window.setTimeout(function () {
        trailingTimer = null;
        last = now();
        fn.apply(self, args);
      }, interval - elapsed);
    };
  }

  /* ---------------------------------------------------------------------
   * guard.interval - polling loop that does not run when nobody is looking
   * ------------------------------------------------------------------ */

  /**
   * A plain setInterval keeps firing in a backgrounded tab forever. For a loop
   * that touches the network or re-reads state, that is a client sitting in a
   * pinned tab generating traffic for hours with nobody watching. This is the
   * vanilla-JS equivalent of the runaway re-render loops the spec calls out.
   *
   * Behaviour:
   *  - skips ticks while document.hidden
   *  - optionally fires once immediately on becoming visible again, so the UI
   *    is correct the instant the user returns rather than up to one period stale
   *  - stops permanently after `maxFailures` consecutive throws, because a loop
   *    that fails every tick will fail every tick
   *
   * Returns a cancel function.
   */
  function interval(fn, periodMs, intervalOpts) {
    intervalOpts = intervalOpts || {};
    var period = Math.max(250, Number(periodMs) || 1000);
    var maxFailures = Number(intervalOpts.maxFailures) > 0 ? Number(intervalOpts.maxFailures) : 5;
    var runOnResume = intervalOpts.runOnResume !== false;
    var label = intervalOpts.label || 'interval';

    var failures = 0;
    var stopped = false;
    var timer = null;
    var doc = window.document;

    function hidden() {
      return !!(doc && doc.hidden);
    }

    function tick() {
      if (stopped) return;
      if (hidden()) return;
      try {
        fn();
        failures = 0;
      } catch (err) {
        failures += 1;
        if (failures >= maxFailures) {
          stop();
          try {
            console.warn('[guard.interval] "' + label + '" stopped after ' +
              failures + ' consecutive failures:', err && err.message);
          } catch (_) {}
        }
      }
    }

    function onVisibility() {
      if (!stopped && runOnResume && !hidden()) tick();
    }

    function stop() {
      if (stopped) return;
      stopped = true;
      if (timer) window.clearInterval(timer);
      timer = null;
      if (doc && typeof doc.removeEventListener === 'function') {
        doc.removeEventListener('visibilitychange', onVisibility);
      }
    }

    timer = window.setInterval(tick, period);
    if (doc && typeof doc.addEventListener === 'function') {
      doc.addEventListener('visibilitychange', onVisibility);
    }

    return stop;
  }

  /* ---------------------------------------------------------------------
   * guard.cached - short-TTL read cache with request coalescing
   * ------------------------------------------------------------------ */

  var readCache = Object.create(null);

  /**
   * Sibling widgets that all want the same entitlement / profile / stats read
   * on boot should produce one request, not one each. This is what SWR or
   * React Query would give a React app.
   */
  function cached(key, loader, ttlMs) {
    var ttl = Number(ttlMs) > 0 ? Number(ttlMs) : 15000;
    var entry = readCache[key];
    if (entry && (now() - entry.at) < ttl) return entry.promise;

    var promise = Promise.resolve().then(loader);
    readCache[key] = { at: now(), promise: promise };
    promise.catch(function () {
      // Never cache a failure: the next caller should be free to try again.
      if (readCache[key] && readCache[key].promise === promise) delete readCache[key];
    });
    return promise;
  }

  function invalidate(key) {
    if (key === undefined) {
      readCache = Object.create(null);
      return;
    }
    delete readCache[key];
  }

  /* ---------------------------------------------------------------------
   * Export
   * ------------------------------------------------------------------ */

  APlus.guard = {
    fetch: guardedFetch,
    action: action,
    button: button,
    isLocked: isLocked,
    currentTarget: currentTarget,
    debounce: debounce,
    throttle: throttle,
    interval: interval,
    cached: cached,
    invalidate: invalidate,
    limitStatus: limitStatus,
    constants: {
      DEFAULT_DEBOUNCE_MS: DEFAULT_DEBOUNCE_MS,
      MAX_ATTEMPTS_CEILING: MAX_ATTEMPTS_CEILING,
      RETRYABLE_STATUS: RETRYABLE_STATUS.slice()
    }
  };

})(typeof window !== 'undefined' ? window : this);
