/**
 * curriculum.js - Course library store + UI controller.
 * Depends on js/curriculum-model.js and js/curriculum-html.js.
 */
(function (window) {
  'use strict';

  window.APlus = window.APlus || {};

  var H = window.APlus._curriculumHelpers || {};
  var escapeHTML = H.escapeHTML || function (s) { return String(s == null ? '' : s); };
  var encodePath = H.encodePath || function (rel) { return String(rel || ''); };
  var examLabel = H.examLabel || function (exam) { return String(exam || ''); };
  var pad2 = H.pad2 || function (n) { return String(n); };
  var model = window.APlus._curriculumModel || {};
  var html = window.APlus._curriculumHtml || {};
  var STORE_KEY = 'aplus3_course_library_v1';

  var store = {
    data: null,
    load: function () {
      if (this.data) return this.data;
      var parsed = null;
      try {
        var raw = window.localStorage && window.localStorage.getItem(STORE_KEY);
        parsed = raw ? JSON.parse(raw) : null;
      } catch (_) {
        parsed = null;
      }
      if (!parsed || typeof parsed !== 'object') parsed = {};
      parsed.slides = parsed.slides || {};
      parsed.labs = parsed.labs || {};
      parsed.videos = parsed.videos || {};
      parsed.assessments = parsed.assessments || {};
      parsed.bookmarks = parsed.bookmarks || {};
      parsed.activityLog = Array.isArray(parsed.activityLog) ? parsed.activityLog : [];
      this.data = parsed;
      return parsed;
    },
    save: function () {
      try {
        if (window.localStorage) window.localStorage.setItem(STORE_KEY, JSON.stringify(this.load()));
      } catch (_) {}
    },
    deck: function (id) {
      var d = this.load().slides;
      if (!d[id]) d[id] = { at: 1, seen: [], seconds: 0, startedAt: null, completedAt: null };
      if (!Array.isArray(d[id].seen)) d[id].seen = [];
      if (typeof d[id].seconds !== 'number') d[id].seconds = 0;
      return d[id];
    },
    lab: function (id) {
      var d = this.load().labs;
      if (!d[id]) d[id] = { done: {}, answers: {}, bestScore: null, seconds: 0, startedAt: null, completedAt: null };
      d[id].done = d[id].done || {};
      d[id].answers = d[id].answers || {};
      if (typeof d[id].seconds !== 'number') d[id].seconds = 0;
      return d[id];
    },
    video: function (id) {
      var d = this.load().videos;
      if (!d[id]) d[id] = { played: false, seconds: 0, lastPosition: 0, completedAt: null };
      if (typeof d[id].seconds !== 'number') d[id].seconds = 0;
      if (typeof d[id].lastPosition !== 'number') d[id].lastPosition = 0;
      return d[id];
    },
    assessment: function (id) {
      var d = this.load().assessments;
      if (!d[id]) {
        d[id] = {
          attempts: 0,
          bestScore: null,
          bestPercent: null,
          lastScore: null,
          lastPercent: null,
          seconds: 0,
          kind: null,
          title: null,
          lastStartedAt: null,
          lastFinishedAt: null
        };
      }
      return d[id];
    },
    toggleBookmark: function (kind, id) {
      var key = String(kind || 'item') + ':' + String(id || '');
      var b = this.load().bookmarks;
      if (b[key]) delete b[key];
      else b[key] = { kind: kind, id: id, at: new Date().toISOString() };
      this.save();
      return !!b[key];
    },
    isBookmarked: function (kind, id) {
      return !!this.load().bookmarks[String(kind || 'item') + ':' + String(id || '')];
    },
    logActivity: function (entry) {
      var log = this.load().activityLog;
      log.push({
        t: new Date().toISOString(),
        kind: entry && entry.kind,
        id: entry && entry.id,
        action: entry && entry.action,
        seconds: entry && entry.seconds,
        score: entry && entry.score
      });
      if (log.length > 400) log.splice(0, log.length - 400);
      this.save();
    },
    exportState: function () {
      return JSON.parse(JSON.stringify(this.load()));
    },
    importState: function (raw) {
      if (!raw || typeof raw !== 'object') return false;
      this.data = {
        slides: raw.slides || {},
        labs: raw.labs || {},
        videos: raw.videos || {},
        assessments: raw.assessments || {},
        bookmarks: raw.bookmarks || {},
        activityLog: Array.isArray(raw.activityLog) ? raw.activityLog : []
      };
      this.save();
      return true;
    },
    moduleProgress: function (moduleNo) {
      var outline = window.COMPTIA_CURRICULUM_OUTLINE;
      if (!outline || !Array.isArray(outline.modules)) return null;
      var mod = null;
      for (var i = 0; i < outline.modules.length; i++) {
        if (outline.modules[i].module_no === moduleNo) {
          mod = outline.modules[i];
          break;
        }
      }
      if (!mod) return null;
      var total = mod.activities.length || 1;
      var done = 0;
      var bestScores = [];
      var self = this;
      mod.activities.forEach(function (act) {
        if (act.kind === 'topic' && act.ref_id) {
          var d = self.load().slides[act.ref_id];
          if (d && d.completedAt) done++;
          else if (d && d.seen && d.seen.length) done += 0.5;
        } else if (act.kind === 'lab' && act.ref_id) {
          var l = self.load().labs[act.ref_id];
          if (l && (l.completedAt || (typeof l.bestScore === 'number' && l.bestScore >= 80))) done++;
          else if (l && l.done && Object.keys(l.done).length) done += 0.5;
          if (l && typeof l.bestScore === 'number') bestScores.push(l.bestScore);
        } else if (act.kind === 'video' && act.ref_id) {
          var v = self.load().videos[act.ref_id];
          if (v && (v.played || v.completedAt)) done++;
        } else if (act.kind === 'assessment' && act.ref_id) {
          var a = self.load().assessments[act.ref_id];
          if (a && typeof a.bestPercent === 'number') {
            done += a.bestPercent >= 70 ? 1 : 0.5;
            bestScores.push(a.bestPercent);
          }
        }
      });
      return {
        module_no: moduleNo,
        title: mod.title,
        percent: Math.min(100, Math.round((done / total) * 100)),
        done: done,
        total: total,
        highScore: bestScores.length ? Math.max.apply(null, bestScores) : null,
        estimated_minutes: mod.estimated_minutes
      };
    },
    resetLab: function (id) {
      this.load().labs[id] = { done: {}, answers: {}, bestScore: null, seconds: 0, startedAt: null, completedAt: null };
      this.save();
    },
    resetDeck: function (id) {
      this.load().slides[id] = { at: 1, seen: [], seconds: 0, startedAt: null, completedAt: null };
      this.save();
    }
  };

  /* ------------------------------------------------------------------ */
  /* Models: turn a catalog item into something drawable                  */
  /* ------------------------------------------------------------------ */


  var Curriculum = {
    tab: 'videos',
    selectedId: null,
    model: model,
    html: html,
    store: store,
    _bound: false,

    catalog: function () {
      return window.COMPTIA_CURRICULUM || null;
    },

    itemsForTab: function (tab) {
      var c = this.catalog();
      if (tab === 'assessments') {
        if (window.APlus && APlus.assessmentPacks && typeof APlus.assessmentPacks.list === 'function') {
          return APlus.assessmentPacks.list({ exam: 'all' }).map(function (p) {
            return {
              id: p.id,
              kind: 'assessment',
              assessment_kind: p.kind,
              title: p.title,
              exam: p.exam,
              domain: p.domain,
              module_no: p.module_no,
              question_count: p.question_count,
              estimated_minutes: p.estimated_minutes,
              excerpt: (p.kind || '') + ' · ' + (p.domain || p.exam || '')
            };
          });
        }
        return [];
      }
      if (!c) return [];
      if (tab === 'labs') return this.sortLabs(c.labs || []);
      if (tab === 'slides') return c.slides || [];
      return c.videos || [];
    },

    sortLabs: function (labs) {
      return labs.slice().sort(function (a, b) {
        var ga = a.format === 'markdown' ? 0 : a.lab_no ? 1 : 2;
        var gb = b.format === 'markdown' ? 0 : b.lab_no ? 1 : 2;
        if (ga !== gb) return ga - gb;
        if (ga === 1) return (a.lab_no || 0) - (b.lab_no || 0);
        return String(a.title).localeCompare(String(b.title));
      });
    },

    open: function (tab, id) {
      if (tab === 'labs' || tab === 'slides' || tab === 'videos' || tab === 'assessments') this.tab = tab;
      var modal = document.getElementById('curriculumModal');
      if (!modal) return;
      modal.classList.add('active');
      this.selectedId = id || null;
      this.bind();
      this.syncTabs();
      this.render();
      if (window.CompTIALedgerUI && typeof CompTIALedgerUI.onStudyOpen === 'function') {
        CompTIALedgerUI.onStudyOpen({
          id: 'curriculum-hub',
          title: 'Course library',
          category: 'Curriculum',
          path: 'curriculum'
        });
      }
    },

    close: function () {
      var modal = document.getElementById('curriculumModal');
      if (modal) modal.classList.remove('active');
      var player = document.getElementById('curriculumVideoPlayer');
      if (player) {
        try {
          player.pause();
          player.removeAttribute('src');
          player.load();
        } catch (_) {}
      }
    },

    isOpen: function () {
      var modal = document.getElementById('curriculumModal');
      return !!(modal && modal.classList.contains('active'));
    },

    setTab: function (tab) {
      this.tab = tab;
      this.selectedId = null;
      this.syncTabs();
      this.render();
    },

    syncTabs: function () {
      var self = this;
      var c = this.catalog();
      var outline = window.COMPTIA_CURRICULUM_OUTLINE;
      ['videos', 'slides', 'labs', 'assessments'].forEach(function (t) {
        var btn = document.getElementById('curriculumTab-' + t);
        if (!btn) return;
        var on = t === self.tab;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
        var countEl = btn.querySelector('.cl-tab-count');
        if (countEl) {
          if (t === 'assessments') {
            countEl.textContent = String((outline && outline.ours && outline.ours.assessments) || (outline && outline.assessments && outline.assessments.length) || 0);
          } else if (c && c.stats) {
            countEl.textContent = String(c.stats[t] || 0);
          }
        }
      });
      var search = document.getElementById('curriculumSearch');
      if (search) {
        search.placeholder =
          this.tab === 'labs'
            ? 'Search labs'
            : this.tab === 'slides'
              ? 'Search slide decks'
              : this.tab === 'assessments'
                ? 'Search assessments'
                : 'Search videos';
      }
    },

    progressText: function (item) {
      if (item.kind === 'slide') {
        var d = store.load().slides[item.id];
        if (!d || !d.seen || !d.seen.length) return '';
        var total = model.deckOf(item).length || parseInt(item.slides, 10) || 0;
        if (total && d.seen.length >= total) return 'Finished';
        return d.seen.length + ' viewed';
      }
      if (item.kind === 'lab') {
        var l = store.load().labs[item.id];
        if (!l) return '';
        if (typeof l.bestScore === 'number') return 'High score ' + l.bestScore + '%';
        var n = 0;
        for (var k in l.done) if (l.done[k] && /^s\d+$/.test(k)) n++;
        if (!n) return '';
        var lab = model.labOf(item);
        return lab.checkables && n >= lab.checkables ? 'Complete' : n + ' steps done';
      }
      if (item.kind === 'assessment') {
        var a = store.load().assessments[item.id];
        if (!a) return (item.estimated_minutes || '?') + ' min';
        if (typeof a.bestPercent === 'number') return 'High score ' + a.bestPercent + '%';
        if (a.attempts) return a.attempts + ' attempt' + (a.attempts === 1 ? '' : 's');
        return (item.estimated_minutes || '?') + ' min';
      }
      var v = store.load().videos[item.id];
      return v && v.played ? 'Watched' : '';
    },

    render: function () {
      var list = document.getElementById('curriculumList');
      var viewer = document.getElementById('curriculumViewer');
      var count = document.getElementById('curriculumCount');
      if (!list || !viewer) return;

      var c = this.catalog();
      if (!c) {
        list.innerHTML = '';
        viewer.innerHTML =
          '<div class="cl-empty"><h4>Course media not built</h4><p>Run <code>python tools/build_curriculum.py</code> with the course folders present, then reload.</p></div>';
        if (count) count.textContent = '';
        return;
      }

      var search = ((document.getElementById('curriculumSearch') || {}).value || '').toLowerCase().trim();
      var exam = (document.getElementById('curriculumExamFilter') || {}).value || 'all';
      var items = this.itemsForTab(this.tab);
      var self = this;
      var visible = 0;
      var first = null;
      var groups = {};
      var order = [];

      items.forEach(function (item) {
        var hay = ((item.title || '') + ' ' + (item.short_title || '') + ' ' + (item.excerpt || '') + ' ' + (item.source || '')).toLowerCase();
        if (search && hay.indexOf(search) < 0) return;
        if (!(exam === 'all' || item.exam === exam || item.exam === 'both')) return;
        visible++;
        if (!first) first = item;
        var g = self.groupOf(item);
        if (!groups[g]) {
          groups[g] = [];
          order.push(g);
        }
        groups[g].push(item);
      });

      var out = '';
      order.forEach(function (g) {
        out += '<div class="cl-group"><p class="cl-group-label">' + escapeHTML(g) + '</p>';
        groups[g].forEach(function (item) {
          out += html.listItem(item, self.selectedId === item.id, self.progressText(item));
        });
        out += '</div>';
      });
      list.innerHTML = out || '<p class="cl-empty-list">Nothing matches this search.</p>';

      if (count) {
        var noun = this.tab === 'slides' ? 'slide decks' : this.tab;
        count.textContent = 'Showing ' + visible + ' of ' + items.length + ' ' + noun;
      }

      if (
        this.selectedId &&
        items.some(function (i) {
          return i.id === self.selectedId;
        })
      ) {
        this.show(this.selectedId);
      } else if (first) {
        this.show(first.id);
      } else {
        viewer.innerHTML = '<div class="cl-empty"><p>No items match this filter.</p></div>';
      }
    },

    groupOf: function (item) {
      if (item.kind === 'assessment') {
        if (item.assessment_kind === 'lesson_review') return 'Lesson Reviews';
        if (item.assessment_kind === 'module_quiz') return 'Module Quizzes';
        if (item.assessment_kind === 'checkpoint_review') return 'Checkpoint Reviews';
        if (item.assessment_kind === 'exam_practice') return 'Exam Practice';
        return 'Assessments';
      }
      if (item.kind === 'lab') {
        if (item.format === 'markdown') return 'Start here';
        if (item.lab_no) return 'Hands-on labs';
        return 'Capstone';
      }
      if (item.exam === 'core1') return 'Core 1 (220-1201)';
      if (item.exam === 'core2') return 'Core 2 (220-1202)';
      return 'Both cores';
    },

    findItem: function (id) {
      var items = this.itemsForTab(this.tab);
      for (var i = 0; i < items.length; i++) if (items[i].id === id) return items[i];
      return null;
    },

    show: function (id) {
      var item = this.findItem(id);
      var viewer = document.getElementById('curriculumViewer');
      if (!item || !viewer) return;
      this.selectedId = id;
      this.markSelected();

      if (item.kind === 'assessment') {
        var a = store.assessment(item.id);
        var kindLabel =
          item.assessment_kind === 'module_quiz'
            ? 'Module Quiz'
            : item.assessment_kind === 'checkpoint_review'
              ? 'Checkpoint Review'
              : item.assessment_kind === 'exam_practice'
                ? 'Exam Practice'
                : 'Lesson Review';
        var high =
          typeof a.bestPercent === 'number'
            ? '<p class="cl-meta">High score: <strong>' + a.bestPercent + '%</strong>' + (typeof a.bestScore === 'number' ? ' (scaled ' + a.bestScore + ')' : '') + '</p>'
            : '<p class="cl-meta">High score: N/A</p>';
        viewer.innerHTML =
          '<div class="cl-assessment">' +
          '<header class="cl-head"><span class="cl-badge">' +
          escapeHTML(kindLabel) +
          '</span><div class="cl-head-text"><h4>' +
          escapeHTML(item.title) +
          '</h4><p class="cl-meta">' +
          escapeHTML(examLabel(item.exam)) +
          (item.domain ? ' · ' + escapeHTML(item.domain) : '') +
          (item.module_no ? ' · Module ' + item.module_no : '') +
          ' · ' +
          (item.question_count || '?') +
          ' questions · ' +
          (item.estimated_minutes || '?') +
          ' min</p></div></header>' +
          high +
          '<p>Questions are drawn from Clariora\'s exam bank for this domain. Scores are stored locally as high scores, the same way CertMaster tracks Lesson Reviews and Module Quizzes.</p>' +
          '<div class="cl-head-actions" style="margin-top:1rem">' +
          '<button type="button" class="btn btn-primary" data-cl-action="start-assessment" data-pack-id="' +
          escapeHTML(item.id) +
          '">Start assessment</button>' +
          '<button type="button" class="btn btn-secondary" data-cl-action="toggle-bookmark" data-kind="assessment" data-id="' +
          escapeHTML(item.id) +
          '">' +
          (store.isBookmarked('assessment', item.id) ? 'Remove bookmark' : 'Bookmark') +
          '</button>' +
          '</div></div>';
        viewer.scrollTop = 0;
        store.logActivity({ kind: 'assessment', id: item.id, action: 'view' });
        return;
      }

      if (item.kind === 'video') {
        viewer.innerHTML = html.video(item, store.video(item.id));
        var player = document.getElementById('curriculumVideoPlayer');
        if (player) {
          var vidRec = store.video(item.id);
          if (vidRec.lastPosition > 0) {
            try {
              player.currentTime = vidRec.lastPosition;
            } catch (_) {}
          }
          player.addEventListener('play', function () {
            var v = store.video(item.id);
            if (!v.played) {
              v.played = true;
              store.save();
              store.logActivity({ kind: 'video', id: item.id, action: 'play' });
            }
          });
          player.addEventListener('timeupdate', function () {
            var v = store.video(item.id);
            v.lastPosition = Math.floor(player.currentTime || 0);
            v.seconds = Math.max(v.seconds || 0, v.lastPosition);
            if (player.duration && player.currentTime / player.duration >= 0.9) {
              v.completedAt = v.completedAt || new Date().toISOString();
              v.played = true;
            }
          });
          player.addEventListener('pause', function () {
            store.save();
          });
          player.addEventListener('ended', function () {
            var v = store.video(item.id);
            v.played = true;
            v.completedAt = new Date().toISOString();
            store.save();
            store.logActivity({ kind: 'video', id: item.id, action: 'complete' });
          });
        }
        viewer.scrollTop = 0;
        return;
      }

      if (item.kind === 'slide') {
        var deck = model.deckOf(item);
        var prog = store.deck(item.id);
        if (!prog.startedAt) prog.startedAt = new Date().toISOString();
        var at = Math.max(1, Math.min(deck.length || 1, prog.at || 1));
        this.markSeen(item.id, at);
        viewer.innerHTML = deck.length
          ? html.deck(item, deck, at, prog)
          : '<div class="cl-empty"><p>No slide text could be read from this deck.</p>' + openOriginal(item, 'Open PowerPoint') + '</div>';
        viewer.scrollTop = 0;
        this.scrollFilmstrip();
        return;
      }

      var labProg = store.lab(item.id);
      if (!labProg.startedAt) {
        labProg.startedAt = new Date().toISOString();
        store.save();
      }
      if (item.format === 'markdown') {
        viewer.innerHTML = html.markdownLab(item);
      } else {
        var lab = model.labOf(item);
        viewer.innerHTML = html.lab(item, lab, labProg);
      }
      viewer.scrollTop = 0;
    },

    markSelected: function () {
      var list = document.getElementById('curriculumList');
      if (!list) return;
      var self = this;
      Array.prototype.forEach.call(list.querySelectorAll('.cl-item'), function (el) {
        var on = el.getAttribute('data-id') === self.selectedId;
        el.classList.toggle('is-active', on);
        el.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    },

    refreshListItem: function (item) {
      var list = document.getElementById('curriculumList');
      if (!list) return;
      var el = list.querySelector('.cl-item[data-id="' + item.id.replace(/"/g, '\\"') + '"]');
      if (!el) return;
      var wrap = document.createElement('div');
      wrap.innerHTML = html.listItem(item, this.selectedId === item.id, this.progressText(item));
      if (wrap.firstChild) el.parentNode.replaceChild(wrap.firstChild, el);
    },

    /* ---- slides ---- */

    markSeen: function (deckId, n) {
      var p = store.deck(deckId);
      p.at = n;
      if (p.seen.indexOf(n) < 0) p.seen.push(n);
      var item = this.findItem(deckId);
      var total = item ? model.deckOf(item).length : 0;
      if (total && p.seen.length >= total) {
        p.completedAt = p.completedAt || new Date().toISOString();
      }
      store.save();
    },

    goTo: function (n) {
      var item = this.findItem(this.selectedId);
      if (!item || item.kind !== 'slide') return;
      var deck = model.deckOf(item);
      var total = deck.length;
      if (!total) return;
      n = Math.max(1, Math.min(total, n));
      this.markSeen(item.id, n);
      var prog = store.deck(item.id);

      var slot = document.getElementById('clSlideSlot');
      if (!slot) {
        this.show(item.id);
        return;
      }
      slot.innerHTML = html.slide(item, deck, n);
      var counter = document.getElementById('clSlideCounter');
      if (counter) counter.textContent = 'Slide ' + n + ' of ' + total;
      var viewer = document.getElementById('curriculumViewer');
      if (viewer) {
        var prev = viewer.querySelector('.cl-nav-prev');
        var next = viewer.querySelector('.cl-nav-next');
        if (prev) prev.disabled = n <= 1;
        if (next) next.disabled = n >= total;
        var bar = viewer.querySelector('.cl-deck > .cl-bar');
        if (bar) {
          var pct = Math.round((prog.seen.length / total) * 100);
          bar.setAttribute('aria-valuenow', String(pct));
          var fill = bar.querySelector('span');
          if (fill) fill.style.width = pct + '%';
        }
        var meta = viewer.querySelector('.cl-deck .cl-meta');
        if (meta) meta.textContent = examLabel(item.exam) + ' · ' + total + ' slides · ' + prog.seen.length + ' viewed';
        var notes = document.getElementById('clNotes');
        if (notes) {
          var s = deck[n - 1];
          notes.hidden = !s.notes;
          var body = notes.querySelector('.cl-notes-body');
          if (body) {
            body.innerHTML = escapeHTML(s.notes || '')
              .split(/\n+/)
              .map(function (p) {
                return '<p>' + p + '</p>';
              })
              .join('');
          }
        }
        Array.prototype.forEach.call(viewer.querySelectorAll('.cl-film'), function (el) {
          var k = parseInt(el.getAttribute('data-n'), 10);
          el.classList.toggle('is-active', k === n);
          if (prog.seen.indexOf(k) >= 0) el.classList.add('is-seen');
        });
      }
      this.scrollFilmstrip();
      this.refreshListItem(item);
    },

    scrollFilmstrip: function () {
      var strip = document.getElementById('clFilmstrip');
      if (!strip) return;
      var active = strip.querySelector('.cl-film.is-active');
      if (active && typeof active.scrollIntoView === 'function') {
        try {
          active.scrollIntoView({ block: 'nearest', inline: 'center' });
        } catch (_) {
          active.scrollIntoView();
        }
      }
    },

    step: function (delta) {
      var item = this.findItem(this.selectedId);
      if (!item || item.kind !== 'slide') return;
      var prog = store.deck(item.id);
      this.goTo((prog.at || 1) + delta);
    },

    /* ---- labs ---- */

    updateLabProgress: function () {
      var item = this.findItem(this.selectedId);
      if (!item || item.kind !== 'lab') return;
      var lab = model.labOf(item);
      var prog = store.lab(item.id);
      var done = 0;
      for (var k in prog.done) if (prog.done[k] && /^s\d+$/.test(k)) done++;
      var answered = 0;
      for (var q in prog.answers) if (String(prog.answers[q] || '').trim()) answered++;
      var pct = lab.checkables ? Math.round((done / lab.checkables) * 100) : 0;
      if (lab.checkables && done >= lab.checkables) {
        prog.completedAt = prog.completedAt || new Date().toISOString();
        if (typeof prog.bestScore !== 'number' || pct > prog.bestScore) prog.bestScore = pct;
        store.logActivity({ kind: 'lab', id: item.id, action: 'complete', score: pct });
      } else if (pct > 0 && (typeof prog.bestScore !== 'number' || pct > prog.bestScore)) {
        prog.bestScore = pct;
      }
      store.save();
      var viewer = document.getElementById('curriculumViewer');
      if (!viewer) return;
      var bar = viewer.querySelector('.cl-lab-progress .cl-bar');
      if (bar) {
        bar.setAttribute('aria-valuenow', String(pct));
        var fill = bar.querySelector('span');
        if (fill) fill.style.width = pct + '%';
      }
      var text = document.getElementById('clLabProgressText');
      if (text) {
        text.textContent =
          done +
          ' of ' +
          lab.checkables +
          ' steps done' +
          (lab.questions ? ' · ' + answered + ' of ' + lab.questions + ' answered' : '') +
          (typeof prog.bestScore === 'number' ? ' · High score ' + prog.bestScore + '%' : '') +
          (lab.checkables && done === lab.checkables ? ' · Lab complete' : '');
      }
      Array.prototype.forEach.call(viewer.querySelectorAll('.cl-step'), function (stepEl) {
        var boxes = stepEl.querySelectorAll('input[data-cl-step]');
        var n = 0;
        Array.prototype.forEach.call(boxes, function (b) {
          if (b.checked) n++;
        });
        var countEl = stepEl.querySelector('.cl-step-count');
        if (countEl) countEl.textContent = n + '/' + boxes.length;
        stepEl.classList.toggle('is-complete', boxes.length > 0 && n === boxes.length);
      });
      this.refreshListItem(item);
    },

    /* ---- events ---- */

    bind: function () {
      if (this._bound) return;
      this._bound = true;
      var self = this;
      var viewer = document.getElementById('curriculumViewer');
      var list = document.getElementById('curriculumList');

      if (list) {
        list.addEventListener('click', function (e) {
          var btn = e.target.closest ? e.target.closest('.cl-item') : null;
          if (btn) self.show(btn.getAttribute('data-id'));
        });
      }

      if (viewer) {
        viewer.addEventListener('click', function (e) {
          var el = e.target.closest ? e.target.closest('[data-cl-action]') : null;
          if (!el) return;
          var action = el.getAttribute('data-cl-action');
          if (action === 'prev') self.step(-1);
          else if (action === 'next') self.step(1);
          else if (action === 'goto') self.goTo(parseInt(el.getAttribute('data-n'), 10) || 1);
          else if (action === 'reset-deck') {
            if (self.selectedId) {
              store.resetDeck(self.selectedId);
              self.show(self.selectedId);
              self.refreshListItem(self.findItem(self.selectedId));
            }
          } else if (action === 'reset-lab') {
            if (self.selectedId) {
              store.resetLab(self.selectedId);
              self.show(self.selectedId);
              self.refreshListItem(self.findItem(self.selectedId));
            }
          } else if (action === 'start-assessment') {
            var packId = el.getAttribute('data-pack-id') || self.selectedId;
            if (window.startAssessmentPack) window.startAssessmentPack(packId);
          } else if (action === 'toggle-bookmark') {
            var bk = el.getAttribute('data-kind') || 'assessment';
            var bid = el.getAttribute('data-id') || self.selectedId;
            store.toggleBookmark(bk, bid);
            if (self.selectedId) self.show(self.selectedId);
          } else if (action === 'copy') {
            var text = el.getAttribute('data-copy') || '';
            var done = function () {
              var old = el.textContent;
              el.textContent = 'Copied';
              setTimeout(function () {
                el.textContent = old;
              }, 1200);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(text).then(done, function () {});
            }
          }
        });

        viewer.addEventListener('change', function (e) {
          var box = e.target;
          if (!box || !box.getAttribute || !box.getAttribute('data-cl-step')) return;
          if (!self.selectedId) return;
          var prog = store.lab(self.selectedId);
          var key = box.getAttribute('data-cl-step');
          if (box.checked) prog.done[key] = true;
          else delete prog.done[key];
          store.save();
          var label = box.closest ? box.closest('.cl-check') : null;
          if (label) label.classList.toggle('is-done', box.checked);
          var li = box.closest ? box.closest('.cl-substep') : null;
          if (li) li.classList.toggle('is-done', box.checked);
          self.updateLabProgress();
        });

        var saveTimer = null;
        viewer.addEventListener('input', function (e) {
          var ta = e.target;
          if (!ta || !ta.getAttribute || !ta.getAttribute('data-cl-answer')) return;
          if (!self.selectedId) return;
          var prog = store.lab(self.selectedId);
          prog.answers[ta.getAttribute('data-cl-answer')] = ta.value;
          var wrap = ta.closest ? ta.closest('.cl-question') : null;
          if (wrap) wrap.classList.toggle('is-answered', !!ta.value.trim());
          clearTimeout(saveTimer);
          saveTimer = setTimeout(function () {
            store.save();
            self.updateLabProgress();
          }, 300);
        });
      }

      document.addEventListener('keydown', function (e) {
        if (!self.isOpen() || self.tab !== 'slides') return;
        var t = e.target;
        var tag = t && t.tagName ? t.tagName.toLowerCase() : '';
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || (t && t.isContentEditable)) return;
        if (e.key === 'ArrowRight' || e.key === 'PageDown') {
          e.preventDefault();
          self.step(1);
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
          e.preventDefault();
          self.step(-1);
        } else if (e.key === 'Home') {
          e.preventDefault();
          self.goTo(1);
        } else if (e.key === 'End') {
          e.preventDefault();
          self.goTo(1e9);
        }
      });
    }
  };

  window.APlus.curriculum = Curriculum;
  window.openCurriculumModal = function (tab, id) {
    Curriculum.open(tab || 'videos', id);
  };
  window.closeCurriculumModal = function () {
    Curriculum.close();
  };
  window.setCurriculumTab = function (tab) {
    Curriculum.setTab(tab);
  };
  window.renderCurriculum = function () {
    Curriculum.render();
  };
})(typeof window !== 'undefined' ? window : this);

