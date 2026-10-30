/**
 * Shared Chrome DevTools Protocol helpers for packaged Electron tooling.
 * Used by smoke_electron, capture_screenshots, and check_update_feed.
 */
'use strict';

const { spawn } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function defaultExePath() {
  if (process.platform === 'win32') {
    return path.join(ROOT, 'release', 'portable', 'CompTIA_A_Plus_Simulator.exe');
  }
  if (process.platform === 'darwin') {
    return path.join(ROOT, 'release', 'mac', 'Clariora.app', 'Contents', 'MacOS', 'Clariora');
  }
  return path.join(ROOT, 'release', 'linux', 'linux-unpacked', 'comptia-a-plus-master');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function launchExe(exe, port, userDataDir, extraArgs, options) {
  const opts = options || {};
  const args = [
    '--remote-debugging-port=' + port,
    '--user-data-dir=' + userDataDir
  ];
  if (process.platform === 'linux' && opts.noSandbox !== false) {
    args.push('--no-sandbox');
  }
  const child = spawn(exe, args.concat(extraArgs || []), {
    stdio: opts.stdio !== undefined ? opts.stdio : 'ignore',
    windowsHide: opts.windowsHide !== undefined ? opts.windowsHide : false
  });
  return child;
}

async function waitForTarget(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch('http://127.0.0.1:' + port + '/json/list');
      const list = await res.json();
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch (_) {}
    await sleep(250);
  }
  return null;
}

/**
 * Minimal CDP client over the Node global WebSocket.
 * @param {object} target CDP target with webSocketDebuggerUrl
 * @param {{trackConsole?: boolean}} [options]
 */
async function connect(target, options) {
  const opts = options || {};
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
    if (opts.trackConsole) {
      if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails || {};
        exceptions.push(String((d.exception && d.exception.description) || d.text || 'exception').split('\n')[0]);
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        consoleErrors.push(msg.params.args.map((a) => a.value || a.description || '').join(' ').slice(0, 200));
      }
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

function killTree(child) {
  if (!child || child.killed) return;
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      child.kill('SIGKILL');
    }
  } catch (_) {}
}

module.exports = {
  ROOT,
  defaultExePath,
  sleep,
  launchExe,
  waitForTarget,
  connect,
  killTree
};
