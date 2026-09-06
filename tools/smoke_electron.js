/**
 * Desktop smoke test. Launches the packaged app with a throwaway user data dir,
 * drives it over the Chrome DevTools Protocol, and asserts the release-critical
 * behaviour: it loads, it is clean, the release info is wired, an exam can be
 * started and finished, the learner database stays small and flat, and the boot
 * intro does not play a second time.
 *
 *   node tools/smoke_electron.js
 *   node tools/smoke_electron.js "C:/path/to/CompTIA_A_Plus_Simulator.exe"
 *
 * Electron needs a desktop session. On a headless machine the window never
 * appears and no CDP target is published: the script says so and exits 1.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_EXE = process.platform === 'win32'
  ? path.join(ROOT, 'release', 'portable', 'CompTIA_A_Plus_Simulator.exe')
  : process.platform === 'darwin'
    ? path.join(ROOT, 'release', 'mac', 'CompTIA A+ Master.app', 'Contents', 'MacOS', 'CompTIA A+ Master')
    : path.join(ROOT, 'release', 'linux', 'linux-unpacked', 'comptia-a-plus-master');
const SCRATCH = process.env.APLUS_SMOKE_DIR || path.join(os.tmpdir(), 'aplus-smoke');
const PORT = 9555;
const SHOT_PATH = path.join(SCRATCH, 'desktop_home.png');

const EXE = path.resolve(process.argv[2] || DEFAULT_EXE);
const USER_DATA = path.join(SCRATCH, 'userdata');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass: !!pass, detail: detail || '' });
  console.log((pass ? 'PASS  ' : 'FAIL  ') + name + (detail ? '  -- ' + detail : ''));
}

/* Startup on a CI runner with a virtual display is slower than a desktop. */
const LOAD_TIMEOUT_MS = process.platform === 'win32' ? 8000 : 20000;
let lastStderr = '';

function launch(extraArgs) {
  const args = [
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + USER_DATA
  ];
  // An unpacked Linux build has no SUID sandbox helper, so Chromium refuses to
  // start without this flag. Packaged AppImage and deb installs do not need it.
  if (process.platform === 'linux') args.push('--no-sandbox');
  const child = spawn(EXE, args.concat(extraArgs || []), { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: false });
  lastStderr = '';
  if (child.stderr) {
    child.stderr.on('data', (d) => { lastStderr = (lastStderr + d.toString()).slice(-4000); });
  }
  return child;
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

/** Minimal CDP client over the Node 22 global WebSocket. */
async function connect(target) {
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = () => reject(new Error('cdp socket error'));
  });
  let id = 0;
  const pending = new Map();
  const consoleErrors = [];
  const exceptions = [];
  ws.onmessage = (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch (_) { return; }
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails || {};
      exceptions.push(String((d.exception && d.exception.description) || d.text || 'exception').split('\n')[0]);
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push(msg.params.args.map((a) => a.value || a.description || '').join(' ').slice(0, 200));
    }
  };
  const send = (method, params) => new Promise((resolve) => {
    const m = ++id;
    pending.set(m, resolve);
    ws.send(JSON.stringify({ id: m, method: method, params: params || {} }));
  });
  const evalJs = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r && r.result && r.result.exceptionDetails) {
      const d = r.result.exceptionDetails;
      throw new Error(String((d.exception && d.exception.description) || d.text).split('\n')[0]);
    }
    return r && r.result && r.result.result ? r.result.result.value : undefined;
  };
  return { ws, send, evalJs, consoleErrors, exceptions };
}

/**
 * The intro's once-only key is versioned inside boot-intro.js and is bumped
 * by the intro's own workstream. Read it from the packaged copy next to the
 * exe so this test never pins a stale key.
 */
function introSeenKey() {
  const candidates = [
    path.join(path.dirname(EXE), 'resources', 'app', 'js', 'boot-intro.js'),
    path.join(ROOT, 'js', 'boot-intro.js')
  ];
  for (const file of candidates) {
    try {
      const m = fs.readFileSync(file, 'utf8').match(/SEEN_KEY\s*=\s*'([^']+)'/);
      if (m) return m[1];
    } catch (_) {}
  }
  return 'aplus3_boot_intro_seen_v2';
}

function findDatabaseFile() {
  // Electron puts userData under <user-data-dir>/<productName> when the dir is given.
  const roots = [USER_DATA];
  try {
    for (const entry of fs.readdirSync(USER_DATA, { withFileTypes: true })) {
      if (entry.isDirectory()) roots.push(path.join(USER_DATA, entry.name));
    }
  } catch (_) {}
  for (const root of roots) {
    const candidate = path.join(root, 'memory', 'aplus_user_db.json');
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function killTree(child) {
  if (!child || child.killed) return;
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }).on('error', () => {});
    } else {
      child.kill('SIGKILL');
    }
  } catch (_) {}
  try { child.kill(); } catch (_) {}
}

async function firstRun() {
  const child = launch();
  let cdp = null;
  try {
    const target = await waitForTarget(LOAD_TIMEOUT_MS);
    if (!target) {
      record('window loads index within ' + (LOAD_TIMEOUT_MS / 1000) + ' s', false, 'no CDP target published');
      console.log('\nElectron published no debugging target within ' + (LOAD_TIMEOUT_MS / 1000) + ' seconds.');
      console.log('This usually means there is no desktop session (headless console).');
      console.log('Run this script from an interactive desktop, or under xvfb-run on Linux.');
      if (lastStderr.trim()) console.log('\nElectron stderr:\n' + lastStderr.trim().split('\n').slice(-15).join('\n'));
      return { fatal: true };
    }
    record('window loads index within ' + (LOAD_TIMEOUT_MS / 1000) + ' s', true, target.url.split('/').pop());

    cdp = await connect(target);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    await sleep(5000);
    const noise = cdp.consoleErrors.concat(cdp.exceptions)
      .filter((e) => !/ServiceWorker|Failed to load resource.*devtools|Autofill/i.test(e));
    record('zero console errors and exceptions after 5 s', noise.length === 0,
      noise.length ? noise.slice(0, 3).join(' | ') : '');

    const isDesktop = await cdp.evalJs('!!(window.electronAPI && window.electronAPI.isDesktopApp)');
    record('electronAPI.isDesktopApp is true', isDesktop === true, String(isDesktop));

    const release = await cdp.evalJs(
      'window.electronAPI && window.electronAPI.app && typeof window.electronAPI.app.getReleaseInfo === "function"'
      + ' ? window.electronAPI.app.getReleaseInfo().then(function(i){ return JSON.stringify(i); }) : "missing"'
    );
    let releaseInfo = null;
    try { releaseInfo = JSON.parse(release); } catch (_) {}
    record('getReleaseInfo() returns the version',
      !!(releaseInfo && releaseInfo.version && /^\d+\.\d+\.\d+/.test(releaseInfo.version)),
      release);

    // Dismiss the intro so the exam functions are reachable, then run one short exam.
    await cdp.evalJs(
      '(function(){ try{ localStorage.setItem(' + JSON.stringify(introSeenKey()) + ',"1"); }catch(e){}'
      + ' document.documentElement.classList.remove("boot-intro-active");'
      + ' var i=document.getElementById("aplusBootIntro"); if(i&&i.parentNode) i.parentNode.removeChild(i);'
      + ' return 1; })()'
    );
    await sleep(500);
    await cdp.send('Page.bringToFront');
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    if (shot && shot.result && shot.result.data) {
      fs.writeFileSync(SHOT_PATH, Buffer.from(shot.result.data, 'base64'));
      record('screenshot written', true, SHOT_PATH);
    } else {
      record('screenshot written', false, 'captureScreenshot returned nothing');
    }

    let examOk = false;
    let examDetail = '';
    try {
      const started = await cdp.evalJs('typeof startExam==="function" ? (startExam("core1",5,5), "started") : "no startExam"');
      await sleep(1500);
      const finished = await cdp.evalJs(
        'typeof finishExam==="function" ? (window.confirm=function(){return true;}, finishExam(), "finished") : "no finishExam"'
      );
      await sleep(2000);
      examOk = started === 'started' && finished === 'finished';
      examDetail = started + ' / ' + finished;
    } catch (err) {
      examDetail = (err && err.message) || 'exam threw';
    }
    record('startExam("core1",5,5) then finishExam()', examOk, examDetail);

    // Let the debounced writes land before the process goes away.
    await sleep(1500);
    return { fatal: false };
  } finally {
    // Close the window the way a learner would. On Windows the last window
    // closing quits the app, which lets Chromium commit localStorage and the
    // learner database to disk. A forced kill can lose the last few seconds
    // of writes and would make the relaunch check fail for the wrong reason.
    if (cdp && cdp.evalJs) {
      try { await cdp.evalJs('setTimeout(function(){ window.close(); }, 50); 1'); } catch (_) {}
    }
    if (cdp && cdp.ws) { try { cdp.ws.close(); } catch (_) {} }
    await waitForExit(child, 8000);
    killTree(child);
    await sleep(1500);
  }
}

function waitForExit(child, timeoutMs) {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null) return resolve();
    const t = setTimeout(resolve, timeoutMs);
    child.once('exit', () => { clearTimeout(t); resolve(); });
  });
}

function checkDatabase() {
  const dbPath = findDatabaseFile();
  if (!dbPath) {
    record('learner database exists under userData/memory', false, 'aplus_user_db.json not found');
    return;
  }
  const size = fs.statSync(dbPath).size;
  record('learner database exists under userData/memory', true, dbPath);
  record('database is under 2 MB', size < 2 * 1024 * 1024, (size / 1024).toFixed(1) + ' KB');
  let parsed = null;
  try {
    parsed = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch (err) {
    record('database is valid JSON', false, (err && err.message) || 'parse error');
    return;
  }
  record('database is valid JSON', true);
  const nested = parsed && typeof parsed === 'object'
    && Object.prototype.hasOwnProperty.call(parsed, 'comptia_database_master_v3');
  record('database is not self-nested', !nested,
    nested ? 'comptia_database_master_v3 present' : 'no master key');
}

async function secondRun() {
  const child = launch();
  let cdp = null;
  try {
    const target = await waitForTarget(LOAD_TIMEOUT_MS);
    if (!target) {
      record('relaunch: boot intro does not replay', false, 'no CDP target on relaunch');
      return;
    }
    cdp = await connect(target);
    await cdp.send('Runtime.enable');
    await sleep(1500);
    const state = await cdp.evalJs(
      '(function(){ var el=document.getElementById("aplusBootIntro");'
      + ' return JSON.stringify({ present: !!el, hidden: !el || el.hidden === true || getComputedStyle(el).display === "none",'
      + ' active: document.documentElement.classList.contains("boot-intro-active") }); })()'
    );
    let parsed = null;
    try { parsed = JSON.parse(state); } catch (_) {}
    const ok = !!parsed && parsed.hidden === true && parsed.active === false;
    record('relaunch: boot intro does not replay within 1.5 s', ok, state);
  } finally {
    if (cdp && cdp.ws) { try { cdp.ws.close(); } catch (_) {} }
    killTree(child);
    await sleep(1500);
  }
}

(async () => {
  if (!fs.existsSync(EXE)) {
    console.error('Executable not found: ' + EXE);
    console.error('Build it first: python tools/build_windows_installer.py --portable');
    process.exit(1);
  }
  console.log('Executable: ' + EXE);
  console.log('User data:  ' + USER_DATA);
  console.log('');

  fs.rmSync(USER_DATA, { recursive: true, force: true });
  fs.mkdirSync(SCRATCH, { recursive: true });
  fs.mkdirSync(USER_DATA, { recursive: true });

  const first = await firstRun();
  if (!first.fatal) {
    checkDatabase();
    await secondRun();
  }

  const failed = results.filter((r) => !r.pass);
  console.log('');
  console.log('='.repeat(60));
  console.log('  ' + (results.length - failed.length) + ' passed, ' + failed.length + ' failed');
  console.log('='.repeat(60));
  process.exit(failed.length ? 1 : 0);
})().catch((err) => {
  console.error('smoke test crashed: ' + ((err && err.stack) || err));
  process.exit(1);
});
