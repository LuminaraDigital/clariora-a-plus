/**
 * PWA update toast + install prompt bridge.
 *
 * Registration itself happens in index.html (inline script, scope "./sw.js").
 * This file only listens for updates and installability, and renders a
 * small non-blocking toast. It never calls navigator.serviceWorker.register
 * itself, to avoid a second, conflicting registration.
 */
(function () {
  'use strict';

  function emit(name, payload) {
    try {
      if (window.APlus && window.APlus.bus && typeof window.APlus.bus.emit === 'function') {
        window.APlus.bus.emit(name, payload);
      }
    } catch (err) {
      /* bus not ready yet - non-fatal */
    }
  }

  function ensureStyles() {
    if (document.getElementById('pwa-update-styles')) return;
    var style = document.createElement('style');
    style.id = 'pwa-update-styles';
    style.textContent = [
      '.pwa-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(12px);',
      'z-index:99999;background:#0B0D12;color:#F2F2F0;border:1px solid #2A2A2A;',
      'border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:14px;',
      'box-shadow:0 8px 30px rgba(0,0,0,.5);font-family:inherit;font-size:14px;',
      'opacity:0;transition:opacity .25s ease, transform .25s ease;max-width:92vw;}',
      '.pwa-toast.pwa-toast-visible{opacity:1;transform:translateX(-50%) translateY(0);}',
      '.pwa-toast .pwa-toast-msg{white-space:nowrap;}',
      '.pwa-toast button{border:1px solid #3A3A3A;background:transparent;color:#D8D8D6;',
      'border-radius:6px;padding:6px 12px;font-size:13px;cursor:pointer;white-space:nowrap;}',
      '.pwa-toast button.pwa-toast-primary{background:#D4AF37;color:#0B0D12;border-color:#D4AF37;font-weight:600;}',
      '.pwa-toast button:hover{opacity:.9;}',
    ].join('');
    document.head.appendChild(style);
  }

  function showToast(message, primaryLabel, onPrimary) {
    ensureStyles();
    var existing = document.querySelector('.pwa-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'pwa-toast';
    toast.setAttribute('role', 'status');

    var msg = document.createElement('span');
    msg.className = 'pwa-toast-msg';
    msg.textContent = message;

    var primaryBtn = document.createElement('button');
    primaryBtn.className = 'pwa-toast-primary';
    primaryBtn.textContent = primaryLabel;
    primaryBtn.addEventListener('click', function () {
      onPrimary();
    });

    var laterBtn = document.createElement('button');
    laterBtn.textContent = 'Later';
    laterBtn.addEventListener('click', function () {
      toast.classList.remove('pwa-toast-visible');
      setTimeout(function () { toast.remove(); }, 250);
    });

    toast.appendChild(msg);
    toast.appendChild(primaryBtn);
    toast.appendChild(laterBtn);
    document.body.appendChild(toast);
    requestAnimationFrame(function () {
      toast.classList.add('pwa-toast-visible');
    });
  }

  function initServiceWorkerUpdates() {
    if (!('serviceWorker' in navigator)) return;

    var reloadRequested = false;

    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (reloadRequested) {
        window.location.reload();
      }
    });

    navigator.serviceWorker.addEventListener('message', function (event) {
      var data = event.data || {};
      if (data.type === 'pwa:update-available') {
        emit('pwa:update', { buildId: data.buildId, source: 'service-worker' });
        showToast('A new version is ready.', 'Reload', function () {
          reloadRequested = true;
          navigator.serviceWorker.getRegistration().then(function (reg) {
            if (reg && reg.waiting) {
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            } else {
              window.location.reload();
            }
          }).catch(function () {
            window.location.reload();
          });
        });
      }
    });

    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (!reg) return;
      reg.addEventListener('updatefound', function () {
        var installing = reg.installing;
        if (!installing) return;
        installing.addEventListener('statechange', function () {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            emit('pwa:update', { source: 'service-worker' });
            showToast('A new version is ready.', 'Reload', function () {
              reloadRequested = true;
              installing.postMessage({ type: 'SKIP_WAITING' });
            });
          }
        });
      });
    }).catch(function () { /* no registration yet - fine */ });
  }

  function initDesktopUpdates() {
    if (!window.electronAPI || !window.electronAPI.updates || typeof window.electronAPI.updates.onReady !== 'function') {
      return;
    }
    window.electronAPI.updates.onReady(function () {
      emit('pwa:update', { source: 'desktop' });
      showToast('A new version is ready.', 'Restart to update', function () {
        window.electronAPI.updates.installNow();
      });
    });
  }

  function initInstallPrompt() {
    var deferredPrompt = null;

    window.addEventListener('beforeinstallprompt', function (event) {
      event.preventDefault();
      deferredPrompt = event;
      emit('pwa:installable', { available: true });
    });

    window.addEventListener('appinstalled', function () {
      deferredPrompt = null;
      emit('pwa:installable', { available: false });
    });

    return function installPrompt() {
      if (!deferredPrompt) {
        return Promise.resolve({ outcome: 'unavailable' });
      }
      var prompt = deferredPrompt;
      deferredPrompt = null;
      prompt.prompt();
      return prompt.userChoice.then(function (choice) {
        emit('pwa:installable', { available: false });
        return choice;
      });
    };
  }

  function isStandaloneDisplay() {
    try {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
      if (window.matchMedia && window.matchMedia('(display-mode: minimal-ui)').matches) return true;
    } catch (err) { /* ignore */ }
    return !!(window.navigator && window.navigator.standalone);
  }

  function isAppleDesktopSafari() {
    var ua = String(navigator.userAgent || '');
    var platform = String(navigator.platform || '');
    var isMac = /Mac|Macintosh/.test(platform) || /Mac OS X/.test(ua);
    var isSafari = /Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox/i.test(ua);
    return isMac && isSafari;
  }

  function maybeShowMacInstallHelp() {
    if (isStandaloneDisplay()) return;
    if (!isAppleDesktopSafari()) return;
    try {
      if (localStorage.getItem('aplus_mac_install_hint_v1') === '1') return;
    } catch (err) { /* storage blocked */ }

    // Delay so the home UI paints first.
    setTimeout(function () {
      showToast('On Mac: File > Add to Dock for an app-like shortcut.', 'Got it', function () {
        try { localStorage.setItem('aplus_mac_install_hint_v1', '1'); } catch (err) { /* ignore */ }
        var toast = document.querySelector('.pwa-toast');
        if (toast) {
          toast.classList.remove('pwa-toast-visible');
          setTimeout(function () { toast.remove(); }, 250);
        }
      });
    }, 1800);
  }

  window.APlus = window.APlus || {};
  window.APlus.pwa = window.APlus.pwa || {};
  window.APlus.pwa.installPrompt = initInstallPrompt();
  window.APlus.pwa.isStandalone = isStandaloneDisplay;

  initServiceWorkerUpdates();
  initDesktopUpdates();
  maybeShowMacInstallHelp();
})();
