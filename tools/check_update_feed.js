#!/usr/bin/env node
/**
 * tools/check_update_feed.js - Prove an installed build can see the newest release.
 *
 * Launches a packaged exe (an OLDER version than the one on GitHub Releases)
 * with remote debugging, asks its renderer to run electronAPI.updates.check(),
 * and waits for the updater to report a phase. Exit 0 when the feed answers
 * "available" with a newer version, 1 otherwise.
 *
 * Usage: node tools/check_update_feed.js release/Clariora_Portable_3.1.4.exe
 */
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  sleep,
  waitForTarget,
  connect,
  killTree
} = require('./electron_cdp_harness');

const EXE = process.argv[2];
if (!EXE || !fs.existsSync(EXE)) {
  console.error('usage: node tools/check_update_feed.js <path to packaged exe>');
  process.exit(2);
}
const PORT = 9333;
const USER_DATA = path.join(os.tmpdir(), 'aplus-update-feed-check');
fs.rmSync(USER_DATA, { recursive: true, force: true });

(async () => {
  const child = spawn(EXE, ['--remote-debugging-port=' + PORT, '--user-data-dir=' + USER_DATA], {
    stdio: 'ignore',
    windowsHide: false
  });
  let exit = 1;
  try {
    const target = await waitForTarget(PORT, 60000);
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
    killTree(child);
    await sleep(500);
  }
  process.exit(exit);
})();
