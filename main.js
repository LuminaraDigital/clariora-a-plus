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
 * Enterprise Policy Engine
 * Centralized administrative fleet management:
 * 1. %PROGRAMDATA%\Clariora\policy.json (machine-wide policy via GPO/Intune)
 * 2. %APPDATA%\Clariora\policy.json (user-level policy)
 * 3. CLI override switch: --policy=<path>
 * ------------------------------------------------------------------------ */
const DEFAULT_POLICY = {
  offlineOnly: false,
  disableExternalAi: false,
  allowedAiProviders: ['groq', 'ollama', 'nvidia', 'openrouter'],
  ollamaBaseUrl: 'http://localhost:11434',
  disableTelemetry: false,
  forceKioskMode: false,
  allowWindowCloseDuringExam: false,
  customDataDir: null
};

let activePolicy = Object.assign({}, DEFAULT_POLICY);
let policyLoaded = false;

function getPolicyFilePath() {
  if (Array.isArray(process.argv)) {
    for (const arg of process.argv) {
      if (typeof arg === 'string' && arg.startsWith('--policy=')) {
        return arg.split('=')[1].trim();
      }
    }
  }

  if (process.platform === 'win32' && process.env.ALLUSERSPROFILE) {
    const machinePolicy = path.join(process.env.ALLUSERSPROFILE, 'Clariora', 'policy.json');
    if (fs.existsSync(machinePolicy)) return machinePolicy;
  }

  try {
    const userPolicy = path.join(app.getPath('userData'), 'policy.json');
    if (fs.existsSync(userPolicy)) return userPolicy;
  } catch (_) {}

  return null;
}

function loadEnterprisePolicy(overridePath) {
  if (policyLoaded && !overridePath) return activePolicy;
  const policyFile = overridePath || getPolicyFilePath();
  if (policyFile && fs.existsSync(policyFile)) {
    try {
      const raw = fs.readFileSync(policyFile, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        activePolicy = Object.assign({}, DEFAULT_POLICY, parsed);
        writeLog('info', `enterprise policy loaded from ${policyFile}: offlineOnly=${activePolicy.offlineOnly} kiosk=${activePolicy.forceKioskMode}`);
      }
    } catch (err) {
      writeLog('warn', `failed to read enterprise policy at ${policyFile}: ${err && err.message}`);
    }
  }
  policyLoaded = true;
  return activePolicy;
}

/* ---------------------------------------------------------------------------
 * Multi-Model Business AI Provider Registry
 * Supports Groq Cloud, Private LAN/air-gapped Ollama, NVIDIA NIM, OpenRouter.
 * ------------------------------------------------------------------------ */
const AI_PROVIDERS = {
  groq: {
    id: 'groq',
    name: 'Groq Cloud',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    allowedHost: 'api.groq.com',
    defaultModel: 'qwen/qwen3.8-27b',
    isLocal: false,
    requiresKey: true
  },
  ollama: {
    id: 'ollama',
    name: 'Private Ollama (LAN/Air-gapped)',
    url: 'http://localhost:11434/v1/chat/completions',
    allowedHost: null,
    defaultModel: 'deepseek-r1:latest',
    isLocal: true,
    requiresKey: false
  },
  nvidia: {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    allowedHost: 'integrate.api.nvidia.com',
    defaultModel: 'meta/llama-3.3-70b-instruct',
    isLocal: false,
    requiresKey: true
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter Multi-Model',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    allowedHost: 'openrouter.ai',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    isLocal: false,
    requiresKey: true
  }
};

function isLocalOrPrivateHost(hostname) {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.corp')) return true;
  return false;
}

let isExamSessionActive = false;

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

const MAX_IPC_KEY_LENGTH = 256;
const MAX_STORAGE_VALUE_BYTES = 10 * 1024 * 1024; // 10 MB cap for storage values

function validateStorageKey(key) {
  return typeof key === 'string' && key.trim().length > 0 && key.length <= MAX_IPC_KEY_LENGTH;
}

function validateStorageValue(val) {
  if (val === undefined || typeof val === 'function' || typeof val === 'symbol') {
    return false;
  }
  if (typeof val === 'string') {
    return val.length <= MAX_STORAGE_VALUE_BYTES;
  }
  if (typeof val === 'number' || typeof val === 'boolean' || val === null) {
    return true;
  }
  if (typeof val === 'object') {
    try {
      const serialized = JSON.stringify(val);
      return serialized !== undefined && serialized.length <= MAX_STORAGE_VALUE_BYTES;
    } catch (_) {
      return false; // circular or un-serializable
    }
  }
  return false;
}

function validateDatabasePayload(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return false;
  }
  try {
    const serialized = JSON.stringify(data);
    return serialized !== undefined && serialized.length <= DB_MAX_BYTES;
  } catch (_) {
    return false;
  }
}

ipcMain.on('database:getAll', (event) => {
  event.returnValue = loadDatabase();
});

ipcMain.on('database:saveAll', (event, data) => {
  if (!validateDatabasePayload(data)) {
    writeLog('warn', 'database:saveAll rejected: malformed database payload');
    event.returnValue = false;
    return;
  }
  event.returnValue = saveDatabase(data);
});

ipcMain.handle('database:saveAllAsync', async (_event, data) => {
  if (!validateDatabasePayload(data)) {
    writeLog('warn', 'database:saveAllAsync rejected: malformed database payload');
    return { ok: false, error: 'invalid_database_payload' };
  }
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
    const mode = (entry.attr >>> 16) & 0o170000;
    if (mode === 0o120000) throw new Error('unsafe_zip_symlink_entry');
  }
  let written = 0;
  for (const entry of entries) {
    const target = safeJoin(destDir, String(entry.entryName || ''));
    if (!target) throw new Error('unsafe_zip_entry');
    if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) {
      throw new Error('unsafe_zip_symlink_target');
    }
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
  if (!validateStorageKey(key) || !validateStorageValue(value)) {
    writeLog('warn', 'storage:set rejected: invalid key length (>256) or malformed/oversized value (>10MB)');
    event.returnValue = false;
    return;
  }
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
  if (!validateStorageKey(key) || !validateStorageValue(value)) {
    writeLog('warn', 'storage:setAsync rejected: invalid key length (>256) or malformed/oversized value (>10MB)');
    return false;
  }
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

async function handleAiChat(payload) {
  try {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      writeLog('warn', 'ai:chat rejected non-object payload');
      return { ok: false, error: 'invalid_payload' };
    }

    const providerId = (typeof payload.provider === 'string' && payload.provider.trim().toLowerCase()) || 'groq';
    const providerCfg = AI_PROVIDERS[providerId];
    if (!providerCfg) {
      writeLog('warn', `ai:chat rejected unknown provider: ${providerId}`);
      return { ok: false, error: 'unknown_provider' };
    }

    const policy = loadEnterprisePolicy();

    // Enterprise policy enforcement
    if (policy.offlineOnly && !providerCfg.isLocal) {
      writeLog('warn', `ai:chat blocked external provider ${providerId} due to offlineOnly policy`);
      return {
        ok: false,
        error: 'policy_offline_only',
        message: 'External AI access is disabled by organizational policy.'
      };
    }
    if (policy.disableExternalAi && !providerCfg.isLocal) {
      writeLog('warn', `ai:chat blocked external provider ${providerId} due to disableExternalAi policy`);
      return {
        ok: false,
        error: 'policy_external_ai_disabled',
        message: 'External cloud AI is disabled. Use local/air-gapped Ollama.'
      };
    }
    if (Array.isArray(policy.allowedAiProviders) && !policy.allowedAiProviders.includes(providerId)) {
      writeLog('warn', `ai:chat provider ${providerId} not permitted by allowedAiProviders policy`);
      return {
        ok: false,
        error: 'provider_not_allowed_by_policy',
        message: `Provider "${providerId}" is not allowed by organizational policy.`
      };
    }

    const apiKey = typeof payload.apiKey === 'string' ? payload.apiKey.trim() : '';
    if (providerCfg.requiresKey) {
      if (!apiKey) {
        return { ok: false, error: 'missing_api_key' };
      }
      if (apiKey.length < 10 || apiKey.length > 512) {
        writeLog('warn', `ai:chat rejected API key with invalid bounds for ${providerId}`);
        return { ok: false, error: 'invalid_api_key' };
      }
    }

    // Determine endpoint URL
    let endpointUrl = providerCfg.url;
    if (providerId === 'ollama') {
      const base = (policy.ollamaBaseUrl || payload.baseUrl || 'http://localhost:11434').replace(/\/+$/, '');
      endpointUrl = base + '/v1/chat/completions';
    }

    // Endpoint security validation
    const parsedEndpoint = new URL(endpointUrl);
    if (providerCfg.allowedHost) {
      if (parsedEndpoint.protocol !== 'https:' || parsedEndpoint.hostname !== providerCfg.allowedHost) {
        writeLog('error', `ai:chat blocked non-allowlisted endpoint for ${providerId}: ${endpointUrl}`);
        return { ok: false, error: 'blocked_endpoint' };
      }
    } else if (providerId === 'ollama') {
      if (!isLocalOrPrivateHost(parsedEndpoint.hostname)) {
        writeLog('error', `ai:chat blocked non-local host for ollama: ${parsedEndpoint.hostname}`);
        return { ok: false, error: 'blocked_endpoint', message: 'Ollama host must be local or private LAN.' };
      }
    }

    if (!Array.isArray(payload.messages) || payload.messages.length === 0 || payload.messages.length > 50) {
      writeLog('warn', 'ai:chat rejected invalid messages list');
      return { ok: false, error: 'invalid_messages' };
    }
    for (const msg of payload.messages) {
      if (!msg || typeof msg !== 'object' || typeof msg.role !== 'string' || typeof msg.content !== 'string') {
        writeLog('warn', 'ai:chat rejected malformed message item');
        return { ok: false, error: 'malformed_message_entry' };
      }
      if (msg.content.length > 65536) {
        writeLog('warn', 'ai:chat rejected message exceeding 64KB');
        return { ok: false, error: 'message_too_large' };
      }
    }

    const model = typeof payload.model === 'string' && payload.model.trim()
      ? payload.model.trim()
      : providerCfg.defaultModel;
    if (model.length > 128 || !/^[a-zA-Z0-9_.:\-\/]+$/.test(model)) {
      writeLog('warn', 'ai:chat rejected invalid model identifier');
      return { ok: false, error: 'invalid_model' };
    }

    const temperature = typeof payload.temperature === 'number' && Number.isFinite(payload.temperature)
      ? Math.max(0, Math.min(2, payload.temperature))
      : 0.2;
    const max_tokens = typeof payload.max_tokens === 'number' && Number.isFinite(payload.max_tokens)
      ? Math.max(1, Math.min(4096, Math.floor(payload.max_tokens)))
      : 220;

    const body = {
      model: model,
      messages: payload.messages,
      temperature: temperature,
      max_tokens: max_tokens
    };

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers['Authorization'] = 'Bearer ' + apiKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    let res;
    try {
      res = await fetch(endpointUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      writeLog('warn', `${providerId} http ${res.status} model=${body.model}`);
      return {
        ok: false,
        provider: providerId,
        error: (data && data.error && (data.error.message || data.error)) || ('http_' + res.status),
        raw: data
      };
    }

    const content = data && data.choices && data.choices[0] && data.choices[0].message
      ? String(data.choices[0].message.content || '').trim()
      : '';

    return {
      ok: true,
      provider: providerId,
      content: content,
      model: body.model,
      raw: data
    };
  } catch (err) {
    const isTimeout = err && (err.name === 'AbortError' || err.code === 'ETIMEDOUT');
    const errMsg = isTimeout ? 'request_timeout' : ((err && err.message) || 'ai_ipc_error');
    writeLog('warn', `ai:chat request failed: ${errMsg}`);
    return { ok: false, error: errMsg };
  }
}

ipcMain.handle('ai:chat', async (_event, payload) => {
  return handleAiChat(payload);
});

ipcMain.handle('ai:getProviders', async () => {
  const policy = loadEnterprisePolicy();
  const list = Object.values(AI_PROVIDERS).map(p => ({
    id: p.id,
    name: p.name,
    defaultModel: p.defaultModel,
    isLocal: p.isLocal,
    requiresKey: p.requiresKey,
    isAllowed: Array.isArray(policy.allowedAiProviders) ? policy.allowedAiProviders.includes(p.id) : true
  }));
  return { ok: true, providers: list, policy: policy };
});

// Legacy backward-compatible Groq IPC
ipcMain.handle('groq:chat', async (_event, payload) => {
  const p = Object.assign({}, payload, { provider: 'groq' });
  return handleAiChat(p);
});

// Exam session active guard
ipcMain.handle('exam:setSessionActive', async (_event, active) => {
  isExamSessionActive = !!active;
  writeLog('info', `exam session active set to: ${isExamSessionActive}`);
  return { ok: true, active: isExamSessionActive };
});

ipcMain.handle('exam:isSessionActive', async () => {
  return isExamSessionActive;
});

// Kiosk / Proctoring Mode
ipcMain.handle('kiosk:enable', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setKiosk(true);
    writeLog('info', 'kiosk mode enabled');
    return true;
  }
  return false;
});

ipcMain.handle('kiosk:disable', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setKiosk(false);
    writeLog('info', 'kiosk mode disabled');
    return false;
  }
  return false;
});

ipcMain.handle('kiosk:toggle', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const curr = mainWindow.isKiosk();
    mainWindow.setKiosk(!curr);
    writeLog('info', `kiosk mode toggled to: ${!curr}`);
    return !curr;
  }
  return false;
});

ipcMain.handle('kiosk:isActive', async () => {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow.isKiosk() : false;
});

// Enterprise Policy IPC
ipcMain.handle('policy:getPolicy', async () => {
  return loadEnterprisePolicy();
});

// Diagnostic & Integrity Suite
function runIntegrityCheck() {
  const result = {
    ok: true,
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    packaged: typeof app !== 'undefined' && app ? app.isPackaged : false,
    portable: isPortableInstall(),
    checks: {}
  };

  const dirRoot = __dirname;

  // 1. Check exam_data.json
  try {
    const bankFile = path.join(dirRoot, 'exam_data.json');
    if (fs.existsSync(bankFile)) {
      const bankData = JSON.parse(fs.readFileSync(bankFile, 'utf8'));
      const qCount = Array.isArray(bankData.questions)
        ? bankData.questions.length
        : ((Array.isArray(bankData.core1) ? bankData.core1.length : 0) + (Array.isArray(bankData.core2) ? bankData.core2.length : 0));
      result.checks.examBank = { ok: qCount >= 500, questionCount: qCount, version: bankData.version };
      if (qCount < 500) result.ok = false;
    } else {
      result.checks.examBank = { ok: false, error: 'missing_exam_data_json' };
      result.ok = false;
    }
  } catch (err) {
    result.checks.examBank = { ok: false, error: String(err && err.message) };
    result.ok = false;
  }

  // 2. Check study_library.json
  try {
    const studyFile = path.join(dirRoot, 'study_library.json');
    if (fs.existsSync(studyFile)) {
      const studyData = JSON.parse(fs.readFileSync(studyFile, 'utf8'));
      const docCount = (studyData.documents && studyData.documents.length) || 0;
      result.checks.studyLibrary = { ok: docCount > 0, docCount: docCount };
    } else {
      result.checks.studyLibrary = { ok: false, error: 'missing_study_library_json' };
    }
  } catch (err) {
    result.checks.studyLibrary = { ok: false, error: String(err && err.message) };
  }

  // 3. Check database & storage health
  try {
    const dbPath = getDatabasePath();
    const dbDir = path.dirname(dbPath);
    fs.mkdirSync(dbDir, { recursive: true });
    const testFile = path.join(dbDir, '.write_test');
    fs.writeFileSync(testFile, 'ok', 'utf8');
    fs.unlinkSync(testFile);

    const dbExists = fs.existsSync(dbPath);
    let recordCount = 0;
    if (dbExists) {
      const dbContent = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      recordCount = Object.keys(dbContent || {}).length;
    }
    result.checks.databaseStorage = {
      ok: true,
      path: dbPath,
      exists: dbExists,
      records: recordCount,
      writeable: true
    };
  } catch (err) {
    result.checks.databaseStorage = { ok: false, error: String(err && err.message) };
    result.ok = false;
  }

  // 4. Policy check
  result.checks.policy = { ok: true, active: loadEnterprisePolicy() };

  return result;
}

function exportDiagnostics() {
  const integrity = runIntegrityCheck();
  let logTail = [];
  try {
    const logFile = getLogFile();
    if (fs.existsSync(logFile)) {
      const lines = fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean);
      logTail = lines.slice(-50).map(scrubSecrets);
    }
  } catch (_) {}

  return {
    reportGeneratedAt: new Date().toISOString(),
    system: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.versions.node,
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome
    },
    app: {
      name: 'Clariora',
      version: APP_VERSION,
      isPackaged: typeof app !== 'undefined' && app ? app.isPackaged : false,
      isPortable: isPortableInstall(),
      appPath: typeof app !== 'undefined' && app && typeof app.getAppPath === 'function' ? app.getAppPath() : __dirname,
      userDataPath: typeof app !== 'undefined' && app && typeof app.getPath === 'function' ? app.getPath('userData') : '',
      databasePath: getDatabasePath(),
      logFile: getLogFile()
    },
    integrity: integrity,
    policy: loadEnterprisePolicy(),
    recentLogs: logTail
  };
}

ipcMain.handle('diagnostics:runIntegrityCheck', async () => {
  return runIntegrityCheck();
});

ipcMain.handle('diagnostics:exportDiagnostics', async () => {
  return exportDiagnostics();
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

const CSP_POLICY = "default-src 'self'; script-src 'self' 'unsafe-inline' https://telegram.org https://unpkg.com https://www.gstatic.com https://apis.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://i.ytimg.com https://*.telegram.org https://lh3.googleusercontent.com https://*.googleusercontent.com; media-src 'self' https://comptia-a-plus-master.pages.dev https://clariora.com.au; connect-src 'self' https://api.telegram.org https://tonconnect.org https://tonapi.io https://*.ton.org https://toncenter.com https://clariora.com.au https://*.supabase.co https://cdn.jsdelivr.net https://unpkg.com https://comptia-a-plus-master.pages.dev https://*.googleapis.com https://*.firebaseio.com https://clariora.firebaseapp.com https://*.firebasestorage.app https://bridge.tonapi.io https://*.tonconnect.org; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://*.telegram.org https://clariora.firebaseapp.com https://accounts.google.com; font-src 'self'; object-src 'none'; base-uri 'self'";

function applySecurityPolicy() {
  const ses = session.defaultSession;
  if (!ses) return;
  // Deny every permission request. The app is fully offline and local.
  ses.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  if (typeof ses.setPermissionCheckHandler === 'function') {
    ses.setPermissionCheckHandler(() => false);
  }
  // Attach Content-Security-Policy header via ses.webRequest.onHeadersReceived
  // for local and remote requests, mirroring the policy in _headers.
  ses.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = Object.assign({}, details.responseHeaders);
    responseHeaders['Content-Security-Policy'] = [CSP_POLICY];
    callback({ responseHeaders });
  });
}

function createWindow() {
  const state = loadWindowState();
  const isMac = process.platform === 'darwin';
  const policy = loadEnterprisePolicy();
  const launchKiosk = (Array.isArray(process.argv) && process.argv.includes('--kiosk')) || !!policy.forceKioskMode;

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    show: false,
    kiosk: launchKiosk,
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

  if (state.maximized && !launchKiosk) mainWindow.maximize();

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

  mainWindow.on('close', (event) => {
    if (isExamSessionActive && !policy.allowWindowCloseDuringExam) {
      const choice = dialog.showMessageBoxSync(mainWindow, {
        type: 'warning',
        buttons: ['Resume Exam', 'Exit Simulator'],
        defaultId: 0,
        cancelId: 0,
        title: 'Active Exam Session',
        message: 'An exam session is currently in progress.',
        detail: 'Exiting now will forfeit your timed exam score and close the simulator.\n\nAre you sure you want to exit?'
      });
      if (choice === 0) {
        event.preventDefault();
        return;
      }
    }
    isExamSessionActive = false;
    saveWindowState();
  });

  mainWindow.on('blur', () => {
    if (isExamSessionActive) {
      writeLog('info', 'proctoring: exam window lost focus');
      if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
        mainWindow.webContents.send('exam:focus-lost', { timestamp: Date.now() });
      }
    }
  });
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
    if (proto === 'file:') {
      try {
        const parsed = new URL(url);
        // Normalize pathname (on Windows, /C:/path -> C:/path)
        const rawPath = decodeURIComponent(parsed.pathname).replace(/^\/([a-zA-Z]:)/, '$1');
        const targetPath = path.normalize(rawPath);
        const appRoot = path.normalize(app.getAppPath());
        const dirRoot = path.normalize(__dirname);
        if (isInsideRoot(appRoot, targetPath) || isInsideRoot(dirRoot, targetPath)) {
          return;
        }
      } catch (_) {}
      event.preventDefault();
      writeLog('warn', 'blocked navigation to external local file: ' + url);
      return;
    }
    event.preventDefault();
    if (proto === 'http:' || proto === 'https:') {
      shell.openExternal(url);
    } else {
      writeLog('warn', 'blocked navigation to non-file protocol: ' + proto);
    }
  });

  const entry = path.join(__dirname, 'index.html');
  const fallback = path.join(__dirname, 'A_Plus_Exam_Simulator.html');
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

function handleHeadlessCliSwitches() {
  if (!Array.isArray(process.argv)) return false;

  if (process.argv.includes('--verify-integrity')) {
    const integrity = runIntegrityCheck();
    process.stdout.write(JSON.stringify(integrity, null, 2) + '\n');
    app.exit(integrity.ok ? 0 : 1);
    return true;
  }

  if (process.argv.includes('--export-diagnostics')) {
    const report = exportDiagnostics();
    let outPath = 'diagnostics.json';
    for (const arg of process.argv) {
      if (typeof arg === 'string' && arg.startsWith('--out=')) {
        outPath = arg.split('=')[1].trim();
      }
    }
    try {
      fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
      process.stdout.write(`Diagnostics successfully exported to ${path.resolve(outPath)}\n`);
      app.exit(0);
    } catch (err) {
      process.stderr.write(`Failed to export diagnostics: ${err && err.message}\n`);
      app.exit(1);
    }
    return true;
  }

  return false;
}

app.whenReady().then(() => {
  ensureStorageLayout();
  loadEnterprisePolicy();
  writeLog('info', 'app ready v' + APP_VERSION + ' packaged=' + app.isPackaged + ' portable=' + isPortableInstall());

  if (handleHeadlessCliSwitches()) return;

  applySecurityPolicy();
  loadProgress();
  createWindow();

  // The updater must never delay the first paint, and is disabled in offlineOnly policy mode.
  if (!activePolicy.offlineOnly) {
    setTimeout(initAutoUpdater, 4000);
  } else {
    writeLog('info', 'updater: skipped, offlineOnly policy is active');
  }

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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CSP_POLICY,
    applySecurityPolicy,
    validateStorageKey,
    validateStorageValue,
    validateDatabasePayload,
    MAX_IPC_KEY_LENGTH,
    MAX_STORAGE_VALUE_BYTES,
    // Enterprise Desktop Exports
    AI_PROVIDERS,
    DEFAULT_POLICY,
    loadEnterprisePolicy,
    handleAiChat,
    runIntegrityCheck,
    exportDiagnostics,
    isLocalOrPrivateHost,
    scrubSecrets
  };
}
