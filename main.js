const { app, BrowserWindow, Menu, shell, dialog, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

/**
 * The version is never typed twice. package.json is the build-time source (the
 * installer writes release.config.json's version into it), and this reads it back.
 */
function readAppVersion() {
  try {
    const pkg = require('./package.json');
    if (pkg && typeof pkg.version === 'string' && pkg.version) return pkg.version;
  } catch (_) {}
  try {
    return app.getVersion();
  } catch (_) {
    return '0.0.0';
  }
}

const APP_VERSION = readAppVersion();

/* ---------------------------------------------------------------------------
 * The app was renamed to Clariora. Electron derives the userData folder from
 * the product name, so a learner who installed under the old name would
 * otherwise start with an empty database. Before anything touches userData,
 * move the legacy folder to the new location once. If the move fails (locked
 * files, cross-volume), keep reading from the legacy folder instead.
 * ------------------------------------------------------------------------ */
const LEGACY_PRODUCT_NAMES = ['CompTIA A+ Exam Simulator', 'CompTIA A+ Master'];

function migrateLegacyUserData() {
  let current;
  try { current = app.getPath('userData'); } catch (_) { return; }
  try {
    if (fs.existsSync(current) && fs.readdirSync(current).length > 0) return;
  } catch (_) { return; }
  const parent = path.dirname(current);
  for (const legacyName of LEGACY_PRODUCT_NAMES) {
    const legacy = path.join(parent, legacyName);
    if (legacy === current) continue;
    let hasData = false;
    try { hasData = fs.existsSync(legacy) && fs.readdirSync(legacy).length > 0; } catch (_) {}
    if (!hasData) continue;
    try {
      try { fs.rmdirSync(current); } catch (_) {}
      fs.renameSync(legacy, current);
    } catch (_) {
      try { app.setPath('userData', legacy); } catch (_) {}
    }
    return;
  }
}

migrateLegacyUserData();

const PROGRESS_FILE = 'aplus_progress.json';
const DATABASE_FILE = 'aplus_user_db.json';
const WINDOW_STATE_FILE = 'window-state.json';

/* ---------------------------------------------------------------------------
 * release.config.json is the single source of release truth. It is read once at
 * startup from the app path and handed to the renderer through
 * electronAPI.app.getReleaseInfo(). Change the URLs there, nowhere else.
 * ------------------------------------------------------------------------ */

const RELEASE_CONFIG_FILE = 'release.config.json';
const RELEASE_CONFIG_DEFAULTS = {
  version: APP_VERSION,
  productName: 'Clariora',
  publisher: 'Datacentre Academy',
  updateBaseUrl: '',
  mediaBaseUrl: '',
  mediaPackName: ''
};

let releaseConfigCache = null;

function loadReleaseConfig() {
  if (releaseConfigCache) return releaseConfigCache;
  const candidates = [];
  try { candidates.push(path.join(app.getAppPath(), RELEASE_CONFIG_FILE)); } catch (_) {}
  candidates.push(path.join(__dirname, RELEASE_CONFIG_FILE));
  let parsed = null;
  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const raw = JSON.parse(fs.readFileSync(candidate, 'utf8'));
      if (raw && typeof raw === 'object') {
        parsed = raw;
        break;
      }
    } catch (_) {}
  }
  if (!parsed) {
    writeLog('warn', 'release.config.json not found, using defaults');
    parsed = {};
  }
  releaseConfigCache = Object.assign({}, RELEASE_CONFIG_DEFAULTS, parsed, { version: APP_VERSION });
  return releaseConfigCache;
}

let mainWindow = null;
let progressCache = null;
let progressPath = null;
let databaseCache = null;
let databasePath = null;

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_ALLOWED_HOST = 'api.groq.com';

/* ---------------------------------------------------------------------------
 * Rotating log file: userData/logs/main.log, 1 MB cap, 2 files kept.
 * No network telemetry is ever sent from the main process.
 * ------------------------------------------------------------------------ */

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

function getProgressPath() {
  if (!progressPath) {
    progressPath = path.join(app.getPath('userData'), PROGRESS_FILE);
  }
  return progressPath;
}

function getProgressBackupPath() {
  return getProgressPath().replace(/\.json$/i, '') + '.backup.json';
}

function isPortableInstall() {
  try {
    return fs.existsSync(path.join(path.dirname(process.execPath), 'portable.txt'));
  } catch (_) {
    return false;
  }
}

function getDatabasePath() {
  if (!databasePath) {
    const exeDir = path.dirname(process.execPath);
    const portableMarker = path.join(exeDir, 'portable.txt');
    const isPackaged = app.isPackaged;
    if (isPackaged && fs.existsSync(portableMarker)) {
      databasePath = path.join(exeDir, 'data', DATABASE_FILE);
    } else {
      databasePath = path.join(app.getPath('userData'), 'memory', DATABASE_FILE);
    }
  }
  return databasePath;
}

function loadProgress() {
  if (progressCache) return progressCache;
  try {
    const raw = fs.readFileSync(getProgressPath(), 'utf8');
    const parsed = JSON.parse(raw);
    progressCache = parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    try {
      const rawBackup = fs.readFileSync(getProgressBackupPath(), 'utf8');
      const parsedBackup = JSON.parse(rawBackup);
      progressCache = parsedBackup && typeof parsedBackup === 'object' ? parsedBackup : {};
    } catch (_2) {
      progressCache = {};
    }
  }
  return progressCache;
}

/**
 * Atomic progress write: tmp file, one .backup.json generation, rename into place.
 * Same pattern as writeDatabaseAtomic.
 */
function writeProgressAtomic() {
  const file = getProgressPath();
  const tmpPath = file + '.tmp';
  const serialized = JSON.stringify(progressCache || {}, null, 2);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(tmpPath, serialized, 'utf8');
  try {
    if (fs.existsSync(file)) fs.copyFileSync(file, getProgressBackupPath());
  } catch (_) {}
  fs.renameSync(tmpPath, file);
  return { ok: true, bytes: serialized.length, path: file };
}

const PROGRESS_DEBOUNCE_MS = 250;
let progressTimer = null;

function flushProgress() {
  if (progressTimer) {
    clearTimeout(progressTimer);
    progressTimer = null;
  }
  try {
    return writeProgressAtomic();
  } catch (err) {
    writeLog('error', 'progress write failed: ' + ((err && err.message) || err));
    return { ok: false, error: (err && err.message) || 'write_failed' };
  }
}

/** Coalesce bursts of renderer writes into one file write per 250 ms. */
function saveProgress() {
  if (progressTimer) clearTimeout(progressTimer);
  progressTimer = setTimeout(() => {
    progressTimer = null;
    try {
      writeProgressAtomic();
    } catch (err) {
      writeLog('error', 'progress write failed: ' + ((err && err.message) || err));
    }
  }, PROGRESS_DEBOUNCE_MS);
}

const DB_MASTER_KEY = 'comptia_database_master_v3';
const DB_MAX_BYTES = 24 * 1024 * 1024; // hard cap: a healthy learner DB is well under 1 MB

function getBackupPath() {
  return getDatabasePath().replace(/\.json$/i, '') + '.backup.json';
}

function isLearnerKey(k) {
  if (typeof k !== 'string') return false;
  if (k === DB_MASTER_KEY || k.startsWith('comptia_database_master')) return false;
  if (k === 'setItem' || k === 'removeItem' || k === 'getItem') return false;
  return k === '_meta' || k.startsWith('comptia_') || k.startsWith('aplus3_');
}

/**
 * v3.0.0 stored the whole DB inside itself on every save, doubling the file each time.
 * Unwrap any nesting (outer values are newest) and drop keys that are not learner state.
 */
function repairSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const out = {};
  let cursor = snapshot;
  let levels = 0;
  while (cursor && typeof cursor === 'object' && levels < 64) {
    for (const k of Object.keys(cursor)) {
      if (!isLearnerKey(k) || Object.prototype.hasOwnProperty.call(out, k)) continue;
      out[k] = k === '_meta' ? cursor[k] : (typeof cursor[k] === 'string' ? cursor[k] : JSON.stringify(cursor[k]));
    }
    const nested = cursor[DB_MASTER_KEY];
    if (nested === undefined || nested === null) break;
    try {
      cursor = typeof nested === 'string' ? JSON.parse(nested) : nested;
    } catch (_) {
      break;
    }
    levels++;
  }
  if (levels > 0) {
    out._meta = Object.assign({}, out._meta || {}, { repairedNestedLevels: levels, repairedAt: new Date().toISOString() });
    console.warn('[Main] Repaired self-nested learner DB: unwrapped ' + levels + ' level(s).');
  }
  return out;
}

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function loadDatabase() {
  if (databaseCache) return databaseCache;
  const filePath = getDatabasePath();
  let parsed = null;
  try {
    parsed = readJsonFile(filePath);
  } catch (err) {
    console.warn('[Main] Primary DB unreadable, trying backup:', err && err.message);
    try { parsed = readJsonFile(getBackupPath()); } catch (_) { parsed = null; }
  }
  if (!parsed) {
    databaseCache = null;
    return databaseCache;
  }
  const repaired = repairSnapshot(parsed);
  databaseCache = repaired;
  if (repaired && repaired._meta && repaired._meta.repairedNestedLevels) {
    // Persist the repaired, compact file immediately so the bloated one is gone.
    writeDatabaseAtomic(repaired);
  }
  return databaseCache;
}

/**
 * Atomic write: serialize, write to a temp file, keep one backup generation, rename into place.
 */
function writeDatabaseAtomic(data) {
  const filePath = getDatabasePath();
  const tmpPath = filePath + '.tmp';
  const clean = repairSnapshot(data) || {};
  const serialized = JSON.stringify(clean);
  if (serialized.length > DB_MAX_BYTES) {
    return { ok: false, error: 'snapshot_too_large', bytes: serialized.length };
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(tmpPath, serialized, 'utf8');
  try {
    if (fs.existsSync(filePath)) fs.copyFileSync(filePath, getBackupPath());
  } catch (_) {}
  fs.renameSync(tmpPath, filePath);
  databaseCache = clean;
  return { ok: true, bytes: serialized.length, path: filePath };
}

function saveDatabase(data) {
  try {
    return writeDatabaseAtomic(data).ok === true;
  } catch (err) {
    console.error('[Main] saveDatabase error:', err);
    return false;
  }
}

/**
 * First run on a new PC: make sure the folders exist before the renderer provisions
 * the default schema. Main never invents learner content, it only creates the paths.
 */
function ensureStorageLayout() {
  try {
    fs.mkdirSync(path.dirname(getDatabasePath()), { recursive: true });
  } catch (err) {
    writeLog('error', 'could not create memory dir: ' + ((err && err.message) || err));
  }
  try {
    fs.mkdirSync(getLogDir(), { recursive: true });
  } catch (_) {}
  try {
    fs.mkdirSync(path.dirname(getProgressPath()), { recursive: true });
  } catch (_) {}
}

ipcMain.on('database:getAll', (event) => {
  event.returnValue = loadDatabase();
});

ipcMain.on('database:saveAll', (event, data) => {
  event.returnValue = saveDatabase(data);
});

ipcMain.handle('database:saveAllAsync', async (_event, data) => {
  try {
    return writeDatabaseAtomic(data);
  } catch (err) {
    console.error('[Main] saveAllAsync error:', err);
    return { ok: false, error: (err && err.message) || 'write_failed' };
  }
});

ipcMain.on('database:getInfo', (event) => {
  const filePath = getDatabasePath();
  const exists = fs.existsSync(filePath);
  let size = 0;
  if (exists) {
    try { size = fs.statSync(filePath).size; } catch (_) {}
  }
  event.returnValue = {
    path: filePath,
    exists: exists,
    sizeBytes: size,
    isPortable: fs.existsSync(path.join(path.dirname(process.execPath), 'portable.txt'))
  };
});

ipcMain.handle('app:getPaths', async () => {
  return {
    userData: app.getPath('userData'),
    logs: getLogDir(),
    logFile: getLogFile(),
    dbPath: getDatabasePath(),
    progressPath: getProgressPath(),
    version: APP_VERSION,
    isPortable: isPortableInstall(),
    isPackaged: app.isPackaged
  };
});

// The sandboxed preload cannot read package.json, so it asks for the version here.
ipcMain.on('app:versionSync', (event) => {
  event.returnValue = APP_VERSION;
});

ipcMain.handle('app:getReleaseInfo', async () => {
  const cfg = loadReleaseConfig();
  return {
    version: cfg.version,
    updateBaseUrl: cfg.updateBaseUrl,
    mediaBaseUrl: cfg.mediaBaseUrl
  };
});

/* ---------------------------------------------------------------------------
 * Media delivery. Course video packs are never shipped inside the installer.
 * They are downloaded on demand into userData/media, checksum verified, and
 * unpacked. Every path is normalized and confined to an allowed root.
 * ------------------------------------------------------------------------ */

const MEDIA_MAX_BYTES = 8 * 1024 * 1024 * 1024; // sanity ceiling for a course pack

function getUserMediaDir() {
  return path.join(app.getPath('userData'), 'media');
}

/** True when target resolves to root itself or something beneath it. */
function isInsideRoot(root, target) {
  const rel = path.relative(path.resolve(root), path.resolve(target));
  if (rel === '') return true;
  return !rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel);
}

/**
 * Join a caller-supplied relative path onto a root, refusing anything absolute,
 * anything with a drive letter, and anything that climbs out with "..".
 */
function safeJoin(root, relPath) {
  const raw = String(relPath == null ? '' : relPath).trim();
  if (!raw) return null;
  if (/^[a-zA-Z]:/.test(raw) || /^[\\/]{2}/.test(raw)) return null;
  const cleaned = raw.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!cleaned) return null;
  const normalized = path.normalize(cleaned);
  if (path.isAbsolute(normalized)) return null;
  const abs = path.resolve(root, normalized);
  if (!isInsideRoot(root, abs)) return null;
  return abs;
}

function directorySizeBytes(dir) {
  let total = 0;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (_) {
    return 0;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += directorySizeBytes(full);
    } else if (entry.isFile()) {
      try { total += fs.statSync(full).size; } catch (_) {}
    }
  }
  return total;
}

ipcMain.handle('media:resolve', async (_event, relPath) => {
  try {
    const appRoot = app.getAppPath();
    const userRoot = getUserMediaDir();
    const stripped = String(relPath == null ? '' : relPath).replace(/\\/g, '/').replace(/^\/+/, '').replace(/^media\//i, '');
    const candidates = [
      safeJoin(userRoot, relPath),
      safeJoin(userRoot, stripped),
      safeJoin(appRoot, relPath)
    ];
    for (const candidate of candidates) {
      if (!candidate) continue;
      try {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return { ok: true, url: pathToFileURL(candidate).href };
        }
      } catch (_) {}
    }
    return { ok: false, url: null };
  } catch (err) {
    writeLog('warn', 'media:resolve failed: ' + ((err && err.message) || err));
    return { ok: false, url: null };
  }
});

ipcMain.handle('media:packStatus', async () => {
  const dir = getUserMediaDir();
  let installed = false;
  try {
    installed = fs.existsSync(dir) && fs.statSync(dir).isDirectory() && fs.readdirSync(dir).length > 0;
  } catch (_) {
    installed = false;
  }
  return {
    installed: installed,
    bytes: installed ? directorySizeBytes(dir) : 0,
    path: dir
  };
});

function mediaPackUrl(requested) {
  const cfg = loadReleaseConfig();
  const base = String(cfg.mediaBaseUrl || '');
  if (!base) return { error: 'media_base_url_missing' };
  let baseUrl;
  try {
    baseUrl = new URL(base);
  } catch (_) {
    return { error: 'media_base_url_invalid' };
  }
  if (baseUrl.protocol !== 'https:') return { error: 'media_base_url_not_https' };

  let target;
  if (requested) {
    try {
      target = new URL(String(requested));
    } catch (_) {
      return { error: 'bad_url' };
    }
  } else {
    if (!cfg.mediaPackName) return { error: 'media_pack_name_missing' };
    try {
      target = new URL(cfg.mediaPackName, baseUrl.href);
    } catch (_) {
      return { error: 'bad_url' };
    }
  }
  if (target.protocol !== 'https:') return { error: 'not_https' };
  if (target.host !== baseUrl.host) return { error: 'host_not_allowed' };
  return { url: target };
}

async function fetchSha256Sidecar(packUrl) {
  const sidecar = new URL(packUrl.href + '.sha256');
  const res = await fetch(sidecar.href, { redirect: 'follow' });
  if (!res.ok) return null;
  const text = (await res.text()).trim();
  const match = text.match(/\b[a-fA-F0-9]{64}\b/);
  return match ? match[0].toLowerCase() : null;
}

function extractZipSafely(zipPath, destDir) {
  let AdmZip;
  try {
    AdmZip = require('adm-zip');
  } catch (err) {
    throw new Error('zip_library_missing');
  }
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  for (const entry of entries) {
    const name = String(entry.entryName || '');
    const target = safeJoin(destDir, name);
    if (!target) throw new Error('unsafe_zip_entry');
  }
  let written = 0;
  for (const entry of entries) {
    const target = safeJoin(destDir, String(entry.entryName || ''));
    if (!target) throw new Error('unsafe_zip_entry');
    if (entry.isDirectory) {
      fs.mkdirSync(target, { recursive: true });
      continue;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const data = entry.getData();
    fs.writeFileSync(target, data);
    written += data.length;
  }
  return written;
}

ipcMain.handle('media:downloadPack', async (_event, options) => {
  const requested = options && options.url ? options.url : null;
  const resolved = mediaPackUrl(requested);
  if (resolved.error) {
    writeLog('warn', 'media:downloadPack rejected: ' + resolved.error);
    return { ok: false, error: resolved.error };
  }
  const packUrl = resolved.url;
  const destDir = getUserMediaDir();
  const tmpPath = path.join(app.getPath('userData'), 'media-pack-download.tmp');

  const send = (payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      try { mainWindow.webContents.send('media:progress', payload); } catch (_) {}
    }
  };

  try {
    let expected = null;
    try {
      expected = await fetchSha256Sidecar(packUrl);
    } catch (err) {
      writeLog('warn', 'media sha256 sidecar fetch failed: ' + ((err && err.message) || err));
    }
    if (!expected) {
      // Fail closed: an unverifiable pack is never written to disk.
      return { ok: false, error: 'checksum_unavailable' };
    }

    const res = await fetch(packUrl.href, { redirect: 'follow' });
    if (!res.ok || !res.body) {
      return { ok: false, error: 'http_' + res.status };
    }
    const totalHeader = Number(res.headers.get('content-length') || 0);
    const total = Number.isFinite(totalHeader) && totalHeader > 0 ? totalHeader : 0;
    if (total && total > MEDIA_MAX_BYTES) {
      return { ok: false, error: 'pack_too_large' };
    }

    fs.mkdirSync(path.dirname(tmpPath), { recursive: true });
    try { fs.rmSync(tmpPath, { force: true }); } catch (_) {}

    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    const handle = fs.openSync(tmpPath, 'w');
    let received = 0;
    let lastPercent = -1;
    try {
      const reader = res.body.getReader();
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        const buf = Buffer.from(chunk.value);
        received += buf.length;
        if (received > MEDIA_MAX_BYTES) throw new Error('pack_too_large');
        hash.update(buf);
        fs.writeSync(handle, buf);
        const percent = total ? Math.floor((received / total) * 100) : 0;
        if (percent !== lastPercent) {
          lastPercent = percent;
          send({ received: received, total: total, percent: percent });
        }
      }
    } finally {
      try { fs.closeSync(handle); } catch (_) {}
    }
    send({ received: received, total: total || received, percent: 100 });

    const actual = hash.digest('hex');
    if (actual !== expected) {
      try { fs.rmSync(tmpPath, { force: true }); } catch (_) {}
      writeLog('error', 'media pack checksum mismatch');
      return { ok: false, error: 'checksum_mismatch' };
    }

    fs.mkdirSync(destDir, { recursive: true });
    const bytes = extractZipSafely(tmpPath, destDir);
    try { fs.rmSync(tmpPath, { force: true }); } catch (_) {}
    writeLog('info', 'media pack installed, ' + bytes + ' bytes extracted');
    return { ok: true, bytes: bytes };
  } catch (err) {
    try { fs.rmSync(tmpPath, { force: true }); } catch (_) {}
    const message = (err && err.message) || 'download_failed';
    writeLog('warn', 'media:downloadPack failed: ' + message);
    return { ok: false, error: message };
  }
});

ipcMain.handle('media:removePack', async () => {
  const dir = getUserMediaDir();
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    return { ok: true, path: dir };
  } catch (err) {
    writeLog('warn', 'media:removePack failed: ' + ((err && err.message) || err));
    return { ok: false, error: (err && err.message) || 'remove_failed' };
  }
});

ipcMain.handle('log:write', async (_event, level, message) => {
  writeLog(level, 'renderer: ' + String(message));
  return true;
});

ipcMain.on('storage:get', (event, key) => {
  const store = loadProgress();
  event.returnValue = Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
});

ipcMain.on('storage:set', (event, key, value) => {
  try {
    const store = loadProgress();
    store[String(key)] = value;
    progressCache = store;
    saveProgress();
    event.returnValue = true;
  } catch (err) {
    event.returnValue = false;
  }
});

ipcMain.on('storage:remove', (event, key) => {
  try {
    const store = loadProgress();
    delete store[String(key)];
    progressCache = store;
    saveProgress();
    event.returnValue = true;
  } catch (_) {
    event.returnValue = false;
  }
});

ipcMain.handle('storage:getAsync', async (_event, key) => {
  const store = loadProgress();
  return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
});

ipcMain.handle('storage:setAsync', async (_event, key, value) => {
  try {
    const store = loadProgress();
    store[String(key)] = value;
    progressCache = store;
    saveProgress();
    return true;
  } catch (err) {
    writeLog('error', 'storage:setAsync failed: ' + ((err && err.message) || err));
    return false;
  }
});

ipcMain.handle('storage:removeAsync', async (_event, key) => {
  try {
    const store = loadProgress();
    delete store[String(key)];
    progressCache = store;
    saveProgress();
    return true;
  } catch (err) {
    writeLog('error', 'storage:removeAsync failed: ' + ((err && err.message) || err));
    return false;
  }
});

ipcMain.handle('storage:exportFile', async (_event, name, content) => {
  const safeName = String(name || 'aplus-export.json').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export CompTIA A+ progress',
    defaultPath: safeName,
    filters: [
      { name: 'JSON', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (result.canceled || !result.filePath) {
    return { ok: false, canceled: true };
  }
  fs.writeFileSync(result.filePath, String(content ?? ''), 'utf8');
  return { ok: true, path: result.filePath };
});

ipcMain.handle('groq:chat', async (_event, payload) => {
  try {
    const apiKey = payload && payload.apiKey ? String(payload.apiKey).trim() : '';
    if (!apiKey) {
      return { ok: false, error: 'missing_api_key' };
    }

    // Hard guard: this handler only ever talks to api.groq.com.
    const target = new URL(GROQ_CHAT_URL);
    if (target.protocol !== 'https:' || target.hostname !== GROQ_ALLOWED_HOST) {
      writeLog('error', 'groq: blocked non-Groq endpoint');
      return { ok: false, error: 'blocked_endpoint' };
    }

    const body = {
      model: (payload && payload.model) || 'qwen/qwen3.8-27b',
      messages: (payload && payload.messages) || [],
      temperature: typeof (payload && payload.temperature) === 'number' ? payload.temperature : 0.2,
      max_tokens: typeof (payload && payload.max_tokens) === 'number' ? payload.max_tokens : 220
    };

    const res = await fetch(GROQ_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey
      },
      body: JSON.stringify(body)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Never log the key: scrubSecrets also strips Bearer tokens defensively.
      writeLog('warn', 'groq http ' + res.status + ' model=' + body.model);
      return {
        ok: false,
        error: (data && data.error && data.error.message) || ('http_' + res.status),
        raw: data
      };
    }

    const content = data && data.choices && data.choices[0] && data.choices[0].message
      ? String(data.choices[0].message.content || '').trim()
      : '';

    return { ok: true, content: content, model: body.model, raw: data };
  } catch (err) {
    writeLog('warn', 'groq request failed: ' + ((err && err.message) || 'groq_ipc_error'));
    return { ok: false, error: (err && err.message) || 'groq_ipc_error' };
  }
});

/* ---------------------------------------------------------------------------
 * Window state
 * ------------------------------------------------------------------------ */

const DEFAULT_BOUNDS = { width: 1480, height: 920 };
const MIN_WIDTH = 1024;
const MIN_HEIGHT = 680;

function getWindowStatePath() {
  return path.join(app.getPath('userData'), WINDOW_STATE_FILE);
}

function loadWindowState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(getWindowStatePath(), 'utf8'));
    if (!parsed || typeof parsed !== 'object') return Object.assign({}, DEFAULT_BOUNDS);
    const state = {
      width: Number.isFinite(parsed.width) ? Math.max(MIN_WIDTH, parsed.width) : DEFAULT_BOUNDS.width,
      height: Number.isFinite(parsed.height) ? Math.max(MIN_HEIGHT, parsed.height) : DEFAULT_BOUNDS.height,
      maximized: parsed.maximized === true
    };
    if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
      state.x = parsed.x;
      state.y = parsed.y;
    }
    return state;
  } catch (_) {
    return Object.assign({}, DEFAULT_BOUNDS);
  }
}

function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    const maximized = mainWindow.isMaximized();
    const bounds = maximized ? mainWindow.getNormalBounds() : mainWindow.getBounds();
    fs.writeFileSync(getWindowStatePath(), JSON.stringify({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      maximized: maximized
    }, null, 2), 'utf8');
  } catch (err) {
    writeLog('warn', 'could not save window state: ' + ((err && err.message) || err));
  }
}

/* ---------------------------------------------------------------------------
 * Auto-update.
 *
 * The feed is GitHub Releases by default: every tagged release already carries
 * the installers and the latest*.yml manifests, so updates never depend on a
 * separate host being live. release.config.json can override the provider with
 * a generic URL if the project ever moves.
 *
 * The renderer drives the experience. Main keeps one status object, pushes it
 * on every change, and answers three commands: check, download, install. A
 * failed check is a logged warning and a status the UI can show, never a crash
 * and never a blocking dialog.
 * ------------------------------------------------------------------------ */

const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
let autoUpdater = null;
let updateTimer = null;

/**
 * phase: disabled | idle | checking | available | downloading | ready | error
 * Everything the update card needs to render is in here, so a window opened
 * later can ask for the current state instead of missing the events.
 */
let updateStatus = {
  phase: 'disabled',
  version: null,
  releaseDate: null,
  notes: null,
  percent: 0,
  bytesPerSecond: 0,
  transferred: 0,
  total: 0,
  error: null,
  checkedAt: null,
  currentVersion: APP_VERSION,
  canInstall: false
};

function setUpdateStatus(patch) {
  updateStatus = Object.assign({}, updateStatus, patch || {});
  updateStatus.canInstall = updateStatus.phase === 'ready';
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.webContents.send('update:status', updateStatus);
    } catch (_) {}
  }
  return updateStatus;
}

/** Trim release notes to something a small card can show. */
function summariseNotes(info) {
  const raw = info && info.releaseNotes;
  if (!raw) return null;
  const text = Array.isArray(raw)
    ? raw.map((n) => (n && n.note) || '').join('\n')
    : String(raw);
  const plain = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!plain) return null;
  return plain.length > 400 ? plain.slice(0, 397) + '...' : plain;
}

function checkForUpdates(opts) {
  const manual = Boolean(opts && opts.manual);
  if (!autoUpdater) {
    return Promise.resolve(setUpdateStatus({ phase: 'disabled' }));
  }
  if (updateStatus.phase === 'downloading' || updateStatus.phase === 'ready') {
    return Promise.resolve(updateStatus);
  }
  setUpdateStatus({ phase: 'checking', error: null });
  return Promise.resolve()
    .then(() => autoUpdater.checkForUpdates())
    .then((result) => {
      // update-available / update-not-available events set the real phase.
      // If neither fired (offline provider quirk), fall back to idle.
      if (updateStatus.phase === 'checking') {
        setUpdateStatus({ phase: 'idle', checkedAt: new Date().toISOString() });
      }
      return result;
    })
    .catch((err) => {
      const message = (err && err.message) || String(err);
      writeLog('warn', 'update check failed: ' + message);
      setUpdateStatus({
        phase: 'error',
        error: manual ? message : null,
        checkedAt: new Date().toISOString()
      });
    });
}

function initAutoUpdater() {
  if (!app.isPackaged) {
    setUpdateStatus({ phase: 'disabled' });
    return;
  }
  // electron-updater can replace an AppImage in place; a .deb is updated by
  // the package manager, so the check would only log an error every launch.
  if (process.platform === 'linux' && !process.env.APPIMAGE) {
    writeLog('info', 'updater: skipped, this Linux package is updated by the package manager');
    setUpdateStatus({ phase: 'disabled' });
    return;
  }
  try {
    autoUpdater = require('electron-updater').autoUpdater;
  } catch (err) {
    writeLog('warn', 'electron-updater not available: ' + ((err && err.message) || err));
    setUpdateStatus({ phase: 'disabled' });
    return;
  }
  try {
    // Download only when the learner asks. An exam in progress must never be
    // interrupted by a background download eating bandwidth.
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.logger = null;

    const cfg = loadReleaseConfig();
    const gh = cfg.github;
    if (cfg.updateProvider !== 'generic' && gh && gh.owner && gh.repo) {
      autoUpdater.setFeedURL({ provider: 'github', owner: gh.owner, repo: gh.repo });
      writeLog('info', 'updater feed: github ' + gh.owner + '/' + gh.repo);
    } else if (cfg.updateBaseUrl && /^https:\/\//i.test(cfg.updateBaseUrl)) {
      autoUpdater.setFeedURL({ provider: 'generic', url: cfg.updateBaseUrl });
      writeLog('info', 'updater feed: generic ' + cfg.updateBaseUrl);
    }

    autoUpdater.on('error', (err) => {
      const message = (err && err.message) || String(err);
      writeLog('warn', 'updater error: ' + message);
      setUpdateStatus({ phase: 'error', error: message });
    });
    autoUpdater.on('update-available', (info) => {
      writeLog('info', 'update available: ' + ((info && info.version) || 'unknown'));
      setUpdateStatus({
        phase: 'available',
        version: (info && info.version) || null,
        releaseDate: (info && info.releaseDate) || null,
        notes: summariseNotes(info),
        checkedAt: new Date().toISOString(),
        percent: 0
      });
    });
    autoUpdater.on('update-not-available', () => {
      setUpdateStatus({ phase: 'idle', version: null, checkedAt: new Date().toISOString() });
    });
    autoUpdater.on('download-progress', (p) => {
      setUpdateStatus({
        phase: 'downloading',
        percent: Math.max(0, Math.min(100, Math.round((p && p.percent) || 0))),
        bytesPerSecond: (p && p.bytesPerSecond) || 0,
        transferred: (p && p.transferred) || 0,
        total: (p && p.total) || 0
      });
    });
    autoUpdater.on('update-downloaded', (info) => {
      writeLog('info', 'update downloaded: ' + ((info && info.version) || 'unknown'));
      setUpdateStatus({
        phase: 'ready',
        percent: 100,
        version: (info && info.version) || updateStatus.version,
        releaseDate: (info && info.releaseDate) || updateStatus.releaseDate,
        notes: summariseNotes(info) || updateStatus.notes
      });
      // Kept for the older toast in js/pwa-update.js.
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update:ready', {
          version: (info && info.version) || null,
          releaseDate: (info && info.releaseDate) || null
        });
      }
    });

    setUpdateStatus({ phase: 'idle' });
    // Give the window a moment to finish loading before the first check.
    setTimeout(() => checkForUpdates({ manual: false }), 8000);
    updateTimer = setInterval(() => checkForUpdates({ manual: false }), UPDATE_CHECK_INTERVAL_MS);
  } catch (err) {
    writeLog('warn', 'updater init failed: ' + ((err && err.message) || err));
    setUpdateStatus({ phase: 'disabled' });
  }
}

ipcMain.handle('update:getStatus', async () => updateStatus);

ipcMain.handle('update:check', async () => {
  await checkForUpdates({ manual: true });
  return updateStatus;
});

ipcMain.handle('update:download', async () => {
  if (!autoUpdater) return { ok: false, error: 'updater_unavailable' };
  if (updateStatus.phase === 'ready') return { ok: true, alreadyDownloaded: true };
  try {
    setUpdateStatus({ phase: 'downloading', percent: 0, error: null });
    await autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (err) {
    const message = (err && err.message) || 'download_failed';
    writeLog('warn', 'downloadUpdate failed: ' + message);
    setUpdateStatus({ phase: 'error', error: message });
    return { ok: false, error: message };
  }
});

ipcMain.handle('update:installNow', async () => {
  if (!autoUpdater) return { ok: false, error: 'updater_unavailable' };
  try {
    flushProgress();
    setImmediate(() => autoUpdater.quitAndInstall(false, true));
    return { ok: true };
  } catch (err) {
    writeLog('warn', 'quitAndInstall failed: ' + ((err && err.message) || err));
    return { ok: false, error: (err && err.message) || 'install_failed' };
  }
});

/* ------------------------------------------------------------------------ */

function attachRendererDiagnostics(contents) {
  contents.on('render-process-gone', (_event, details) => {
    writeLog('error', 'render-process-gone reason=' + (details && details.reason) + ' exitCode=' + (details && details.exitCode));
  });
  contents.on('unresponsive', () => {
    writeLog('error', 'renderer unresponsive');
  });
  contents.on('console-message', function (a, b, c, d) {
    // Electron 36+ passes a single details object, older versions pass positional args.
    let level;
    let message;
    let line;
    let source;
    if (a && typeof a === 'object' && ('message' in a || 'level' in a)) {
      level = a.level;
      message = a.message;
      line = a.lineNumber;
      source = a.sourceId;
    } else {
      level = b;
      message = c;
      line = d;
      source = arguments[4];
    }
    const isError = level === 'error' || level === 3;
    if (!isError) return;
    writeLog('error', 'renderer console: ' + String(message) + ' (' + String(source) + ':' + String(line) + ')');
  });
}

function applySecurityPolicy() {
  const ses = session.defaultSession;
  if (!ses) return;
  // Deny every permission request. The app is fully offline and local.
  ses.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  if (typeof ses.setPermissionCheckHandler === 'function') {
    ses.setPermissionCheckHandler(() => false);
  }
}

function createWindow() {
  const state = loadWindowState();
  const isMac = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    show: false,
    autoHideMenuBar: !isMac,
    title: 'Clariora Exam Simulator',
    backgroundColor: '#07090E',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  if (state.maximized) mainWindow.maximize();

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isMac && app.dock) {
      try {
        const dockIcon = path.join(__dirname, 'icon.png');
        if (fs.existsSync(dockIcon)) app.dock.setIcon(dockIcon);
      } catch (err) {
        writeLog('warn', 'dock icon failed: ' + ((err && err.message) || err));
      }
    }
  });

  mainWindow.on('close', saveWindowState);
  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('closed', () => { mainWindow = null; });

  attachRendererDiagnostics(mainWindow.webContents);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:$/i.test(safeProtocol(url))) shell.openExternal(url);
    return { action: 'deny' };
  });

  // The app is a local file:// document. Anything else opens in the system browser.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const proto = safeProtocol(url);
    if (proto === 'file:') return;
    event.preventDefault();
    if (proto === 'http:' || proto === 'https:') {
      shell.openExternal(url);
    } else {
      writeLog('warn', 'blocked navigation to non-file protocol: ' + proto);
    }
  });

  const entry = path.join(__dirname, 'A_Plus_Exam_Simulator.html');
  const fallback = path.join(__dirname, 'index.html');
  mainWindow.loadFile(fs.existsSync(entry) ? entry : fallback).catch((err) => {
    writeLog('error', 'loadFile failed: ' + ((err && err.message) || err));
  });

  buildAppMenu();
}

function safeProtocol(url) {
  try {
    return new URL(url).protocol;
  } catch (_) {
    return '';
  }
}

function runInPage(expression) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.executeJavaScript(expression).catch((err) => {
    writeLog('warn', 'menu action failed: ' + ((err && err.message) || err));
  });
}

function buildAppMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'Exam',
      submenu: [
        {
          label: 'Start Core 1 exam (90 questions)',
          accelerator: 'CmdOrCtrl+1',
          click: () => runInPage("typeof startExam==='function'&&startExam('core1',90,90)")
        },
        {
          label: 'Start Core 2 exam (90 questions)',
          accelerator: 'CmdOrCtrl+2',
          click: () => runInPage("typeof startExam==='function'&&startExam('core2',90,90)")
        },
        {
          label: 'Start mixed exam (90 questions)',
          accelerator: 'CmdOrCtrl+3',
          click: () => runInPage("typeof startExam==='function'&&startExam('both',90,90)")
        },
        { type: 'separator' },
        {
          label: 'Open hands-on labs',
          accelerator: 'CmdOrCtrl+L',
          click: () => runInPage("typeof openPBQModal==='function'&&openPBQModal()")
        },
        {
          label: 'Retake missed questions',
          accelerator: 'CmdOrCtrl+M',
          click: () => runInPage("typeof startMissedDrill==='function'&&startMissedDrill()")
        },
        { type: 'separator' },
        {
          label: 'Return to main menu',
          accelerator: process.platform === 'darwin' ? 'CmdOrCtrl+Shift+H' : 'CmdOrCtrl+H',
          click: () => runInPage("typeof showScreen==='function'&&showScreen('startScreen')")
        }
      ]
    },
    {
      label: 'Study',
      submenu: [
        {
          label: 'Course library',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => runInPage("typeof openCurriculumModal==='function'&&openCurriculumModal('videos')")
        },
        {
          label: 'Study library',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => runInPage("typeof openStudyLibraryModal==='function'&&openStudyLibraryModal()")
        },
        {
          label: 'Progress ledger',
          accelerator: 'CmdOrCtrl+Shift+L',
          click: () => runInPage("typeof openLedgerModal==='function'&&openLedgerModal()")
        },
        {
          label: 'Flashcards',
          accelerator: 'CmdOrCtrl+Shift+M',
          click: () => runInPage("typeof openMemoryModal==='function'&&openMemoryModal()")
        },
        {
          label: 'Study plan',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => runInPage("typeof openStudyPlanModal==='function'&&openStudyPlanModal()")
        },
        {
          label: 'Video lessons (220-1201)',
          accelerator: 'CmdOrCtrl+P',
          click: () => runInPage("typeof openMesserModal==='function'&&openMesserModal()")
        },
        { type: 'separator' },
        {
          label: 'Export full backup',
          click: () => runInPage('window.CompTIAProductTrust&&CompTIAProductTrust.onExportBackup()')
        },
        {
          label: 'Save sync file to OneDrive or Dropbox',
          click: () => runInPage('window.CompTIAProductTrust&&CompTIAProductTrust.onSaveSync()')
        },
        { type: 'separator' },
        {
          label: 'Switch dark or light theme',
          accelerator: 'CmdOrCtrl+T',
          click: () => runInPage("typeof toggleAppTheme==='function'&&toggleAppTheme()")
        },
        {
          label: 'Print or save scorecard as PDF',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => runInPage('window.print()')
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Official CompTIA A+ objectives',
          click: async () => {
            await shell.openExternal('https://www.comptia.org/certifications/a');
          }
        },
        {
          label: 'Video playlist on YouTube',
          click: async () => {
            await shell.openExternal('https://www.youtube.com/playlist?list=PLG49S3nxzAnnes8ZGI-OBlKEukHCX46N8');
          }
        },
        { type: 'separator' },
        {
          label: 'Open data folder',
          click: () => {
            try {
              shell.openPath(path.dirname(getDatabasePath()));
            } catch (err) {
              writeLog('warn', 'could not open data folder: ' + ((err && err.message) || err));
            }
          }
        },
        {
          label: 'Open log folder',
          click: () => {
            try {
              fs.mkdirSync(getLogDir(), { recursive: true });
              shell.openPath(getLogDir());
            } catch (err) {
              writeLog('warn', 'could not open log folder: ' + ((err && err.message) || err));
            }
          }
        },
        { type: 'separator' },
        {
          label: 'About this app',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Clariora Simulator',
              message: 'Clariora Exam Simulator v' + APP_VERSION,
              detail: 'Built for Datacentre Academy.\n' +
                'Core 1 (220-1201) and Core 2 (220-1202).\n' +
                'Your progress: ' + getDatabasePath() + '\n' +
                'Logs: ' + getLogFile()
            });
          }
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

process.on('uncaughtException', (err) => {
  writeLog('error', 'uncaughtException: ' + ((err && err.stack) || err));
});

process.on('unhandledRejection', (reason) => {
  writeLog('error', 'unhandledRejection: ' + ((reason && reason.stack) || reason));
});

app.whenReady().then(() => {
  ensureStorageLayout();
  writeLog('info', 'app ready v' + APP_VERSION + ' packaged=' + app.isPackaged + ' portable=' + isPortableInstall());
  applySecurityPolicy();
  loadProgress();
  createWindow();

  // The updater must never delay the first paint.
  setTimeout(initAutoUpdater, 4000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch((err) => {
  writeLog('error', 'startup failed: ' + ((err && err.stack) || err));
});

app.on('before-quit', () => {
  if (updateTimer) {
    clearInterval(updateTimer);
    updateTimer = null;
  }
  flushProgress();
});

app.on('window-all-closed', () => {
  flushProgress();
  if (process.platform !== 'darwin') app.quit();
});
