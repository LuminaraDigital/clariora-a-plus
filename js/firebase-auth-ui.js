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
    busy: false
  };

  /**
   * Initializes the Auth UI layer
   */
  function init() {
    // Detect if running inside Telegram Mini App
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) {
      authState.isTMA = true;
      console.log('[AuthUI] Telegram Mini App active. Native TMA pill preserved.');
      return;
    }

    injectStyles();
    injectModalMarkup();

    // Hide Telegram-only Stars chip in regular browser
    var starsChip = document.getElementById('tmaStarsChip');
    if (starsChip) starsChip.style.display = 'none';

    var service = firebaseService || window.ClarioraFirebaseService;
    if (service) {
      service.onAuthStateChanged(function (user) {
        renderHeaderPill(user);
        if (user && authState.modalOpen) {
          closeModal();
        }
      });
      service.init();
    } else {
      renderHeaderPill(null);
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
      '  z-index: 1000;',
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
      '.auth-modal-header {',
      '  text-align: center;',
      '  margin-bottom: 22px;',
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
      '  color: #CB6E63;',
      '  padding: 8px 12px;',
      '  border-radius: 6px;',
      '  font-size: 12px;',
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
      '  <button type="button" class="auth-close-btn" onclick="ClarioraAuthUI.closeModal()" aria-label="Close dialog">',
      '    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
      '  </button>',
      '  <div class="auth-modal-header">',
      '    <h3 id="authModalTitle">Sign in to Clariora</h3>',
      '    <p id="authModalSubtitle">Sync your practice streaks and progress across devices.</p>',
      '  </div>',
      '  <div id="authErrorBanner" class="auth-error-banner" role="alert"></div>',
      '  <button type="button" class="btn-google" onclick="ClarioraAuthUI.handleGoogleSignIn()">',
      '    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>',
      '    <span>Continue with Google</span>',
      '  </button>',
      '  <div class="auth-divider"><span>or with email</span></div>',
      '  <form id="authEmailForm" onsubmit="ClarioraAuthUI.handleEmailSubmit(event)">',
      '    <div class="auth-input-group" id="authDisplayNameGroup" style="display: none;">',
      '      <label for="authDisplayName">Full Name</label>',
      '      <input type="text" id="authDisplayName" class="auth-input" placeholder="Technician Name" autocomplete="name">',
      '    </div>',
      '    <div class="auth-input-group">',
      '      <label for="authEmail">Email Address</label>',
      '      <input type="email" id="authEmail" class="auth-input" placeholder="technician@example.com" required autocomplete="email">',
      '    </div>',
      '    <div class="auth-input-group">',
      '      <label for="authPassword">Password</label>',
      '      <input type="password" id="authPassword" class="auth-input" placeholder="Password" required autocomplete="current-password">',
      '    </div>',
      '    <button type="submit" id="authSubmitBtn" class="btn-auth-submit">Sign In</button>',
      '  </form>',
      '  <div class="auth-footer-links">',
      '    <span id="authTogglePrompt">Need an account?</span>',
      '    <button type="button" class="auth-link" id="authToggleBtn" onclick="ClarioraAuthUI.toggleMode()">Create one</button>',
      '    <div style="margin-top: 8px;">',
      '      <button type="button" class="auth-link" style="font-size: 12px; color: var(--text-muted, #8B95A8);" onclick="ClarioraAuthUI.handleForgotPassword()">Forgot password?</button>',
      '    </div>',
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
        '<button type="button" class="streak-chip clariora-auth-chip" onclick="ClarioraAuthUI.openModal()" title="Sign in to save and sync progress" aria-label="Sign in">',
        '  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
        '  <strong>Sign in</strong>',
        '</button>'
      ].join('');
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
    }
  }

  function openModal() {
    var overlay = document.getElementById('clarioraAuthModalOverlay');
    if (overlay) {
      overlay.classList.add('is-active');
      authState.modalOpen = true;
      clearError();
    }
  }

  function closeModal() {
    var overlay = document.getElementById('clarioraAuthModalOverlay');
    if (overlay) {
      overlay.classList.remove('is-active');
      authState.modalOpen = false;
      clearError();
    }
  }

  function toggleMode() {
    authState.mode = authState.mode === 'signin' ? 'signup' : 'signin';
    var isSignup = authState.mode === 'signup';

    var title = document.getElementById('authModalTitle');
    var subtitle = document.getElementById('authModalSubtitle');
    var submitBtn = document.getElementById('authSubmitBtn');
    var nameGroup = document.getElementById('authDisplayNameGroup');
    var prompt = document.getElementById('authTogglePrompt');
    var toggleBtn = document.getElementById('authToggleBtn');

    if (isSignup) {
      if (title) title.textContent = 'Create Clariora Account';
      if (subtitle) subtitle.textContent = 'Save your certification journey and practice progress.';
      if (submitBtn) submitBtn.textContent = 'Create Account';
      if (nameGroup) nameGroup.style.display = 'block';
      if (prompt) prompt.textContent = 'Already have an account?';
      if (toggleBtn) toggleBtn.textContent = 'Sign in';
    } else {
      if (title) title.textContent = 'Sign in to Clariora';
      if (subtitle) subtitle.textContent = 'Sync your practice streaks and progress across devices.';
      if (submitBtn) submitBtn.textContent = 'Sign In';
      if (nameGroup) nameGroup.style.display = 'none';
      if (prompt) prompt.textContent = 'Need an account?';
      if (toggleBtn) toggleBtn.textContent = 'Create one';
    }
    clearError();
  }

  function showError(msg) {
    var banner = document.getElementById('authErrorBanner');
    if (banner) {
      banner.textContent = msg;
      banner.style.display = 'block';
    }
  }

  function clearError() {
    var banner = document.getElementById('authErrorBanner');
    if (banner) {
      banner.textContent = '';
      banner.style.display = 'none';
    }
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
        showError(err.message || 'Google sign-in could not be completed.');
      }
    }
  }

  async function handleEmailSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    clearError();

    var service = firebaseService || window.ClarioraFirebaseService;
    if (!service) return;

    var email = (document.getElementById('authEmail').value || '').trim();
    var pass = document.getElementById('authPassword').value || '';
    var name = (document.getElementById('authDisplayName').value || '').trim();

    if (!email || !pass) {
      showError('Please enter both email and password.');
      return;
    }

    try {
      if (authState.mode === 'signup') {
        await service.signUpWithEmail(email, pass, name);
      } else {
        await service.signInWithEmail(email, pass);
      }
      closeModal();
    } catch (err) {
      console.warn('[AuthUI] Email auth failed:', err);
      var userMessage = 'Authentication failed.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        userMessage = 'Incorrect email or password.';
      } else if (err.code === 'auth/user-not-found') {
        userMessage = 'No account found with this email.';
      } else if (err.code === 'auth/email-already-in-use') {
        userMessage = 'An account with this email already exists.';
      } else if (err.code === 'auth/weak-password') {
        userMessage = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        userMessage = 'Please enter a valid email address.';
      }
      showError(userMessage);
    }
  }

  async function handleForgotPassword() {
    var emailInput = document.getElementById('authEmail');
    var email = (emailInput ? emailInput.value : '').trim();
    if (!email) {
      showError('Please enter your email address above to reset password.');
      return;
    }

    var service = firebaseService || window.ClarioraFirebaseService;
    if (!service) return;

    try {
      await service.sendPasswordReset(email);
      showError('Password reset link sent to ' + email + '.');
    } catch (err) {
      showError(err.message || 'Could not send reset email.');
    }
  }

  function openAccountMenu() {
    var service = firebaseService || window.ClarioraFirebaseService;
    var user = service ? service.getCurrentUser() : null;
    if (!user) return;

    var email = user.email || 'Anonymous';
    var name = user.displayName || email.split('@')[0];
    var confirmed = window.confirm('Signed in as: ' + name + ' (' + email + ')\n\nClick OK to Sign Out, or Cancel to keep studying.');
    if (confirmed) {
      service.signOutUser().then(function () {
        renderHeaderPill(null);
      });
    }
  }

  return {
    init: init,
    openModal: openModal,
    closeModal: closeModal,
    toggleMode: toggleMode,
    handleGoogleSignIn: handleGoogleSignIn,
    handleEmailSubmit: handleEmailSubmit,
    handleForgotPassword: handleForgotPassword,
    openAccountMenu: openAccountMenu
  };
});
