/**
 * Verify Memory SRS scheduling + APX reward math (Node harness).
 */
const { webcrypto } = require("crypto");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

global.crypto = webcrypto;
global.window = global;
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

function load(file) {
  const code = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  vm.runInThisContext(code, { filename: file });
}

let failed = 0;
function pass(name, cond, detail) {
  if (cond) console.log("PASS -", name, detail ? ":: " + detail : "");
  else {
    failed += 1;
    console.log("FAIL -", name, detail ? ":: " + detail : "");
  }
}

load("memory_srs.js");

const id = "C2-001";
let r = CompTIAMemorySRS.reviewCard(id, 1, { domain: "2.0 Security", exam: "core2" });
pass("fail schedules 1 day", r.ok && r.card.interval === 1 && r.card.repetitions === 0);

// Force due today and succeed
let st = CompTIAMemorySRS.loadState();
st.cards[id].due = CompTIAMemorySRS.todayKey();
CompTIAMemorySRS.saveState(st);
r = CompTIAMemorySRS.reviewCard(id, 4, { domain: "2.0 Security", exam: "core2" });
pass("first success interval 1", r.ok && r.card.interval === 1 && r.card.repetitions === 1);

st = CompTIAMemorySRS.loadState();
st.cards[id].due = CompTIAMemorySRS.todayKey();
CompTIAMemorySRS.saveState(st);
r = CompTIAMemorySRS.reviewCard(id, 4);
pass("second success interval 3", r.ok && r.card.interval === 3 && r.card.repetitions === 2);

const apxNew = CompTIAMemorySRS.apxForSuccessfulRecall({ lapses: 0, repetitions: 0 }, 4);
const apxLapse = CompTIAMemorySRS.apxForSuccessfulRecall({ lapses: 2, repetitions: 2 }, 5);
pass("apx base", apxNew === 3, "apx=" + apxNew);
pass("apx lapse+easy+mature", apxLapse === 7, "apx=" + apxLapse); // 3+2+1+1

CompTIAMemorySRS.enqueueMissed(["C1-010", "C1-011"], () => ({ domain: "3.0 Hardware", exam: "core1" }));
const stats = CompTIAMemorySRS.getStats();
pass("enqueue grows queue", stats.total >= 3, "total=" + stats.total);

pass("raid not claimed initially", CompTIAMemorySRS.raidClaimedToday() === false);
CompTIAMemorySRS.markRaidComplete();
pass("raid claimed after mark", CompTIAMemorySRS.raidClaimedToday() === true);

console.log(failed ? failed + " failed" : "all memory checks passed");
process.exit(failed ? 1 : 0);
