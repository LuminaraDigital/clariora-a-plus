const { contextBridge, ipcRenderer } = require('electron');

// The version comes from package.json, which the installer build writes from
// release.config.json. It is never typed here. The preload is sandboxed, so it
// cannot read the file itself and asks main for it synchronously at load time.
let appVersion = '0.0.0';
try {
  const reported = ipcRenderer.sendSync('app:versionSync');
  if (typeof reported === 'string' && reported) appVersion = reported;
} catch (_) {}

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktopApp: true,
  appVersion: appVersion,
  storage: {
    get: (key) => ipcRenderer.sendSync('storage:get', key),
    set: (key, value) => ipcRenderer.sendSync('storage:set', key, value),
    remove: (key) => ipcRenderer.sendSync('storage:remove', key),
    getAsync: (key) => ipcRenderer.invoke('storage:getAsync', key),
    setAsync: (key, value) => ipcRenderer.invoke('storage:setAsync', key, value),
    removeAsync: (key) => ipcRenderer.invoke('storage:removeAsync', key),
    exportFile: (name, content) => ipcRenderer.invoke('storage:exportFile', name, content)
  },
  database: {
    getAll: () => ipcRenderer.sendSync('database:getAll'),
    saveAll: (data) => ipcRenderer.sendSync('database:saveAll', data),
    saveAllAsync: (data) => ipcRenderer.invoke('database:saveAllAsync', data),
    getInfo: () => ipcRenderer.sendSync('database:getInfo')
  },
  app: {
    getPaths: () => ipcRenderer.invoke('app:getPaths'),
    getReleaseInfo: () => ipcRenderer.invoke('app:getReleaseInfo')
  },
  media: {
    resolve: (relPath) => ipcRenderer.invoke('media:resolve', relPath),
    packStatus: () => ipcRenderer.invoke('media:packStatus'),
    downloadPack: (options) => ipcRenderer.invoke('media:downloadPack', options || {}),
    removePack: () => ipcRenderer.invoke('media:removePack'),
    onProgress: (cb) => {
      if (typeof cb !== 'function') return () => {};
      const listener = (_event, payload) => cb(payload);
      ipcRenderer.on('media:progress', listener);
      return () => ipcRenderer.removeListener('media:progress', listener);
    }
  },
  updates: {
    onReady: (cb) => {
      if (typeof cb !== 'function') return () => {};
      const listener = (_event, info) => cb(info);
      ipcRenderer.on('update:ready', listener);
      return () => ipcRenderer.removeListener('update:ready', listener);
    },
    // Fires on every state change: checking, available, downloading with a
    // percentage, ready, up to date, or error.
    onStatus: (cb) => {
      if (typeof cb !== 'function') return () => {};
      const listener = (_event, status) => cb(status);
      ipcRenderer.on('update:status', listener);
      return () => ipcRenderer.removeListener('update:status', listener);
    },
    getStatus: () => ipcRenderer.invoke('update:getStatus'),
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    installNow: () => ipcRenderer.invoke('update:installNow')
  },
  log: (level, message) => ipcRenderer.invoke('log:write', String(level || 'info'), String(message == null ? '' : message)),
  groq: {
    chat: (payload) => ipcRenderer.invoke('groq:chat', payload)
  },
  ai: {
    chat: (payload) => ipcRenderer.invoke('ai:chat', payload),
    getProviders: () => ipcRenderer.invoke('ai:getProviders')
  },
  kiosk: {
    enable: () => ipcRenderer.invoke('kiosk:enable'),
    disable: () => ipcRenderer.invoke('kiosk:disable'),
    toggle: () => ipcRenderer.invoke('kiosk:toggle'),
    isActive: () => ipcRenderer.invoke('kiosk:isActive'),
    onFocusLost: (cb) => {
      if (typeof cb !== 'function') return () => {};
      const listener = (_event, payload) => cb(payload);
      ipcRenderer.on('exam:focus-lost', listener);
      return () => ipcRenderer.removeListener('exam:focus-lost', listener);
    }
  },
  exam: {
    setSessionActive: (active) => ipcRenderer.invoke('exam:setSessionActive', active),
    isSessionActive: () => ipcRenderer.invoke('exam:isSessionActive')
  },
  policy: {
    getPolicy: () => ipcRenderer.invoke('policy:getPolicy')
  },
  diagnostics: {
    runIntegrityCheck: () => ipcRenderer.invoke('diagnostics:runIntegrityCheck'),
    exportDiagnostics: () => ipcRenderer.invoke('diagnostics:exportDiagnostics')
  }
});

