/**
 * assessment-packs.js - CertMaster-style assessment launchers.
 *
 * Lesson Reviews, Module Quizzes, Checkpoint Reviews, and Exam Practice packs
 * sample from Clariora's own exam bank (never CertMaster question text).
 * High scores land in APlus.curriculum.store under assessments[id].
 */
(function (window) {
  'use strict';

  window.APlus = window.APlus || {};

  function outline() {
    return window.COMPTIA_CURRICULUM_OUTLINE || null;
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function getQuestions(exam) {
    var APlus = window.APlus;
    if (APlus && APlus.data && typeof APlus.data.getQuestions === 'function') {
      return APlus.data.getQuestions(exam === 'both' ? 'both' : exam) || [];
    }
    return [];
  }

  function filterPool(pack) {
    var exam = pack.exam || 'both';
    var pool = getQuestions(exam);
    var domain = pack.domain ? String(pack.domain).toLowerCase() : '';
    var codes = Array.isArray(pack.objective_codes) ? pack.objective_codes : [];
    var codeSet = {};
    for (var i = 0; i < codes.length; i++) codeSet[String(codes[i])] = true;

    var filtered = pool.filter(function (q) {
      if (domain) {
        var qd = String(q.domain || '').toLowerCase();
        if (qd.indexOf(domain.slice(0, 3)) < 0 && qd.indexOf(domain) < 0) return false;
      }
      if (codes.length) {
        var oc = String(q.objective || '');
        if (!codeSet[oc]) {
          // Allow prefix match (e.g. objective "2.1" vs code "2.1")
          var hit = false;
          for (var c = 0; c < codes.length; c++) {
            if (oc === codes[c] || oc.indexOf(codes[c] + '.') === 0) {
              hit = true;
              break;
            }
          }
          if (!hit) return false;
        }
      }
      return true;
    });

    // Checkpoint: include all modules through N by expanding domains of those modules.
    if (pack.kind === 'checkpoint_review' && pack.modules_through && outline()) {
      var mods = (outline().modules || []).filter(function (m) {
        return m.module_no <= pack.modules_through && m.exam === exam;
      });
      var domains = {};
      mods.forEach(function (m) {
        if (m.domain) domains[String(m.domain).toLowerCase().slice(0, 3)] = true;
      });
      filtered = pool.filter(function (q) {
        var qd = String(q.domain || '').toLowerCase();
        for (var key in domains) {
          if (qd.indexOf(key) >= 0) return true;
        }
        return false;
      });
    }

    if (!filtered.length && domain) {
      filtered = pool.filter(function (q) {
        return String(q.domain || '')
          .toLowerCase()
          .indexOf(domain.slice(0, 3)) >= 0;
      });
    }
    if (!filtered.length) filtered = pool.slice();
    return filtered;
  }

  function findPack(id) {
    var doc = outline();
    if (!doc || !Array.isArray(doc.assessments)) return null;
    for (var i = 0; i < doc.assessments.length; i++) {
      if (doc.assessments[i].id === id) return doc.assessments[i];
    }
    return null;
  }

  function listPacks(filter) {
    var doc = outline();
    if (!doc || !Array.isArray(doc.assessments)) return [];
    var exam = (filter && filter.exam) || 'all';
    var kind = (filter && filter.kind) || 'all';
    var q = ((filter && filter.q) || '').toLowerCase().trim();
    return doc.assessments.filter(function (p) {
      if (exam !== 'all' && p.exam !== exam && !(exam === 'both' && p.exam)) return false;
      if (kind !== 'all' && p.kind !== kind) return false;
      if (q) {
        var hay = ((p.title || '') + ' ' + (p.kind || '') + ' ' + (p.domain || '')).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  function startPack(id) {
    var pack = findPack(id);
    if (!pack) {
      alert('Assessment pack not found.');
      return null;
    }
    var APlus = window.APlus;
    if (!APlus || !APlus.engine || typeof APlus.engine.start !== 'function') {
      alert('Exam engine is not ready yet.');
      return null;
    }

    var pool = filterPool(pack);
    var count = Math.min(pack.question_count || 15, pool.length);
    if (!count) {
      alert('No questions available for this pack yet. Expand the exam bank for this domain.');
      return null;
    }
    var sampled = shuffle(pool).slice(0, count);
    var minutes = pack.estimated_minutes || Math.max(5, Math.ceil((count * 75) / 60));

    if (APlus.curriculum && APlus.curriculum.store && APlus.curriculum.store.assessment) {
      var rec = APlus.curriculum.store.assessment(pack.id);
      rec.attempts = (rec.attempts || 0) + 1;
      rec.lastStartedAt = new Date().toISOString();
      rec.kind = pack.kind;
      rec.title = pack.title;
      APlus.curriculum.store.save();
    }

    if (APlus.bus && typeof APlus.bus.emit === 'function') {
      APlus.bus.emit('assessment:started', {
        id: pack.id,
        kind: pack.kind,
        module_no: pack.module_no || null,
        count: count,
        minutes: minutes
      });
    }

    APlus.engine.start({
      type: 'assessment',
      customPool: sampled,
      domainKey: pack.id,
      assessmentId: pack.id,
      assessmentKind: pack.kind,
      questionCount: count,
      timeMinutes: minutes,
      mode: pack.kind === 'exam_practice' && (pack.question_count || 0) >= 80 ? 'mock' : 'practice'
    });

    if (typeof window.closeCurriculumModal === 'function') {
      try {
        window.closeCurriculumModal();
      } catch (_) {}
    }

    return pack;
  }

  function recordResult(payload) {
    if (!payload || !payload.domainKey) return;
    var pack = findPack(payload.domainKey);
    if (!pack && !(payload.assessmentId || payload.domainKey)) return;
    var id = payload.assessmentId || payload.domainKey;
    var APlus = window.APlus;
    if (!APlus || !APlus.curriculum || !APlus.curriculum.store) return;
    var rec = APlus.curriculum.store.assessment(id);
    var pct =
      typeof payload.rawCorrect === 'number' && payload.totalQuestions
        ? Math.round((payload.rawCorrect / payload.totalQuestions) * 1000) / 10
        : null;
    var score = typeof payload.scaledScore === 'number' ? payload.scaledScore : pct;
    rec.lastScore = score;
    rec.lastPercent = pct;
    rec.lastFinishedAt = payload.timestamp || new Date().toISOString();
    rec.seconds = typeof payload.secondsSpent === 'number' ? payload.secondsSpent : rec.seconds;
    rec.kind = (pack && pack.kind) || payload.assessmentKind || rec.kind;
    rec.title = (pack && pack.title) || rec.title || id;
    if (typeof score === 'number') {
      if (typeof rec.bestScore !== 'number' || score > rec.bestScore) rec.bestScore = score;
    }
    if (typeof pct === 'number') {
      if (typeof rec.bestPercent !== 'number' || pct > rec.bestPercent) rec.bestPercent = pct;
    }
    APlus.curriculum.store.save();

    if (APlus.bus && typeof APlus.bus.emit === 'function') {
      APlus.bus.emit('assessment:finished', {
        id: id,
        kind: rec.kind,
        score: score,
        percent: pct,
        bestScore: rec.bestScore,
        bestPercent: rec.bestPercent
      });
    }
  }

  function wireEngine() {
    var APlus = window.APlus;
    if (!APlus || !APlus.bus || typeof APlus.bus.on !== 'function') return;
    APlus.bus.on('exam:finished', function (payload) {
      try {
        if (!payload) return;
        if (payload.examType === 'assessment' || (payload.domainKey && String(payload.domainKey).indexOf('assess-') === 0) || (payload.domainKey && String(payload.domainKey).indexOf('exam-practice-') === 0)) {
          recordResult(payload);
        }
      } catch (_) {}
    });
  }

  var Packs = {
    outline: outline,
    list: listPacks,
    find: findPack,
    start: startPack,
    recordResult: recordResult,
    filterPool: filterPool
  };

  window.APlus.assessmentPacks = Packs;
  window.startAssessmentPack = function (id) {
    return Packs.start(id);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireEngine);
  } else {
    wireEngine();
  }
})(typeof window !== 'undefined' ? window : this);
