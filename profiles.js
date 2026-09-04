/**
 * Local multi-profile accounts for CompTIA A+ simulator.
 * Isolates history / missed / ledger / objectives / plan / readiness per profile.
 * Not a cloud identity system. All data stays in localStorage on this device.
 */
(function (global) {
  const META_KEY = "comptia_profiles_meta_v1";
  const LEGACY_KEYS = [
    "comptia_a_plus_history",
    "comptia_a_plus_missed",
    "comptia_pom_ledger_v1",
    "comptia_objectives_v1",
    "comptia_study_plan_v1",
    "comptia_readiness_cache_v1",
    "comptia_memory_srs_v1",
    "comptia_memory_raid_meta_v1"
  ];

  const DATA_KEYS = {
    history: "comptia_a_plus_history",
    missed: "comptia_a_plus_missed",
    ledger: "comptia_pom_ledger_v1",
    objectives: "comptia_objectives_v1",
    studyPlan: "comptia_study_plan_v1",
    readiness: "comptia_readiness_cache_v1",
    memorySrs: "comptia_memory_srs_v1",
    memoryRaidMeta: "comptia_memory_raid_meta_v1"
  };

  function uid() {
    return "p_" + Date.now().toString(36) + "_" + Math.floor(Math.random() * 1e6).toString(36);
  }

  function defaultMeta() {
    const id = uid();
    return {
      version: 1,
      activeProfileId: id,
      profiles: {
        [id]: {
          id,
          name: "Learner 1",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
    };
  }

  function loadMeta() {
    try {
      const raw = localStorage.getItem(META_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.profiles || !parsed.activeProfileId) return null;
      if (!parsed.profiles[parsed.activeProfileId]) {
        const first = Object.keys(parsed.profiles)[0];
        if (!first) return null;
        parsed.activeProfileId = first;
      }
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function saveMeta(meta) {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  }

  function scopedKey(baseKey, profileId) {
    const id = profileId || getActiveId();
    return "comptia_p_" + id + "__" + baseKey;
  }

  function migrateLegacyIfNeeded(meta) {
    let moved = false;
    LEGACY_KEYS.forEach((baseKey) => {
      const legacy = localStorage.getItem(baseKey);
      if (legacy == null) return;
      const target = scopedKey(baseKey, meta.activeProfileId);
      if (localStorage.getItem(target) == null) {
        localStorage.setItem(target, legacy);
        moved = true;
      }
      localStorage.removeItem(baseKey);
    });
    return moved;
  }

  function ensureInitialized() {
    let meta = loadMeta();
    if (!meta) {
      meta = defaultMeta();
      saveMeta(meta);
      migrateLegacyIfNeeded(meta);
    } else {
      migrateLegacyIfNeeded(meta);
    }
    return meta;
  }

  function getActiveId() {
    return ensureInitialized().activeProfileId;
  }

  function getActive() {
    const meta = ensureInitialized();
    return meta.profiles[meta.activeProfileId];
  }

  function listProfiles() {
    const meta = ensureInitialized();
    return Object.values(meta.profiles).sort((a, b) =>
      String(a.name).localeCompare(String(b.name))
    );
  }

  function scopedGet(baseKey, profileId) {
    ensureInitialized();
    return localStorage.getItem(scopedKey(baseKey, profileId));
  }

  function scopedSet(baseKey, value, profileId) {
    ensureInitialized();
    localStorage.setItem(scopedKey(baseKey, profileId), value);
  }

  function scopedRemove(baseKey, profileId) {
    ensureInitialized();
    localStorage.removeItem(scopedKey(baseKey, profileId));
  }

  function createProfile(name) {
    const meta = ensureInitialized();
    const id = uid();
    const clean = String(name || "").trim() || "New Learner";
    meta.profiles[id] = {
      id,
      name: clean,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saveMeta(meta);
    return meta.profiles[id];
  }

  function renameProfile(id, name) {
    const meta = ensureInitialized();
    if (!meta.profiles[id]) return { ok: false, error: "Profile not found" };
    const clean = String(name || "").trim();
    if (!clean) return { ok: false, error: "Name required" };
    meta.profiles[id].name = clean;
    meta.profiles[id].updatedAt = new Date().toISOString();
    saveMeta(meta);
    return { ok: true, profile: meta.profiles[id] };
  }

  function wipeProfileData(profileId) {
    Object.values(DATA_KEYS).forEach((baseKey) => {
      localStorage.removeItem(scopedKey(baseKey, profileId));
    });
  }

  function deleteProfile(id) {
    const meta = ensureInitialized();
    if (!meta.profiles[id]) return { ok: false, error: "Profile not found" };
    const ids = Object.keys(meta.profiles);
    if (ids.length <= 1) {
      return { ok: false, error: "Cannot delete the last profile" };
    }
    wipeProfileData(id);
    delete meta.profiles[id];
    if (meta.activeProfileId === id) {
      meta.activeProfileId = Object.keys(meta.profiles)[0];
    }
    saveMeta(meta);
    return { ok: true, activeProfileId: meta.activeProfileId };
  }

  function switchProfile(id) {
    const meta = ensureInitialized();
    if (!meta.profiles[id]) return { ok: false, error: "Profile not found" };
    meta.activeProfileId = id;
    meta.profiles[id].updatedAt = new Date().toISOString();
    saveMeta(meta);
    return { ok: true, profile: meta.profiles[id] };
  }

  function exportAllProfileData() {
    const meta = ensureInitialized();
    const data = {};
    Object.keys(meta.profiles).forEach((pid) => {
      data[pid] = {};
      Object.values(DATA_KEYS).forEach((baseKey) => {
        const raw = scopedGet(baseKey, pid);
        if (raw != null) {
          try {
            data[pid][baseKey] = JSON.parse(raw);
          } catch (_) {
            data[pid][baseKey] = raw;
          }
        } else {
          data[pid][baseKey] = null;
        }
      });
    });
    return { meta, data };
  }

  function importAllProfileData(bundle) {
    if (!bundle || !bundle.meta || !bundle.data) {
      return { ok: false, error: "Invalid profile bundle" };
    }
    const meta = bundle.meta;
    if (!meta.profiles || !meta.activeProfileId) {
      return { ok: false, error: "Invalid profile meta" };
    }
    // Clear existing scoped keys for known profiles, then write imported set
    const existing = loadMeta();
    if (existing) {
      Object.keys(existing.profiles || {}).forEach((pid) => wipeProfileData(pid));
    }
    saveMeta(meta);
    Object.keys(bundle.data).forEach((pid) => {
      const slice = bundle.data[pid] || {};
      Object.values(DATA_KEYS).forEach((baseKey) => {
        if (slice[baseKey] == null) {
          scopedRemove(baseKey, pid);
        } else {
          scopedSet(baseKey, JSON.stringify(slice[baseKey]), pid);
        }
      });
    });
    return { ok: true, activeProfileId: meta.activeProfileId };
  }

  /**
   * Simple objectives checklist (domain-level) for readiness scoring.
   * Shape: { core1: { "1.0 Mobile Devices": true, ... }, core2: { ... } }
   */
  const DEFAULT_OBJECTIVES = {
    core1: {
      "1.0 Mobile Devices": false,
      "2.0 Networking": false,
      "3.0 Hardware": false,
      "4.0 Virtualization and Cloud Computing": false,
      "5.0 Hardware and Network Troubleshooting": false
    },
    core2: {
      "1.0 Operating Systems": false,
      "2.0 Security": false,
      "3.0 Software Troubleshooting": false,
      "4.0 Operational Procedures": false
    }
  };

  function getObjectives(profileId) {
    try {
      const raw = scopedGet(DATA_KEYS.objectives, profileId);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_OBJECTIVES));
      const parsed = JSON.parse(raw);
      return {
        core1: Object.assign({}, DEFAULT_OBJECTIVES.core1, parsed.core1 || {}),
        core2: Object.assign({}, DEFAULT_OBJECTIVES.core2, parsed.core2 || {})
      };
    } catch (_) {
      return JSON.parse(JSON.stringify(DEFAULT_OBJECTIVES));
    }
  }

  function setObjectives(obj, profileId) {
    scopedSet(DATA_KEYS.objectives, JSON.stringify(obj), profileId);
  }

  function toggleObjective(exam, key, profileId) {
    const obj = getObjectives(profileId);
    if (!obj[exam] || !(key in obj[exam])) return obj;
    obj[exam][key] = !obj[exam][key];
    setObjectives(obj, profileId);
    return obj;
  }

  function objectivesCompletion(exam, profileId) {
    const obj = getObjectives(profileId);
    const map = obj[exam] || {};
    const keys = Object.keys(map);
    if (!keys.length) return 0;
    const done = keys.filter((k) => map[k]).length;
    return done / keys.length;
  }

  global.CompTIAProfiles = {
    META_KEY,
    DATA_KEYS,
    DEFAULT_OBJECTIVES,
    ensureInitialized,
    getActiveId,
    getActive,
    listProfiles,
    createProfile,
    renameProfile,
    deleteProfile,
    switchProfile,
    scopedKey,
    scopedGet,
    scopedSet,
    scopedRemove,
    exportAllProfileData,
    importAllProfileData,
    getObjectives,
    setObjectives,
    toggleObjective,
    objectivesCompletion,
    wipeProfileData
  };
})(window);
