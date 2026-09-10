/**
 * boot-intro.js
 * Cinematic startup: brand on full-bleed media, one enter path.
 * Stays until Enter (keyboard), Enter app, or the A+ mark (when ready).
 * Nothing auto-dismisses. No skip, no path chips.
 */
(function (window) {
  'use strict';

  var document = window.document;
  var APlus = (window.APlus = window.APlus || {});

  var VIDEO_SRC = 'media/brand/huly_laser_remix_scene.webm';
  var POSTER_SRC = 'media/brand/huly_laser_remix_scene.png';

  var REVEAL_MS = 600;
  var REVEAL_REDUCED_MS = 250;
  var EXIT_MS = 400;
  var ARM_FAILSAFE_MS = 1500;
  var VIDEO_WAIT_MS = 1200;
  var LAYOUT = 'lean-v1';

  var introRunning = false;
  var activeRunId = 0;
  var activeCleanup = null;

  function prefersReducedMotion() {
    return !!(
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function hideImmediate() {
    var root = byId('aplusBootIntro');
    if (root) {
      if (root._bootVideoKeepAlive) {
        window.clearInterval(root._bootVideoKeepAlive);
        root._bootVideoKeepAlive = null;
      }
      root.hidden = true;
      root.setAttribute('hidden', '');
      root.classList.remove('is-active', 'is-exiting', 'is-ready', 'is-armed', 'is-reduced');
    }
    document.documentElement.classList.remove('boot-intro-active');
    introRunning = false;
  }

  var INTRO_HTML =
    '<div class="boot-intro-stage" data-boot-layout="' +
    LAYOUT +
    '">' +
    '  <div class="boot-intro-media" id="aplusBootIntroMedia" aria-hidden="true">' +
    '    <img id="aplusBootIntroStill" class="boot-intro-still" src="' +
    POSTER_SRC +
    '" alt="" decoding="async">' +
    '    <video id="aplusBootIntroVideo" class="boot-intro-video" muted playsinline loop preload="auto" poster="' +
    POSTER_SRC +
    '"></video>' +
    '    <div class="boot-intro-grain"></div>' +
    '    <div class="boot-intro-gold-wash"></div>' +
    '    <div class="boot-intro-vignette"></div>' +
    '  </div>' +
    '  <div class="boot-intro-copy">' +
    '    <button type="button" class="boot-intro-mark" id="aplusBootIntroMark" aria-label="Enter Clariora" disabled>A+</button>' +
    '    <p class="boot-intro-eyebrow">Datacentre Academy</p>' +
    '    <h2 id="aplusBootIntroTitle" class="boot-intro-title">Clariora</h2>' +
    '    <p class="boot-intro-sub" id="aplusBootIntroSub">Preparing your workspace</p>' +
    '    <div class="boot-intro-actions" id="aplusBootIntroActions">' +
    '      <button type="button" class="boot-intro-enter" id="aplusBootIntroEnter" disabled>Enter app</button>' +
    '    </div>' +
    '  </div>' +
    '</div>';

  function ensureMarkup() {
    var root = byId('aplusBootIntro');
    if (root) {
      var stage = root.querySelector('.boot-intro-stage');
      var needsRebuild =
        !byId('aplusBootIntroEnter') ||
        !byId('aplusBootIntroStill') ||
        !stage ||
        stage.getAttribute('data-boot-layout') !== LAYOUT ||
        byId('aplusBootIntroSkip') ||
        root.querySelector('[data-boot-action]');
      if (needsRebuild) root.innerHTML = INTRO_HTML;
      return root;
    }
    root = document.createElement('div');
    root.id = 'aplusBootIntro';
    root.className = 'boot-intro';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'aplusBootIntroTitle');
    root.innerHTML = INTRO_HTML;
    document.body.insertBefore(root, document.body.firstChild);
    return root;
  }

  function setProgress(pct, label) {
    /* Progress chrome removed from lean layout. Kept for shell-ux callers. */
    var sub = byId('aplusBootIntroSub');
    if (sub && label && !document.documentElement.classList.contains('boot-intro-ready-copy')) {
      /* Quiet loading copy only; ready state owns the Enter line. */
      if (/ready|enter/i.test(String(label)) === false) {
        sub.textContent = 'Preparing your workspace';
      }
    }
    void pct;
  }

  function setActionsEnabled(on) {
    var enter = byId('aplusBootIntroEnter');
    var mark = byId('aplusBootIntroMark');
    var sub = byId('aplusBootIntroSub');
    var root = byId('aplusBootIntro');
    if (enter) {
      enter.disabled = !on;
      if (on) enter.removeAttribute('disabled');
      else enter.setAttribute('disabled', '');
    }
    if (mark) {
      mark.disabled = !on;
      if (on) {
        mark.removeAttribute('disabled');
        mark.removeAttribute('aria-disabled');
        mark.tabIndex = 0;
      } else {
        mark.setAttribute('disabled', '');
        mark.setAttribute('aria-disabled', 'true');
        mark.tabIndex = -1;
      }
    }
    if (root) root.classList.toggle('is-ready', !!on);
    if (sub) {
      sub.textContent = on ? 'Press Enter to continue' : 'Preparing your workspace';
    }
    document.documentElement.classList.toggle('boot-intro-ready-copy', !!on);
  }

  function startVideo(video, still, root) {
    if (!video) return Promise.resolve(false);
    if (still) {
      still.hidden = false;
      still.removeAttribute('hidden');
    }

    return new Promise(function (resolve) {
      var settled = false;
      var keepAlive = null;

      function done(ok) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        video.removeEventListener('canplay', onReady);
        video.removeEventListener('loadeddata', onReady);
        video.removeEventListener('error', onErr);
        if (ok) {
          keepAlive = window.setInterval(function () {
            if (!root || !root.classList.contains('is-active') || root.hidden) {
              window.clearInterval(keepAlive);
              return;
            }
            if (video.paused) {
              var p = video.play();
              if (p && typeof p.catch === 'function') p.catch(function () {});
            }
          }, 700);
          root._bootVideoKeepAlive = keepAlive;
        }
        resolve(!!ok);
      }
      function onReady() {
        try {
          if (video.currentTime < 0.01) video.currentTime = 0.12;
        } catch (_) {}
        var p = video.play();
        if (p && typeof p.then === 'function') {
          p.then(function () {
            window.setTimeout(function () {
              if (!video.paused && video.readyState >= 2) {
                root.classList.add('is-video-playing');
                done(true);
              } else {
                done(false);
              }
            }, 80);
          })['catch'](function () {
            done(false);
          });
        } else if (!video.paused) {
          root.classList.add('is-video-playing');
          done(true);
        } else {
          done(false);
        }
      }
      function onErr() {
        done(false);
      }
      var timer = window.setTimeout(function () {
        done(false);
      }, VIDEO_WAIT_MS);

      video.addEventListener('canplay', onReady);
      video.addEventListener('loadeddata', onReady);
      video.addEventListener('error', onErr);
      try {
        video.muted = true;
        video.defaultMuted = true;
        video.setAttribute('muted', '');
        video.playsInline = true;
        video.loop = true;
        video.setAttribute('loop', '');
        video.preload = 'auto';
        video.src = VIDEO_SRC;
        video.load();
      } catch (err) {
        done(false);
      }
    });
  }

  // Seen flag is written only after the user actually enters (finish()).
  // v2 invalidates earlier builds that marked this before Enter was pressed.
  var SEEN_KEY = 'aplus3_boot_intro_seen_v2';

  function hasSeenIntro() {
    try {
      return window.localStorage.getItem(SEEN_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function markIntroSeen() {
    try {
      window.localStorage.setItem(SEEN_KEY, '1');
    } catch (_) {}
  }

  function clearIntroSeen() {
    try {
      window.localStorage.removeItem(SEEN_KEY);
    } catch (_) {}
  }

  function quickPass(opts) {
    hideImmediate();
    var work =
      typeof opts.provision === 'function'
        ? Promise.resolve().then(function () {
            return opts.provision();
          })
        : Promise.resolve();
    return work
      ['catch'](function (err) {
        console.warn('[boot-intro] provision during quick pass:', err);
      })
      .then(function () {
        hideImmediate();
      });
  }

  function run(opts) {
    opts = opts || {};
    if (introRunning && !opts.force) {
      return Promise.resolve();
    }
    if (!opts.force && hasSeenIntro()) {
      return quickPass(opts);
    }
    if (document.documentElement.classList.contains('clariora-auth-locked') ||
        (window.ClarioraAuthGate && typeof window.ClarioraAuthGate.isUnlocked === 'function' && !window.ClarioraAuthGate.isUnlocked())) {
      return quickPass(opts);
    }

    if (typeof activeCleanup === 'function') {
      try {
        activeCleanup();
      } catch (_) {}
      activeCleanup = null;
    }

    introRunning = true;
    var runId = ++activeRunId;

    var root = ensureMarkup();
    var video = byId('aplusBootIntroVideo');
    var still = byId('aplusBootIntroStill');
    var media = byId('aplusBootIntroMedia');
    var enterBtn = byId('aplusBootIntroEnter');
    var markBtn = byId('aplusBootIntroMark');
    var reduced = prefersReducedMotion();
    var finished = false;
    var cleaned = false;
    var revealMs = reduced ? REVEAL_REDUCED_MS : REVEAL_MS;
    var provisionDone = false;
    var revealDone = false;
    var armed = false;
    var startedAt = Date.now();
    var timers = [];
    var finishResolver = null;
    var finishPromise = new Promise(function (resolve) {
      finishResolver = resolve;
    });

    function isCurrent() {
      return runId === activeRunId;
    }

    function detachListeners() {
      document.removeEventListener('keydown', onKey);
      if (root) {
        root.removeEventListener('pointermove', onPointerMove);
        root.removeEventListener('pointerleave', onPointerLeave);
      }
      if (enterBtn) enterBtn.onclick = null;
      if (markBtn) markBtn.onclick = null;
    }

    function cleanupRun(hide) {
      if (cleaned) return;
      cleaned = true;
      clearTimers();
      detachListeners();
      if (hide) hideImmediate();
      if (activeCleanup === cleanupRunBound) activeCleanup = null;
      if (isCurrent()) introRunning = false;
    }

    var cleanupRunBound = function () {
      finished = true;
      cleanupRun(true);
      if (finishResolver) {
        var r = finishResolver;
        finishResolver = null;
        r();
      }
    };
    activeCleanup = cleanupRunBound;

    document.documentElement.classList.add('boot-intro-active');
    document.documentElement.classList.remove('boot-intro-ready-copy');
    root.hidden = false;
    root.removeAttribute('hidden');
    root.className = 'boot-intro is-active';
    if (reduced) root.classList.add('is-reduced');
    setActionsEnabled(false);

    if (reduced) {
      if (video) {
        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch (_) {}
      }
      if (still) {
        still.hidden = false;
        still.removeAttribute('hidden');
      }
    } else {
      startVideo(video, still, root).then(function (ok) {
        if (!isCurrent() || finished) return;
        if (!ok) {
          root.classList.add('is-reduced');
          root.classList.remove('is-video-playing');
          if (still) {
            still.hidden = false;
            still.removeAttribute('hidden');
          }
        }
      });
    }

    var provisionPromise = Promise.resolve();
    if (typeof opts.provision === 'function') {
      provisionPromise = Promise.resolve()
        .then(function () {
          if (!isCurrent()) return;
          return opts.provision();
        })
        .then(function () {
          if (!isCurrent()) return;
          provisionDone = true;
          maybeArm();
        })
        ['catch'](function (err) {
          console.warn('[boot-intro] provision:', err);
          if (!isCurrent()) return;
          provisionDone = true;
          maybeArm();
        });
    } else {
      provisionDone = true;
    }

    function clearTimers() {
      timers.forEach(function (id) {
        window.clearTimeout(id);
        window.clearInterval(id);
      });
      timers = [];
    }

    function maybeArm() {
      if (!isCurrent() || armed || finished) return;
      if (!(provisionDone && revealDone)) return;
      var minShow = reduced ? 300 : 700;
      var waited = Date.now() - startedAt;
      if (waited < minShow) {
        timers.push(
          window.setTimeout(function () {
            maybeArm();
          }, minShow - waited)
        );
        return;
      }
      armed = true;
      root.classList.add('is-armed', 'is-ready');
      setActionsEnabled(true);
      if (enterBtn) {
        try {
          enterBtn.focus({ preventScroll: true });
        } catch (_) {
          try {
            enterBtn.focus();
          } catch (__) {}
        }
      }
    }

    function finish() {
      if (finished || !isCurrent()) return finishPromise;
      finished = true;
      clearTimers();
      detachListeners();
      markIntroSeen();
      root.classList.add('is-exiting');
      setActionsEnabled(false);

      if (video) {
        try {
          video.pause();
        } catch (_) {}
      }

      window.setTimeout(function () {
        if (!isCurrent()) {
          if (finishResolver) {
            var stale = finishResolver;
            finishResolver = null;
            stale();
          }
          return;
        }
        hideImmediate();
        if (video) {
          try {
            video.removeAttribute('src');
            video.load();
          } catch (_) {}
        }
        cleanupRun(false);
        if (finishResolver) {
          var r = finishResolver;
          finishResolver = null;
          r();
        }
      }, EXIT_MS);

      return finishPromise;
    }

    function requestEnter() {
      if (finished || !isCurrent() || !armed) return;
      finish();
    }

    function onKey(e) {
      if (finished || !armed) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        requestEnter();
      }
    }

    function onPointerMove(e) {
      if (reduced || !media || finished) return;
      var w = window.innerWidth || 1;
      var h = window.innerHeight || 1;
      var x = (e.clientX / w - 0.5) * 10;
      var y = (e.clientY / h - 0.5) * 6;
      media.style.transform =
        'translate(' + x.toFixed(2) + 'px, ' + y.toFixed(2) + 'px) scale(1.03)';
    }

    function onPointerLeave() {
      if (media) media.style.transform = '';
    }

    function onEnterClick(e) {
      e.preventDefault();
      e.stopPropagation();
      if (!armed) return;
      if (enterBtn && enterBtn.disabled) return;
      requestEnter();
    }

    if (enterBtn) enterBtn.onclick = onEnterClick;
    if (markBtn) markBtn.onclick = onEnterClick;

    document.addEventListener('keydown', onKey);
    if (!reduced) {
      root.addEventListener('pointermove', onPointerMove);
      root.addEventListener('pointerleave', onPointerLeave);
    }

    timers.push(
      window.setTimeout(function () {
        revealDone = true;
        maybeArm();
      }, revealMs)
    );

    timers.push(
      window.setTimeout(function () {
        // Unlock if setup stalled. Never auto-enter.
        provisionDone = true;
        revealDone = true;
        maybeArm();
      }, ARM_FAILSAFE_MS)
    );

    return provisionPromise
      .then(function () {
        if (!isCurrent()) return finishPromise;
        provisionDone = true;
        maybeArm();
        return finishPromise;
      })
      .then(function () {
        if (isCurrent()) cleanupRun(false);
      });
  }

  APlus.bootIntro = {
    run: run,
    ensure: ensureMarkup,
    setProgress: setProgress,
    hide: hideImmediate,
    clearSeen: clearIntroSeen,
  };

  if (hasSeenIntro()) {
    hideImmediate();
    document.addEventListener('DOMContentLoaded', hideImmediate);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      ensureMarkup();
      document.documentElement.classList.add('boot-intro-active');
      var root = byId('aplusBootIntro');
      if (root) {
        root.hidden = false;
        root.removeAttribute('hidden');
        root.classList.add('is-active');
      }
    });
  } else {
    ensureMarkup();
    document.documentElement.classList.add('boot-intro-active');
  }
})(window);
