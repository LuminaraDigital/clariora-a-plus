/**
 * shell-ux.js
 * App shell: first-run gate, More drawer, body scroll lock, label hygiene.
 * Owns no exam logic. Never changes function signatures used by other modules.
 */
(function (window) {
  'use strict';

  var document = window.document;
  var APlus = (window.APlus = window.APlus || {});
  var BOOT_KEY = 'aplus3_boot_complete_v1';
  /* The startup cinematic plays until the user presses Enter (or Skip / a path).
     The seen flag is written only after that exit (by boot-intro.js), so a
     refresh mid-intro still shows the scene. Nothing auto-dismisses.
     "Replay startup intro" uses run({force:true}). */
  var INTRO_SEEN_KEY = 'aplus3_boot_intro_seen_v2';

  /* Pictograph ranges, used only to strip glyphs that other modules render. */
  var EMOJI_SOURCE =
    '[\\u2190-\\u21FF\\u2300-\\u27BF\\u2B00-\\u2BFF\\u2705\\u274C\\uFE0F]' +
    '|[\\uD83C-\\uDBFF][\\uDC00-\\uDFFF]';
  var EMOJI_RE = new RegExp(EMOJI_SOURCE, 'g');

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function byId(id) {
    return document.getElementById(id);
  }

  /* ---------------------------------------------------------------
     First-run gate
     --------------------------------------------------------------- */

  function ensureBootGate() {
    if (byId('aplusBootGate')) return;
    var gate = document.createElement('div');
    gate.id = 'aplusBootGate';
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-modal', 'true');
    gate.setAttribute('aria-labelledby', 'aplusBootTitle');
    gate.innerHTML =
      '<div class="boot-panel">' +
      '<div class="mark" aria-hidden="true">A+</div>' +
      '<h2 id="aplusBootTitle">Clariora</h2>' +
      '<p>Your progress is saved on this PC. No account needed.</p>' +
      '<div class="boot-progress" aria-hidden="true"><span id="aplusBootBar"></span></div>' +
      '<button type="button" class="btn" id="aplusBootStartBtn">Continue</button>' +
      '<div class="boot-meta" id="aplusBootMeta">Setting up</div>' +
      '</div>';
    document.body.appendChild(gate);
  }

  function setBootProgress(pct, label) {
    var bar = byId('aplusBootBar');
    var meta = byId('aplusBootMeta');
    if (bar) bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
    if (meta && label) meta.textContent = label;
    if (APlus.bootIntro && typeof APlus.bootIntro.setProgress === 'function') {
      APlus.bootIntro.setProgress(pct, label);
    }
  }

  function provisionMemory() {
    setBootProgress(20, 'Opening your saved progress');
    var step = Promise.resolve();
    if (window.CompTIADatabase && typeof window.CompTIADatabase.init === 'function') {
      try {
        step = Promise.resolve(window.CompTIADatabase.init());
      } catch (err) {
        console.warn('[shell-ux] database init:', err);
      }
    }
    return step['catch'](function (err) {
      console.warn('[shell-ux] database init:', err);
    }).then(function () {
      setBootProgress(60, 'Loading your profile');
      if (APlus.storage) {
        APlus.storage.set('theme', APlus.storage.get('theme', 'dark') || 'dark');
        APlus.storage.set('machine_ready', true);
        if (!APlus.storage.get('active_profile', null)) {
          APlus.storage.set('active_profile', {
            id: 'local',
            name: 'Learner',
            createdAt: new Date().toISOString()
          });
        }
      }
      var badge = byId('dbMemoryStatusBadge');
      if (badge) badge.textContent = 'Saved on this PC';
      setBootProgress(100, 'Ready');
    });
  }

  function emitShellReady() {
    if (APlus.bus && typeof APlus.bus.emit === 'function') {
      APlus.bus.emit('shell:ready', { version: '4.0.0' });
    }
  }

  function hideBootGate() {
    var gate = byId('aplusBootGate');
    if (gate) gate.hidden = true;
    try {
      localStorage.setItem(BOOT_KEY, '1');
      if (APlus.storage) APlus.storage.set('boot_complete', true);
    } catch (err) {
      /* storage blocked, gate simply shows again next launch */
    }
    emitShellReady();
  }

  function hasSeenIntro() {
    try {
      return window.localStorage.getItem(INTRO_SEEN_KEY) === '1';
    } catch (err) {
      /* Storage blocked: treat as a first launch and show the intro. */
      return false;
    }
  }

  /* Takes the stage down without waiting for boot-intro.js, so a regenerated
     module that lost its own hide path still cannot leave a black screen. */
  function hideIntroStage() {
    if (APlus.bootIntro && typeof APlus.bootIntro.hide === 'function') {
      try {
        APlus.bootIntro.hide();
      } catch (err) {
        console.warn('[shell-ux] boot intro hide:', err);
      }
    }
    var root = byId('aplusBootIntro');
    if (root) {
      root.hidden = true;
      root.setAttribute('hidden', '');
      root.classList.remove('is-active', 'is-exiting', 'is-ready', 'is-armed');
    }
    document.documentElement.classList.remove('boot-intro-active');
  }

  function runFirstLaunch() {
    var legacyGate = byId('aplusBootGate');
    if (legacyGate) legacyGate.hidden = true;

    var provision = function () {
      return provisionMemory();
    };

    var chain;
    if (hasSeenIntro()) {
      hideIntroStage();
      chain = Promise.resolve().then(provision);
    } else {
      /* First launch only. Stays until Enter / Enter app / A+ mark.
         boot-intro.js writes INTRO_SEEN_KEY on that exit (not before). */
      chain =
        APlus.bootIntro && typeof APlus.bootIntro.run === 'function'
          ? APlus.bootIntro.run({ provision: provision, force: true })
          : Promise.resolve().then(provision);
      chain = chain.then(function () {
        hideIntroStage();
      });
    }

    return chain
      .then(function () {
        try {
          localStorage.setItem(BOOT_KEY, '1');
          if (APlus.storage) APlus.storage.set('boot_complete', true);
        } catch (err) {
          /* storage blocked */
        }
        if (legacyGate) legacyGate.hidden = true;
        emitShellReady();
      })
      ['catch'](function (err) {
        console.warn('[shell-ux] boot intro:', err);
        if (legacyGate) legacyGate.hidden = true;
        hideIntroStage();
        emitShellReady();
      });
  }

  /* ---------------------------------------------------------------
     Body scroll lock
     --------------------------------------------------------------- */

  function anyOverlayOpen() {
    if (document.querySelector('.modal-overlay.active')) return true;
    var drawer = byId('moreMenu');
    return !!(drawer && !drawer.hidden);
  }

  var lockApplied = false;
  var lockWriting = false;

  /* Writes the lock class only when the state actually changes, so the
     observer below can never be woken by its own work. */
  function syncBodyScrollLock() {
    var want = anyOverlayOpen();
    if (want === lockApplied) return;
    lockApplied = want;
    lockWriting = true;
    if (want) document.body.classList.add('is-locked');
    else document.body.classList.remove('is-locked');
    window.setTimeout(function () {
      lockWriting = false;
    }, 0);
  }

  function watchOverlays() {
    if (!window.MutationObserver) return;
    var timer = null;
    var observer = new window.MutationObserver(function () {
      if (lockWriting) return;
      if (timer) return;
      timer = window.setTimeout(function () {
        timer = null;
        syncBodyScrollLock();
      }, 60);
    });
    observer.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ['class', 'hidden']
    });
  }

  /* ---------------------------------------------------------------
     More drawer
     --------------------------------------------------------------- */

  var lastFocusBeforeDrawer = null;

  function focusableIn(root) {
    if (!root) return [];
    var nodes = root.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'
    );
    return Array.prototype.filter.call(nodes, function (el) {
      return el.offsetParent !== null || el === document.activeElement;
    });
  }

  function openMoreMenu() {
    var drawer = byId('moreMenu');
    var scrim = byId('moreMenuScrim');
    var btn = byId('moreMenuBtn');
    if (!drawer) return;
    lastFocusBeforeDrawer = document.activeElement;
    drawer.hidden = false;
    if (scrim) scrim.hidden = false;
    if (btn) btn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('is-locked');
    window.setTimeout(function () {
      drawer.classList.add('open');
      if (scrim) scrim.classList.add('open');
      var close = byId('moreMenuCloseBtn');
      if (close) close.focus();
    }, 0);
  }

  function closeMoreMenu() {
    var drawer = byId('moreMenu');
    var scrim = byId('moreMenuScrim');
    var btn = byId('moreMenuBtn');
    if (!drawer || drawer.hidden) return;
    drawer.classList.remove('open');
    if (scrim) scrim.classList.remove('open');
    if (btn) btn.setAttribute('aria-expanded', 'false');

    var finish = function () {
      drawer.hidden = true;
      if (scrim) scrim.hidden = true;
      syncBodyScrollLock();
    };
    if (prefersReducedMotion()) finish();
    else window.setTimeout(finish, 180);

    if (lastFocusBeforeDrawer && typeof lastFocusBeforeDrawer.focus === 'function') {
      lastFocusBeforeDrawer.focus();
    }
    lastFocusBeforeDrawer = null;
  }

  function toggleMoreMenu() {
    var drawer = byId('moreMenu');
    if (!drawer) return;
    if (drawer.hidden) openMoreMenu();
    else closeMoreMenu();
  }

  function wireDrawerKeys() {
    document.addEventListener('keydown', function (e) {
      var drawer = byId('moreMenu');
      if (!drawer || drawer.hidden) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeMoreMenu();
        return;
      }
      if (e.key !== 'Tab') return;
      var items = focusableIn(drawer);
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (items.indexOf(document.activeElement) === -1) {
        e.preventDefault();
        first.focus();
      }
    }, true);
  }

  /**
   * Open the drawer and land on one group (Practice, Study, Progress, ...).
   * The header nav uses this so the study tools are one click away instead
   * of a scroll through the whole drawer.
   */
  function openMoreMenuAt(groupId) {
    openMoreMenu();
    window.setTimeout(function () {
      var heading = byId(groupId);
      var body = document.querySelector('#moreMenu .more-drawer-body');
      if (!heading || !body) return;
      var section = heading.closest('.more-group') || heading;
      var top = section.offsetTop - body.offsetTop;
      if (prefersReducedMotion()) body.scrollTop = Math.max(0, top - 8);
      else body.scrollTo({ top: Math.max(0, top - 8), behavior: 'smooth' });
      heading.setAttribute('tabindex', '-1');
      try { heading.focus({ preventScroll: true }); } catch (_) { heading.focus(); }
    }, 30);
  }

  /* ------------------------------------------------------------------
   * In-app confirm dialog. Replaces window.confirm for the flows a learner
   * hits every session (submit exam, clear history) so the desktop app never
   * pops an operating-system dialog box in the middle of the black and gold
   * shell. Returns a Promise<boolean>. Escape and the quiet button cancel,
   * Enter and the primary button confirm.
   * ------------------------------------------------------------------ */
  function confirmDialog(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var previous = document.activeElement;
      var overlay = document.createElement('div');
      overlay.className = 'modal-overlay dialog-overlay active';
      overlay.setAttribute('role', 'presentation');

      var card = document.createElement('div');
      card.className = 'modal-card dialog-card';
      card.setAttribute('role', 'alertdialog');
      card.setAttribute('aria-modal', 'true');
      card.setAttribute('aria-labelledby', 'appDialogTitle');
      card.setAttribute('aria-describedby', 'appDialogBody');

      var title = document.createElement('h3');
      title.id = 'appDialogTitle';
      title.className = 'dialog-title';
      title.textContent = opts.title || 'Are you sure?';
      card.appendChild(title);

      var body = document.createElement('div');
      body.id = 'appDialogBody';
      body.className = 'dialog-body';
      var lines = Array.isArray(opts.body) ? opts.body : [opts.body || ''];
      lines.forEach(function (line) {
        if (line === '' || line == null) return;
        if (Array.isArray(line)) {
          var ul = document.createElement('ul');
          ul.className = 'dialog-list';
          line.forEach(function (item) {
            var li = document.createElement('li');
            li.textContent = String(item);
            ul.appendChild(li);
          });
          body.appendChild(ul);
          return;
        }
        var para = document.createElement('p');
        para.textContent = String(line);
        body.appendChild(para);
      });
      if (opts.warning) {
        var warn = document.createElement('p');
        warn.className = 'dialog-warning';
        warn.textContent = String(opts.warning);
        body.appendChild(warn);
      }
      card.appendChild(body);

      var actions = document.createElement('div');
      actions.className = 'dialog-actions';
      var cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'btn btn-secondary';
      cancel.textContent = opts.cancelLabel || 'Cancel';
      var ok = document.createElement('button');
      ok.type = 'button';
      ok.className = 'btn ' + (opts.danger ? 'btn-red' : 'btn-green');
      ok.textContent = opts.confirmLabel || 'Continue';
      actions.appendChild(cancel);
      actions.appendChild(ok);
      card.appendChild(actions);
      overlay.appendChild(card);

      function finish(value) {
        document.removeEventListener('keydown', onKey, true);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        syncBodyScrollLock();
        if (previous && typeof previous.focus === 'function') {
          try { previous.focus({ preventScroll: true }); } catch (_) {}
        }
        resolve(!!value);
      }
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); return; }
        if (e.key === 'Enter' && document.activeElement !== cancel) { e.preventDefault(); e.stopPropagation(); finish(true); return; }
        if (e.key === 'Tab') {
          var order = [cancel, ok];
          var idx = order.indexOf(document.activeElement);
          var next = e.shiftKey ? (idx <= 0 ? order.length - 1 : idx - 1) : (idx === order.length - 1 ? 0 : idx + 1);
          e.preventDefault();
          order[next].focus();
        }
      }
      cancel.addEventListener('click', function () { finish(false); });
      ok.addEventListener('click', function () { finish(true); });
      overlay.addEventListener('click', function (e) { if (e.target === overlay) finish(false); });
      document.addEventListener('keydown', onKey, true);

      document.body.appendChild(overlay);
      document.body.classList.add('is-locked');
      window.setTimeout(function () { ok.focus(); }, 0);
    });
  }

  /**
   * One-time explanation after a bank correction invalidated earlier practice
   * data. Shown at the top of the home screen and dismissed by the learner, not
   * on a timer, because it changes what their readiness score means.
   */
  function renderBankFixNotice() {
    var bi = APlus.bankIntegrity;
    if (!bi || typeof bi.noticePending !== 'function' || !bi.noticePending()) return;
    var host = byId('homeMissionMount');
    var parent = host && host.parentNode;
    if (!parent) return;
    if (byId('bankFixNotice')) return;

    var info = bi.summary();
    var card = document.createElement('section');
    card.id = 'bankFixNotice';
    card.className = 'bank-fix-notice';
    card.setAttribute('role', 'status');

    var attempts = info.affectedAttempts === 1
      ? 'Your earlier attempt was'
      : 'Your earlier ' + info.affectedAttempts + ' attempts were';
    var body = info.affectedAttempts > 0
      ? attempts + ' scored against questions that had the wrong answer marked correct. They stay in your history, but they no longer count toward your readiness score.'
      : 'Practice recorded before this update was scored against questions that had the wrong answer marked correct, so it no longer counts toward your readiness score.';

    card.innerHTML =
      '<div class="label">Question bank corrected</div>' +
      '<p class="bank-fix-line"></p>' +
      '<p class="bank-fix-note">Take a fresh diagnostic or a mock exam to rebuild an accurate readiness score.</p>' +
      '<div class="bank-fix-actions">' +
      '<button type="button" class="btn btn-secondary" id="bankFixDismiss">Got it</button>' +
      '</div>';
    // Set as text, not markup: this module has no escaping helper and the
    // sentence carries a count from storage.
    card.querySelector('.bank-fix-line').textContent = body;
    parent.insertBefore(card, host);

    var btn = byId('bankFixDismiss');
    if (btn) {
      btn.addEventListener('click', function () {
        try { bi.dismissNotice(); } catch (_) {}
        if (card.parentNode) card.parentNode.removeChild(card);
      });
    }
  }

  APlus.dialog = APlus.dialog || {};
  APlus.dialog.confirm = confirmDialog;
  window.openMoreMenu = openMoreMenu;
  window.openMoreMenuAt = openMoreMenuAt;
  window.closeMoreMenu = closeMoreMenu;
  window.toggleMoreMenu = toggleMoreMenu;

  /* ---------------------------------------------------------------
     Label hygiene
     --------------------------------------------------------------- */

  var PHRASES = [
    ['Enterprise Diagnostic & Readiness Analytics', 'Readiness analytics'],
    ['Invisible tutor · mutates your next drill', 'Practice built from your weak spots'],
    ['Start Coach Mission', 'Start coach session'],
    ['Coach Mission', 'Coach session'],
    ['repair mission', 'practice set'],
    ['blind spots', 'weak spots'],
    ['The harness watches', 'It watches'],
    ['the harness watches', 'it watches'],
    [' (Scale 100 to 900) · CompTIA Standard', '. Scale 100 to 900.'],
    ['Passing Score: ', 'Pass mark '],
    ['EXAM PASSED', 'Passed'],
    ['DID NOT PASS', 'Did not pass'],
    ['Flagged for Review', 'Flagged'],
    ['Flagged for review', 'Flagged'],
    ['Flag for Review', 'Flag'],
    ['Flag for review', 'Flag'],
    ['Review / Finish', 'Review and finish'],
    ['Next ->', 'Next'],
    ['Retake Missed Questions', 'Review mistakes'],
    ['Proof-of-Mastery Ledger · APX Token Economy', 'Progress record'],
    ['Hansei 5-Whys Diagnostic Debrief', 'Debrief'],
    ['Hansei 5-Whys Debrief', 'Debrief'],
    ['Igniting', 'Starting'],
    ['Hansei Error Taxonomy Distribution', 'Common mistake types'],
    ['Hansei debrief', 'debrief'],
    ['Proof-of-Mastery Local Ledger', 'Progress record'],
    ['Proof-of-Mastery ledger', 'progress record'],
    ['Proof-of-Mastery Ledger', 'Progress record'],
    ['Proof-of-Mastery', 'Progress record'],
    ['Ghost Coach Mission', 'Study coach'],
    ['Ghost Coach', 'Study coach'],
    ['Daily Memory Raid', 'Daily flashcard session'],
    ['Start Memory Raid', 'Start flashcard session'],
    ['Memory Raid', 'Flashcard session'],
    ['SRS Raid', 'Flashcard session'],
    ['Memory Mode Hub', 'Flashcards'],
    ['Memory Mode', 'Flashcards'],
    ['Memory Hub', 'Flashcards'],
    ['missed question(s) in personal bank.', 'saved'],
    ['Tutor Mode: ON', 'Explanations: on'],
    ['Tutor Mode: OFF', 'Explanations: off'],
    ['Tutor Mode', 'Explanations'],
    ['APX Token Economy', 'Points'],
    ['APX', 'points']
  ];

  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, CODE: 1, PRE: 1 };
  var sweeping = false;

  function cleanString(text) {
    var out = text;
    for (var i = 0; i < PHRASES.length; i++) {
      if (out.indexOf(PHRASES[i][0]) !== -1) {
        out = out.split(PHRASES[i][0]).join(PHRASES[i][1]);
      }
    }
    out = out.replace(EMOJI_RE, '');
    if (out !== text) out = out.replace(/[ \t]{2,}/g, ' ');
    return out;
  }

  function relabelDom(root) {
    if (sweeping) return;
    var scope = root || document.body;
    if (!scope || !document.createTreeWalker) return;
    sweeping = true;
    try {
      var walker = document.createTreeWalker(scope, window.NodeFilter.SHOW_TEXT, null, false);
      var node;
      while ((node = walker.nextNode())) {
        var parent = node.parentNode;
        if (!parent || SKIP_TAGS[parent.nodeName]) continue;
        var value = node.nodeValue;
        if (!value || !value.trim()) continue;
        var next = cleanString(value);
        if (next !== value) node.nodeValue = next;
      }
    } finally {
      sweeping = false;
    }
  }

  /* Drawer rows are an icon plus a label span. Other modules still write
     textContent straight onto the button, which deletes the icon, so the row
     markup is captured once and restored whenever the span goes missing. */
  var ROW_TEMPLATES = {};

  function captureDrawerRows() {
    /* index.html snapshots the rows the moment they are parsed, which is
       before any other module can overwrite one. */
    var seed = window.APLUS_DRAWER_ROWS;
    if (seed) {
      for (var key in seed) {
        if (Object.prototype.hasOwnProperty.call(seed, key) && !ROW_TEMPLATES[key]) {
          ROW_TEMPLATES[key] = seed[key];
        }
      }
    }
    ['themeToggleBtn', 'soundToggleBtn', 'tutorModeToggleBtn'].forEach(function (id) {
      var el = byId(id);
      if (!el || ROW_TEMPLATES[id]) return;
      if (el.querySelector && el.querySelector('.drawer-item-text')) {
        ROW_TEMPLATES[id] = el.innerHTML;
      }
    });
  }

  function drawerLabelOf(el) {
    if (!el || !el.querySelector) return null;
    var label = el.querySelector('.drawer-item-text');
    if (label) return label;
    var tpl = el.id ? ROW_TEMPLATES[el.id] : null;
    if (!tpl) return null;
    el.innerHTML = tpl;
    return el.querySelector('.drawer-item-text');
  }

  /* Assigning textContent always replaces the child node, which would wake the
     label observer again. Only write when the value actually changes. */
  function setText(el, value) {
    if (!el) return;
    var target = drawerLabelOf(el) || el;
    if (target.textContent === value) return;
    target.textContent = value;
  }

  function syncChromeLabels() {
    var theme = byId('themeToggleBtn');
    if (theme) {
      var mode = document.documentElement.getAttribute('data-theme') || 'dark';
      setText(theme, mode === 'dark' ? 'Light' : 'Dark');
    }
    var sound = byId('soundToggleBtn');
    if (sound) {
      var text = sound.textContent || '';
      setText(sound, text.indexOf('Muted') >= 0 ? 'Muted' : 'Sound');
    }
    syncStreakChip();
    syncQuickLinks();
    syncTutorLabels();
    updateResultsNeed();
  }

  /* ---------------------------------------------------------------
     Streak chip. The chip reads "12 day streak", never a date widget.
     Other modules write values such as "12d" into #apxStreakBadge,
     so the number is extracted and the wording lives in the label.
     --------------------------------------------------------------- */

  function syncStreakChip() {
    var badge = byId('apxStreakBadge');
    if (!badge) return;
    var raw = String(badge.textContent || '').replace(EMOJI_RE, '');
    var digits = raw.match(/\d+/);
    var count = digits ? digits[0] : '0';
    setText(badge, count);
    var label = document.querySelector('#streakChip .streak-label');
    if (label) setText(label, count === '1' ? 'day streak' : 'day streak');
  }

  /* ---------------------------------------------------------------
     Quick links. Review mistakes is hidden outright while its count
     is zero rather than sitting greyed out, and the first link that
     survives becomes the visually primary one.
     --------------------------------------------------------------- */

  function countFromText(text) {
    var match = String(text || '').match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  function syncQuickLinks() {
    var nav = document.querySelector('.quick-links');
    if (!nav) return;

    var missedBtn = byId('retakeMissedBtn');
    if (missedBtn) {
      var missed = countFromText((byId('missedCountText') || {}).textContent);
      var shouldHide = missed <= 0;
      if (missedBtn.hidden !== shouldHide) missedBtn.hidden = shouldHide;
      if (!shouldHide && missedBtn.disabled) missedBtn.disabled = false;
    }

    var links = nav.querySelectorAll('.quick-link');
    var firstVisible = null;
    Array.prototype.forEach.call(links, function (el) {
      if (!firstVisible && !el.hidden) firstVisible = el;
    });
    // Only a real "Review mistakes" count earns the wide slot. With nothing to
    // review, every quick link stays equal so "0 due today" is never the headline.
    var promote = firstVisible && firstVisible.id === 'retakeMissedBtn' ? firstVisible : null;
    Array.prototype.forEach.call(links, function (el) {
      var want = el === promote;
      if (el.classList.contains('is-primary') !== want) {
        el.classList.toggle('is-primary', want);
      }
    });
  }

  /* Adds the gap to the pass mark on a failed result. */
  function updateResultsNeed() {
    var results = byId('resultsScreen');
    if (!results || !results.classList.contains('active')) return;
    var hero = byId('scoreHero');
    var subtitle = byId('scoreSubtitle');
    var scoreEl = byId('scaledScoreDisplay');
    if (!hero || !subtitle || !scoreEl) return;
    var text = subtitle.textContent || '';
    var base = text.split(' You need ')[0];
    if (!hero.classList.contains('failed')) {
      setText(subtitle, base);
      return;
    }
    var mark = base.match(/(\d{3})/);
    var score = parseInt(String(scoreEl.textContent || '').replace(/[^0-9]/g, ''), 10);
    if (!mark || !score) return;
    var gap = parseInt(mark[1], 10) - score;
    if (gap <= 0) {
      setText(subtitle, base);
      return;
    }
    setText(subtitle, base + ' You need ' + gap + ' more points.');
  }

  function syncTutorLabels() {
    var toggles = document.querySelectorAll('[data-tutor-toggle]');
    Array.prototype.forEach.call(toggles, function (el) {
      if (el.type === 'checkbox') return;
      var on = el.getAttribute('aria-pressed') !== 'false';
      if (el.id === 'tutorModeToggleBtn') {
        setText(el, on ? 'Explanations' : 'Explanations off');
      } else {
        setText(el, on ? 'Explanations: on' : 'Explanations: off');
      }
    });
  }

  function wrapTutorToggle() {
    if (!window.TutorMode || typeof window.TutorMode.syncToggleUi !== 'function') return;
    if (window.TutorMode.syncToggleUi._shellWrapped) return;
    var orig = window.TutorMode.syncToggleUi.bind(window.TutorMode);
    var wrapped = function () {
      var result = orig();
      syncTutorLabels();
      return result;
    };
    wrapped._shellWrapped = true;
    window.TutorMode.syncToggleUi = wrapped;
    syncTutorLabels();
  }

  function wrapThemeAndSound() {
    var originalTheme = window.toggleAppTheme;
    window.toggleAppTheme = function () {
      var next = typeof originalTheme === 'function' ? originalTheme.apply(this, arguments) : null;
      var theme = document.documentElement.getAttribute('data-theme') || next || 'dark';
      var btn = byId('themeToggleBtn');
      if (btn) setText(btn, theme === 'dark' ? 'Light' : 'Dark');
      return theme;
    };

    var originalSound = window.toggleSound;
    window.toggleSound = function () {
      var enabled = typeof originalSound === 'function' ? originalSound.apply(this, arguments) : true;
      var btn = byId('soundToggleBtn');
      if (btn) setText(btn, btn.textContent.indexOf('Muted') >= 0 ? 'Sound' : 'Muted');
      return enabled;
    };
  }

  function watchLabels() {
    if (!window.MutationObserver) return;
    var timer = null;
    var observer = new window.MutationObserver(function () {
      if (sweeping) return;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        relabelDom();
        syncChromeLabels();
      }, 160);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  /* ---------------------------------------------------------------
     Screen and scroll behaviour
     --------------------------------------------------------------- */

  function wrapShowScreen() {
    var install = function () {
      if (typeof window.showScreen !== 'function' || window.showScreen._shellWrapped) return;
      var orig = window.showScreen;
      var wrapped = function () {
        var result = orig.apply(this, arguments);
        closeMoreMenu();
        syncBodyScrollLock();
        window.setTimeout(function () {
          relabelDom();
          syncChromeLabels();
        }, 0);
        return result;
      };
      wrapped._shellWrapped = true;
      window.showScreen = wrapped;
    };
    install();
    window.setTimeout(install, 500);
    window.setTimeout(install, 1500);
  }

  function modernScrollContainers() {
    var selectors = [
      '.study-doc-list',
      '.study-doc-viewer',
      '.modal-card',
      '#ledgerBlockList',
      '.review-accordion',
      '.matrix-grid',
      '.more-drawer-body'
    ];
    selectors.forEach(function (sel) {
      Array.prototype.forEach.call(document.querySelectorAll(sel), function (el) {
        el.style.overscrollBehavior = 'contain';
        el.style.webkitOverflowScrolling = 'touch';
      });
    });
  }

  /* ---------------------------------------------------------------
     Compatibility shims for earlier shell APIs
     --------------------------------------------------------------- */

  function openSettingsModal() {
    var modal = byId('settingsModal');
    if (modal) modal.classList.add('active');
    else openMoreMenu();
  }

  function closeSettingsModal() {
    var modal = byId('settingsModal');
    if (modal) modal.classList.remove('active');
    else closeMoreMenu();
  }

  function toggleExamModesPanel() {
    var panel = byId('examModesPanel');
    if (!panel) {
      toggleMoreMenu();
      return;
    }
    panel.hidden = !panel.hidden;
    var btn = byId('browseExamModesBtn');
    if (btn) btn.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true');
  }

  function refreshPrimaryStudyCta() {
    var btn = byId('primaryStudyCta');
    if (!btn || typeof window.startExam !== 'function') return;
    btn.onclick = function () {
      window.startExam('core1', 90, 90);
    };
  }

  window.openSettingsModal = openSettingsModal;
  window.closeSettingsModal = closeSettingsModal;
  window.toggleExamModesPanel = toggleExamModesPanel;
  window.refreshPrimaryStudyCta = refreshPrimaryStudyCta;

  /* ---------------------------------------------------------------
     Settings: anonymous usage data switch
     The row is removed outright when telemetry is not on the page, so the
     drawer never offers a control that does nothing.
     --------------------------------------------------------------- */

  function telemetryApi() {
    var t = APlus.telemetry;
    if (!t || typeof t.setConsent !== 'function' || typeof t.getConsent !== 'function') return null;
    return t;
  }

  function syncTelemetrySwitch() {
    var btn = byId('telemetryConsentToggle');
    var note = byId('telemetryConsentNoteRow');
    if (!btn) return;
    var api = telemetryApi();
    var show = !!api;
    if (btn.hidden !== !show) btn.hidden = !show;
    var row = btn.parentNode;
    if (row && row.tagName === 'LI' && row.hidden !== !show) row.hidden = !show;
    if (note && note.hidden !== !show) note.hidden = !show;
    if (!api) return;
    var on = false;
    try {
      on = api.getConsent() === true;
    } catch (err) {
      on = false;
    }
    var want = on ? 'true' : 'false';
    if (btn.getAttribute('aria-checked') !== want) btn.setAttribute('aria-checked', want);
    btn.classList.toggle('is-on', on);
  }

  function wireTelemetrySwitch() {
    var btn = byId('telemetryConsentToggle');
    if (!btn || btn._shellWired) return;
    btn._shellWired = true;
    btn.addEventListener('click', function () {
      var api = telemetryApi();
      if (!api) return;
      var next = btn.getAttribute('aria-checked') !== 'true';
      try {
        api.setConsent(next);
      } catch (err) {
        console.warn('[shell-ux] telemetry consent:', err);
      }
      syncTelemetrySwitch();
    });
  }

  /* ---------------------------------------------------------------
     About panel
     --------------------------------------------------------------- */

  function appVersion() {
    return String(window.APLUS_VERSION || 'web');
  }

  function syncAboutPanel() {
    var line = byId('aboutVersionLine');
    if (line) setText(line, 'Version ' + appVersion());

    var api = window.electronAPI;
    if (!api) return;

    if (line && api.app && typeof api.app.getReleaseInfo === 'function') {
      try {
        Promise.resolve(api.app.getReleaseInfo()).then(function (info) {
          var v = info && (info.version || info.appVersion);
          if (v) setText(line, 'Version ' + String(v));
        })['catch'](function () {});
      } catch (err) {
        /* older preload, the fallback above already stands */
      }
    }

    var row = byId('dataFolderRow');
    var path = byId('dataFolderPath');
    if (row) row.hidden = false;
    if (path && api.app && typeof api.app.getPaths === 'function') {
      try {
        Promise.resolve(api.app.getPaths()).then(function (paths) {
          var dir = paths && (paths.userData || paths.data || paths.appData);
          if (!dir) return;
          setText(path, String(dir));
          path.hidden = false;
        })['catch'](function () {});
      } catch (err) {
        /* path stays hidden */
      }
    }
  }

  /* ---------------------------------------------------------------
     Home: recent attempts
     Fills the third quiet card in the right rail so the column does not
     end in an empty band on wide screens.
     --------------------------------------------------------------- */

  var EXAM_LABELS = { core1: 'Core 1', core2: 'Core 2', both: 'Mixed' };

  function attemptDate(ms) {
    if (!ms) return '';
    try {
      var d = new Date(ms);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
    } catch (err) {
      return '';
    }
  }

  function readHistory() {
    try {
      if (APlus.learner && typeof APlus.learner.getHistory === 'function') {
        var rows = APlus.learner.getHistory();
        return Array.isArray(rows) ? rows : [];
      }
    } catch (err) {
      console.warn('[shell-ux] history:', err);
    }
    return [];
  }

  function placeRecentAttempts(mount) {
    var rail = document.querySelector('#startScreen .home-rail');
    var main = document.querySelector('#startScreen .home-main');
    var plan = byId('todayPlanCard');
    var wide = window.innerWidth >= 1100;
    try {
      if (wide && rail && plan && mount.parentNode !== rail) {
        rail.insertBefore(mount, plan.nextSibling);
      } else if (!wide && main && mount.parentNode !== main) {
        main.appendChild(mount);
      }
    } catch (err) { /* layout only */ }
  }

  function renderRecentAttempts() {
    var mount = byId('recentAttemptsMount');
    if (!mount) return;
    placeRecentAttempts(mount);
    var rows = readHistory().slice(0, 5);
    var html = '<div class="card-title">Recent attempts</div>';
    if (!rows.length) {
      html += '<p class="recent-empty">No attempts yet. Your first mock will show here.</p>';
    } else {
      html += '<ul class="recent-list">';
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i] || {};
        var label = EXAM_LABELS[r.examType] || 'Practice';
        var score = isFinite(Number(r.scaledScore)) ? Math.round(Number(r.scaledScore)) : '';
        html +=
          '<li class="recent-row">' +
          '<span class="recent-dot ' + (r.passed ? 'is-pass' : 'is-fail') + '" aria-hidden="true"></span>' +
          '<span class="recent-date">' + attemptDate(r.timestamp) + '</span>' +
          '<span class="recent-exam">' + label + '</span>' +
          '<span class="recent-score">' + score + '</span>' +
          '<span class="sr-only">' + (r.passed ? 'Passed' : 'Did not pass') + '</span>' +
          '</li>';
      }
      html += '</ul>';
    }
    if (mount.innerHTML !== html) mount.innerHTML = html;
  }

  /* ---------------------------------------------------------------
     Init
     --------------------------------------------------------------- */

  function init() {
    captureDrawerRows();
    wrapThemeAndSound();
    wrapTutorToggle();
    wrapShowScreen();
    wireDrawerKeys();
    watchOverlays();
    watchLabels();
    modernScrollContainers();
    syncChromeLabels();
    relabelDom();
    syncBodyScrollLock();
    wireTelemetrySwitch();
    syncTelemetrySwitch();
    syncAboutPanel();
    renderRecentAttempts();

    if (APlus.bus && typeof APlus.bus.on === 'function') {
      APlus.bus.on('shell:ready', renderRecentAttempts);
    }

    window.setTimeout(function () {
      wrapTutorToggle();
      relabelDom();
      syncChromeLabels();
      syncTelemetrySwitch();
      renderRecentAttempts();
    }, 600);
    window.setTimeout(function () {
      relabelDom();
      syncChromeLabels();
      renderRecentAttempts();
    }, 1600);

    renderBankFixNotice();
    runFirstLaunch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
