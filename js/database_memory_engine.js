/**
 * CompTIA A+ Master Exam Simulator
 * Database & Memory Engine
 * File: js/database_memory_engine.js
 * 
 * Enterprise-grade persistent database & memory subsystem designed for senior IT/Datacenter standards.
 * Features:
 *  1. Self-contained multi-tier persistence (Electron File DB -> IndexedDB -> Synchronous Cache).
 *  2. Zero-touch auto-provisioning: When downloaded onto a new PC, automatically creates
 *     a dedicated user memory database, user profile, and ledger.
 *  3. Automatic two-way sync: Transparently mirrors and persists all state from profiles,
 *     exam history, missed drills, SRS memory raids, and APX ledger.
 *  4. Executive Black & Gold interactive Database Status & Backup Manager.
 */

(function (global) {
  'use strict';

  const DB_NAME = 'CompTIA_A_Plus_Database';
  const DB_VERSION = 1;
  const STORE_NAME = 'learner_memory_store';
  const SCHEMA_VERSION = '3.0.0';
  const LOCAL_STORAGE_DB_KEY = 'comptia_database_master_v3';

  let idbDatabase = null;
  let inMemoryCache = {};
  let isEngineReady = false;
  let saveDebounceTimer = null;
  let isSaving = false;

  /**
   * IndexedDB Native Wrapper
   */
  function openIndexedDB() {
    return new Promise((resolve) => {
      if (!global.indexedDB) {
        return resolve(null); // Fall back to localStorage + Electron
      }
      try {
        const req = global.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function (event) {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          }
        };
        req.onsuccess = function (event) {
          idbDatabase = event.target.result;
          resolve(idbDatabase);
        };
        req.onerror = function (err) {
          console.warn('[DatabaseEngine] IndexedDB open error, falling back to local cache:', err);
          resolve(null);
        };
      } catch (err) {
        console.warn('[DatabaseEngine] IndexedDB init exception:', err);
        resolve(null);
      }
    });
  }

  function idbGet(key) {
    return new Promise((resolve) => {
      if (!idbDatabase) return resolve(null);
      try {
        const tx = idbDatabase.transaction([STORE_NAME], 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ? req.result.value : null);
        req.onerror = () => resolve(null);
      } catch (_) {
        resolve(null);
      }
    });
  }

  function idbSet(key, value) {
    return new Promise((resolve) => {
      if (!idbDatabase) return resolve(false);
      try {
        const tx = idbDatabase.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({ key, value, updatedAt: Date.now() });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (_) {
        resolve(false);
      }
    });
  }

  /**
   * Generate initial user memory schema when running on a fresh PC
   */
  function createDefaultSchema() {
    const defaultProfileId = 'p_user_' + Date.now().toString(36);
    const nowIso = new Date().toISOString();

    const genesisLedger = {
      version: 1,
      name: 'Proof-of-Mastery Local Ledger',
      address: '0x' + Math.random().toString(16).slice(2, 10).padEnd(8, '0'),
      token: 'APX',
      balance: 100, // Welcome grant for new installations
      streakDays: 1,
      lastActiveDate: nowIso.split('T')[0],
      blocks: [
        {
          index: 0,
          timestamp: nowIso,
          type: 'GENESIS',
          data: {
            app: 'CompTIA A+ Master Exam Simulator',
            version: SCHEMA_VERSION,
            message: 'Local memory database initialized on this PC'
          },
          previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
          hash: 'genesis_hash_' + Date.now().toString(36)
        }
      ],
      achievements: []
    };

    const defaultProfilesMeta = {
      version: 1,
      activeProfileId: defaultProfileId,
      profiles: {
        [defaultProfileId]: {
          id: defaultProfileId,
          name: 'Learner 1',
          createdAt: nowIso,
          updatedAt: nowIso
        }
      }
    };

    const schema = {
      _meta: {
        schemaVersion: SCHEMA_VERSION,
        createdAt: nowIso,
        updatedAt: nowIso,
        machineProvisioned: true
      },
      comptia_profiles_meta_v1: JSON.stringify(defaultProfilesMeta),
      comptia_pom_ledger_v1: JSON.stringify(genesisLedger),
      comptia_a_plus_history: JSON.stringify([]),
      comptia_a_plus_missed: JSON.stringify([]),
      comptia_memory_srs_v1: JSON.stringify({ cards: {}, version: 1 }),
      comptia_theme: 'dark',
      comptia_tutor_mode: 'on'
    };

    // Scoped keys for the initial profile
    schema['comptia_p_' + defaultProfileId + '__comptia_a_plus_history'] = JSON.stringify([]);
    schema['comptia_p_' + defaultProfileId + '__comptia_a_plus_missed'] = JSON.stringify([]);
    schema['comptia_p_' + defaultProfileId + '__comptia_pom_ledger_v1'] = JSON.stringify(genesisLedger);

    return schema;
  }

  /**
   * Load entire database snapshot from multi-tier storage
   */
  async function loadDatabaseSnapshot() {
    let snapshot = null;

    // 1. Try Electron native file storage first (highest priority)
    if (global.electronAPI && global.electronAPI.database && typeof global.electronAPI.database.getAll === 'function') {
      try {
        const fileDb = global.electronAPI.database.getAll();
        if (fileDb && typeof fileDb === 'object' && Object.keys(fileDb).length > 0) {
          snapshot = fileDb;
        }
      } catch (err) {
        console.warn('[DatabaseEngine] Error reading Electron DB file:', err);
      }
    }

    // 2. Try IndexedDB if no Electron DB or running in browser
    if (!snapshot && idbDatabase) {
      try {
        const idbData = await idbGet('database_snapshot');
        if (idbData && typeof idbData === 'object' && Object.keys(idbData).length > 0) {
          snapshot = idbData;
        }
      } catch (err) {
        console.warn('[DatabaseEngine] Error reading IndexedDB snapshot:', err);
      }
    }

    // 3. Try LocalStorage master key
    if (!snapshot) {
      try {
        const rawLs = localStorage.getItem(LOCAL_STORAGE_DB_KEY);
        if (rawLs) {
          const parsed = JSON.parse(rawLs);
          if (parsed && typeof parsed === 'object') {
            snapshot = parsed;
          }
        }
      } catch (_) {}
    }

    // 4. Try scanning individual localStorage keys
    if (!snapshot) {
      const scanned = {};
      let foundAny = false;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('comptia_') || k.startsWith('aplus3_'))) {
          scanned[k] = localStorage.getItem(k);
          foundAny = true;
        }
      }
      if (foundAny) {
        snapshot = scanned;
      }
    }

    // 5. If this is a completely fresh download on a new PC, provision clean memory schema!
    if (!snapshot || Object.keys(snapshot).length === 0) {
      console.log('[DatabaseEngine] New PC detected: Provisioning pristine personal memory database...');
      snapshot = createDefaultSchema();
    }

    // 6. Repair snapshots written by v3.0.0, which nested the master blob inside itself
    //    on every flush (the file doubled each save). Unwrap, drop junk, keep newest values.
    snapshot = sanitizeSnapshot(snapshot);

    inMemoryCache = snapshot;

    // Hydrate synchronous localStorage so all legacy components read instantly
    Object.keys(inMemoryCache).forEach((k) => {
      try {
        if (isPersistableKey(k)) {
          localStorage.setItem(k, inMemoryCache[k]);
        }
      } catch (_) {}
    });

    // Remove the oversized legacy blob from localStorage; it is rewritten small on flush.
    // Also drop stray keys named after storage methods that an earlier interceptor leaked.
    try {
      localStorage.removeItem(LOCAL_STORAGE_DB_KEY);
      ['setItem', 'removeItem', 'getItem'].forEach((junk) => {
        if (localStorage.getItem(junk) !== null) localStorage.removeItem(junk);
      });
    } catch (_) {}

    isEngineReady = true;
    scheduleFlush();
    return snapshot;
  }

  /**
   * A key belongs in the snapshot only if it is learner state. The master key itself,
   * function names leaked by the interceptor, and other engines' caches are excluded.
   */
  function isPersistableKey(k) {
    if (typeof k !== 'string') return false;
    if (k === LOCAL_STORAGE_DB_KEY || k.startsWith('comptia_database_master')) return false;
    if (k.startsWith('_meta')) return false;
    if (k === 'setItem' || k === 'removeItem' || k === 'getItem') return false;
    return k.startsWith('comptia_') || k.startsWith('aplus3_');
  }

  /**
   * Unwrap self-nested snapshots and strip non-learner keys.
   * Outer values are newer than nested copies, so nested values only fill gaps.
   */
  function sanitizeSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return createDefaultSchema();
    const out = {};
    let levels = 0;
    let cursor = snapshot;
    const seen = new Set();

    while (cursor && typeof cursor === 'object' && levels < 64) {
      Object.keys(cursor).forEach((k) => {
        if (k === '_meta') {
          if (!out._meta && cursor._meta && typeof cursor._meta === 'object') out._meta = cursor._meta;
          return;
        }
        if (!isPersistableKey(k)) return;
        if (!Object.prototype.hasOwnProperty.call(out, k)) {
          out[k] = typeof cursor[k] === 'string' ? cursor[k] : JSON.stringify(cursor[k]);
        }
      });

      const nested = cursor[LOCAL_STORAGE_DB_KEY];
      if (nested === undefined || nested === null) break;
      let parsed = nested;
      if (typeof nested === 'string') {
        try { parsed = JSON.parse(nested); } catch (_) { break; }
      }
      if (!parsed || typeof parsed !== 'object' || seen.has(parsed)) break;
      seen.add(parsed);
      cursor = parsed;
      levels++;
    }

    if (!out._meta) {
      out._meta = { schemaVersion: SCHEMA_VERSION, createdAt: new Date().toISOString(), machineProvisioned: true };
    }
    out._meta.schemaVersion = SCHEMA_VERSION;
    out._meta.updatedAt = new Date().toISOString();
    if (levels > 0) {
      out._meta.repairedNestedLevels = levels;
      out._meta.repairedAt = new Date().toISOString();
      console.warn('[DatabaseEngine] Repaired self-nested snapshot: unwrapped ' + levels + ' level(s).');
    }
    return out;
  }

  function snapshotByteLength(obj) {
    try { return JSON.stringify(obj).length; } catch (_) { return 0; }
  }

  /**
   * Debounced background persistence flush to all storage layers
   */
  function scheduleFlush() {
    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(async () => {
      if (isSaving) return;
      isSaving = true;
      try {
        if (inMemoryCache._meta) {
          inMemoryCache._meta.updatedAt = new Date().toISOString();
        }

        // Defensive: never let the master key or junk keys re-enter the snapshot.
        Object.keys(inMemoryCache).forEach((k) => {
          if (k !== '_meta' && !isPersistableKey(k)) delete inMemoryCache[k];
        });

        const serialized = JSON.stringify(inMemoryCache);
        const MAX_LOCALSTORAGE_MIRROR = 2 * 1024 * 1024; // 2 MB; larger snapshots live in IndexedDB + file only

        // 1. Persist master snapshot to LocalStorage (mirror only while small)
        try {
          if (serialized.length <= MAX_LOCALSTORAGE_MIRROR) {
            localStorage.setItem(LOCAL_STORAGE_DB_KEY, serialized);
          } else {
            localStorage.removeItem(LOCAL_STORAGE_DB_KEY);
          }
        } catch (_) {}

        // 2. Persist to IndexedDB
        if (idbDatabase) {
          await idbSet('database_snapshot', inMemoryCache);
        }

        // 3. Persist to Electron local file (async IPC preferred; sync only as legacy fallback)
        const dbApi = global.electronAPI && global.electronAPI.database;
        if (dbApi && typeof dbApi.saveAllAsync === 'function') {
          const res = await dbApi.saveAllAsync(inMemoryCache);
          if (res && res.ok === false) console.warn('[DatabaseEngine] File save rejected:', res.error);
        } else if (dbApi && typeof dbApi.saveAll === 'function') {
          dbApi.saveAll(inMemoryCache);
        }

        updateDatabaseStatusUi();
      } catch (err) {
        console.error('[DatabaseEngine] Error persisting database snapshot:', err);
      } finally {
        isSaving = false;
      }
    }, 300);
  }

  /**
   * Intercept localStorage writes so memory is continuously captured
   */
  function attachStorageInterceptors() {
    const originalSetItem = localStorage.setItem.bind(localStorage);
    const originalRemoveItem = localStorage.removeItem.bind(localStorage);

    localStorage.setItem = function (key, value) {
      originalSetItem(key, value);
      // The master key itself must never be captured, or the snapshot nests inside itself.
      if (isPersistableKey(key)) {
        inMemoryCache[key] = String(value);
        scheduleFlush();
      }
    };

    localStorage.removeItem = function (key) {
      originalRemoveItem(key);
      if (typeof key === 'string' && inMemoryCache[key] !== undefined) {
        delete inMemoryCache[key];
        scheduleFlush();
      }
    };

    // Also sync from storage events across windows
    global.addEventListener('storage', (event) => {
      if (event.key && (event.key.startsWith('comptia_') || event.key.startsWith('aplus3_'))) {
        if (event.newValue === null) {
          delete inMemoryCache[event.key];
        } else {
          inMemoryCache[event.key] = event.newValue;
        }
        scheduleFlush();
      }
    });
  }

  /**
   * Database UI Status & Management
   */
  function getStats() {
    let historyCount = 0;
    let missedCount = 0;
    let ledgerBlocks = 0;
    let srsCards = 0;
    let profileCount = 1;

    try {
      const hRaw = inMemoryCache['comptia_a_plus_history'] || localStorage.getItem('comptia_a_plus_history');
      if (hRaw) historyCount = JSON.parse(hRaw).length || 0;
    } catch (_) {}

    try {
      const mRaw = inMemoryCache['comptia_a_plus_missed'] || localStorage.getItem('comptia_a_plus_missed');
      if (mRaw) missedCount = JSON.parse(mRaw).length || 0;
    } catch (_) {}

    try {
      const lRaw = inMemoryCache['comptia_pom_ledger_v1'] || localStorage.getItem('comptia_pom_ledger_v1');
      if (lRaw) ledgerBlocks = (JSON.parse(lRaw).blocks || []).length || 0;
    } catch (_) {}

    try {
      const sRaw = inMemoryCache['comptia_memory_srs_v1'] || localStorage.getItem('comptia_memory_srs_v1');
      if (sRaw) srsCards = Object.keys(JSON.parse(sRaw).cards || {}).length || 0;
    } catch (_) {}

    try {
      const pRaw = inMemoryCache['comptia_profiles_meta_v1'] || localStorage.getItem('comptia_profiles_meta_v1');
      if (pRaw) profileCount = Object.keys(JSON.parse(pRaw).profiles || {}).length || 1;
    } catch (_) {}

    const rawSize = JSON.stringify(inMemoryCache).length;
    const sizeKb = (rawSize / 1024).toFixed(1);

    const storageType = (global.electronAPI && global.electronAPI.isDesktopApp)
      ? 'Desktop Local File DB (.json)'
      : (idbDatabase ? 'Offline IndexedDB Engine' : 'Browser Persistent Cache');

    return {
      historyCount,
      missedCount,
      ledgerBlocks,
      srsCards,
      profileCount,
      sizeKb,
      storageType,
      updatedAt: inMemoryCache._meta ? inMemoryCache._meta.updatedAt : new Date().toISOString()
    };
  }

  function updateDatabaseStatusUi() {
    const badge = document.getElementById('dbMemoryStatusBadge');
    if (badge) {
      badge.innerHTML = '<span style="color: #10B981;">●</span> Memory Active';
    }
  }

  function exportDatabaseJson() {
    const payload = JSON.stringify(inMemoryCache, null, 2);
    const filename = 'comptia_database_backup_' + new Date().toISOString().slice(0, 10) + '.json';

    if (global.electronAPI && global.electronAPI.storage && typeof global.electronAPI.storage.exportFile === 'function') {
      global.electronAPI.storage.exportFile(filename, payload).then((res) => {
        if (res && res.ok) {
          alert('Database successfully backed up to:\n' + res.path);
        }
      });
      return;
    }

    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importDatabaseJson() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = function (e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (evt) {
        try {
          const parsed = JSON.parse(evt.target.result);
          if (!parsed || typeof parsed !== 'object') {
            throw new Error('Invalid database format');
          }
          if (confirm('Importing this database will merge and update all history, SRS cards, and ledger records on this PC. Continue?')) {
            inMemoryCache = Object.assign({}, inMemoryCache, parsed);
            Object.keys(inMemoryCache).forEach((k) => {
              try {
                if (isPersistableKey(k)) localStorage.setItem(k, inMemoryCache[k]);
              } catch (_) {}
            });
            scheduleFlush();
            alert('Database restored successfully! Reloading...');
            global.location.reload();
          }
        } catch (err) {
          alert('Failed to import database: ' + (err.message || 'Invalid JSON file'));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function resetDatabaseFactory() {
    if (confirm('CAUTION: Are you sure you want to reset your local database? All exam history and APX ledger blocks on this PC will be returned to initial state.')) {
      if (confirm('Final confirmation: Reset all memory to clean state?')) {
        inMemoryCache = createDefaultSchema();
        localStorage.clear();
        Object.keys(inMemoryCache).forEach((k) => {
          try {
            if (isPersistableKey(k)) localStorage.setItem(k, inMemoryCache[k]);
          } catch (_) {}
        });
        scheduleFlush();
        alert('Database has been reset to initial clean state. Reloading...');
        global.location.reload();
      }
    }
  }

  function openDatabaseModal() {
    let modal = document.getElementById('databaseModal');
    if (!modal) {
      createDatabaseModal();
      modal = document.getElementById('databaseModal');
    }
    renderDatabaseModalDetails();
    modal.classList.add('active');
  }

  function closeDatabaseModal() {
    const modal = document.getElementById('databaseModal');
    if (modal) modal.classList.remove('active');
  }

  function renderDatabaseModalDetails() {
    const s = getStats();
    const detailsContainer = document.getElementById('dbModalDetails');
    if (!detailsContainer) return;

    detailsContainer.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.75rem; margin-bottom: 1.25rem;">
        <div class="stat-box" style="padding: 0.75rem;">
          <div class="stat-label">Database Status</div>
          <div style="color: #10B981; font-weight: 700; font-size: 1.05rem; margin-top: 0.25rem;">● Synchronized</div>
        </div>
        <div class="stat-box" style="padding: 0.75rem;">
          <div class="stat-label">Storage Engine</div>
          <div style="color: #D4AF37; font-weight: 700; font-size: 0.95rem; margin-top: 0.25rem;">${s.storageType}</div>
        </div>
        <div class="stat-box" style="padding: 0.75rem;">
          <div class="stat-label">Exam Attempts</div>
          <div class="stat-val" style="font-size: 1.25rem;">${s.historyCount}</div>
        </div>
        <div class="stat-box" style="padding: 0.75rem;">
          <div class="stat-label">Weak / Missed Qs</div>
          <div class="stat-val" style="font-size: 1.25rem;">${s.missedCount}</div>
        </div>
        <div class="stat-box" style="padding: 0.75rem;">
          <div class="stat-label">SRS Memory Cards</div>
          <div class="stat-val" style="font-size: 1.25rem;">${s.srsCards}</div>
        </div>
        <div class="stat-box" style="padding: 0.75rem;">
          <div class="stat-label">APX Ledger Blocks</div>
          <div class="stat-val" style="font-size: 1.25rem;">${s.ledgerBlocks}</div>
        </div>
      </div>
      <div style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1.25rem; background: var(--bg-card); padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
        <div><strong>Self-Contained PC Memory:</strong> This application automatically maintains its own isolated database file and IndexedDB storage on your PC. No third-party servers or telemetry required.</div>
        <div style="margin-top: 0.4rem;"><strong>Last Synced:</strong> ${new Date(s.updatedAt).toLocaleString()} · <strong>Payload Size:</strong> ${s.sizeKb} KB</div>
      </div>
    `;
  }

  function createDatabaseModal() {
    const div = document.createElement('div');
    div.id = 'databaseModal';
    div.className = 'modal-overlay';
    div.setAttribute('role', 'dialog');
    div.setAttribute('aria-modal', 'true');
    div.innerHTML = `
      <div class="modal-card" style="max-width: 680px;">
        <div class="modal-header">
          <div>
            <h3 style="font-size: 1.25rem; color: var(--gold-light);">
              PC memory database
            </h3>
            <p style="color: var(--text-secondary); font-size: 0.82rem; margin-top: 0.2rem;">
              Private store for exam history, ledger, and spaced-repetition decks on this machine.
            </p>
          </div>
          <button type="button" class="modal-close-btn" onclick="CompTIADatabase.closeModal()">&times;</button>
        </div>

        <div id="dbModalDetails"></div>

        <div style="display: flex; gap: 0.6rem; flex-wrap: wrap; margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
          <button type="button" class="btn" onclick="CompTIADatabase.exportBackup()">Export backup</button>
          <button type="button" class="btn btn-secondary" onclick="CompTIADatabase.importBackup()">Restore backup</button>
          <button type="button" class="btn btn-secondary" onclick="CompTIADatabase.flushSync()">Sync now</button>
          <button type="button" class="btn btn-red" style="margin-left: auto;" onclick="CompTIADatabase.factoryReset()">Reset database</button>
        </div>
      </div>
    `;
    document.body.appendChild(div);
  }

  // Public Database API
  global.CompTIADatabase = {
    init: async function () {
      await openIndexedDB();
      attachStorageInterceptors();
      await loadDatabaseSnapshot();
      updateDatabaseStatusUi();
      console.log('[DatabaseEngine] Initialized successfully. Personal memory active.');
    },
    get: function (key, fallback = null) {
      if (inMemoryCache && Object.prototype.hasOwnProperty.call(inMemoryCache, key)) {
        return inMemoryCache[key];
      }
      const raw = localStorage.getItem(key);
      return raw !== null ? raw : fallback;
    },
    set: function (key, value) {
      const valStr = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, valStr);
      inMemoryCache[key] = valStr;
      scheduleFlush();
      return true;
    },
    remove: function (key) {
      localStorage.removeItem(key);
      delete inMemoryCache[key];
      scheduleFlush();
      return true;
    },
    getAll: function () {
      return Object.assign({}, inMemoryCache);
    },
    getStats: getStats,
    openModal: openDatabaseModal,
    closeModal: closeDatabaseModal,
    exportBackup: exportDatabaseJson,
    importBackup: importDatabaseJson,
    factoryReset: resetDatabaseFactory,
    flushSync: function () {
      scheduleFlush();
      renderDatabaseModalDetails();
    }
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => global.CompTIADatabase.init());
  } else {
    global.CompTIADatabase.init();
  }

})(typeof window !== 'undefined' ? window : this);
