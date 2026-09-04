/**
 * CompTIA A+ Proof-of-Mastery Ledger (signed local chain)
 *
 * Local hash-chained append-only ledger + APX token economy.
 * Each profile has an ECDSA P-256 keypair. Blocks carry a signature over the hash.
 *
 * Honest scope:
 * - Not a distributed blockchain. No multi-user consensus. No unpaid SaaS cloud.
 * - Strongest practical local equivalent: signed append-only chain verifiable on-device.
 *
 * Key storage:
 * 1) Preferred: IndexedDB, non-extractable private CryptoKey.
 * 2) Fallback: JWK in localStorage (device-local). Documented as weaker at-rest protection.
 */
(function (global) {
  const STORAGE_KEY = "comptia_pom_ledger_v1";
  const TOKEN_SYMBOL = "APX";
  const TOKEN_NAME = "A+ Proof eXchange";
  const GENESIS_HASH = "000000pom_genesis_comptia_a_plus_datacenter_academy";
  const IDB_NAME = "comptia_pom_keys_v1";
  const IDB_STORE = "keys";
  const JWK_FALLBACK_PREFIX = "comptia_pom_jwk_fallback_";

  const RANKS = [
    { id: "l1", name: "L1 Helpdesk Trainee", minXp: 0, badge: "" },
    { id: "l2", name: "L2 Field Technician", minXp: 400, badge: "" },
    { id: "l3", name: "L3 Datacenter Specialist", minXp: 1200, badge: "" },
    { id: "senior", name: "Senior Systems Engineer", minXp: 2800, badge: "" },
    { id: "master", name: "A+ Master Technician", minXp: 5000, badge: "" }
  ];

  const ACHIEVEMENTS = {
    FIRST_EXAM: { id: "FIRST_EXAM", name: "First Block Mined", desc: "Complete your first scored exam", xp: 50, apx: 20 },
    PASS_CORE1: { id: "PASS_CORE1", name: "Core 1 Cleared", desc: "Pass a Core 1 full exam", xp: 120, apx: 60 },
    PASS_CORE2: { id: "PASS_CORE2", name: "Core 2 Cleared", desc: "Pass a Core 2 full exam", xp: 120, apx: 60 },
    SCORE_850: { id: "SCORE_850", name: "Elite 850+", desc: "Score 850 or higher on a full exam", xp: 150, apx: 80 },
    PERFECT_DRILL: { id: "PERFECT_DRILL", name: "Domain Laser", desc: "Score 100% on a domain drill", xp: 80, apx: 40 },
    STREAK_3: { id: "STREAK_3", name: "3-Day Chain", desc: "Study or exam on 3 consecutive days", xp: 60, apx: 30 },
    STREAK_7: { id: "STREAK_7", name: "7-Day Hashrate", desc: "7 consecutive active days", xp: 140, apx: 70 },
    STUDY_10: { id: "STUDY_10", name: "Knowledge Validator", desc: "Open 10 unique study documents", xp: 90, apx: 45 },
    PBQ_COMPLETE: { id: "PBQ_COMPLETE", name: "PBQ Operator", desc: "Complete a performance-based lab", xp: 70, apx: 35 },
    LEDGER_100: { id: "LEDGER_100", name: "Century Chain", desc: "Reach 100 ledger blocks", xp: 100, apx: 50 },
    PLAN_TASK: { id: "PLAN_TASK", name: "Plan Finisher", desc: "Complete 10 study-plan tasks", xp: 80, apx: 40 }
  };

  const keyCache = {};

  function todayKey() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  function profileId() {
    if (global.CompTIAProfiles && CompTIAProfiles.getActiveId) {
      return CompTIAProfiles.getActiveId();
    }
    return "default";
  }

  function storageGet() {
    if (global.CompTIAProfiles && CompTIAProfiles.scopedGet) {
      return CompTIAProfiles.scopedGet(STORAGE_KEY);
    }
    return localStorage.getItem(STORAGE_KEY);
  }

  function storageSet(value) {
    if (global.CompTIAProfiles && CompTIAProfiles.scopedSet) {
      CompTIAProfiles.scopedSet(STORAGE_KEY, value);
      return;
    }
    localStorage.setItem(STORAGE_KEY, value);
  }

  function storageRemove() {
    if (global.CompTIAProfiles && CompTIAProfiles.scopedRemove) {
      CompTIAProfiles.scopedRemove(STORAGE_KEY);
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
  }

  async function sha256Hex(message) {
    const data = typeof message === "string" ? new TextEncoder().encode(message) : message;
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function hexToBytes(hex) {
    const clean = String(hex || "").replace(/[^0-9a-f]/gi, "");
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < out.length; i++) {
      out[i] = parseInt(clean.substr(i * 2, 2), 16);
    }
    return out;
  }

  function bytesToBase64(buf) {
    const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
    let s = "";
    bytes.forEach((b) => {
      s += String.fromCharCode(b);
    });
    return btoa(s);
  }

  function base64ToBytes(b64) {
    const s = atob(b64);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  function openIdb() {
    return new Promise((resolve, reject) => {
      if (!global.indexedDB) {
        reject(new Error("IndexedDB unavailable"));
        return;
      }
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("IDB open failed"));
    });
  }

  async function idbGet(pid) {
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(pid);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbSet(pid, value) {
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      const req = store.put(value, pid);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async function generateKeyPair() {
    return crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign", "verify"]
    );
  }

  async function generateExtractableKeyPair() {
    return crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"]
    );
  }

  async function publicFingerprint(publicKey) {
    const spki = await crypto.subtle.exportKey("spki", publicKey);
    const hex = await sha256Hex(new Uint8Array(spki));
    return hex.slice(0, 16);
  }

  async function loadJwkFallback(pid) {
    try {
      const raw = localStorage.getItem(JWK_FALLBACK_PREFIX + pid);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed.privateJwk || !parsed.publicJwk) return null;
      const privateKey = await crypto.subtle.importKey(
        "jwk",
        parsed.privateJwk,
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign"]
      );
      const publicKey = await crypto.subtle.importKey(
        "jwk",
        parsed.publicJwk,
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["verify"]
      );
      return {
        privateKey,
        publicKey,
        fingerprint: parsed.fingerprint,
        storage: "jwk_localStorage_fallback",
        publicJwk: parsed.publicJwk
      };
    } catch (_) {
      return null;
    }
  }

  async function saveJwkFallback(pid, keyPair) {
    const privateJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
    const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const fingerprint = await publicFingerprint(keyPair.publicKey);
    localStorage.setItem(
      JWK_FALLBACK_PREFIX + pid,
      JSON.stringify({ privateJwk, publicJwk, fingerprint, note: "Fallback only. Prefer IndexedDB non-extractable keys." })
    );
    return { privateKey: keyPair.privateKey, publicKey: keyPair.publicKey, fingerprint, storage: "jwk_localStorage_fallback", publicJwk };
  }

  async function ensureKeyPair() {
    const pid = profileId();
    if (keyCache[pid]) return keyCache[pid];

    try {
      const stored = await idbGet(pid);
      if (stored && stored.privateKey && stored.publicKey) {
        const fingerprint = stored.fingerprint || (await publicFingerprint(stored.publicKey));
        let publicJwk = stored.publicJwk || null;
        try {
          if (!publicJwk) publicJwk = await crypto.subtle.exportKey("jwk", stored.publicKey);
        } catch (_) {}
        keyCache[pid] = {
          privateKey: stored.privateKey,
          publicKey: stored.publicKey,
          fingerprint,
          storage: "indexedDB",
          publicJwk
        };
        return keyCache[pid];
      }
      const pair = await generateKeyPair();
      const fingerprint = await publicFingerprint(pair.publicKey);
      let publicJwk = null;
      try {
        publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
      } catch (_) {}
      await idbSet(pid, {
        privateKey: pair.privateKey,
        publicKey: pair.publicKey,
        fingerprint,
        publicJwk,
        createdAt: new Date().toISOString()
      });
      keyCache[pid] = {
        privateKey: pair.privateKey,
        publicKey: pair.publicKey,
        fingerprint,
        storage: "indexedDB",
        publicJwk
      };
      return keyCache[pid];
    } catch (err) {
      console.warn("IndexedDB key store unavailable, using JWK localStorage fallback:", err && err.message);
      const existing = await loadJwkFallback(pid);
      if (existing) {
        keyCache[pid] = existing;
        return existing;
      }
      const pair = await generateExtractableKeyPair();
      const saved = await saveJwkFallback(pid, pair);
      keyCache[pid] = saved;
      return saved;
    }
  }

  function clearKeyCache() {
    Object.keys(keyCache).forEach((k) => delete keyCache[k]);
  }

  function loadRaw() {
    try {
      const raw = storageGet();
      if (!raw) return { version: 2, chain: [], signed: true };
      const parsed = JSON.parse(raw);
      if (!parsed.chain || !Array.isArray(parsed.chain)) return { version: 2, chain: [], signed: true };
      return parsed;
    } catch (_) {
      return { version: 2, chain: [], signed: true };
    }
  }

  function saveRaw(state) {
    state.version = 2;
    state.signed = true;
    storageSet(JSON.stringify(state));
  }

  function blockPayloadString(block) {
    return [
      block.index,
      block.prevHash,
      block.timestamp,
      block.type,
      JSON.stringify(block.payload || {}),
      block.tokenDelta,
      block.xpDelta,
      block.nonce || 0
    ].join("|");
  }

  async function hashBlock(block) {
    return sha256Hex(blockPayloadString(block));
  }

  async function signBlockHash(hash) {
    const keys = await ensureKeyPair();
    const sig = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      keys.privateKey,
      hexToBytes(hash)
    );
    return {
      signature: bytesToBase64(sig),
      publicKeyFingerprint: keys.fingerprint,
      keyStorage: keys.storage
    };
  }

  async function verifyBlockSignature(block, publicKey) {
    if (!block.signature) return { ok: false, reason: "missing_signature" };
    try {
      const ok = await crypto.subtle.verify(
        { name: "ECDSA", hash: "SHA-256" },
        publicKey,
        base64ToBytes(block.signature),
        hexToBytes(block.hash)
      );
      return { ok, reason: ok ? null : "bad_signature" };
    } catch (e) {
      return { ok: false, reason: (e && e.message) || "verify_error" };
    }
  }

  async function ensureGenesis() {
    const state = loadRaw();
    if (state.chain.length > 0) return state;
    const keys = await ensureKeyPair();
    const genesis = {
      index: 0,
      prevHash: "0",
      timestamp: new Date().toISOString(),
      type: "GENESIS",
      payload: {
        network: "Proof-of-Mastery",
        token: TOKEN_SYMBOL,
        tokenName: TOKEN_NAME,
        note: "Local signed learning ledger. Hash-chained, ECDSA P-256 signed, verifiable on this device.",
        publicKeyFingerprint: keys.fingerprint
      },
      tokenDelta: 100,
      xpDelta: 0,
      nonce: 0,
      hash: GENESIS_HASH
    };
    genesis.hash = await hashBlock(genesis);
    const signed = await signBlockHash(genesis.hash);
    genesis.signature = signed.signature;
    genesis.publicKeyFingerprint = signed.publicKeyFingerprint;
    state.chain = [genesis];
    state.publicKeyFingerprint = keys.fingerprint;
    saveRaw(state);
    return state;
  }

  async function appendBlock(type, payload, tokenDelta, xpDelta) {
    const state = await ensureGenesis();
    const keys = await ensureKeyPair();
    const prev = state.chain[state.chain.length - 1];
    const block = {
      index: prev.index + 1,
      prevHash: prev.hash,
      timestamp: new Date().toISOString(),
      type,
      payload: payload || {},
      tokenDelta: Number(tokenDelta) || 0,
      xpDelta: Number(xpDelta) || 0,
      nonce: Math.floor(Math.random() * 1e9)
    };
    block.hash = await hashBlock(block);
    const signed = await signBlockHash(block.hash);
    block.signature = signed.signature;
    block.publicKeyFingerprint = signed.publicKeyFingerprint;
    state.chain.push(block);
    state.publicKeyFingerprint = keys.fingerprint;
    saveRaw(state);
    return block;
  }

  async function verifyChain() {
    const state = await ensureGenesis();
    const chain = state.chain;
    if (!chain.length) return { valid: false, error: "Empty chain", height: 0 };

    const keys = await ensureKeyPair();
    let legacyUnsigned = 0;
    let signedCount = 0;

    for (let i = 0; i < chain.length; i++) {
      const block = chain[i];
      const expected = await hashBlock(block);
      if (block.hash !== expected) {
        return { valid: false, error: "Hash mismatch at block #" + i, height: chain.length, brokenAt: i };
      }
      if (i > 0 && block.prevHash !== chain[i - 1].hash) {
        return { valid: false, error: "Broken link at block #" + i, height: chain.length, brokenAt: i };
      }
      if (i > 0 && block.index !== chain[i - 1].index + 1) {
        return { valid: false, error: "Index gap at block #" + i, height: chain.length, brokenAt: i };
      }
      if (block.signature) {
        const v = await verifyBlockSignature(block, keys.publicKey);
        if (!v.ok) {
          return {
            valid: false,
            error: "Signature invalid at block #" + i + " (" + v.reason + ")",
            height: chain.length,
            brokenAt: i
          };
        }
        signedCount += 1;
      } else {
        legacyUnsigned += 1;
      }
    }

    return {
      valid: true,
      error: null,
      height: chain.length,
      tip: chain[chain.length - 1].hash,
      signedCount,
      legacyUnsigned,
      publicKeyFingerprint: keys.fingerprint,
      keyStorage: keys.storage
    };
  }

  function replayWallet(chain) {
    let balance = 0;
    let xp = 0;
    const achievements = new Set();
    const studiedDocs = new Set();
    const stakes = {};
    const activeDays = new Set();
    let exams = 0;
    let passes = 0;
    let pbqs = 0;
    let planTasks = 0;
    let lastDaily = null;

    chain.forEach((b) => {
      balance += Number(b.tokenDelta) || 0;
      xp += Number(b.xpDelta) || 0;
      if (b.timestamp) activeDays.add(b.timestamp.slice(0, 10));
      if (b.type === "ACHIEVEMENT_MINT" && b.payload && b.payload.achievementId) {
        achievements.add(b.payload.achievementId);
      }
      if (b.type === "STUDY_OPEN" && b.payload && b.payload.docId) {
        studiedDocs.add(b.payload.docId);
      }
      if (b.type === "EXAM_COMPLETE") {
        exams += 1;
        if (b.payload && b.payload.passed) passes += 1;
      }
      if (b.type === "PBQ_COMPLETE") pbqs += 1;
      if (b.type === "STUDY_PLAN_TASK") planTasks += 1;
      if (b.type === "DAILY_CHECKIN") lastDaily = (b.payload && b.payload.day) || b.timestamp.slice(0, 10);
      if (b.type === "DOMAIN_STAKE_LOCK" && b.payload && b.payload.stakeId) {
        stakes[b.payload.stakeId] = {
          domainKey: b.payload.domainKey,
          amount: b.payload.amount,
          status: "locked"
        };
      }
      if (b.type === "DOMAIN_STAKE_RESOLVE" && b.payload && b.payload.stakeId && stakes[b.payload.stakeId]) {
        stakes[b.payload.stakeId].status = b.payload.success ? "yielded" : "returned";
      }
    });

    const rank = [...RANKS].reverse().find((r) => xp >= r.minXp) || RANKS[0];
    const streak = computeStreak(activeDays);

    return {
      balance,
      xp,
      rank,
      achievements: Array.from(achievements),
      studiedDocs: Array.from(studiedDocs),
      stakes,
      exams,
      passes,
      pbqs,
      planTasks,
      lastDaily,
      streak,
      activeDays: activeDays.size,
      height: chain.length
    };
  }

  function computeStreak(activeDaySet) {
    let streak = 0;
    const cursor = new Date();
    for (;;) {
      const key = cursor.toISOString().slice(0, 10);
      if (!activeDaySet.has(key)) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  async function getState() {
    const state = await ensureGenesis();
    const wallet = replayWallet(state.chain);
    const integrity = await verifyChain();
    const keys = await ensureKeyPair();
    return {
      tokenSymbol: TOKEN_SYMBOL,
      tokenName: TOKEN_NAME,
      chain: state.chain,
      wallet,
      integrity,
      ranks: RANKS,
      achievementsCatalog: ACHIEVEMENTS,
      publicKeyFingerprint: keys.fingerprint,
      keyStorage: keys.storage
    };
  }

  function alreadyHasAchievement(wallet, id) {
    return (wallet.achievements || []).includes(id);
  }

  async function mintAchievementIfNew(achievementId, extraPayload) {
    const state = await getState();
    if (alreadyHasAchievement(state.wallet, achievementId)) return null;
    const meta = ACHIEVEMENTS[achievementId];
    if (!meta) return null;
    return appendBlock(
      "ACHIEVEMENT_MINT",
      {
        achievementId,
        name: meta.name,
        desc: meta.desc,
        ...(extraPayload || {})
      },
      meta.apx,
      meta.xp
    );
  }

  function calcExamReward(result) {
    const total = Math.max(1, Number(result.total) || 1);
    const correct = Number(result.rawCorrect) || 0;
    const scaled = Number(result.scaledScore) || 0;
    const passed = !!result.passed;
    const type = (result.examType || "core1").toLowerCase();
    const isFull = total >= 60;

    let apx = 10 + correct * 2;
    let xp = 15 + correct * 3;

    if (passed) {
      apx += isFull ? 50 : 20;
      xp += isFull ? 80 : 30;
    }
    if (scaled >= 850) {
      apx += 40;
      xp += 60;
    }
    if (scaled >= 900) {
      apx += 25;
      xp += 40;
    }

    const domainBonuses = [];
    const domainStats = result.domainStats || {};
    Object.keys(domainStats).forEach((d) => {
      const s = domainStats[d];
      if (!s || !s.total) return;
      const pct = (s.correct / s.total) * 100;
      if (pct >= 80) {
        apx += 15;
        xp += 20;
        domainBonuses.push({ domain: d, pct: Math.round(pct), bonusApx: 15 });
      }
    });

    if (type === "missed") {
      apx = Math.round(apx * 0.75);
      xp = Math.round(xp * 0.75);
    }

    return { apx, xp, domainBonuses, isFull };
  }

  async function recordExamComplete(result) {
    const reward = calcExamReward(result);
    const block = await appendBlock(
      "EXAM_COMPLETE",
      {
        examType: result.examType,
        scaledScore: result.scaledScore,
        rawCorrect: result.rawCorrect,
        total: result.total,
        passed: result.passed,
        passingScore: result.passingScore,
        domainStats: result.domainStats,
        rewardBreakdown: reward
      },
      reward.apx,
      reward.xp
    );

    const minted = [];
    const walletBefore = (await getState()).wallet;
    if (walletBefore.exams === 1) {
      const b = await mintAchievementIfNew("FIRST_EXAM");
      if (b) minted.push(b);
    }
    if (result.passed && String(result.examType).toLowerCase() === "core1" && result.total >= 60) {
      const b = await mintAchievementIfNew("PASS_CORE1", { score: result.scaledScore });
      if (b) minted.push(b);
    }
    if (result.passed && String(result.examType).toLowerCase() === "core2" && result.total >= 60) {
      const b = await mintAchievementIfNew("PASS_CORE2", { score: result.scaledScore });
      if (b) minted.push(b);
    }
    if (result.scaledScore >= 850 && result.total >= 60) {
      const b = await mintAchievementIfNew("SCORE_850", { score: result.scaledScore });
      if (b) minted.push(b);
    }
    if (result.total > 0 && result.rawCorrect === result.total && String(result.examType).toLowerCase().includes("domain")) {
      const b = await mintAchievementIfNew("PERFECT_DRILL");
      if (b) minted.push(b);
    }

    const state = await getState();
    if (state.wallet.streak >= 3) {
      const b = await mintAchievementIfNew("STREAK_3");
      if (b) minted.push(b);
    }
    if (state.wallet.streak >= 7) {
      const b = await mintAchievementIfNew("STREAK_7");
      if (b) minted.push(b);
    }
    if (state.wallet.height >= 100) {
      const b = await mintAchievementIfNew("LEDGER_100");
      if (b) minted.push(b);
    }

    const stakeBlocks = [];
    if (result.domainKey) {
      const resolved = await resolveDomainStakes(result.domainKey, result.domainPct || 0);
      stakeBlocks.push(...resolved);
    }

    return {
      block,
      reward,
      minted,
      stakeBlocks,
      wallet: (await getState()).wallet
    };
  }

  async function recordStudyOpen(doc) {
    const state = await getState();
    const docId = doc.id || doc.path || doc.title;
    const day = todayKey();
    const alreadyToday = state.chain.some(
      (b) =>
        b.type === "STUDY_OPEN" &&
        b.payload &&
        b.payload.docId === docId &&
        (b.payload.day === day || (b.timestamp || "").slice(0, 10) === day)
    );
    if (alreadyToday) {
      return { skipped: true, reason: "already_rewarded_today", wallet: state.wallet };
    }

    const isNewDoc = !(state.wallet.studiedDocs || []).includes(docId);
    const apx = isNewDoc ? 8 : 3;
    const xp = isNewDoc ? 12 : 4;
    const block = await appendBlock(
      "STUDY_OPEN",
      {
        docId,
        title: doc.title,
        category: doc.category,
        folder: doc.folder,
        day,
        firstTime: isNewDoc
      },
      apx,
      xp
    );

    const minted = [];
    const after = await getState();
    if ((after.wallet.studiedDocs || []).length >= 10) {
      const b = await mintAchievementIfNew("STUDY_10");
      if (b) minted.push(b);
    }
    if (after.wallet.streak >= 3) {
      const b = await mintAchievementIfNew("STREAK_3");
      if (b) minted.push(b);
    }
    if (after.wallet.streak >= 7) {
      const b = await mintAchievementIfNew("STREAK_7");
      if (b) minted.push(b);
    }

    return { skipped: false, block, apx, xp, minted, wallet: after.wallet };
  }

  async function recordPbqComplete(labName) {
    const day = todayKey();
    const state = await getState();
    const already = state.chain.some(
      (b) => b.type === "PBQ_COMPLETE" && b.payload && b.payload.labName === labName && b.payload.day === day
    );
    if (already) return { skipped: true, wallet: state.wallet };

    const block = await appendBlock("PBQ_COMPLETE", { labName, day }, 18, 25);
    const minted = [];
    const b = await mintAchievementIfNew("PBQ_COMPLETE", { labName });
    if (b) minted.push(b);
    return { skipped: false, block, minted, wallet: (await getState()).wallet };
  }

  async function recordStudyPlanTask(task) {
    const day = todayKey();
    const taskId = (task && task.id) || "task";
    const state = await getState();
    const already = state.chain.some(
      (b) =>
        b.type === "STUDY_PLAN_TASK" &&
        b.payload &&
        b.payload.taskId === taskId &&
        b.payload.day === day
    );
    if (already) return { skipped: true, wallet: state.wallet };

    const apx = 5;
    const xp = 8;
    const block = await appendBlock(
      "STUDY_PLAN_TASK",
      {
        taskId,
        title: (task && task.title) || taskId,
        kind: (task && task.kind) || "task",
        day
      },
      apx,
      xp
    );
    const minted = [];
    const after = await getState();
    if ((after.wallet.planTasks || 0) >= 10) {
      const b = await mintAchievementIfNew("PLAN_TASK");
      if (b) minted.push(b);
    }
    return { skipped: false, block, apx, xp, minted, wallet: after.wallet };
  }

  async function claimDailyCheckin() {
    const day = todayKey();
    const state = await getState();
    if (state.wallet.lastDaily === day) {
      return { skipped: true, reason: "already_claimed", wallet: state.wallet };
    }
    const bonus = Math.min(35, Math.max(0, (state.wallet.streak || 0) * 5));
    const apx = 5 + bonus;
    const xp = 10 + Math.min(40, (state.wallet.streak || 0) * 4);
    const block = await appendBlock(
      "DAILY_CHECKIN",
      { day, streakAtClaim: state.wallet.streak, bonus },
      apx,
      xp
    );
    const minted = [];
    const after = await getState();
    if (after.wallet.streak >= 3) {
      const b = await mintAchievementIfNew("STREAK_3");
      if (b) minted.push(b);
    }
    if (after.wallet.streak >= 7) {
      const b = await mintAchievementIfNew("STREAK_7");
      if (b) minted.push(b);
    }
    return { skipped: false, block, apx, xp, streakNext: after.wallet.streak, wallet: after.wallet, minted };
  }

  async function stakeDomain(domainKey, amount) {
    const amt = Number(amount) || 30;
    const state = await getState();
    if (state.wallet.balance < amt) {
      return { ok: false, error: "Need " + amt + " " + TOKEN_SYMBOL + ". Balance: " + state.wallet.balance };
    }
    const open = Object.values(state.wallet.stakes || {}).some(
      (s) => s.status === "locked" && s.domainKey === domainKey
    );
    if (open) return { ok: false, error: "You already have an open stake on this domain." };

    const stakeId = "stake_" + Date.now() + "_" + Math.floor(Math.random() * 1e5);
    const block = await appendBlock(
      "DOMAIN_STAKE_LOCK",
      { stakeId, domainKey, amount: amt },
      -amt,
      5
    );
    return { ok: true, block, stakeId, wallet: (await getState()).wallet };
  }

  async function resolveDomainStakes(domainKey, domainPct) {
    const state = await getState();
    const resolved = [];
    const openIds = Object.keys(state.wallet.stakes || {}).filter(
      (id) => state.wallet.stakes[id].status === "locked" && state.wallet.stakes[id].domainKey === domainKey
    );
    for (const stakeId of openIds) {
      const stake = state.wallet.stakes[stakeId];
      const success = domainPct >= 80;
      const yieldAmt = success ? Math.round(stake.amount * 0.4) : 0;
      const delta = stake.amount + yieldAmt;
      const block = await appendBlock(
        "DOMAIN_STAKE_RESOLVE",
        {
          stakeId,
          domainKey,
          success,
          domainPct,
          returned: stake.amount,
          yield: yieldAmt
        },
        delta,
        success ? 30 : 8
      );
      resolved.push(block);
    }
    return resolved;
  }

  async function spendForInsight() {
    const cost = 25;
    const state = await getState();
    if (state.wallet.balance < cost) {
      return { ok: false, error: "Need " + cost + " " + TOKEN_SYMBOL };
    }
    const block = await appendBlock(
      "SPEND_INSIGHT",
      { item: "Weak-domain insight unlock", cost },
      -cost,
      5
    );
    return { ok: true, block, wallet: (await getState()).wallet };
  }

  async function exportLedgerJson() {
    const state = loadRaw();
    const keys = await ensureKeyPair();
    const bundle = {
      ...state,
      publicKeyFingerprint: keys.fingerprint,
      keyStorage: keys.storage,
      publicJwk: keys.publicJwk || null,
      exportedAt: new Date().toISOString(),
      note: "Signed local ledger export. Private key is never included."
    };
    return JSON.stringify(bundle, null, 2);
  }

  async function resetLedgerHard() {
    storageRemove();
    clearKeyCache();
    return ensureGenesis();
  }

  global.CompTIALedger = {
    TOKEN_SYMBOL,
    TOKEN_NAME,
    RANKS,
    ACHIEVEMENTS,
    ensureGenesis,
    ensureKeyPair,
    getState,
    verifyChain,
    appendBlock,
    recordExamComplete,
    recordStudyOpen,
    recordPbqComplete,
    recordStudyPlanTask,
    claimDailyCheckin,
    stakeDomain,
    spendForInsight,
    exportLedgerJson,
    resetLedgerHard,
    calcExamReward,
    clearKeyCache,
    STORAGE_KEY
  };
})(window);
