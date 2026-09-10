/**
 * js/firebase-auth-ui.js
 * Clariora Authentication UI & Account Management
 * Handles Google Sign-In, Email/Password modal, and Header User Pill for browser users.
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['./firebase-service'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./firebase-service'));
  } else {
    root.ClarioraAuthUI = factory(root.ClarioraFirebaseService);
  }
})(typeof self !== 'undefined' ? self : this, function (firebaseService) {
  'use strict';

  var authState = {
    isTMA: false,
    mode: 'signin', // 'signin' | 'signup'
    modalOpen: false,
    accountOpen: false,
    busy: false,
    wallMode: false,
    authListeners: []
  };

  /**
   * Initializes the Auth UI layer
   */
  function init(options) {
    options = options || {};

    // Detect if running inside Telegram Mini App with real initData
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) {
      authState.isTMA = true;
      console.log('[AuthUI] Telegram Mini App active. Native TMA identity used.');
      return;
    }

    injectStyles();
    injectModalMarkup();

    // Upgrade chip is visible only inside native Telegram Mini App (TMA).
    // In regular web browser, hide Stars & TON clutter from header.
    var starsChip = document.getElementById('tmaStarsChip');
    if (starsChip) {
      starsChip.style.display = authState.isTMA ? 'inline-flex' : 'none';
    }

    // Restore Telegram web session if logged in previously
    var savedTg = localStorage.getItem('clariora_telegram_auth');
    if (savedTg) {
      try {
        var tgUser = JSON.parse(savedTg);
        var tgName = tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name : '');
        renderHeaderPill({
          displayName: tgName,
          photoURL: tgUser.photo_url,
          email: tgUser.username ? '@' + tgUser.username : null,
          isTelegram: true
        });
        notifyAuthenticated({ isTelegram: true, user: tgUser, event: 'signin' });
      } catch (e) {}
    }

    var service = firebaseService || window.ClarioraFirebaseService;
    if (service) {
      service.onAuthStateChanged(function (user) {
        renderHeaderPill(user);
        if (user && authState.modalOpen) {
          closeModal();
        }
        if (user) {
          notifyAuthenticated({ isTelegram: false, user: user, event: 'signin' });
        }
      });
      service.init();
    } else {
      renderHeaderPill(null);
    }

    if (options.wall) setWallMode(true);
  }

  function setWallMode(enabled) {
    authState.wallMode = !!enabled;
    // Close button stays visible so email modal can return to the wall.
    var closeBtn = document.querySelector('#clarioraAuthModalOverlay .auth-close-btn');
    if (closeBtn) closeBtn.style.display = '';
  }

  function onAuthenticated(callback) {
    if (typeof callback === 'function') authState.authListeners.push(callback);
    return function unsubscribe() {
      var idx = authState.authListeners.indexOf(callback);
      if (idx !== -1) authState.authListeners.splice(idx, 1);
    };
  }

  function notifyAuthenticated(payload) {
    for (var i = 0; i < authState.authListeners.length; i++) {
      try { authState.authListeners[i](payload); } catch (e) {
        console.error('[AuthUI] auth listener error:', e);
      }
    }
    if (window.ClarioraAuthGate) {
      if (payload && payload.isTelegram && payload.user && window.ClarioraAuthGate.onTelegramWebLogin) {
        window.ClarioraAuthGate.onTelegramWebLogin(payload.user);
      }
    }
  }

  /**
   * Injects CSS styles for the Auth Modal and User Pill
   */
  function injectStyles() {
    if (document.getElementById('clarioraAuthStyles')) return;

    var css = [
      '.clariora-auth-chip {',
      '  cursor: pointer;',
      '  border: 1px solid rgba(212, 175, 55, 0.35) !important;',
      '  background: rgba(212, 175, 55, 0.08) !important;',
      '  transition: all 0.18s ease;',
      '}',
      '.clariora-auth-chip:hover {',
      '  background: rgba(212, 175, 55, 0.18) !important;',
      '  border-color: rgba(212, 175, 55, 0.6) !important;',
      '}',
      '.clariora-user-chip {',
      '  cursor: pointer;',
      '  display: inline-flex;',
      '  align-items: center;',
      '  gap: 8px;',
      '  padding: 4px 10px 4px 6px;',
      '}',
      '.user-chip-avatar {',
      '  width: 24px;',
      '  height: 24px;',
      '  border-radius: 50%;',
      '  object-fit: cover;',
      '  border: 1px solid rgba(212, 175, 55, 0.5);',
      '}',
      '.user-chip-initials {',
      '  width: 24px;',
      '  height: 24px;',
      '  border-radius: 50%;',
      '  background: rgba(212, 175, 55, 0.2);',
      '  color: var(--gold-primary, #D4AF37);',
      '  font-size: 11px;',
      '  font-weight: 700;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  border: 1px solid rgba(212, 175, 55, 0.4);',
      '}',
      '.user-chip-name {',
      '  max-width: 110px;',
      '  overflow: hidden;',
      '  text-overflow: ellipsis;',
      '  white-space: nowrap;',
      '  font-weight: 600;',
      '  font-size: 12px;',
      '}',
      '.sync-dot {',
      '  width: 7px;',
      '  height: 7px;',
      '  border-radius: 50%;',
      '  background: #58A177;',
      '  box-shadow: 0 0 6px rgba(88, 161, 119, 0.7);',
      '}',
      '/* Auth Modal */',
      '.auth-modal-overlay {',
      '  position: fixed;',
      '  inset: 0;',
      '  background: rgba(5, 7, 11, 0.75);',
      '  backdrop-filter: blur(12px);',
      '  -webkit-backdrop-filter: blur(12px);',
      '  z-index: 10120;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  padding: 16px;',
      '  opacity: 0;',
      '  visibility: hidden;',
      '  transition: opacity 0.2s ease, visibility 0.2s ease;',
      '}',
      '.auth-modal-overlay.is-active {',
      '  opacity: 1;',
      '  visibility: visible;',
      '  z-index: 10120;',
      '}',
      '.auth-modal-card {',
      '  background: rgba(15, 19, 27, 0.94);',
      '  border: 1px solid rgba(212, 175, 55, 0.28);',
      '  border-radius: 14px;',
      '  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(212, 175, 55, 0.22);',
      '  width: 100%;',
      '  max-width: 400px;',
      '  padding: 28px 24px;',
      '  position: relative;',
      '  transform: translateY(10px);',
      '  transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);',
      '}',
      '.auth-modal-overlay.is-active .auth-modal-card {',
      '  transform: translateY(0);',
      '}',
      '.auth-mode-tabs {',
      '  display: grid;',
      '  grid-template-columns: 1fr 1fr;',
      '  gap: 4px;',
      '  padding: 4px;',
      '  margin-bottom: 18px;',
      '  border: 1px solid rgba(255,255,255,0.12);',
      '  border-radius: 8px;',
      '  background: rgba(255,255,255,0.04);',
      '}',
      '.auth-mode-tab {',
      '  min-height: 40px;',
      '  border: 0;',
      '  border-radius: 6px;',
      '  background: transparent;',
      '  color: #A3ADC2;',
      '  font: inherit;',
      '  font-size: 13px;',
      '  font-weight: 700;',
      '  cursor: pointer;',
      '}',
      '.auth-mode-tab[aria-selected="true"] {',
      '  background: #D4AF37;',
      '  color: #07090E;',
      '}',
      '.auth-mode-tab:hover:not([aria-selected="true"]) {',
      '  color: #F3F4F6;',
      '  background: rgba(255,255,255,0.06);',
      '}',
      '.auth-modal-header {',
      '  text-align: center;',
      '  margin-bottom: 16px;',
      '}',
      '.auth-modal-header h3 {',
      '  margin: 0 0 6px;',
      '  font-size: 1.35rem;',
      '  color: var(--text-primary, #F3F4F6);',
      '  font-weight: 700;',
      '}',
      '.auth-modal-header p {',
      '  margin: 0;',
      '  font-size: 0.86rem;',
      '  color: var(--text-secondary, #A3ADC2);',
      '}',
      '.auth-password-hint {',
      '  margin: 6px 0 0;',
      '  font-size: 11px;',
      '  line-height: 1.4;',
      '  color: #8B95A8;',
      '}',
      '.auth-input.is-invalid {',
      '  border-color: #CB6E63;',
      '}',
      '.btn-google:focus-visible,',
      '.btn-telegram:focus-visible,',
      '.btn-auth-submit:focus-visible,',
      '.auth-mode-tab:focus-visible,',
      '.auth-link:focus-visible,',
      '.auth-close-btn:focus-visible {',
      '  outline: 2px solid #D4AF37;',
      '  outline-offset: 2px;',
      '}',
      '.btn-auth-submit[disabled] {',
      '  opacity: 0.55;',
      '  cursor: not-allowed;',
      '}',
      '.auth-error-banner[hidden] { display: none !important; }',
      '.auth-error-banner.is-info {',
      '  background: rgba(88, 161, 119, 0.14);',
      '  border-color: rgba(88, 161, 119, 0.4);',
      '  color: #86EFAC;',
      '}',
      '.btn-google {',
      '  width: 100%;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  gap: 12px;',
      '  padding: 12px 16px;',
      '  background: #FFFFFF;',
      '  color: #1F2937;',
      '  border: 1px solid #E5E7EB;',
      '  border-radius: 8px;',
      '  font-weight: 600;',
      '  font-size: 0.95rem;',
      '  cursor: pointer;',
      '  transition: background 0.15s ease, box-shadow 0.15s ease;',
      '}',
      '.btn-google:hover {',
      '  background: #F9FAFB;',
      '  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.15);',
      '}',
      '.btn-telegram {',
      '  width: 100%;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  gap: 12px;',
      '  padding: 10px 16px;',
      '  background: #24A1DE;',
      '  color: #FFFFFF;',
      '  border: 1px solid #1E88BE;',
      '  border-radius: 8px;',
      '  font-weight: 600;',
      '  font-size: 0.95rem;',
      '  cursor: pointer;',
      '  margin-top: 10px;',
      '  transition: background 0.15s ease, box-shadow 0.15s ease;',
      '}',
      '.btn-telegram:hover {',
      '  background: #1E88BE;',
      '  box-shadow: 0 4px 12px rgba(36, 161, 222, 0.25);',
      '}',
      '.auth-divider {',
      '  display: flex;',
      '  align-items: center;',
      '  text-align: center;',
      '  margin: 20px 0;',
      '  color: var(--text-muted, #8B95A8);',
      '  font-size: 12px;',
      '  text-transform: uppercase;',
      '  letter-spacing: 0.05em;',
      '}',
      '.auth-divider::before, .auth-divider::after {',
      '  content: "";',
      '  flex: 1;',
      '  border-bottom: 1px solid rgba(255, 255, 255, 0.1);',
      '}',
      '.auth-divider span {',
      '  padding: 0 12px;',
      '}',
      '.auth-input-group {',
      '  margin-bottom: 14px;',
      '}',
      '.auth-input-group label {',
      '  display: block;',
      '  font-size: 12px;',
      '  font-weight: 600;',
      '  color: var(--text-secondary, #A3ADC2);',
      '  margin-bottom: 5px;',
      '}',
      '.auth-input {',
      '  width: 100%;',
      '  padding: 10px 12px;',
      '  background: rgba(21, 26, 37, 0.85);',
      '  border: 1px solid rgba(212, 175, 55, 0.2);',
      '  border-radius: 6px;',
      '  color: var(--text-primary, #F3F4F6);',
      '  font-size: 14px;',
      '  box-sizing: border-box;',
      '}',
      '.auth-input:focus {',
      '  outline: none;',
      '  border-color: var(--gold-primary, #D4AF37);',
      '  box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.15);',
      '}',
      '.btn-auth-submit {',
      '  width: 100%;',
      '  padding: 11px;',
      '  background: var(--gold-primary, #D4AF37);',
      '  color: #07090E;',
      '  font-weight: 700;',
      '  font-size: 14px;',
      '  border: none;',
      '  border-radius: 6px;',
      '  cursor: pointer;',
      '  margin-top: 6px;',
      '  transition: opacity 0.15s ease;',
      '}',
      '.btn-auth-submit:hover {',
      '  opacity: 0.92;',
      '}',
      '.auth-footer-links {',
      '  margin-top: 18px;',
      '  text-align: center;',
      '  font-size: 13px;',
      '  color: var(--text-secondary, #A3ADC2);',
      '}',
      '.auth-link {',
      '  color: var(--gold-primary, #D4AF37);',
      '  cursor: pointer;',
      '  background: none;',
      '  border: none;',
      '  padding: 0;',
      '  font: inherit;',
      '  text-decoration: underline;',
      '}',
      '.auth-error-banner {',
      '  background: rgba(203, 110, 99, 0.15);',
      '  border: 1px solid rgba(203, 110, 99, 0.4);',
      '  color: #FCA5A5;',
      '  padding: 10px 12px;',
      '  border-radius: 8px;',
      '  font-size: 13px;',
      '  line-height: 1.4;',
      '  margin-bottom: 14px;',
      '  display: none;',
      '}',
      '.auth-close-btn {',
      '  position: absolute;',
      '  top: 14px;',
      '  right: 14px;',
      '  background: transparent;',
      '  border: none;',
      '  color: var(--text-muted, #8B95A8);',
      '  cursor: pointer;',
      '  padding: 4px;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '}',
      '.auth-close-btn:hover {',
      '  color: var(--text-primary, #F3F4F6);',
      '}'
    ].join('\n');

    var styleEl = document.createElement('style');
    styleEl.id = 'clarioraAuthStyles';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  /**
   * Injects modal HTML elements into the DOM
   */
  function injectModalMarkup() {
    if (document.getElementById('clarioraAuthModalOverlay')) return;

    var container = document.createElement('div');
    container.id = 'clarioraAuthModalOverlay';
    container.className = 'auth-modal-overlay';
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-modal', 'true');
    container.setAttribute('aria-labelledby', 'authModalTitle');

    container.innerHTML = [
      '<div class="auth-modal-card">',
      '  <button type="button" class="auth-close-btn" onclick="ClarioraAuthUI.closeModal()" aria-label="Close and return to sign-in options">',
      '    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
      '  </button>',
      '  <div class="auth-mode-tabs" role="tablist" aria-label="Account mode">',
      '    <button type="button" class="auth-mode-tab" id="authTabSignin" role="tab" aria-selected="true" aria-controls="authEmailForm" onclick="ClarioraAuthUI.setMode(\'signin\')">Sign in</button>',
      '    <button type="button" class="auth-mode-tab" id="authTabSignup" role="tab" aria-selected="false" aria-controls="authEmailForm" onclick="ClarioraAuthUI.setMode(\'signup\')">Create account</button>',
      '  </div>',
      '  <div class="auth-modal-header">',
      '    <h3 id="authModalTitle">Sign in with email</h3>',
      '    <p id="authModalSubtitle">Your CompTIA A+ progress stays with this account.</p>',
      '  </div>',
      '  <div id="authErrorBanner" class="auth-error-banner" role="alert" aria-live="assertive"></div>',
      '  <button type="button" class="btn-google" onclick="ClarioraAuthUI.handleGoogleSignIn()">',
      '    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>',
      '    <span>Continue with Google</span>',
      '  </button>',
      '  <button type="button" class="btn-telegram" onclick="ClarioraAuthUI.handleTelegramSignIn()">',
      '    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>',
      '    <span>Continue with Telegram</span>',
      '  </button>',
      '  <div class="auth-divider"><span>or with email</span></div>',
      '  <form id="authEmailForm" onsubmit="ClarioraAuthUI.handleEmailSubmit(event)" novalidate>',
      '    <div class="auth-input-group" id="authDisplayNameGroup" hidden>',
      '      <label for="authDisplayName">Display name</label>',
      '      <input type="text" id="authDisplayName" class="auth-input" placeholder="Your name" autocomplete="name" maxlength="80">',
      '    </div>',
      '    <div class="auth-input-group">',
      '      <label for="authEmail">Email</label>',
      '      <input type="email" id="authEmail" class="auth-input" placeholder="you@example.com" required autocomplete="email" inputmode="email" spellcheck="false">',
      '    </div>',
      '    <div class="auth-input-group">',
      '      <label for="authPassword">Password</label>',
      '      <input type="password" id="authPassword" class="auth-input" placeholder="Password" required autocomplete="current-password" minlength="8">',
      '      <p class="auth-password-hint" id="authPasswordHint">At least 8 characters. Use letters and a number.</p>',
      '    </div>',
      '    <div class="auth-input-group" id="authConfirmGroup" hidden>',
      '      <label for="authPasswordConfirm">Confirm password</label>',
      '      <input type="password" id="authPasswordConfirm" class="auth-input" placeholder="Confirm password" autocomplete="new-password" minlength="8">',
      '    </div>',
      '    <button type="submit" id="authSubmitBtn" class="btn-auth-submit">Sign in</button>',
      '  </form>',
      '  <div class="auth-footer-links">',
      '    <button type="button" class="auth-link" id="authForgotBtn" onclick="ClarioraAuthUI.handleForgotPassword()">Forgot password?</button>',
      '    <p style="margin: 14px 0 0; font-size: 11px; line-height: 1.45; color: #8B95A8; text-align: center;">Local-first privacy: Practice history is saved on this device. Sign in to sync across devices.</p>',
      '  </div>',
      '</div>'
    ].join('\n');

    document.body.appendChild(container);

    // Close on backdrop click or Escape key
    container.addEventListener('click', function (e) {
      if (e.target === container) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && authState.modalOpen) {
        closeModal();
      }
    });
  }

  /**
   * Renders the header control pill
   */
  function renderHeaderPill(user) {
    var mount = document.getElementById('tmaUserPillMount');
    if (!mount) return;

    if (authState.isTMA) return; // Leave for TMA bridge

    if (!user) {
      mount.innerHTML = [
        '<button type="button" class="streak-chip clariora-auth-chip" onclick="ClarioraAuthUI.openModal()" title="Sign in to save and sync progress across devices" aria-label="Sign in to sync">',
        '  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
        '  <strong>Sign in to sync</strong>',
        '</button>'
      ].join('');
      var dt = document.getElementById('drawerAccountText');
      if (dt) dt.textContent = 'Sign in / Account';
      var dm = document.getElementById('drawerAccountMeta');
      if (dm) dm.textContent = 'Cloud Sync';
    } else {
      var name = user.displayName || (user.email ? user.email.split('@')[0] : 'Learner');
      var avatarHtml = '';
      if (user.photoURL) {
        avatarHtml = '<img src="' + user.photoURL + '" alt="' + name + '" class="user-chip-avatar" crossorigin="anonymous">';
      } else {
        var initial = (name.charAt(0) || 'U').toUpperCase();
        avatarHtml = '<span class="user-chip-initials">' + initial + '</span>';
      }

      mount.innerHTML = [
        '<button type="button" class="streak-chip clariora-user-chip" onclick="ClarioraAuthUI.openAccountMenu()" title="Account settings and cloud sync" aria-label="Account">',
        avatarHtml,
        '<span class="user-chip-name">' + name + '</span>',
        '<span class="sync-dot" title="Cloud Synced" aria-hidden="true"></span>',
        '</button>'
      ].join('');
      var dt = document.getElementById('drawerAccountText');
      if (dt) dt.textContent = name;
      var dm = document.getElementById('drawerAccountMeta');
      if (dm) dm.textContent = 'Account';
    }
  }

  function openModal(opts) {
    opts = opts || {};
    injectStyles();
    injectModalMarkup();
    if (opts.wall) setWallMode(true);
    var desired = opts.mode === 'signup' ? 'signup' : 'signin';
    setMode(desired);
    var overlay = document.getElementById('clarioraAuthModalOverlay');
    if (overlay) {
      overlay.classList.add('is-active');
      authState.modalOpen = true;
      clearError();
      var closeBtn = overlay.querySelector('.auth-close-btn');
      if (closeBtn) closeBtn.style.display = '';
      var focusTarget = document.getElementById('authEmail') || closeBtn;
      if (focusTarget && typeof focusTarget.focus === 'function') {
        setTimeout(function () { focusTarget.focus(); }, 30);
      }
    }
  }

  function closeModal() {
    // Always allow dismissing the email modal. When gated, the wall remains underneath.
    var overlay = document.getElementById('clarioraAuthModalOverlay');
    if (overlay) {
      overlay.classList.remove('is-active');
      authState.modalOpen = false;
      clearError();
    }
  }

  function setMode(mode) {
    authState.mode = mode === 'signup' ? 'signup' : 'signin';
    var isSignup = authState.mode === 'signup';

    var title = document.getElementById('authModalTitle');
    var subtitle = document.getElementById('authModalSubtitle');
    var submitBtn = document.getElementById('authSubmitBtn');
    var nameGroup = document.getElementById('authDisplayNameGroup');
    var confirmGroup = document.getElementById('authConfirmGroup');
    var passInput = document.getElementById('authPassword');
    var hint = document.getElementById('authPasswordHint');
    var tabSignin = document.getElementById('authTabSignin');
    var tabSignup = document.getElementById('authTabSignup');
    var forgotBtn = document.getElementById('authForgotBtn');

    if (isSignup) {
      if (title) title.textContent = 'Create your Clariora account';
      if (subtitle) subtitle.textContent = 'Save readiness, streaks, and mock history to this email.';
      if (submitBtn) submitBtn.textContent = 'Create account';
      if (nameGroup) nameGroup.hidden = false;
      if (confirmGroup) confirmGroup.hidden = false;
      if (passInput) passInput.setAttribute('autocomplete', 'new-password');
      if (hint) hint.textContent = 'At least 8 characters. Use letters and a number.';
      if (forgotBtn) forgotBtn.hidden = true;
    } else {
      if (title) title.textContent = 'Sign in with email';
      if (subtitle) subtitle.textContent = 'Your CompTIA A+ progress stays with this account.';
      if (submitBtn) submitBtn.textContent = 'Sign in';
      if (nameGroup) nameGroup.hidden = true;
      if (confirmGroup) confirmGroup.hidden = true;
      if (passInput) passInput.setAttribute('autocomplete', 'current-password');
      if (hint) hint.textContent = 'Enter the password for this account.';
      if (forgotBtn) forgotBtn.hidden = false;
    }

    if (tabSignin) {
      tabSignin.setAttribute('aria-selected', isSignup ? 'false' : 'true');
    }
    if (tabSignup) {
      tabSignup.setAttribute('aria-selected', isSignup ? 'true' : 'false');
    }
    clearError();
  }

  function toggleMode() {
    setMode(authState.mode === 'signin' ? 'signup' : 'signin');
  }

  function showError(msg, isInfo) {
    var banner = document.getElementById('authErrorBanner');
    if (banner) {
      banner.textContent = msg;
      banner.style.display = 'block';
      banner.classList.toggle('is-info', !!isInfo);
      banner.hidden = false;
    }
  }

  function clearError() {
    var banner = document.getElementById('authErrorBanner');
    if (banner) {
      banner.textContent = '';
      banner.style.display = 'none';
      banner.classList.remove('is-info');
      banner.hidden = true;
    }
    ['authEmail', 'authPassword', 'authPasswordConfirm', 'authDisplayName'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.remove('is-invalid');
    });
  }

  function markInvalid(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('is-invalid');
  }

  function passwordMeetsRules(pass) {
    if (!pass || pass.length < 8) return false;
    if (!/[A-Za-z]/.test(pass)) return false;
    if (!/[0-9]/.test(pass)) return false;
    return true;
  }

  async function handleGoogleSignIn() {
    clearError();
    var service = firebaseService || window.ClarioraFirebaseService;
    if (!service) return;

    try {
      await service.signInWithGoogle();
      closeModal();
    } catch (err) {
      console.warn('[AuthUI] Google sign-in failed:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        var msg = err.message || 'Google sign-in could not be completed.';
        if (authState.modalOpen) showError(msg);
        else if (window.ClarioraAuthGate && document.getElementById('gateErrorNote')) {
          var gateErr = document.getElementById('gateErrorNote');
          gateErr.hidden = false;
          gateErr.textContent = msg;
        }
      }
    }
  }

  async function handleEmailSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    clearError();

    var service = firebaseService || window.ClarioraFirebaseService;
    if (!service) {
      showError('Sign-in is temporarily unavailable. Refresh and try again.');
      return;
    }

    var emailEl = document.getElementById('authEmail');
    var passEl = document.getElementById('authPassword');
    var confirmEl = document.getElementById('authPasswordConfirm');
    var nameEl = document.getElementById('authDisplayName');
    var submitBtn = document.getElementById('authSubmitBtn');

    var email = (emailEl && emailEl.value || '').trim();
    var pass = (passEl && passEl.value) || '';
    var confirm = (confirmEl && confirmEl.value) || '';
    var name = (nameEl && nameEl.value || '').trim();

    if (!email) {
      markInvalid('authEmail');
      showError('Enter your email address.');
      return;
    }
    if (!pass) {
      markInvalid('authPassword');
      showError('Enter your password.');
      return;
    }

    if (authState.mode === 'signup') {
      if (!passwordMeetsRules(pass)) {
        markInvalid('authPassword');
        showError('Password must be at least 8 characters and include a letter and a number.');
        return;
      }
      if (pass !== confirm) {
        markInvalid('authPasswordConfirm');
        showError('Passwords do not match.');
        return;
      }
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.setAttribute('aria-busy', 'true');
    }
    authState.busy = true;

    try {
      if (authState.mode === 'signup') {
        var created = await service.signUpWithEmail(email, pass, name);
        notifyAuthenticated({ isTelegram: false, user: created, event: 'signup' });
      } else {
        var signedIn = await service.signInWithEmail(email, pass);
        notifyAuthenticated({ isTelegram: false, user: signedIn, event: 'signin' });
      }
      closeModal();
    } catch (err) {
      console.warn('[AuthUI] Email auth failed:', err);
      var userMessage = 'Authentication failed. Check your details and try again.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        userMessage = 'Incorrect email or password.';
        markInvalid('authPassword');
      } else if (err.code === 'auth/user-not-found') {
        userMessage = 'No account found with this email. Create an account instead.';
        markInvalid('authEmail');
      } else if (err.code === 'auth/email-already-in-use') {
        userMessage = 'An account with this email already exists. Sign in instead.';
        markInvalid('authEmail');
      } else if (err.code === 'auth/weak-password') {
        userMessage = 'Password must be at least 8 characters and include a letter and a number.';
        markInvalid('authPassword');
      } else if (err.code === 'auth/invalid-email') {
        userMessage = 'Enter a valid email address.';
        markInvalid('authEmail');
      } else if (err.code === 'auth/too-many-requests') {
        userMessage = 'Too many attempts. Wait a moment, then try again.';
      } else if (err.code === 'auth/network-request-failed') {
        userMessage = 'Network error. Check your connection and try again.';
      }
      showError(userMessage);
    } finally {
      authState.busy = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.removeAttribute('aria-busy');
      }
    }
  }

  async function handleForgotPassword() {
    var emailInput = document.getElementById('authEmail');
    var email = (emailInput ? emailInput.value : '').trim();
    if (!email) {
      markInvalid('authEmail');
      showError('Enter your email address above to reset your password.');
      return;
    }

    var service = firebaseService || window.ClarioraFirebaseService;
    if (!service) return;

    try {
      await service.sendPasswordReset(email);
      showError('Password reset link sent to ' + email + '.', true);
    } catch (err) {
      showError(err.message || 'Could not send reset email.');
    }
  }

  function handleTelegramSignIn() {
    clearError();
    if (!window.Telegram || !window.Telegram.Login) {
      var script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.async = true;
      script.onload = function () {
        triggerTelegramPopup();
      };
      script.onerror = function () {
        showError('Could not load Telegram login widget.');
      };
      document.body.appendChild(script);
    } else {
      triggerTelegramPopup();
    }
  }

  function triggerTelegramPopup() {
    if (!window.Telegram || !window.Telegram.Login) {
      showError('Telegram login is initializing. Please try again.');
      return;
    }
        window.Telegram.Login.auth(
      { bot_id: '8280144046', request_access: true },
      function (data) {
        if (!data) {
          showError('Telegram login cancelled.');
          return;
        }
        fetch('/api/v1/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        .then(function (res) { return res.json(); })
        .then(function (result) {
          if (result.success && result.user) {
            try {
              localStorage.setItem('clariora_telegram_auth', JSON.stringify(result.user));
              localStorage.setItem('clariora_telegram_login_payload', JSON.stringify(data));
            } catch (_) {}
            if (window.ClarioraAuthGate && window.ClarioraAuthGate.storeTelegramLoginPayload) {
              window.ClarioraAuthGate.storeTelegramLoginPayload(data);
            }
            if (result.entitlement) {
              try {
                window.__CLARIORA_SERVER_ENTITLEMENT__ = result.entitlement;
                window.dispatchEvent(new CustomEvent('clariora:entitlement-updated'));
              } catch (_) {}
            }
            var displayName = result.user.first_name + (result.user.last_name ? ' ' + result.user.last_name : '');
            renderHeaderPill({
              displayName: displayName,
              photoURL: result.user.photo_url,
              email: result.user.username ? '@' + result.user.username : null,
              isTelegram: true
            });
            notifyAuthenticated({
              isTelegram: true,
              user: result.user,
              loginPayload: data,
              event: 'signin'
            });
            closeModal();
          } else {
            showError(result.error || 'Telegram verification failed.');
          }
        })
        .catch(function (err) {
          showError('Authentication error: ' + err.message);
        });
      }
    );
  }

  function openAccountMenu() {
    var savedTg = localStorage.getItem('clariora_telegram_auth');
    var tgUser = null;
    if (savedTg) {
      try { tgUser = JSON.parse(savedTg); } catch (_) {}
    }
    var service = firebaseService || window.ClarioraFirebaseService;
    var user = service ? service.getCurrentUser() : null;

    if (!tgUser && !user) {
      openModal();
      return;
    }

    var displayName = '';
    var emailOrHandle = '';
    var providerLabel = '';
    var avatarHtml = '';

    if (tgUser) {
      displayName = tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name : '');
      emailOrHandle = tgUser.username ? '@' + tgUser.username : 'Telegram Account';
      providerLabel = 'Telegram';
      if (tgUser.photo_url) {
        avatarHtml = '<img src="' + tgUser.photo_url + '" class="user-chip-avatar" style="width:42px;height:42px;" alt="' + displayName + '">';
      } else {
        avatarHtml = '<span class="user-chip-initials" style="width:42px;height:42px;font-size:16px;">' + (displayName.charAt(0) || 'T').toUpperCase() + '</span>';
      }
    } else {
      displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'Learner');
      emailOrHandle = user.email || 'Cloud Account';
      providerLabel = (user.providerData && user.providerData[0] && user.providerData[0].providerId === 'google.com') ? 'Google' : 'Email';
      if (user.photoURL) {
        avatarHtml = '<img src="' + user.photoURL + '" class="user-chip-avatar" style="width:42px;height:42px;" alt="' + displayName + '">';
      } else {
        avatarHtml = '<span class="user-chip-initials" style="width:42px;height:42px;font-size:16px;">' + (displayName.charAt(0) || 'L').toUpperCase() + '</span>';
      }
    }

    var overlayId = 'clarioraAccountSheetOverlay';
    var existing = document.getElementById(overlayId);
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

    var sheet = document.createElement('div');
    sheet.id = overlayId;
    sheet.className = 'auth-modal-overlay is-active';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', 'Account Settings');
    sheet.innerHTML = [
      '<div class="auth-modal-card" style="max-width: 380px; text-align: left;">',
      '  <button type="button" class="auth-close-btn" id="clarioraAccountCloseBtn" aria-label="Close account settings">',
      '    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
      '  </button>',
      '  <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 18px;">',
      '    ' + avatarHtml,
      '    <div style="overflow: hidden;">',
      '      <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700; color: #F3F4F6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + displayName + '</h3>',
      '      <p style="margin: 2px 0 0; font-size: 0.84rem; color: #94A3B8;">' + emailOrHandle + '</p>',
      '    </div>',
      '  </div>',
      '  <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(212,175,55,0.2); border-radius: 8px; padding: 12px 14px; margin-bottom: 18px;">',
      '    <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">',
      '      <span style="color: #94A3B8;">Sign-in method</span>',
      '      <strong style="color: #D4AF37;">' + providerLabel + '</strong>',
      '    </div>',
      '    <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px;">',
      '      <span style="color: #94A3B8;">Cloud backup</span>',
      '      <span style="color: #86EFAC; display: flex; align-items: center; gap: 6px;"><span class="sync-dot"></span> Synced</span>',
      '    </div>',
      '  </div>',
      '  <div style="display: grid; gap: 10px;">',
      '    <button type="button" class="btn" id="clarioraAccountSyncNowBtn" style="width: 100%; padding: 10px; background: rgba(212,175,55,0.14); border: 1px solid rgba(212,175,55,0.4); color: #F5D061; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer;">Sync Now</button>',
      '    <button type="button" class="btn" id="clarioraAccountSignOutBtn" style="width: 100%; padding: 10px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #FCA5A5; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer;">Sign out</button>',
      '  </div>',
      '</div>'
    ].join('\n');

    document.body.appendChild(sheet);

    function closeSheet() {
      if (sheet && sheet.parentNode) sheet.parentNode.removeChild(sheet);
    }

    var closeBtn = document.getElementById('clarioraAccountCloseBtn');
    if (closeBtn) closeBtn.onclick = closeSheet;
    sheet.onclick = function (e) { if (e.target === sheet) closeSheet(); };

    var syncBtn = document.getElementById('clarioraAccountSyncNowBtn');
    if (syncBtn) {
      syncBtn.onclick = async function () {
        syncBtn.textContent = 'Syncing...';
        syncBtn.disabled = true;
        try {
          if (service && typeof service.scheduleSyncToFirestore === 'function') {
            await service.scheduleSyncToFirestore();
          }
          syncBtn.textContent = 'Synced successfully!';
          setTimeout(function () {
            if (syncBtn) { syncBtn.textContent = 'Sync Now'; syncBtn.disabled = false; }
          }, 1500);
        } catch (err) {
          syncBtn.textContent = 'Sync delayed';
          syncBtn.disabled = false;
        }
      };
    }

    var signOutBtn = document.getElementById('clarioraAccountSignOutBtn');
    if (signOutBtn) {
      signOutBtn.onclick = function () {
        closeSheet();
        if (tgUser) {
          localStorage.removeItem('clariora_telegram_auth');
          localStorage.removeItem('clariora_telegram_login_payload');
          localStorage.removeItem('clariora_auth_session_v1');
          renderHeaderPill(null);
          if (window.ClarioraAuthGate) window.ClarioraAuthGate.lock();
        } else if (service) {
          service.signOutUser().then(function () {
            localStorage.removeItem('clariora_auth_session_v1');
            renderHeaderPill(null);
            if (window.ClarioraAuthGate) window.ClarioraAuthGate.lock();
          });
        }
      };
    }
  }

  return {
    init: init,
    openModal: openModal,
    closeModal: closeModal,
    toggleMode: toggleMode,
    setMode: setMode,
    handleGoogleSignIn: handleGoogleSignIn,
    handleTelegramSignIn: handleTelegramSignIn,
    handleEmailSubmit: handleEmailSubmit,
    handleForgotPassword: handleForgotPassword,
    openAccountMenu: openAccountMenu,
    setWallMode: setWallMode,
    onAuthenticated: onAuthenticated
  };
});
