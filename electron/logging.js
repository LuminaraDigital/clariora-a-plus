/** electron/logging.js - Rotating local logs for the desktop main process. */
'use strict';

const path = require('path');
const fs = require('fs');
const { app } = require('electron');

const LOG_MAX_BYTES = 1024 * 1024;
const LOG_KEEP_FILES = 2;
let logDir = null;
let logFile = null;

function getLogDir() {
  if (!logDir) {
    logDir = path.join(app.getPath('userData'), 'logs');
  }
  return logDir;
}

function getLogFile() {
  if (!logFile) {
    logFile = path.join(getLogDir(), 'main.log');
  }
  return logFile;
}

function rotateLogIfNeeded() {
  const file = getLogFile();
  let size = 0;
  try {
    size = fs.statSync(file).size;
  } catch (_) {
    return;
  }
  if (size < LOG_MAX_BYTES) return;
  try {
    // Keep main.log plus (LOG_KEEP_FILES - 1) rolled generations.
    for (let i = LOG_KEEP_FILES - 1; i >= 1; i--) {
      const older = file + '.' + i;
      const newer = i === 1 ? file : file + '.' + (i - 1);
      if (fs.existsSync(newer)) {
        try { fs.rmSync(older, { force: true }); } catch (_) {}
        fs.renameSync(newer, older);
      }
    }
  } catch (_) {}
}

function scrubSecrets(text) {
  return String(text)
    .replace(/(Bearer\s+)[A-Za-z0-9._\-]+/gi, '$1[redacted]')
    .replace(/(gsk_)[A-Za-z0-9._\-]+/gi, '$1[redacted]')
    .replace(/("?\bapi[_-]?key"?\s*[:=]\s*"?)[^",\s}]+/gi, '$1[redacted]');
}

function writeLog(level, message) {
  const lvl = String(level || 'info').toLowerCase();
  const line = '[' + new Date().toISOString() + '] [' + lvl + '] ' + scrubSecrets(message) + '\n';
  try {
    fs.mkdirSync(getLogDir(), { recursive: true });
    rotateLogIfNeeded();
    fs.appendFileSync(getLogFile(), line, 'utf8');
  } catch (_) {
    // Logging must never take the app down.
  }
  if (lvl === 'error' || lvl === 'warn') {
    console.warn(line.trim());
  }
}

/* ------------------------------------------------------------------------ */

module.exports = { getLogDir, getLogFile, rotateLogIfNeeded, scrubSecrets, writeLog };
