/**
 * Clariora Exam Simulator v3.0.0
 * core.js - Core Application Namespace, Event Bus, Storage Adapter, and Utilities
 * File: js/core.js
 */

(function(window) {
  'use strict';

  // Master namespace
  window.APlus = window.APlus || {};
  const APlus = window.APlus;

  APlus.APP_VERSION = '3.1.5';
  APlus.NAME = 'Clariora Exam Simulator';

  /**
   * Event Bus: publish-subscribe system for decoupled modular communication
   */
  class EventBus {
    constructor() {
      this.listeners = new Map();
    }

    on(event, callback) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set());
      }
      this.listeners.get(event).add(callback);
      return () => this.off(event, callback);
    }

    off(event, callback) {
      if (this.listeners.has(event)) {
        this.listeners.get(event).delete(callback);
      }
    }

    emit(event, payload) {
      if (this.listeners.has(event)) {
        this.listeners.get(event).forEach(callback => {
          try {
            callback(payload);
          } catch (err) {
            console.error(`[APlus.bus] Error handling event "${event}":`, err);
          }
        });
      }
    }
  }

  APlus.bus = new EventBus();

  /**
   * Feature Registry: allows modules and sub-agents to register extensible UI components
   */
  class FeatureRegistry {
    constructor() {
      this.features = new Map();
    }

    register(name, config) {
      if (this.features.has(name)) {
        console.warn(`[APlus.features] Feature "${name}" is already registered. Overwriting.`);
      }
      this.features.set(name, config);
      APlus.bus.emit('feature:registered', { name, config });
    }

    get(name) {
      return this.features.get(name);
    }

    list() {
      return Array.from(this.features.entries()).map(([name, config]) => ({ name, ...config }));
    }
  }

  APlus.features = new FeatureRegistry();
  APlus.registerFeature = (name, config) => APlus.features.register(name, config);

  /**
   * Storage Adapter: Namespaced "aplus3_" persistence with migration and Electron fallback
   */
  const STORAGE_PREFIX = 'aplus3_';

  const StorageAdapter = {
    _migrated: false,

    _migrateLegacyKeys() {
      if (this._migrated) return;
      try {
        const migrationMap = {
          'comptia_a_plus_missed': 'missed',
          'comptia_a_plus_history': 'history',
          'comptia_theme': 'theme',
          'comptia_objectives_progress_v1': 'objectives_progress',
          'comptia_profiles_v1': 'profiles',
          'comptia_active_profile_v1': 'active_profile'
        };

        Object.keys(migrationMap).forEach(oldKey => {
          const newKey = STORAGE_PREFIX + migrationMap[oldKey];
          const existingNew = localStorage.getItem(newKey);
          const legacyVal = localStorage.getItem(oldKey);

          if (!existingNew && legacyVal !== null) {
            localStorage.setItem(newKey, legacyVal);
          }
        });
        this._migrated = true;
      } catch (err) {
        console.warn('[APlus.storage] Legacy migration error:', err);
      }
    },

    get(key, fallback = null) {
      this._migrateLegacyKeys();
      const fullKey = key.startsWith(STORAGE_PREFIX) ? key : STORAGE_PREFIX + key;
      try {
        if (window.electronAPI && window.electronAPI.storage && typeof window.electronAPI.storage.get === 'function') {
          const val = window.electronAPI.storage.get(fullKey);
          return val !== undefined && val !== null ? val : fallback;
        }
        const raw = localStorage.getItem(fullKey);
        if (raw === null || raw === undefined) return fallback;
        return JSON.parse(raw);
      } catch (err) {
        // Raw string fallback
        try {
          const raw = localStorage.getItem(fullKey);
          return raw !== null ? raw : fallback;
        } catch (_) {
          return fallback;
        }
      }
    },

    set(key, value) {
      this._migrateLegacyKeys();
      const fullKey = key.startsWith(STORAGE_PREFIX) ? key : STORAGE_PREFIX + key;
      try {
        if (window.electronAPI && window.electronAPI.storage && typeof window.electronAPI.storage.set === 'function') {
          window.electronAPI.storage.set(fullKey, value);
        }
        localStorage.setItem(fullKey, JSON.stringify(value));
        APlus.bus.emit('storage:changed', { key: fullKey, value });
        return true;
      } catch (err) {
        console.error(`[APlus.storage] Failed to write key "${fullKey}":`, err);
        return false;
      }
    },

    remove(key) {
      const fullKey = key.startsWith(STORAGE_PREFIX) ? key : STORAGE_PREFIX + key;
      try {
        if (window.electronAPI && window.electronAPI.storage && typeof window.electronAPI.storage.remove === 'function') {
          window.electronAPI.storage.remove(fullKey);
        }
        localStorage.removeItem(fullKey);
        APlus.bus.emit('storage:removed', { key: fullKey });
        return true;
      } catch (err) {
        console.error(`[APlus.storage] Failed to remove key "${fullKey}":`, err);
        return false;
      }
    }
  };

  APlus.storage = StorageAdapter;

  /**
   * Utilities (single source of truth for shared helpers)
   */
  APlus.utils = {
    escapeHTML(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },

    shuffleArray(arr) {
      const copy = Array.isArray(arr) ? arr.slice() : [];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = copy[i];
        copy[i] = copy[j];
        copy[j] = t;
      }
      return copy;
    },

    clone(obj) {
      if (obj === null || typeof obj !== 'object') return obj;
      return JSON.parse(JSON.stringify(obj));
    },

    parseJSON(str, fallback) {
      if (str === null || str === undefined || str === '') {
        return arguments.length > 1 ? fallback : null;
      }
      try {
        return JSON.parse(str);
      } catch (_) {
        return arguments.length > 1 ? fallback : null;
      }
    },

    byId(id) {
      if (typeof document === 'undefined' || !id) return null;
      return document.getElementById(id);
    },

    todayKey(date) {
      const d = date instanceof Date ? date : new Date();
      return d.toISOString().slice(0, 10);
    },

    addDays(isoDay, days) {
      const d = new Date(String(isoDay) + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() + Number(days || 0));
      return d.toISOString().slice(0, 10);
    },

    formatSeconds(seconds) {
      const s = Math.max(0, Math.floor(seconds));
      const mins = Math.floor(s / 60);
      const secs = s % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    },

    calcScaledScore(rawCorrect, totalQuestions) {
      if (!totalQuestions || totalQuestions <= 0) return 100;
      return Math.round(100 + (800 * (rawCorrect / totalQuestions)));
    },

    clamp(val, min, max) {
      return Math.min(Math.max(val, min), max);
    },

    /**
     * Profile-scoped localStorage get/set used by ledger, SRS, readiness, study plan.
     * Prefers CompTIAProfiles when present; otherwise raw localStorage.
     */
    scopedGet(key) {
      if (window.CompTIAProfiles && typeof CompTIAProfiles.scopedGet === 'function') {
        return CompTIAProfiles.scopedGet(key);
      }
      try {
        return localStorage.getItem(key);
      } catch (_) {
        return null;
      }
    },

    scopedSet(key, value) {
      if (window.CompTIAProfiles && typeof CompTIAProfiles.scopedSet === 'function') {
        CompTIAProfiles.scopedSet(key, value);
        return true;
      }
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (_) {
        return false;
      }
    },

    scopedRemove(key) {
      if (window.CompTIAProfiles && typeof CompTIAProfiles.scopedRemove === 'function') {
        CompTIAProfiles.scopedRemove(key);
        return true;
      }
      try {
        localStorage.removeItem(key);
        return true;
      } catch (_) {
        return false;
      }
    }
  };

  // Expose global convenience aliases if not already defined
  window.escapeHTML = window.escapeHTML || APlus.utils.escapeHTML;
  window.shuffleArray = window.shuffleArray || function (arr) {
    return APlus.utils.shuffleArray(arr);
  };

})(typeof window !== 'undefined' ? window : this);
