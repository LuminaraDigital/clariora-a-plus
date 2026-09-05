/**
 * Captures the README screenshots from the real desktop build.
 *
 * Launches the packaged Electron app with a throwaway user data directory,
 * drives it over the Chrome DevTools Protocol, and writes one PNG per screen
 * into docs/screenshots/. The pictures therefore show exactly what a test
 * user sees, not a browser approximation.
 *
 *   node tools/capture_screenshots.js
 *   node tools/capture_screenshots.js "C:/path/to/CompTIA_A_Plus_Simulator.exe"
 *
 * Needs a desktop session (the window has to exist for the compositor to
 * paint it). Exits 1 if the app never publishes a debugging target.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_EXE = path.join(ROOT, 'release', 'portable', 'CompTIA_A_Plus_Simulator.exe');
const OUT_DIR = path.join(ROOT, 'docs', 'screenshots');
const PORT = Number(process.env.APLUS_SHOT_PORT) || 9566;
const WIDTH = 1440;
const HEIGHT = 900;

const EXE = path.resolve(process.argv[2] || DEFAULT_EXE);
const USER_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'aplus-shots-'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function launch() {
  return spawn(EXE, [
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + USER_DATA,
    '--force-device-scale-factor=1'
  ], { stdio: 'ignore', windowsHide: false });
}

async function waitForTarget(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch('http://127.0.0.1:' + PORT + '/json/list');
      const list = await res.json();
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch (_) {}
    await sleep(250);
  }
  return null;
}

async function connect(target) {
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = () => reject(new Error('cdp socket error'));
  });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch (_) { return; }
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };
  const send = (method, params) => new Promise((resolve) => {
    const m = ++id;
    pending.set(m, resolve);
    ws.send(JSON.stringify({ id: m, method, params: params || {} }));
  });
  const evalJs = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r && r.result && r.result.exceptionDetails) {
      const d = r.result.exceptionDetails;
      throw new Error(String((d.exception && d.exception.description) || d.text).split('\n')[0]);
    }
    return r && r.result && r.result.result ? r.result.result.value : undefined;
  };
  return { ws, send, evalJs };
}

function killTree(child) {
  if (!child || child.killed) return;
  try {
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else child.kill('SIGKILL');
  } catch (_) {}
}

async function shoot(cdp, name) {
  await sleep(450);
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const data = shot && shot.result && shot.result.data;
  if (!data) throw new Error('captureScreenshot returned nothing for ' + name);
  const file = path.join(OUT_DIR, name + '.png');
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
  console.log('wrote ' + path.relative(ROOT, file));
}

/* A small, believable history so the dashboard and results have numbers in them. */
const SEED = `
(() => {
  const day = 86400000;
  const now = Date.now();
  const mk = (daysAgo, exam, pct) => {
    const total = exam === 'core1' ? 90 : 90;
    const correct = Math.round(total * pct);
    const scaled = Math.round(100 + 800 * pct);
    return {
      id: 'seed-' + daysAgo, date: new Date(now - daysAgo * day).toISOString(),
      examType: exam, totalQuestions: total, correct, incorrect: total - correct,
      percentage: Math.round(pct * 100), scaledScore: scaled,
      passed: scaled >= (exam === 'core1' ? 675 : 700), timeSpent: 3900 + daysAgo * 60,
      domainBreakdown: {}
    };
  };
  const history = [mk(9, 'core1', 0.58), mk(6, 'core1', 0.66), mk(4, 'core2', 0.61), mk(2, 'core1', 0.74), mk(1, 'core1', 0.79)];
  const onboarding = {
    exam: 'core1', testDate: new Date(now + 21 * day).toISOString().slice(0, 10),
    minutesPerDay: 25, completedAt: new Date(now - 9 * day).toISOString(), skippedAt: null,
    diagnostic: { scaledScore: 564, byObjective: {} }
  };
  /* APlus.storage is the app's own store (prefix aplus3_, JSON values). Fall
     back to the raw keys when the shell has not finished booting. */
  if (window.APlus && APlus.storage && typeof APlus.storage.set === 'function') {
    APlus.storage.set('history', history);
    APlus.storage.set('onboarding', onboarding);
  } else {
    localStorage.setItem('aplus3_history', JSON.stringify(history));
    localStorage.setItem('aplus3_onboarding', JSON.stringify(onboarding));
  }
  localStorage.setItem('aplus3_boot_intro_seen_v2', '1');
  return 'seeded';
})()`;

async function main() {
  if (!fs.existsSync(EXE)) {
    console.error('Desktop build not found: ' + EXE);
    console.error('Run: python tools/build_windows_installer.py --portable');
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  if (await waitForTarget(500)) {
    console.error('Port ' + PORT + ' already has a debug target. Close the other app instance or set APLUS_SHOT_PORT.');
    process.exit(1);
  }

  /* One process for the whole run. The desktop store lives in the main
     process, so seeding and then reloading the renderer gives every module
     a returning learner's data without a relaunch (a forced kill would drop
     anything not yet flushed to disk). */
  const child = launch();
  let target = await waitForTarget(30000);
  if (!target) {
    killTree(child);
    console.error('No CDP target. Electron needs a desktop session.');
    process.exit(1);
  }
  let cdp = await connect(target);
  const metrics = () => cdp.send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false });
  await metrics();
  await sleep(2500);
  await shoot(cdp, '01-startup');

  console.log('seed: ' + (await cdp.evalJs(SEED)));
  await cdp.evalJs("location.reload(); 'reloading'");
  cdp.ws.close();
  await sleep(1500);
  target = await waitForTarget(30000);
  if (!target) {
    killTree(child);
    console.error('No CDP target after reload.');
    process.exit(1);
  }
  cdp = await connect(target);
  await metrics();
  await sleep(3000);
  await cdp.evalJs(`(() => {
    const intro = document.getElementById('aplusBootIntro');
    if (intro) intro.hidden = true;
    document.documentElement.classList.remove('boot-intro-active');
    const skip = document.getElementById('obSkip');
    if (skip) skip.click();
    return 'ok';
  })()`);
  await sleep(800);
  await shoot(cdp, '02-home');

  await cdp.evalJs("openMoreMenuAt('moreGroupStudy'); 'ok'");
  await sleep(700);
  await shoot(cdp, '03-study-drawer');
  await cdp.evalJs("closeMoreMenu(); 'ok'");
  await sleep(400);

  await cdp.evalJs("startExam('core1', 20, 20); 'ok'");
  await sleep(1200);
  /* Answer every question through the engine, most of them correctly, so the
     results page shows a realistic pass rather than an empty attempt. */
  await cdp.evalJs(`(() => {
    const e = APlus.engine;
    const n = e.questions.length;
    for (let i = 0; i < n; i++) {
      e.jumpTo(i);
      const q = e.getCurrentQuestion();
      if (!q || q.type !== 'single' || typeof q.answer !== 'number') continue;
      const wrong = (i % 6 === 4);
      const opts = Array.isArray(q.options) ? q.options.length : 4;
      e.answerQuestion(wrong ? (q.answer + 1) % opts : q.answer);
    }
    e.jumpTo(0);
    return Object.keys(e.userAnswers).length + ' answered';
  })()`).then((r) => console.log('exam: ' + r));
  await sleep(600);
  await shoot(cdp, '04-exam');

  await cdp.evalJs("confirmFinishExam(); 'ok'");
  await sleep(600);
  await shoot(cdp, '05-submit-dialog');
  await cdp.evalJs(`(() => {
    const ok = document.querySelector('.dialog-actions .btn-green');
    if (ok) ok.click();
    return 'ok';
  })()`);
  await sleep(1500);
  await shoot(cdp, '06-results');

  cdp.ws.close();
  killTree(child);
  try { fs.rmSync(USER_DATA, { recursive: true, force: true }); } catch (_) {}
  console.log('done');
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
