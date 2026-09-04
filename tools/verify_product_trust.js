/**
 * Node harness: verify profiles, backup schema, study plan, readiness math,
 * and ECDSA-signed ledger (JWK fallback path without IndexedDB).
 */
const fs = require("fs");
const path = require("path");
const { webcrypto } = require("crypto");

global.crypto = webcrypto;
global.btoa = (s) => Buffer.from(s, "binary").toString("base64");
global.atob = (s) => Buffer.from(s, "base64").toString("binary");

const store = {};
global.localStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
  setItem: (k, v) => {
    store[k] = String(v);
  },
  removeItem: (k) => {
    delete store[k];
  }
};
global.window = global;
global.indexedDB = undefined; // force JWK fallback
global.console = console;

const ROOT = path.join(__dirname, "..");

function load(name) {
  const code = fs.readFileSync(path.join(ROOT, name), "utf8");
  eval(code);
}

async function main() {
  const results = [];
  function ok(name, cond, detail) {
    results.push({ name, ok: !!cond, detail: detail || "" });
    console.log((cond ? "PASS" : "FAIL") + " - " + name + (detail ? " :: " + detail : ""));
  }

  load("profiles.js");
  load("ledger_engine.js");
  load("learner_state.js");
  load("study_plan.js");
  load("readiness.js");

  CompTIAProfiles.ensureInitialized();
  ok("profiles init", !!CompTIAProfiles.getActiveId());

  const p2 = CompTIAProfiles.createProfile("Alt Learner");
  ok("create profile", p2 && p2.id);

  CompTIAProfiles.scopedSet("comptia_a_plus_history", JSON.stringify([
    {
      date: "2026-09-01",
      examType: "core1",
      scaledScore: 720,
      raw: "60/90",
      percentage: "67%",
      status: "PASSED",
      domainStats: {
        "1.0 Mobile Devices": { correct: 8, total: 10 },
        "2.0 Networking": { correct: 10, total: 15 },
        "3.0 Hardware": { correct: 12, total: 20 },
        "4.0 Virtualization and Cloud Computing": { correct: 5, total: 8 },
        "5.0 Hardware and Network Troubleshooting": { correct: 15, total: 25 }
      }
    }
  ]));

  CompTIAProfiles.switchProfile(p2.id);
  ok("isolated history empty on new profile", getHist().length === 0, "len=" + getHist().length);
  CompTIAProfiles.switchProfile(CompTIAProfiles.listProfiles().find((p) => p.name === "Learner 1").id);
  ok("history restored on switch back", getHist().length === 1, "len=" + getHist().length);

  function getHist() {
    const raw = CompTIAProfiles.scopedGet("comptia_a_plus_history");
    return raw ? JSON.parse(raw) : [];
  }

  await CompTIALedger.ensureGenesis();
  const block = await CompTIALedger.appendBlock("TEST_BLOCK", { n: 1 }, 1, 1);
  ok("block has signature", !!block.signature);
  ok("block has fingerprint", !!block.publicKeyFingerprint);
  const v = await CompTIALedger.verifyChain();
  ok("verifyChain valid", v.valid, v.error || "height=" + v.height);
  ok("verifyChain reports fingerprint", !!v.publicKeyFingerprint);

  // Tamper
  const raw = JSON.parse(CompTIAProfiles.scopedGet("comptia_pom_ledger_v1"));
  raw.chain[1].tokenDelta = 9999;
  CompTIAProfiles.scopedSet("comptia_pom_ledger_v1", JSON.stringify(raw));
  const bad = await CompTIALedger.verifyChain();
  ok("tamper detected", !bad.valid, bad.error);

  // Restore by resetting
  await CompTIALedger.resetLedgerHard();
  await CompTIALedger.appendBlock("EXAM_COMPLETE", { examType: "core1", scaledScore: 720 }, 20, 30);

  const plan = CompTIAStudyPlan.generatePlan({
    examDate: "2026-12-01",
    target: "both",
    hoursPerWeek: 7
  });
  ok("study plan weeks", plan.weeks >= 1, "weeks=" + plan.weeks);
  ok("study plan has tasks", plan.dailyTasks.length > 0, "tasks=" + plan.dailyTasks.length);
  const task = plan.dailyTasks[0];
  const done = await CompTIAStudyPlan.completeTask(task.id);
  ok("complete task awards", done.ok && done.reward && !done.reward.skipped, JSON.stringify(done.reward && { apx: done.reward.apx }));

  CompTIAProfiles.toggleObjective("core1", "1.0 Mobile Devices");
  const ready = await CompTIAReadiness.computeAll();
  ok("readiness core1 computed", ready.core1.percent >= 0 && ready.core1.percent <= 100, String(ready.core1.percent));
  ok("readiness has exam date", ready.examDate === "2026-12-01");
  ok("weights sum 1", Math.abs(Object.values(CompTIAReadiness.WEIGHTS).reduce((a, b) => a + b, 0) - 1) < 1e-9);

  const backup = CompTIALearnerState.buildBackupObject();
  ok("backup schemaVersion", backup.schemaVersion === 1);
  const validated = CompTIALearnerState.validateBackup(backup);
  ok("backup validates", validated.ok);

  const badSchema = { ...backup, schemaVersion: 99 };
  ok("rejects bad schema", !CompTIALearnerState.validateBackup(badSchema).ok);

  const applied = CompTIALearnerState.applyBackup(backup);
  ok("apply backup", applied.ok);

  const exportJson = await CompTIALedger.exportLedgerJson();
  const exportObj = JSON.parse(exportJson);
  ok("ledger export has fingerprint", !!exportObj.publicKeyFingerprint);
  ok("ledger export has no private key", !exportObj.privateJwk && !exportObj.privateKey);

  const failed = results.filter((r) => !r.ok);
  console.log("\n" + results.length + " checks, " + failed.length + " failed");
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
