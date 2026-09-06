/**
 * app-update.js - the desktop update card and the header "Update ready" button.
 *
 * Main process owns the state machine and pushes a status object on every
 * change (see initAutoUpdater in main.js). This module renders that status and
 * sends back the three commands: check, download, install.
 *
 * Phases and what the learner sees:
 *   disabled     nothing on desktop; on the web the service worker path in
 *                js/pwa-update.js handles reloads instead
 *   idle         "You are on the latest version" with a Check for updates button
 *   checking     "Checking for updates"
 *   available    version, notes and a Download update button
 *   downloading  a progress bar with the percentage
 *   ready        "Version X is ready" and a Restart and update button, plus a
 *                gold pill in the header so it is visible without opening the
 *                drawer
 *   error        the message and a Try again button
 *
 * Nothing here ever restarts the app on its own. An update installs when the
 * learner presses the button, or quietly on the next quit.
 */
(function (global) {
  'use strict';

  var APlus = (global.APlus = global.APlus || {});

  var MOUNT_ID = 'appUpdateMount';
  var PILL_ID = 'appUpdatePill';
  var state = { phase: 'disabled', currentVersion: null };
  var booted = false;

  function api() {
    var e = global.electronAPI;
    return e && e.updates ? e.updates : null;
  }

  function byId(id) {
    return global.document ? global.document.getElementById(id) : null;
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /** "12.4 MB of 103.8 MB" so a slow download does not look stalled. */
  function bytesLine(status) {
    var mb = function (n) { return (Number(n) || 0) / (1024 * 1024); };
    if (!status.total) return '';
    return mb(status.transferred).toFixed(1) + ' MB of ' + mb(status.total).toFixed(1) + ' MB';
  }

  function ensureMount() {
    var mount = byId(MOUNT_ID);
    if (mount) return mount;
    var about = global.document && global.document.querySelector('.more-about');
    if (!about) return null;
    mount = global.document.createElement('section');
    mount.id = MOUNT_ID;
    mount.className = 'app-update';
    var version = byId('aboutVersionLine');
    if (version && version.parentNode === about) about.insertBefore(mount, version.nextSibling);
    else about.appendChild(mount);
    return mount;
  }

  /* ------------------------------------------------------------------ *
   * Header pill. Only shown when an update is downloaded and waiting, so
   * the learner does not have to open the drawer to find it.
   * ------------------------------------------------------------------ */
  function renderPill(status) {
    var pill = byId(PILL_ID);
    var wanted = status.phase === 'ready';
    if (!wanted) {
      if (pill && pill.parentNode) pill.parentNode.removeChild(pill);
      return;
    }
    if (pill) return;
    var wrap = global.document.querySelector('.header-controls-wrap');
    if (!wrap) return;
    pill = global.document.createElement('button');
    pill.type = 'button';
    pill.id = PILL_ID;
    pill.className = 'app-update-pill';
    pill.title = 'Version ' + (status.version || '') + ' is ready to install';
    pill.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      '<path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg><span>Update ready</span>';
    pill.addEventListener('click', install);
    wrap.insertBefore(pill, wrap.firstChild);
  }

  function render(status) {
    state = status || state;
    var mount = ensureMount();
    if (!mount) return;

    if (state.phase === 'disabled') {
      mount.hidden = true;
      mount.innerHTML = '';
      renderPill(state);
      return;
    }
    mount.hidden = false;

    var html = '<div class="label">Software update</div>';
    var actions = '';

    if (state.phase === 'checking') {
      html += '<p class="app-update-line">Checking for updates.</p>';
    } else if (state.phase === 'available') {
      html += '<p class="app-update-line"><strong>Version ' + esc(state.version) + '</strong> is available.</p>';
      if (state.notes) html += '<p class="app-update-notes">' + esc(state.notes) + '</p>';
      actions = '<button type="button" class="btn btn-green" data-update-action="download">Download update</button>';
    } else if (state.phase === 'downloading') {
      var pct = Math.max(0, Math.min(100, Number(state.percent) || 0));
      html += '<p class="app-update-line">Downloading version ' + esc(state.version) + '. ' + esc(String(pct)) + ' percent.</p>';
      html += '<div class="app-update-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '">' +
        '<div class="app-update-bar-fill" style="width:' + pct + '%"></div></div>';
      var bytes = bytesLine(state);
      if (bytes) html += '<p class="app-update-notes">' + esc(bytes) + '</p>';
    } else if (state.phase === 'ready') {
      html += '<p class="app-update-line"><strong>Version ' + esc(state.version) + '</strong> is ready to install.</p>';
      html += '<p class="app-update-notes">The app restarts and reopens. Your progress is saved first.</p>';
      actions = '<button type="button" class="btn btn-green" data-update-action="install">Restart and update</button>' +
        '<button type="button" class="btn btn-secondary" data-update-action="later">Later</button>';
    } else if (state.phase === 'error') {
      html += '<p class="app-update-line">The update check did not finish.</p>';
      if (state.error) html += '<p class="app-update-notes">' + esc(state.error) + '</p>';
      actions = '<button type="button" class="btn btn-secondary" data-update-action="check">Try again</button>';
    } else {
      html += '<p class="app-update-line">You are on the latest version.</p>';
      actions = '<button type="button" class="btn btn-secondary" data-update-action="check">Check for updates</button>';
    }

    if (actions) html += '<div class="app-update-actions">' + actions + '</div>';
    mount.innerHTML = html;

    var buttons = mount.querySelectorAll('[data-update-action]');
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.getAttribute('data-update-action');
        if (action === 'check') check();
        else if (action === 'download') download();
        else if (action === 'install') install();
        else if (action === 'later') {
          // Keep the state; the pill stays and the install happens on next quit.
          if (global.closeMoreMenu) { try { global.closeMoreMenu(); } catch (_) {} }
        }
      });
    });

    renderPill(state);
  }

  function withApi(method, args) {
    var u = api();
    if (!u || typeof u[method] !== 'function') return Promise.resolve(null);
    try {
      return Promise.resolve(u[method].apply(u, args || []));
    } catch (err) {
      console.warn('[app-update] ' + method + ' failed:', err);
      return Promise.resolve(null);
    }
  }

  function check() {
    render(Object.assign({}, state, { phase: 'checking' }));
    return withApi('check').then(function (status) { if (status) render(status); });
  }

  function download() {
    render(Object.assign({}, state, { phase: 'downloading', percent: 0 }));
    return withApi('download');
  }

  function install() {
    return withApi('installNow');
  }

  function refreshVersionLine(status) {
    var line = byId('aboutVersionLine');
    if (!line) return;
    var version = (status && status.currentVersion) ||
      (global.electronAPI && global.electronAPI.appVersion) ||
      (APlus && APlus.APP_VERSION) || null;
    if (version) line.textContent = 'Version ' + version;
  }

  function init() {
    if (booted) return;
    booted = true;
    var u = api();
    if (!u || typeof u.onStatus !== 'function') {
      // Web edition: js/pwa-update.js owns the reload prompt.
      refreshVersionLine(null);
      return;
    }
    u.onStatus(function (status) {
      render(status);
      refreshVersionLine(status);
    });
    withApi('getStatus').then(function (status) {
      if (status) {
        render(status);
        refreshVersionLine(status);
      }
    });
  }

  APlus.appUpdate = {
    check: check,
    download: download,
    install: install,
    render: render,
    getState: function () { return state; }
  };

  if (global.document) {
    if (global.document.readyState === 'loading') {
      global.document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
