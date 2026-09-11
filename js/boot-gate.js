/**
 * boot-gate.js - Auth wall / TMA pill / skeleton handoff after module scripts load.
 * Extracted from index.html for context hygiene. Behavior unchanged.
 */
(function (window) {
  'use strict';

  function bootAppGateAndSkeleton() {
    var isTMA = false;
    if (window.TMABridge) {
      try {
        var bridge = window.TMABridge.init();
        if (bridge && ((bridge.state && bridge.state.isTMA) || bridge.isTMA) && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) {
          isTMA = true;
          var sub = document.getElementById('tmaSkeletonSubtext');
          if (sub) sub.textContent = 'Telegram Mini App Initializing...';
          if (typeof window.TMABridge.mountUserPill === 'function') {
            window.TMABridge.mountUserPill('tmaUserPillMount');
          }
        }
      } catch (bridgeErr) {
        console.warn('[Init] TMABridge notice:', bridgeErr);
      }
    }
    try {
      if (window.ClarioraAuthUI) {
        window.ClarioraAuthUI.init({ wall: !isTMA });
      }
    } catch (authUiErr) {
      console.warn('[Init] AuthUI init notice:', authUiErr);
    }
    try {
      if (window.ClarioraAuthGate) {
        window.ClarioraAuthGate.init();
      }
    } catch (authGateErr) {
      console.warn('[Init] AuthGate init notice:', authGateErr);
    }
    setTimeout(function () {
      var sk = document.getElementById('tmaSkeletonScreen');
      if (sk) {
        sk.classList.add('is-loaded');
        sk.setAttribute('aria-hidden', 'true');
        sk.setAttribute('aria-busy', 'false');
        sk.removeAttribute('aria-live');
      }
    }, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAppGateAndSkeleton);
  } else {
    bootAppGateAndSkeleton();
  }
})(typeof window !== 'undefined' ? window : this);
// a11y-hard-20260911
