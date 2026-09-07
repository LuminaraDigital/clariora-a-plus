#!/usr/bin/env node
/**
 * tools/check_update_feed.js - Prove an installed build can see the newest release.
 *
 * Launches a packaged exe (an OLDER version than the one on GitHub Releases)
 * with remote debugging, asks its renderer to run electronAPI.updates.check(),
 * and waits for the updater to report a phase. Exit 0 when the feed answers
 * "available" with a newer version, 1 otherwise.
 *
 * Usage: node tools/check_update_feed.js release/CompTIA_A_Plus_Portable_3.1.4.exe
 */
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EXE = process.argv[2];
if (!EXE || !fs.existsSync(EXE)) {
  console.error('usage: node tools/check_update_feed.js <path to packaged exe>');
  process.exit(2);
}
const PORT = 9333;
const USER_DATA = path.join(os.tmpdir(), 'aplus-update-feed-check');
fs.rmSync(USER_DATA, { recursive: true, force: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForTarget(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const list = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
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
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
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
  return { ws, evalJs };
}

(async () => {
  const child = spawn(EXE, ['--remote-debugging-port=' + PORT, '--user-data-dir=' + USER_DATA], {
    stdio: 'ignore',
    windowsHide: false
  });
  let exit = 1;
  try {
    const target = await waitForTarget(60000);
    if (!target) throw new Error('no CDP target after 60 s');
    const cdp = await connect(target);
    await sleep(2500);
    const info = await cdp.evalJs('window.electronAPI && electronAPI.app && electronAPI.app.getReleaseInfo ? electronAPI.app.getReleaseInfo() : null');
    console.log('running version :', info && info.version);
    await cdp.evalJs('electronAPI.updates.check()');
    let status = null;
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      status = await cdp.evalJs('electronAPI.updates.getStatus()');
      if (status && ['available', 'idle', 'error', 'disabled', 'downloading', 'ready'].indexOf(status.phase) >= 0) break;
      await sleep(500);
    }
    console.log('updater status  :', JSON.stringify(status));
    if (status && status.phase === 'available') {
      console.log('RESULT: update to ' + (status.version || status.info && status.info.version || '?') + ' is offered to ' + (info && info.version));
      exit = 0;
    } else if (status && (status.phase === 'downloading' || status.phase === 'ready')) {
      console.log('RESULT: update already ' + status.phase);
      exit = 0;
    } else {
      console.log('RESULT: no update offered');
    }
    cdp.ws.close();
  } catch (err) {
    console.log('FAIL:', err.message);
  } finally {
    try { child.kill(); } catch (_) {}
    await sleep(500);
    try { spawn('taskkill', ['/F', '/T', '/PID', String(child.pid)], { stdio: 'ignore' }); } catch (_) {}
  }
  process.exit(exit);
})();
