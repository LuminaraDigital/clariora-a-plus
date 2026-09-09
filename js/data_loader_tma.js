/**
 * data_loader_tma.js
 * High-performance progressive data loader for CompTIA A+ TMA.
 * Keeps initial bundle size tiny while prefetching exam shards as needed.
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TMADataLoader = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const cache = {
    meta: null,
    diagnostic: null,
    shards: {},
    core1: null,
    core2: null
  };

  /**
   * Get metadata and shard manifests
   */
  async function getMeta() {
    if (cache.meta) return cache.meta;
    if (typeof window !== 'undefined' && window.TMA_BANK_META) {
      cache.meta = window.TMA_BANK_META;
      return cache.meta;
    }
    try {
      const res = await fetch('shards/meta.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      cache.meta = await res.json();
      return cache.meta;
    } catch (err) {
      console.warn('Fallback: reading legacy exam_data if present', err);
      if (typeof window !== 'undefined' && window.EXAM_DATA) {
        return window.EXAM_DATA;
      }
      throw err;
    }
  }

  /**
   * Fast boot: loads the 20-question diagnostic pack (< 35KB)
   */
  async function loadDiagnosticPack() {
    if (cache.diagnostic) return cache.diagnostic;
    const meta = await getMeta();
    const path = (meta.shards && meta.shards.diagnostic_pack && meta.shards.diagnostic_pack.path) || 'shards/diagnostic_pack.json';
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load diagnostic pack: ${res.status}`);
    cache.diagnostic = await res.json();
    return cache.diagnostic;
  }

  /**
   * Loads questions for a specific domain on demand
   */
  async function loadDomainQuestions(examCore, domainName) {
    const key = `${examCore}:${domainName}`;
    if (cache.shards[key]) return cache.shards[key];

    const meta = await getMeta();
    const coreShards = meta.shards && meta.shards[examCore];
    if (!coreShards || !coreShards[domainName]) {
      throw new Error(`Shard not found for ${examCore} - ${domainName}`);
    }

    const shardPath = coreShards[domainName].path;
    const res = await fetch(shardPath);
    if (!res.ok) throw new Error(`Failed to fetch ${shardPath}`);
    const questions = await res.json();
    cache.shards[key] = questions;
    return questions;
  }

  /**
   * Loads all questions for Core 1 or Core 2 concurrently
   */
  async function loadFullCore(examCore) {
    if (examCore === 'core1' && cache.core1) return cache.core1;
    if (examCore === 'core2' && cache.core2) return cache.core2;

    const meta = await getMeta();
    const coreShards = meta.shards && meta.shards[examCore];
    if (!coreShards) throw new Error(`Unknown exam core: ${examCore}`);

    const domainNames = Object.keys(coreShards);
    const domainPromises = domainNames.map(d => loadDomainQuestions(examCore, d));
    const results = await Promise.all(domainPromises);
    const flattened = results.flat();

    if (examCore === 'core1') cache.core1 = flattened;
    if (examCore === 'core2') cache.core2 = flattened;

    // Synchronize to global window.EXAM_DATA for backward compatibility with existing engine
    if (typeof window !== 'undefined') {
      window.EXAM_DATA = window.EXAM_DATA || { ...meta };
      window.EXAM_DATA[examCore] = flattened;
    }

    return flattened;
  }

  return {
    getMeta,
    loadDiagnosticPack,
    loadDomainQuestions,
    loadFullCore,
    _cache: cache
  };
});
