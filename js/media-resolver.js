/**
 * media-resolver.js - decides where each media file is played from.
 *
 * Order, highest first:
 *   1. Local offline pack on the desktop app (electronAPI.media.resolve)
 *   2. The bundled relative path, when the file really ships with the app.
 *      Only slides and labs ship. Checked once with a HEAD request and cached.
 *   3. The remote base URL plus the encoded relative path.
 *   4. Nothing. resolve() gives back null and the player shows a short
 *      message instead of a broken video.
 *
 * The course library renderer (js/curriculum.js) is owned by another
 * workstream, so nothing here edits it. Instead a MutationObserver watches
 * the course library container and rewrites video, source, poster and
 * download links after they are put on the page. Rewriting is idempotent:
 * a node that has been handled carries data-media-resolved.
 *
 * Never throws at load. Every outside interface is behind a typeof guard.
 */
(function (root) {
  'use strict';

  var CONTAINER_IDS = ['curriculumViewer', 'curriculumModal'];
  var UNAVAILABLE_TEXT =
    'This video is not available offline. Connect to the internet or download the course pack.';

  // ---------------------------------------------------------------- helpers

  function cfg() {
    var c = (root && root.APLUS_MEDIA_CONFIG) || {};
    return {
      remoteBase: typeof c.remoteBase === 'string' ? c.remoteBase : '',
      packName:
        typeof c.packName === 'string' && c.packName
          ? c.packName
          : 'CompTIA_A_Plus_Course_Videos_v1.zip',
      packSizeLabel:
        typeof c.packSizeLabel === 'string' && c.packSizeLabel ? c.packSizeLabel : '2.4 GB',
      streamByDefault: c.streamByDefault !== false
    };
  }

  function encodePath(rel) {
    return String(rel == null ? '' : rel)
      .split('/')
      .map(function (part) {
        return encodeURIComponent(part);
      })
      .join('/');
  }

  function decodePath(p) {
    return String(p == null ? '' : p)
      .split('/')
      .map(function (part) {
        try {
          return decodeURIComponent(part);
        } catch (_) {
          return part;
        }
      })
      .join('/');
  }

  /**
   * Join the base URL to an already encoded relative path.
   *
   * mediaBaseUrl usually ends in "/media/" while the catalog paths start with
   * "media/", so the shared segment is dropped once rather than repeated.
   */
  function joinBase(base, encodedRel) {
    var b = String(base == null ? '' : base);
    var rel = String(encodedRel == null ? '' : encodedRel);
    if (!b) return rel;
    if (b.charAt(b.length - 1) !== '/') b += '/';

    var tail = b.split('/').filter(Boolean).pop();
    var firstSlash = rel.indexOf('/');
    if (tail && firstSlash > 0 && rel.slice(0, firstSlash) === tail) {
      rel = rel.slice(firstSlash + 1);
    }
    return b + rel;
  }

  function isAbsolute(u) {
    return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(String(u || ''));
  }

  function isVideoPath(rel) {
    var r = String(rel || '').toLowerCase();
    return (
      r.indexOf('media/videos/') === 0 ||
      r.indexOf('videos for a+/') === 0 ||
      /\.(mp4|m4v|mov|webm|mkv)$/.test(r)
    );
  }

  // Slides and labs are the only things that really ship inside the app.
  function isBundledKind(rel) {
    if (isVideoPath(rel)) return false;
    var r = String(rel || '').toLowerCase();
    return (
      r.indexOf('media/slides/') === 0 ||
      r.indexOf('media/labs/') === 0 ||
      r.indexOf('powerpoint for a+/') === 0 ||
      r.indexOf('labs for a+/') === 0
    );
  }

  /**
   * Pure decision function. No IO, no globals. Used by the tests.
   *
   * ctx:
   *   localUrl  string or null   result of the desktop offline pack lookup
   *   bundled   true/false/null  does the file ship with the app
   *                              (null means "not checked yet")
   *   remoteBase string          base URL for streaming
   *
   * Returns { source, url } where source is one of
   * 'local', 'bundled', 'remote', 'none'.
   */
  function resolveOrder(rel, ctx) {
    var c = ctx || {};
    var encoded = encodePath(rel);

    if (c.localUrl) return { source: 'local', url: String(c.localUrl) };
    if (c.bundled === true) return { source: 'bundled', url: encoded };

    var base = typeof c.remoteBase === 'string' ? c.remoteBase : '';
    if (base) return { source: 'remote', url: joinBase(base, encoded) };

    return { source: 'none', url: null };
  }

  // ------------------------------------------------------------- resolution

  var headCache = Object.create(null);
  var localCache = Object.create(null);
  var releaseInfoPromise = null;
  var releaseInfoDone = false;

  function api() {
    if (!root || typeof root.electronAPI === 'undefined' || !root.electronAPI) return null;
    return root.electronAPI;
  }

  function mediaApi() {
    var a = api();
    if (!a || !a.media || typeof a.media !== 'object') return null;
    return a.media;
  }

  function isDesktop() {
    var a = api();
    return !!(a && a.isDesktopApp);
  }

  /** Pull mediaBaseUrl from the desktop release info, once. */
  function primeReleaseInfo() {
    if (releaseInfoPromise) return releaseInfoPromise;
    var a = api();
    if (!a || !a.app || typeof a.app.getReleaseInfo !== 'function') {
      releaseInfoDone = true;
      releaseInfoPromise = Promise.resolve(null);
      return releaseInfoPromise;
    }
    releaseInfoPromise = Promise.resolve()
      .then(function () {
        return a.app.getReleaseInfo();
      })
      .then(function (info) {
        if (info && typeof info.mediaBaseUrl === 'string' && info.mediaBaseUrl) {
          if (root.APLUS_MEDIA_CONFIG) root.APLUS_MEDIA_CONFIG.remoteBase = info.mediaBaseUrl;
        }
        releaseInfoDone = true;
        return info || null;
      })
      .catch(function () {
        releaseInfoDone = true;
        return null;
      });
    return releaseInfoPromise;
  }

  function localLookup(rel) {
    var m = mediaApi();
    if (!m || typeof m.resolve !== 'function') return Promise.resolve(null);
    if (Object.prototype.hasOwnProperty.call(localCache, rel)) {
      return Promise.resolve(localCache[rel]);
    }
    return Promise.resolve()
      .then(function () {
        return m.resolve(rel);
      })
      .then(function (r) {
        var url = r && r.ok && r.url ? String(r.url) : null;
        localCache[rel] = url;
        return url;
      })
      .catch(function () {
        localCache[rel] = null;
        return null;
      });
  }

  function bundledLookup(rel) {
    if (!isBundledKind(rel)) return Promise.resolve(false);
    if (Object.prototype.hasOwnProperty.call(headCache, rel)) {
      return Promise.resolve(headCache[rel]);
    }
    if (typeof fetch !== 'function') {
      headCache[rel] = false;
      return Promise.resolve(false);
    }
    return fetch(encodePath(rel), { method: 'HEAD' })
      .then(function (res) {
        headCache[rel] = !!(res && res.ok);
        return headCache[rel];
      })
      .catch(function () {
        headCache[rel] = false;
        return false;
      });
  }

  /**
   * resolve(rel) -> URL string, null, or a Promise for either.
   * A plain string comes back when the answer needs no async work.
   */
  function resolve(rel) {
    var relPath = String(rel == null ? '' : rel);
    if (!relPath) return null;
    if (isAbsolute(relPath)) return relPath;

    var m = mediaApi();
    var needsLocal = !!(m && typeof m.resolve === 'function') &&
      !Object.prototype.hasOwnProperty.call(localCache, relPath);
    var needsBundled =
      isBundledKind(relPath) && !Object.prototype.hasOwnProperty.call(headCache, relPath);
    var needsRelease = isDesktop() && !releaseInfoDone;

    if (!needsLocal && !needsBundled && !needsRelease) {
      return resolveOrder(relPath, {
        localUrl: localCache[relPath] || null,
        bundled: isBundledKind(relPath) ? headCache[relPath] === true : false,
        remoteBase: cfg().remoteBase
      }).url;
    }

    return Promise.all([primeReleaseInfo(), localLookup(relPath), bundledLookup(relPath)]).then(
      function (parts) {
        return resolveOrder(relPath, {
          localUrl: parts[1],
          bundled: parts[2] === true,
          remoteBase: cfg().remoteBase
        }).url;
      }
    );
  }

  // ------------------------------------------------------ DOM rewriting

  function relFromUrl(value) {
    var v = String(value == null ? '' : value).trim();
    if (!v) return '';
    if (isAbsolute(v)) return '';
    if (v.indexOf('blob:') === 0 || v.indexOf('data:') === 0) return '';
    return decodePath(v.replace(/^\.\//, ''));
  }

  function showUnavailable(el) {
    if (!el || !el.ownerDocument) return;
    var doc = el.ownerDocument;
    var host = el.parentNode;
    if (!host) return;
    if (host.querySelector && host.querySelector('.media-unavailable')) return;
    var p = doc.createElement('p');
    p.className = 'media-unavailable';
    p.setAttribute('role', 'status');
    p.style.cssText =
      'margin:0.75rem 0;padding:0.75rem 0.9rem;border:1px solid var(--border-color);' +
      'border-radius:8px;background:var(--bg-card);color:var(--text-secondary);' +
      'font-size:0.9rem;line-height:1.5;';
    p.textContent = UNAVAILABLE_TEXT;
    try {
      host.insertBefore(p, el.nextSibling);
    } catch (_) {
      host.appendChild(p);
    }
  }

  function applyUrl(el, attr, url) {
    if (url) {
      el.setAttribute(attr, url);
      if (typeof el.load === 'function' && String(el.tagName || '').toUpperCase() === 'VIDEO') {
        try {
          el.load();
        } catch (_) {}
      }
      return;
    }
    el.removeAttribute(attr);
    if (attr === 'src') showUnavailable(el);
  }

  function settle(value, cb) {
    if (value && typeof value.then === 'function') {
      value.then(cb, function () {
        cb(null);
      });
      return;
    }
    cb(value);
  }

  /** Rewrite one element. Safe to call any number of times. */
  function rewriteNode(el) {
    if (!el || el.nodeType !== 1 || typeof el.getAttribute !== 'function') return false;
    if (el.getAttribute('data-media-resolved') === '1') return false;

    var tag = String(el.tagName || '').toUpperCase();
    var attrs = [];
    if (tag === 'VIDEO' || tag === 'AUDIO') {
      attrs.push('src');
      attrs.push('poster');
    } else if (tag === 'SOURCE') {
      attrs.push('src');
    } else if (tag === 'A' && el.hasAttribute && el.hasAttribute('download')) {
      attrs.push('href');
    } else {
      return false;
    }

    var touched = false;
    attrs.forEach(function (attr) {
      var raw = el.getAttribute(attr);
      if (!raw) return;
      var rel = relFromUrl(raw);
      if (!rel) return;
      touched = true;
      if (attr === 'src' || attr === 'href') el.setAttribute('data-media-rel', rel);
      settle(resolve(rel), function (url) {
        applyUrl(el, attr, url);
      });
    });

    el.setAttribute('data-media-resolved', '1');
    return touched;
  }

  function rewriteTree(node) {
    if (!node || node.nodeType !== 1) return;
    rewriteNode(node);
    if (typeof node.querySelectorAll !== 'function') return;
    var found = node.querySelectorAll('video, audio, source, a[download]');
    Array.prototype.forEach.call(found, rewriteNode);
  }

  var observer = null;

  function watchContainers() {
    if (typeof document === 'undefined' || !document.getElementById) return;
    if (typeof MutationObserver !== 'function') return;
    if (observer) return;
    observer = new MutationObserver(function (records) {
      records.forEach(function (rec) {
        Array.prototype.forEach.call(rec.addedNodes || [], rewriteTree);
        if (rec.type === 'attributes' && rec.target) {
          var t = rec.target;
          if (t.getAttribute && t.getAttribute('data-media-resolved') === '1') {
            var current = t.getAttribute(rec.attributeName);
            var known = t.getAttribute('data-media-rel');
            if (current && known && relFromUrl(current) === known) return;
            if (current && !isAbsolute(current)) {
              t.removeAttribute('data-media-resolved');
              rewriteNode(t);
            }
          }
        }
      });
    });
    var watched = 0;
    CONTAINER_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      observer.observe(el, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src', 'poster', 'href']
      });
      rewriteTree(el);
      watched++;
    });
    if (!watched && document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  // ------------------------------------------------------ offline pack UI

  var packState = { installed: false, bytes: 0, path: '' };

  function emit(name, detail) {
    try {
      if (root.APlus && root.APlus.bus && typeof root.APlus.bus.emit === 'function') {
        root.APlus.bus.emit(name, detail);
      }
    } catch (_) {}
  }

  function formatBytes(n) {
    var b = Number(n) || 0;
    if (b <= 0) return '0 MB';
    var gb = b / (1024 * 1024 * 1024);
    if (gb >= 1) return gb.toFixed(1) + ' GB';
    return Math.round(b / (1024 * 1024)) + ' MB';
  }

  // No display value here on purpose. An inline display beats the browser
  // rule for [hidden], and these buttons are shown and hidden by that
  // attribute.
  function ghostButtonStyle() {
    return (
      'background:transparent;color:var(--text-primary);' +
      'border:1px solid var(--border-color);border-radius:8px;padding:0.5rem 0.85rem;' +
      'font-size:0.85rem;font-family:inherit;cursor:pointer;'
    );
  }

  function buildPanel(doc) {
    var wrap = doc.createElement('div');
    wrap.id = 'mediaPackPanel';
    wrap.className = 'more-subcard media-pack-panel';
    wrap.style.cssText =
      'margin-top:0.75rem;padding:0.85rem;border:1px solid var(--border-color);' +
      'border-radius:10px;background:var(--bg-card);';
    wrap.innerHTML =
      '<h4 class="label" style="margin:0 0 0.35rem;">Course videos</h4>' +
      '<p class="more-note" id="mediaPackStatus" style="margin:0 0 0.6rem;color:var(--text-secondary);font-size:0.85rem;">Streaming</p>' +
      '<div id="mediaPackProgressWrap" hidden style="margin:0 0 0.6rem;">' +
      '<div style="height:6px;border-radius:3px;background:var(--border-color);overflow:hidden;">' +
      '<div id="mediaPackProgressBar" style="height:100%;width:0%;background:var(--gold-primary);"></div>' +
      '</div>' +
      '<p class="more-note" id="mediaPackProgressText" style="margin:0.35rem 0 0;color:var(--text-secondary);font-size:0.8rem;">Starting</p>' +
      '<p class="more-note" style="margin:0.2rem 0 0;color:var(--text-secondary);font-size:0.8rem;">You can close this menu. Closing the app cancels the download.</p>' +
      '</div>' +
      '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;">' +
      '<button type="button" id="mediaPackDownloadBtn" style="' +
      ghostButtonStyle() +
      '">Download for offline use (' +
      cfg().packSizeLabel +
      ')</button>' +
      '<button type="button" id="mediaPackRemoveBtn" hidden style="' +
      ghostButtonStyle() +
      '">Remove download</button>' +
      '</div>';
    return wrap;
  }

  function panelParts(doc) {
    return {
      status: doc.getElementById('mediaPackStatus'),
      progressWrap: doc.getElementById('mediaPackProgressWrap'),
      bar: doc.getElementById('mediaPackProgressBar'),
      progressText: doc.getElementById('mediaPackProgressText'),
      download: doc.getElementById('mediaPackDownloadBtn'),
      remove: doc.getElementById('mediaPackRemoveBtn')
    };
  }

  function paintPack(doc) {
    var p = panelParts(doc);
    if (!p.status) return;
    if (packState.installed) {
      p.status.textContent = 'Downloaded, ' + formatBytes(packState.bytes);
      if (p.download) p.download.hidden = true;
      if (p.remove) p.remove.hidden = false;
    } else {
      p.status.textContent = 'Streaming';
      if (p.download) p.download.hidden = false;
      if (p.remove) p.remove.hidden = true;
    }
  }

  function refreshPackStatus(doc) {
    var m = mediaApi();
    if (!m || typeof m.packStatus !== 'function') return Promise.resolve(packState);
    return Promise.resolve()
      .then(function () {
        return m.packStatus();
      })
      .then(function (s) {
        packState = {
          installed: !!(s && s.installed),
          bytes: (s && s.bytes) || 0,
          path: (s && s.path) || ''
        };
        localCache = Object.create(null);
        paintPack(doc);
        emit('media:packChanged', packState);
        return packState;
      })
      .catch(function () {
        return packState;
      });
  }

  function packUrl() {
    var c = cfg();
    if (!c.remoteBase) return '';
    return joinBase(c.remoteBase, encodeURIComponent(c.packName));
  }

  function wirePack(doc) {
    var m = mediaApi();
    var p = panelParts(doc);

    if (p.download) {
      p.download.addEventListener('click', function () {
        if (!m || typeof m.downloadPack !== 'function') return;
        var url = packUrl();
        if (!url) {
          if (p.status) p.status.textContent = 'No download address is set for this build.';
          return;
        }
        p.download.disabled = true;
        p.download.hidden = true;
        if (p.remove) p.remove.hidden = true;
        if (p.progressWrap) p.progressWrap.hidden = false;
        if (p.progressText) p.progressText.textContent = 'Starting';
        if (p.bar) p.bar.style.width = '0%';
        Promise.resolve()
          .then(function () {
            return m.downloadPack({ url: url });
          })
          .then(function (r) {
            p.download.disabled = false;
            if (p.progressWrap) p.progressWrap.hidden = true;
            if (r && r.ok) return refreshPackStatus(doc);
            paintPack(doc);
            if (p.status) {
              p.status.textContent =
                'Download did not finish. ' + ((r && r.error) || 'Try again later.');
            }
            return null;
          })
          .catch(function () {
            p.download.disabled = false;
            if (p.progressWrap) p.progressWrap.hidden = true;
            paintPack(doc);
            if (p.status) p.status.textContent = 'Download did not finish. Try again later.';
          });
      });
    }

    if (p.remove) {
      p.remove.addEventListener('click', function () {
        if (!m || typeof m.removePack !== 'function') return;
        Promise.resolve()
          .then(function () {
            return m.removePack();
          })
          .then(function () {
            return refreshPackStatus(doc);
          })
          .catch(function () {});
      });
    }

    if (m && typeof m.onProgress === 'function') {
      try {
        m.onProgress(function (info) {
          var parts = panelParts(doc);
          if (!parts.bar) return;
          var pct = info && typeof info.percent === 'number' ? info.percent : 0;
          if (pct > 0 && pct <= 1) pct = pct * 100;
          pct = Math.max(0, Math.min(100, pct));
          parts.bar.style.width = pct.toFixed(1) + '%';
          if (parts.progressText) {
            parts.progressText.textContent =
              formatBytes(info && info.received) +
              ' of ' +
              formatBytes(info && info.total) +
              ', ' +
              Math.round(pct) +
              ' percent';
          }
        });
      } catch (_) {}
    }
  }

  function mountPackUI() {
    if (typeof document === 'undefined' || !document.getElementById) return;
    if (!isDesktop()) return;
    var m = mediaApi();
    if (!m) return;
    if (document.getElementById('mediaPackPanel')) return;

    var panel = buildPanel(document);
    var drawer = document.getElementById('moreMenu');
    var dataGroup = drawer
      ? drawer.querySelector('section.more-group[aria-labelledby="moreGroupData"]')
      : null;
    if (dataGroup) {
      dataGroup.appendChild(panel);
    } else {
      var host = document.getElementById('syncRoot') || document.body;
      if (!host) return;
      panel.style.cssText += 'max-width:420px;margin:1rem auto;';
      host.appendChild(panel);
    }
    wirePack(document);
    paintPack(document);
    refreshPackStatus(document);
  }

  // ---------------------------------------------------------------- wire up

  function init() {
    try {
      primeReleaseInfo();
    } catch (_) {}
    try {
      watchContainers();
    } catch (_) {}
    try {
      mountPackUI();
    } catch (_) {}
  }

  var Media = {
    resolve: resolve,
    resolveOrder: resolveOrder,
    encodePath: encodePath,
    decodePath: decodePath,
    isBundledKind: isBundledKind,
    isVideoPath: isVideoPath,
    joinBase: joinBase,
    rewriteNode: rewriteNode,
    rewriteTree: rewriteTree,
    unavailableText: UNAVAILABLE_TEXT,
    packStatus: function () {
      return packState;
    },
    refresh: function () {
      try {
        watchContainers();
        mountPackUI();
      } catch (_) {}
    },
    _resetCaches: function () {
      headCache = Object.create(null);
      localCache = Object.create(null);
      releaseInfoPromise = null;
      releaseInfoDone = false;
    }
  };

  if (root) {
    root.APlus = root.APlus || {};
    root.APlus.media = Media;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Media;
  }

  if (typeof document !== 'undefined' && document.addEventListener) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
    document.addEventListener('click', function (ev) {
      var t = ev && ev.target;
      if (!t || !t.closest) return;
      if (t.closest('#curriculumModal')) {
        setTimeout(function () {
          try {
            watchContainers();
          } catch (_) {}
        }, 0);
      }
    });
  }
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
