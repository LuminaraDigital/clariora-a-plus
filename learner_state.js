/**
 * Full learner-state backup / restore + optional cloud-folder sync blob.
 *
 * ONE JSON file can hold exam history, missed questions, ledger, theme,
 * objectives, study plan, readiness cache, and active profile (all profiles).
 *
 * Cloud sync is intentionally manual: Save/Load a file the user can place
 * in OneDrive / Dropbox. No unpaid SaaS backend.
 */
(function (global) {
  const SCHEMA_VERSION = 1;
  const SYNC_FILENAME = "comptia_a_plus_sync.json";
  const BACKUP_FILENAME_PREFIX = "comptia_a_plus_full_backup_";

  /* ================================================================== *
   * CANONICAL EXAM HISTORY READER
   * ================================================================== *
   * APlus.learner.getHistory() is the single history reader for the whole
   * app. Nothing else may parse localStorage history directly.
   *
   * Source order (first source that yields at least one record wins):
   *   1. the active profile's scoped key
   *      comptia_p_<profileId>__comptia_a_plus_history
   *   2. the legacy unscoped key  comptia_a_plus_history
   *   3. the namespaced mirror    aplus3_history  (APlus.storage)
   *
   * Every record is normalised to:
   *   { examType: 'core1'|'core2'|'both', scaledScore: number,
   *     passed: boolean, timestamp: ms|null, rawCorrect, totalQuestions,
   *     passingScore, domainStats, date, perQuestion? }
   * sorted newest first and deduped on timestamp + scaledScore.
   * ================================================================== */

  const HISTORY_BASE_KEY = "comptia_a_plus_history";
  const HISTORY_MIRROR_KEY = "aplus3_history";

  let historySourceLogged = false;

  function ls() {
    try {
      return global.localStorage || null;
    } catch (_) {
      return null;
    }
  }

  function asArray(raw) {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        return [];
      }
    }
    return [];
  }

  /** 'CORE1' / '220-1201' / 'c2' / 'mixed' -> 'core1' | 'core2' | 'both'. */
  function normExamType(value) {
    const t = String(value === null || value === undefined ? "" : value).toLowerCase();
    if (t.indexOf("core2") >= 0 || t.indexOf("1202") >= 0 || t.indexOf("1102") >= 0 || t === "c2") return "core2";
    if (t.indexOf("core1") >= 0 || t.indexOf("1201") >= 0 || t.indexOf("1101") >= 0 || t === "c1") return "core1";
    return "both";
  }

  function toMs(value) {
    if (typeof value === "number" && isFinite(value)) return value;
    if (typeof value === "string" && value) {
      const parsed = Date.parse(value);
      if (!isNaN(parsed)) return parsed;
    }
    return null;
  }

  function normalizeRecord(record) {
    if (!record || typeof record !== "object") return null;
    const score = Number(record.scaledScore);
    if (!isFinite(score)) return null;

    let timestamp = toMs(record.timestamp);
    if (timestamp === null) timestamp = toMs(record.ts);
    if (timestamp === null) timestamp = toMs(record.date);

    const passingScore = Number(record.passingScore);
    let passed;
    if (typeof record.passed === "boolean") {
      passed = record.passed;
    } else if (record.status !== undefined && record.status !== null) {
      passed = String(record.status).toUpperCase() === "PASSED";
    } else {
      passed = isFinite(passingScore) ? score >= passingScore : false;
    }

    let rawCorrect = Number(record.rawCorrect);
    let totalQuestions = Number(record.totalQuestions);
    if ((!isFinite(rawCorrect) || !isFinite(totalQuestions)) && typeof record.raw === "string") {
      const m = record.raw.match(/(\d+)\s*\/\s*(\d+)/);
      if (m) {
        rawCorrect = Number(m[1]);
        totalQuestions = Number(m[2]);
      }
    }

    const out = {
      examType: normExamType(record.examType || record.exam || record.type),
      scaledScore: score,
      passed: Boolean(passed),
      timestamp: timestamp,
      rawCorrect: isFinite(rawCorrect) ? rawCorrect : null,
      totalQuestions: isFinite(totalQuestions) ? totalQuestions : null,
      passingScore: isFinite(passingScore) ? passingScore : null,
      domainStats: record.domainStats && typeof record.domainStats === "object" ? record.domainStats : null,
      date: record.date || null
    };
    if (Array.isArray(record.perQuestion)) out.perQuestion = record.perQuestion;
    return out;
  }

  /**
   * normalizeHistoryRecords(raw) -> normalised records, newest first, deduped.
   * Stored history is written newest first, so the stored index is used as the
   * tie break whenever timestamps are missing or equal.
   */
  function normalizeHistoryRecords(raw) {
    const list = asArray(raw);
    const rows = [];
    for (let i = 0; i < list.length; i++) {
      const rec = normalizeRecord(list[i]);
      if (rec) rows.push({ rec: rec, idx: i });
    }

    rows.sort(function (a, b) {
      const at = a.rec.timestamp;
      const bt = b.rec.timestamp;
      if (at !== null && bt !== null && at !== bt) return bt - at;
      if (at !== null && bt === null) return -1;
      if (at === null && bt !== null) return 1;
      return a.idx - b.idx;
    });

    const seen = Object.create(null);
    const out = [];
    rows.forEach(function (row) {
      const key = String(row.rec.timestamp) + "|" + String(row.rec.scaledScore);
      if (seen[key]) return;
      seen[key] = true;
      out.push(row.rec);
    });
    return out;
  }

  function readScopedHistoryRaw() {
    try {
      if (global.CompTIAProfiles && typeof global.CompTIAProfiles.scopedGet === "function") {
        return global.CompTIAProfiles.scopedGet(HISTORY_BASE_KEY);
      }
    } catch (_) {}
    return null;
  }

  function readLegacyHistoryRaw() {
    const store = ls();
    if (!store) return null;
    try {
      return store.getItem(HISTORY_BASE_KEY);
    } catch (_) {
      return null;
    }
  }

  function readMirrorHistoryRaw() {
    try {
      const APlus = global.APlus;
      if (APlus && APlus.storage && typeof APlus.storage.get === "function") {
        return APlus.storage.get("history", []);
      }
    } catch (_) {}
    const store = ls();
    if (!store) return null;
    try {
      return store.getItem(HISTORY_MIRROR_KEY);
    } catch (_) {
      return null;
    }
  }

  /**
   * getHistory() -> normalised attempt records, newest first.
   * The only supported way to read exam history anywhere in the app.
   *
   * The first source that yields records is the primary one, in the documented
   * order. Records the later sources hold that the primary does not are then
   * folded in and deduped, because js/engine.js writes each finished exam to
   * the aplus3_history mirror only: without the union, a learner carrying an
   * older profile-scoped history would never see a new attempt appear.
   */
  function getHistory() {
    const sources = [
      { name: "profile-scoped", read: readScopedHistoryRaw },
      { name: "legacy-unscoped", read: readLegacyHistoryRaw },
      { name: "aplus3-mirror", read: readMirrorHistoryRaw }
    ];

    let primaryName = "empty";
    let merged = [];
    let mergedIn = 0;

    sources.forEach(function (source) {
      let rows = [];
      try {
        rows = normalizeHistoryRecords(source.read());
      } catch (_) {
        rows = [];
      }
      if (!rows.length) return;
      if (primaryName === "empty") {
        primaryName = source.name;
        merged = rows;
        return;
      }
      const before = merged.length;
      merged = normalizeHistoryRecords(merged.concat(rows));
      mergedIn += merged.length - before;
    });

    if (!historySourceLogged) {
      historySourceLogged = true;
      try {
        if (typeof console !== "undefined" && console && typeof console.debug === "function") {
          console.debug(
            "[learner] history source: " + primaryName + " (" + merged.length + " records" +
            (mergedIn ? ", " + mergedIn + " folded in from other sources" : "") + ")"
          );
        }
      } catch (_) {}
    }

    return merged;
  }

  /** Test and profile-switch helper: makes the next getHistory() log again. */
  function resetHistorySourceLog() {
    historySourceLogged = false;
  }

  function themeGet() {
    return localStorage.getItem("comptia_theme") || "dark";
  }

  function themeSet(theme) {
    localStorage.setItem("comptia_theme", theme === "light" ? "light" : "dark");
  }

  function tutorGet() {
    return localStorage.getItem("comptia_tutor_mode") === "off" ? "off" : "on";
  }

  function tutorSet(mode) {
    localStorage.setItem("comptia_tutor_mode", mode === "off" || mode === false ? "off" : "on");
    if (global.TutorMode && typeof TutorMode.syncToggleUi === "function") {
      TutorMode.syncToggleUi();
    }
  }

  function safeJsonParse(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  /** Legacy flat pack (history + missed + ledger + theme + tutor) when profiles API is absent. */
  function buildLegacyFlatBackup() {
    const historyKey = "comptia_a_plus_history";
    const missedKey = "comptia_a_plus_missed";
    const ledgerKey = "comptia_pom_ledger_v1";
    let history = safeJsonParse(localStorage.getItem(historyKey), []);
    let missed = safeJsonParse(localStorage.getItem(missedKey), []);
    let ledger = safeJsonParse(localStorage.getItem(ledgerKey), null);
    if (global.CompTIAProfiles) {
      CompTIAProfiles.ensureInitialized();
      history = CompTIAProfiles.scopedGet(historyKey);
      if (!Array.isArray(history)) history = safeJsonParse(history, []);
      missed = CompTIAProfiles.scopedGet(missedKey);
      if (!Array.isArray(missed)) missed = safeJsonParse(missed, []);
      ledger = CompTIAProfiles.scopedGet(ledgerKey);
      if (typeof ledger === "string") ledger = safeJsonParse(ledger, null);
    }
    return {
      version: 1,
      schemaVersion: SCHEMA_VERSION,
      kind: "comptia_a_plus_legacy_flat",
      exportedAt: new Date().toISOString(),
      app: "CompTIA_A_Plus_Exam_Simulator",
      history: history || [],
      missed: missed || [],
      ledger: ledger,
      theme: themeGet(),
      tutorMode: tutorGet()
    };
  }

  function applyLegacyFlatBackup(obj) {
    if (!obj || typeof obj !== "object") return { ok: false, error: "Invalid flat backup" };
    const history = obj.history || [];
    const missed = obj.missed || [];
    const theme = obj.theme || "dark";
    themeSet(theme);
    if (obj.tutorMode !== undefined) tutorSet(obj.tutorMode);
    if (global.CompTIAProfiles) {
      CompTIAProfiles.ensureInitialized();
      CompTIAProfiles.scopedSet("comptia_a_plus_history", JSON.stringify(history));
      CompTIAProfiles.scopedSet("comptia_a_plus_missed", JSON.stringify(missed));
      if (obj.ledger != null) CompTIAProfiles.scopedSet("comptia_pom_ledger_v1", JSON.stringify(obj.ledger));
    } else {
      localStorage.setItem("comptia_a_plus_history", JSON.stringify(history));
      localStorage.setItem("comptia_a_plus_missed", JSON.stringify(missed));
      if (obj.ledger != null) localStorage.setItem("comptia_pom_ledger_v1", JSON.stringify(obj.ledger));
    }
    return { ok: true, kind: "legacy_flat" };
  }

  function refreshUiAfterImport() {
    try {
      if (typeof global.initTheme === "function") global.initTheme();
      else {
        document.documentElement.setAttribute("data-theme", themeGet());
        if (typeof global.updateThemeBtn === "function") global.updateThemeBtn(themeGet());
      }
      if (typeof global.updateMissedCountDisplay === "function") global.updateMissedCountDisplay();
      if (typeof global.renderHistoryTable === "function") global.renderHistoryTable();
      if (global.CompTIALedgerUI && typeof CompTIALedgerUI.init === "function") CompTIALedgerUI.init();
      if (global.TutorMode && typeof TutorMode.syncToggleUi === "function") TutorMode.syncToggleUi();
      if (global.CompTIAProductTrust && typeof CompTIAProductTrust.refresh === "function") {
        CompTIAProductTrust.refresh();
      }
    } catch (_) {}
  }

  function buildBackupObject() {
    if (!global.CompTIAProfiles) {
      return buildLegacyFlatBackup();
    }
    CompTIAProfiles.ensureInitialized();
    const { meta, data } = CompTIAProfiles.exportAllProfileData();
    let ledgerFingerprint = null;
    try {
      const activeLedger = data[meta.activeProfileId] && data[meta.activeProfileId][CompTIAProfiles.DATA_KEYS.ledger];
      if (activeLedger && activeLedger.publicKeyFingerprint) {
        ledgerFingerprint = activeLedger.publicKeyFingerprint;
      }
    } catch (_) {}

    return {
      schemaVersion: SCHEMA_VERSION,
      kind: "comptia_a_plus_full_backup",
      exportedAt: new Date().toISOString(),
      theme: themeGet(),
      tutorMode: tutorGet(),
      activeProfileId: meta.activeProfileId,
      profilesMeta: meta,
      profilesData: data,
      ledgerPublicKeyFingerprint: ledgerFingerprint,
      note: "Full local learner backup. Import replaces profile data on this device."
    };
  }

  function validateBackup(obj) {
    if (!obj || typeof obj !== "object") return { ok: false, error: "Not a JSON object" };
    if (obj.schemaVersion == null) return { ok: false, error: "Missing schemaVersion" };
    if (Number(obj.schemaVersion) !== SCHEMA_VERSION) {
      return {
        ok: false,
        error: "Unsupported schemaVersion " + obj.schemaVersion + " (expected " + SCHEMA_VERSION + ")"
      };
    }
    if (!obj.profilesMeta || !obj.profilesData) {
      return { ok: false, error: "Missing profilesMeta or profilesData" };
    }
    if (!obj.profilesMeta.profiles || !obj.profilesMeta.activeProfileId) {
      return { ok: false, error: "Invalid profilesMeta" };
    }
    return { ok: true };
  }

  function applyBackup(obj) {
    // Accept legacy flat JSON (history/missed/ledger/theme) from older exporters
    if (
      obj &&
      (obj.kind === "comptia_a_plus_legacy_flat" ||
        (obj.history && !obj.profilesMeta) ||
        (obj.version && obj.missed && !obj.profilesMeta))
    ) {
      const flat = applyLegacyFlatBackup(obj);
      if (flat.ok) refreshUiAfterImport();
      return flat;
    }
    const v = validateBackup(obj);
    if (!v.ok) return v;
    if (!global.CompTIAProfiles) {
      return { ok: false, error: "profiles.js required for full backup import" };
    }
    if (obj.theme) themeSet(obj.theme);
    if (obj.tutorMode !== undefined) tutorSet(obj.tutorMode);
    const imported = CompTIAProfiles.importAllProfileData({
      meta: obj.profilesMeta,
      data: obj.profilesData
    });
    if (!imported.ok) return imported;
    if (global.CompTIALedger && CompTIALedger.clearKeyCache) {
      CompTIALedger.clearKeyCache();
    }
    refreshUiAfterImport();
    return { ok: true, activeProfileId: imported.activeProfileId };
  }

  function downloadJson(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function readFileAsJson(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(JSON.parse(String(reader.result || "")));
        } catch (e) {
          reject(new Error("Invalid JSON file"));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  }

  async function exportFullBackup() {
    const obj = buildBackupObject();
    const name = BACKUP_FILENAME_PREFIX + new Date().toISOString().slice(0, 10) + ".json";
    downloadJson(name, obj);
    return { ok: true, filename: name, schemaVersion: SCHEMA_VERSION };
  }

  function pickFile(accept) {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept || "application/json,.json";
      input.onchange = () => {
        const file = input.files && input.files[0];
        resolve(file || null);
      };
      input.click();
    });
  }

  async function importFullBackupFromPicker() {
    const file = await pickFile(".json,application/json");
    if (!file) return { ok: false, error: "Cancelled", cancelled: true };
    const obj = await readFileAsJson(file);
    const result = applyBackup(obj);
    if (!result.ok) return result;
    return { ok: true, filename: file.name, activeProfileId: result.activeProfileId };
  }

  function buildSyncObject() {
    const backup = buildBackupObject();
    return {
      ...backup,
      kind: "comptia_a_plus_sync",
      syncFilename: SYNC_FILENAME
    };
  }

  async function saveSyncFile() {
    const obj = buildSyncObject();
    const json = JSON.stringify(obj, null, 2);

    if (typeof window.showSaveFilePicker === "function") {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: SYNC_FILENAME,
          types: [
            {
              description: "CompTIA A+ Sync JSON",
              accept: { "application/json": [".json"] }
            }
          ]
        });
        const writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
        return { ok: true, method: "file_system_access", filename: SYNC_FILENAME };
      } catch (e) {
        if (e && e.name === "AbortError") return { ok: false, cancelled: true, error: "Cancelled" };
        // fall through to download
      }
    }

    downloadJson(SYNC_FILENAME, obj);
    return {
      ok: true,
      method: "download",
      filename: SYNC_FILENAME,
      hint: "Move this file into your OneDrive or Dropbox folder, then use Load Sync File on another device."
    };
  }

  async function loadSyncFile() {
    if (typeof window.showOpenFilePicker === "function") {
      try {
        const handles = await window.showOpenFilePicker({
          multiple: false,
          types: [
            {
              description: "CompTIA A+ Sync JSON",
              accept: { "application/json": [".json"] }
            }
          ]
        });
        const file = await handles[0].getFile();
        const text = await file.text();
        const obj = JSON.parse(text);
        const result = applyBackup(obj);
        if (!result.ok) return result;
        return { ok: true, method: "file_system_access", filename: file.name };
      } catch (e) {
        if (e && e.name === "AbortError") return { ok: false, cancelled: true, error: "Cancelled" };
        // fall through
      }
    }

    const file = await pickFile(".json,application/json");
    if (!file) return { ok: false, cancelled: true, error: "Cancelled" };
    const obj = await readFileAsJson(file);
    const result = applyBackup(obj);
    if (!result.ok) return result;
    return { ok: true, method: "upload", filename: file.name };
  }

  global.CompTIALearnerState = {
    SCHEMA_VERSION,
    SYNC_FILENAME,
    buildBackupObject,
    buildLegacyFlatBackup,
    validateBackup,
    applyBackup,
    exportFullBackup,
    importFullBackupFromPicker,
    saveSyncFile,
    loadSyncFile,
    themeGet,
    themeSet,
    tutorGet,
    tutorSet
  };

  /** Button-friendly aliases used by the start screen / ledger modal. */
  async function exportLearnerState() {
    try {
      const result = await exportFullBackup();
      if (global.ExamA11y) ExamA11y.announce("Learner state exported");
      return result;
    } catch (err) {
      // Absolute fallback: flat JSON without profiles
      const flat = buildLegacyFlatBackup();
      downloadJson("comptia_a_plus_learner_state_" + new Date().toISOString().slice(0, 10) + ".json", flat);
      return { ok: true, kind: "legacy_flat" };
    }
  }

  async function promptImportLearnerState() {
    try {
      const result = await importFullBackupFromPicker();
      if (result.cancelled) return result;
      if (!result.ok) {
        alert("Import failed: " + (result.error || "Unknown error"));
        return result;
      }
      alert("Learner state imported successfully.");
      if (global.ExamA11y) ExamA11y.announce("Learner state imported");
      return result;
    } catch (err) {
      alert("Import failed: " + (err && err.message ? err.message : String(err)));
      return { ok: false, error: String(err) };
    }
  }

  global.exportLearnerState = exportLearnerState;
  global.promptImportLearnerState = promptImportLearnerState;
  global.LearnerState = global.CompTIALearnerState;

  /* Canonical history reader, published on the APlus namespace. This file
     loads before js/core.js, so the namespace is created here if needed. */
  global.APlus = global.APlus || {};
  global.APlus.learner = global.APlus.learner || {};
  global.APlus.learner.HISTORY_BASE_KEY = HISTORY_BASE_KEY;
  global.APlus.learner.HISTORY_MIRROR_KEY = HISTORY_MIRROR_KEY;
  global.APlus.learner.getHistory = getHistory;
  global.APlus.learner.normalizeHistoryRecords = normalizeHistoryRecords;
  global.APlus.learner.normExamType = normExamType;
  global.APlus.learner.resetHistorySourceLog = resetHistorySourceLog;

  global.CompTIALearnerState.getHistory = getHistory;
  global.CompTIALearnerState.normalizeHistoryRecords = normalizeHistoryRecords;

  if (typeof module === "object" && module && module.exports) {
    module.exports = {
      getHistory: getHistory,
      normalizeHistoryRecords: normalizeHistoryRecords,
      normExamType: normExamType,
      resetHistorySourceLog: resetHistorySourceLog,
      CompTIALearnerState: global.CompTIALearnerState
    };
  }
})(
  typeof window !== "undefined" && window
    ? window
    : typeof globalThis !== "undefined"
      ? globalThis
      : this
);
