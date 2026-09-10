/**
 * tma_bridge.js
 * Comprehensive Telegram Mini Apps (TMA) bridge for Clariora.
 * Integrates official @telegram-apps/sdk / Telegram.WebApp ergonomics:
 * - Viewport handling & safe-area insets
 * - Native BackButton routing
 * - Native MainButton lifecycle
 * - Haptic tactile feedback
 * - Closing confirmation (anti-accidental dismissal during exams)
 * - CloudStorage sync
 * - Theme synchronization & graceful browser fallbacks
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TMABridge = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const isBrowser = typeof window !== 'undefined';
  const tg = isBrowser && window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

  // Real TMA detection: must be running inside Telegram with valid initData or user
  const isRealTMA = !!(
    tg &&
    ((typeof tg.initData === 'string' && tg.initData.length > 0) ||
     (tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id))
  );

  const state = {
    isTMA: isRealTMA,
    user: null,
    navigationStack: [],
    onBackHandlers: [],
    theme: 'dark'
  };

  /**
   * Initializes the Telegram WebApp environment
   */
  function init() {
    if (!isBrowser) return state;

    if (tg && isRealTMA) {
      try {
        tg.ready();
        
        // Expand viewport immediately for full screen coverage
        if (typeof tg.expand === 'function') {
          tg.expand();
        }

        // Telegram 7.5+ fullscreen request if available
        if (typeof tg.requestFullscreen === 'function') {
          try {
            tg.requestFullscreen();
          } catch (e) {
            console.debug('Fullscreen not granted or supported:', e);
          }
        }

        // Telegram 7.7+ disable vertical swipes to prevent accidental closure during PBQs and exams
        if (typeof tg.disableVerticalSwipes === 'function') {
          try {
            tg.disableVerticalSwipes();
          } catch (e) {
            console.debug('disableVerticalSwipes not supported:', e);
          }
        }

        // Telegram 8.0+ orientation locking (mobile portrait)
        if (typeof tg.lockOrientation === 'function') {
          try {
            tg.lockOrientation();
          } catch (e) {
            console.debug('lockOrientation not supported:', e);
          }
        }

        // Enable closing confirmation to guard against accidental swiping during exams
        if (typeof tg.enableClosingConfirmation === 'function') {
          tg.enableClosingConfirmation();
        }

        // Capture Telegram user details
        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
          state.user = tg.initDataUnsafe.user;
          console.log('[TMA] Initialized for user:', state.user.first_name, `(ID: ${state.user.id})`);
        }

        // Apply Telegram theme styling
        syncTheme();
        tg.onEvent('themeChanged', syncTheme);
        tg.onEvent('viewportChanged', syncViewport);

        // Initial viewport sync
        syncViewport();

        // Wire BackButton
        if (tg.BackButton) {
          tg.BackButton.onClick(handleBackClick);
        }

        // Wire SettingsButton (Telegram Bot API 7.0+)
        if (tg.SettingsButton) {
          try {
            tg.SettingsButton.show();
            tg.SettingsButton.onClick(function () {
              if (typeof window.openMoreMenu === 'function') {
                window.openMoreMenu();
              } else if (window.StarsBilling) {
                window.StarsBilling.openStarsUpgradeSheet();
              }
            });
          } catch (e) {
            console.debug('SettingsButton initialization error:', e);
          }
        }

      } catch (err) {
        console.warn('[TMA] Error during WebApp initialization:', err);
      }
    } else {
      console.log('[TMA] Running outside Telegram: Mock WebApp active for development.');
      state.user = {
        id: 99999999,
        first_name: 'Dev',
        last_name: 'Tester',
        username: 'dev_technician'
      };
      syncViewport();
    }

    return state;
  }

  /**
   * Synchronize viewport metrics & safe areas to CSS variables
   */
  function syncViewport() {
    if (!isBrowser) return;
    const doc = document.documentElement;

    const vh = tg && tg.viewportHeight ? tg.viewportHeight : window.innerHeight;
    const stableVh = tg && tg.viewportStableHeight ? tg.viewportStableHeight : window.innerHeight;

    doc.style.setProperty('--tg-viewport-height', `${vh}px`);
    doc.style.setProperty('--tg-viewport-stable-height', `${stableVh}px`);

    // Safe area defaults (overridden by Telegram webview parameters if supplied)
    const topInset = (tg && tg.safeAreaInset && tg.safeAreaInset.top) || 0;
    const bottomInset = (tg && tg.safeAreaInset && tg.safeAreaInset.bottom) || 0;
    doc.style.setProperty('--tg-safe-area-inset-top', `${topInset}px`);
    doc.style.setProperty('--tg-safe-area-inset-bottom', `${bottomInset}px`);
  }

  /**
   * Synchronize colors and theme parameters
   */
  function syncTheme() {
    if (!isBrowser) return;
    const doc = document.documentElement;
    const colorScheme = (tg && tg.colorScheme) || 'dark';
    state.theme = colorScheme;
    doc.setAttribute('data-theme', colorScheme);

    if (tg && tg.themeParams) {
      const p = tg.themeParams;
      if (p.bg_color) doc.style.setProperty('--tg-theme-bg-color', p.bg_color);
      if (p.text_color) doc.style.setProperty('--tg-theme-text-color', p.text_color);
      if (p.hint_color) doc.style.setProperty('--tg-theme-hint-color', p.hint_color);
      if (p.button_color) doc.style.setProperty('--tg-theme-button-color', p.button_color);
      if (p.button_text_color) doc.style.setProperty('--tg-theme-button-text-color', p.button_text_color);
      if (p.secondary_bg_color) doc.style.setProperty('--tg-theme-secondary-bg-color', p.secondary_bg_color);
    }
  }

  /**
   * Push a route/view to the BackButton navigation stack
   */
  function pushNav(viewName, onBackCallback) {
    state.navigationStack.push({ viewName, onBackCallback });
    if (tg && tg.BackButton) {
      tg.BackButton.show();
    }
  }

  /**
   * Pop the topmost view
   */
  function popNav() {
    const item = state.navigationStack.pop();
    if (state.navigationStack.length === 0 && tg && tg.BackButton) {
      tg.BackButton.hide();
    }
    return item;
  }

  /**
   * Native Telegram BackButton handler
   */
  function handleBackClick() {
    haptic('light');
    if (state.navigationStack.length > 0) {
      const current = popNav();
      if (current && typeof current.onBackCallback === 'function') {
        current.onBackCallback();
        return;
      }
    }

    // Default fallback: check if any modals or drawers are open
    const openModals = document.querySelectorAll('.modal.is-open, .drawer.is-open, .tma-sheet.is-open');
    if (openModals.length > 0) {
      openModals[openModals.length - 1].classList.remove('is-open');
      return;
    }

    // If at root, hide back button
    if (tg && tg.BackButton) {
      tg.BackButton.hide();
    }
  }

  /**
   * Tactile Haptic Feedback
   */
  function haptic(type = 'light') {
    if (!tg || !tg.HapticFeedback) return;
    try {
      if (['light', 'medium', 'heavy', 'rigid', 'soft'].includes(type)) {
        tg.HapticFeedback.impactOccurred(type);
      } else if (['success', 'warning', 'error'].includes(type)) {
        tg.HapticFeedback.notificationOccurred(type);
      } else if (type === 'selection') {
        tg.HapticFeedback.selectionChanged();
      }
    } catch (e) {
      // Ignore if not supported on platform
    }
  }

  /**
   * Native MainButton management
   */
  function setMainButton({ text, color, textColor, isVisible = true, isActive = true, onClick }) {
    if (!tg || !tg.MainButton) return;
    try {
      if (text) tg.MainButton.setText(text);
      if (color) tg.MainButton.setParams({ color, text_color: textColor || '#000000' });
      if (isActive) tg.MainButton.enable(); else tg.MainButton.disable();
      
      if (onClick) {
        tg.MainButton.onClick(onClick);
      }
      
      if (isVisible) {
        tg.MainButton.show();
      } else {
        tg.MainButton.hide();
      }
    } catch (e) {
      console.warn('[TMA] Error configuring MainButton:', e);
    }
  }

  function hideMainButton() {
    if (tg && tg.MainButton) {
      tg.MainButton.hide();
    }
  }

  /**
   * Telegram CloudStorage wrapper
   */
  function setCloudItem(key, value) {
    return new Promise((resolve, reject) => {
      const hasCloudStorage = tg && tg.CloudStorage && typeof tg.isVersionAtLeast === 'function' && tg.isVersionAtLeast('6.9');
      if (hasCloudStorage) {
        try {
          tg.CloudStorage.setItem(key, JSON.stringify(value), (err, stored) => {
            if (err) reject(err); else resolve(stored);
          });
        } catch (e) {
          fallbackLocal();
        }
      } else {
        fallbackLocal();
      }

      function fallbackLocal() {
        try {
          localStorage.setItem(`tma_${key}`, JSON.stringify(value));
          resolve(true);
        } catch (e) {
          reject(e);
        }
      }
    });
  }

  function getCloudItem(key) {
    return new Promise((resolve, reject) => {
      const hasCloudStorage = tg && tg.CloudStorage && typeof tg.isVersionAtLeast === 'function' && tg.isVersionAtLeast('6.9');
      if (hasCloudStorage) {
        try {
          tg.CloudStorage.getItem(key, (err, val) => {
            if (err) reject(err);
            else {
              try {
                resolve(val ? JSON.parse(val) : null);
              } catch (e) {
                resolve(val);
              }
            }
          });
        } catch (e) {
          fallbackLocal();
        }
      } else {
        fallbackLocal();
      }

      function fallbackLocal() {
        try {
          const val = localStorage.getItem(`tma_${key}`);
          resolve(val ? JSON.parse(val) : null);
        } catch (e) {
          reject(e);
        }
      }
    });
  }

  /**
   * Open Telegram Link or URL safely inside WebApp
   */
  function openLink(url, options = {}) {
    if (tg && typeof tg.openTelegramLink === 'function' && (url.startsWith('https://t.me/') || url.startsWith('tg:'))) {
      tg.openTelegramLink(url);
    } else if (tg && typeof tg.openLink === 'function') {
      tg.openLink(url, options);
    } else if (isBrowser) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  /**
   * Safe HTML escaping
   */
  function escapeHTML(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Mounts the Telegram User Status Pill into the navigation bar
   */
  function mountUserPill(containerId = 'tmaUserPillMount') {
    if (!isBrowser) return;
    const container = document.getElementById(containerId);
    if (!container) return;

    const user = state.user;
    if (!user) {
      container.innerHTML = '';
      return;
    }

    const firstLetter = (user.first_name || 'U').charAt(0).toUpperCase();
    const displayName = user.first_name || user.username || 'Learner';

    container.innerHTML = `
      <div class="tma-user-pill" onclick="if (window.StarsBilling) window.StarsBilling.openStarsUpgradeSheet()" title="Telegram Account & Tier" style="cursor: pointer;">
        <div class="tma-user-avatar">${firstLetter}</div>
        <span>${escapeHTML(displayName)}</span>
        <span id="tmaUserTierBadge" style="font-size: 0.7rem; color: #F5D061; font-weight: 700; background: rgba(245, 208, 97, 0.15); padding: 1px 6px; border-radius: 99px;">
          ${state.isTMA ? 'TMA' : 'Web'}
        </span>
      </div>
    `;

    // Refresh tier badge asynchronously
    if (window.StarsBilling && window.StarsBilling.getEntitlements) {
      window.StarsBilling.getEntitlements().then(ent => {
        const badge = document.getElementById('tmaUserTierBadge');
        if (badge && ent) {
          const isPro = ent.tier && ent.tier !== 'free';
          const trialDays = typeof ent.trialDaysRemaining === 'number' ? ent.trialDaysRemaining : 14;
          badge.textContent = isPro ? 'PRO' : (trialDays > 0 ? `TRIAL ${trialDays}D` : 'FREE');
          badge.style.color = isPro ? '#10B981' : (trialDays > 0 ? '#38BDF8' : '#F5D061');
          badge.style.background = isPro ? 'rgba(16, 185, 129, 0.15)' : (trialDays > 0 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 208, 97, 0.15)');
        }
      }).catch(() => {});
    }
  }

  return {
    init,
    state,
    tg,
    syncViewport,
    syncTheme,
    pushNav,
    popNav,
    handleBackClick,
    haptic,
    setMainButton,
    hideMainButton,
    setCloudItem,
    getCloudItem,
    openLink,
    mountUserPill
  };
});
