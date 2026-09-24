/**
 * Clariora Multi-Track Certification Architecture
 * track-registry.js - Dynamic Registry for Certification Tracks (CompTIA & Microsoft Azure)
 * File: js/track-registry.js
 * Works in Browser and Node.js environments.
 */

(function(root, factory) {
  const instance = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = instance;
  }
  if (typeof root === 'object' && root) {
    root.APlus = root.APlus || {};
    root.APlus.trackRegistry = instance;
  }
  if (typeof window === 'object' && window) {
    window.APlus = window.APlus || {};
    window.APlus.trackRegistry = instance;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  const STORAGE_KEY = 'clariora_active_track_v1';

  const TRACKS = {
    'core1': {
      id: 'core1',
      code: '220-1201',
      vendor: 'CompTIA',
      title: 'CompTIA A+ Core 1',
      subtitle: 'Mobile Devices, Networking, Hardware & Cloud',
      scoreMin: 100,
      scoreMax: 900,
      passingScore: 675,
      timeMinutes: 90,
      questionCount: 90,
      badge: 'A+ Core 1',
      icon: 'desktop',
      blueprint: [
        { prefix: '1.0', name: '1.0 Mobile Devices', weight: 13 },
        { prefix: '2.0', name: '2.0 Networking', weight: 23 },
        { prefix: '3.0', name: '3.0 Hardware', weight: 25 },
        { prefix: '4.0', name: '4.0 Virtualization and Cloud Computing', weight: 11 },
        { prefix: '5.0', name: '5.0 Hardware and Network Troubleshooting', weight: 28 }
      ],
      examKey: 'core1',
      objectivesKey: 'core1',
      shardPrefix: 'core1_'
    },
    'core2': {
      id: 'core2',
      code: '220-1202',
      vendor: 'CompTIA',
      title: 'CompTIA A+ Core 2',
      subtitle: 'Operating Systems, Security & Operational Procedures',
      scoreMin: 100,
      scoreMax: 900,
      passingScore: 700,
      timeMinutes: 90,
      questionCount: 90,
      badge: 'A+ Core 2',
      icon: 'shield',
      blueprint: [
        { prefix: '1.0', name: '1.0 Operating Systems', weight: 28 },
        { prefix: '2.0', name: '2.0 Security', weight: 28 },
        { prefix: '3.0', name: '3.0 Software Troubleshooting', weight: 23 },
        { prefix: '4.0', name: '4.0 Operational Procedures', weight: 21 }
      ],
      examKey: 'core2',
      objectivesKey: 'core2',
      shardPrefix: 'core2_'
    },
    'az900': {
      id: 'az900',
      code: 'AZ-900',
      vendor: 'Microsoft',
      title: 'Microsoft Azure Fundamentals',
      subtitle: 'Cloud Concepts, Azure Architecture & Governance',
      scoreMin: 100,
      scoreMax: 1000,
      passingScore: 700,
      timeMinutes: 50,
      questionCount: 45,
      badge: 'Azure AZ-900',
      icon: 'cloud',
      blueprint: [
        { prefix: '1.0', name: '1.0 Describe cloud concepts', weight: 28 },
        { prefix: '2.0', name: '2.0 Describe Azure architecture and services', weight: 37 },
        { prefix: '3.0', name: '3.0 Describe Azure management and governance', weight: 35 }
      ],
      examKey: 'az900',
      objectivesKey: 'az900',
      shardPrefix: 'az900_'
    }
  };

  let activeTrackId = 'core1';
  const listeners = [];

  // Initialize from storage if available in browser
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && TRACKS[saved]) {
        activeTrackId = saved;
      }
    }
  } catch (e) {
    // LocalStorage fallback
  }

  function syncDom(track) {
    if (typeof document === 'undefined') return;
    const headerSelect = document.getElementById('certTrackSelect');
    if (headerSelect && headerSelect.value !== track.id) {
      headerSelect.value = track.id;
    }
    const drawerSelect = document.getElementById('drawerTrackSelect');
    if (drawerSelect && drawerSelect.value !== track.id) {
      drawerSelect.value = track.id;
    }
    const drawerMeta = document.getElementById('drawerTrackMeta');
    if (drawerMeta) {
      drawerMeta.textContent = 'Active syllabus: ' + track.vendor + ' ' + track.code;
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        syncDom(TRACKS[activeTrackId] || TRACKS['core1']);
      });
    } else {
      setTimeout(() => syncDom(TRACKS[activeTrackId] || TRACKS['core1']), 0);
    }
  }

  return {
    getTracks() {
      return Object.values(TRACKS);
    },

    getTrack(trackId) {
      if (!trackId) return TRACKS[activeTrackId];
      // Normalize aliases
      if (trackId === '1201' || trackId === 'c1') return TRACKS['core1'];
      if (trackId === '1202' || trackId === 'c2') return TRACKS['core2'];
      if (trackId === 'azure' || trackId === 'ms_az900') return TRACKS['az900'];
      return TRACKS[trackId] || TRACKS['core1'];
    },

    getActiveTrackId() {
      return activeTrackId;
    },

    getActiveTrack() {
      return TRACKS[activeTrackId] || TRACKS['core1'];
    },

    setActiveTrack(trackId) {
      const target = this.getTrack(trackId);
      if (!target) return false;
      const prev = activeTrackId;
      activeTrackId = target.id;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, activeTrackId);
        }
      } catch (e) {
        // noop
      }
      syncDom(target);
      if (prev !== activeTrackId) {
        listeners.forEach(fn => {
          try { fn(target, prev); } catch (err) { console.error('Track switch listener error:', err); }
        });
      }
      return true;
    },

    onTrackChange(callback) {
      if (typeof callback === 'function') {
        listeners.push(callback);
      }
    },

    calcScaledScore(rawCorrect, totalQuestions, trackId) {
      const track = this.getTrack(trackId);
      if (!totalQuestions || totalQuestions <= 0) return track.scoreMin;
      const ratio = Math.min(1, Math.max(0, rawCorrect / totalQuestions));
      const range = track.scoreMax - track.scoreMin;
      return Math.round(track.scoreMin + (range * ratio));
    },

    getPassingScore(trackId) {
      const track = this.getTrack(trackId);
      return track.passingScore;
    },

    evaluatePass(scaledScore, trackId) {
      const req = this.getPassingScore(trackId);
      return scaledScore >= req;
    }
  };
});
