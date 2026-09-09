/**
 * curriculum.js - Course library: videos, slide decks and hands-on labs.
 *
 * Slide decks render as a real deck (one slide at a time, keyboard arrows,
 * filmstrip, speaker notes, images pulled from the PowerPoint). Labs render
 * as a guided worksheet (numbered steps with checkboxes, questions with a
 * place to type the answer, terminal panes for commands and output).
 * Progress is kept per learner under one localStorage key.
 *
 * Data comes from curriculum_data.js (python tools/build_curriculum.py).
 * Version 1.1 of that file carries `deck` for slides and `blocks` for labs;
 * older files only carry flat `content`, so every parser here also accepts
 * plain text and does its best.
 *
 * The pure pieces (parsers and HTML builders) live on APlus.curriculum.model
 * and APlus.curriculum.html so tools/test_curriculum.js can run them in Node.
 */
(function (window) {
  'use strict';

  window.APlus = window.APlus || {};

  var escapeHTML =
    (window.APlus.utils && window.APlus.utils.escapeHTML) ||
    function (s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };

  function encodePath(rel) {
    return String(rel || '')
      .split('/')
      .map(function (part) {
        return encodeURIComponent(part);
      })
      .join('/');
  }

  function examLabel(exam) {
    if (exam === 'core1') return 'Core 1';
    if (exam === 'core2') return 'Core 2';
    return 'Core 1 and 2';
  }

  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  /* ------------------------------------------------------------------ */
  /* Progress store                                                       */
  /* ------------------------------------------------------------------ */

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
      if (!d[id]) d[id] = { at: 1, seen: [] };
      if (!Array.isArray(d[id].seen)) d[id].seen = [];
      return d[id];
    },
    lab: function (id) {
      var d = this.load().labs;
      if (!d[id]) d[id] = { done: {}, answers: {} };
      d[id].done = d[id].done || {};
      d[id].answers = d[id].answers || {};
      return d[id];
    },
    video: function (id) {
      var d = this.load().videos;
      if (!d[id]) d[id] = { played: false };
      return d[id];
    },
    resetLab: function (id) {
      this.load().labs[id] = { done: {}, answers: {} };
      this.save();
    },
    resetDeck: function (id) {
      this.load().slides[id] = { at: 1, seen: [] };
      this.save();
    }
  };

  /* ------------------------------------------------------------------ */
  /* Models: turn a catalog item into something drawable                  */
  /* ------------------------------------------------------------------ */

  var model = {};

  /** Slide deck from item.deck, or parsed from "--- Slide N ---" text. */
  model.deckOf = function (item) {
    if (item && Array.isArray(item.deck) && item.deck.length) {
      return item.deck.map(function (s, i) {
        return {
          n: s.n || i + 1,
          title: s.title || '',
          subtitle: s.subtitle || '',
          bullets: Array.isArray(s.bullets) ? s.bullets : [],
          images: Array.isArray(s.images) ? s.images : [],
          notes: s.notes || ''
        };
      });
    }
    var text = String((item && item.content) || '');
    var chunks = text.split(/^---\s*Slide\s+(\d+)\s*---\s*$/m);
    var out = [];
    // split() with a capture group yields [pre, n1, body1, n2, body2, ...]
    for (var i = 1; i < chunks.length; i += 2) {
      var n = parseInt(chunks[i], 10) || out.length + 1;
      var lines = String(chunks[i + 1] || '')
        .split(/\r?\n/)
        .map(function (l) {
          return l.trim();
        })
        .filter(Boolean);
      if (lines.length && /^\d+$/.test(lines[lines.length - 1])) lines.pop();
      out.push({
        n: n,
        title: lines.shift() || 'Slide ' + n,
        subtitle: '',
        bullets: lines.map(function (l) {
          return { text: l, level: 0 };
        }),
        images: [],
        notes: ''
      });
    }
    return out;
  };

  /** Cover, section divider or content slide. */
  model.slideKind = function (slide, index) {
    var hasBody = slide.bullets.length || slide.images.length;
    if (index === 0 && !hasBody) return 'cover';
    if (!hasBody && (slide.subtitle || /^lesson\s+\d/i.test(slide.subtitle || ''))) return 'section';
    if (!hasBody && slide.title) return 'section';
    return 'content';
  };

  /** Objectives listed in the speaker notes of a section divider slide. */
  model.sectionPoints = function (notes) {
    var lines = String(notes || '')
      .split(/\r?\n/)
      .map(function (l) {
        return l.trim();
      })
      .filter(Boolean);
    var pts = [];
    for (var i = 0; i < lines.length && pts.length < 6; i++) {
      var l = lines[i];
      if (/^(core\s*\d\s*)?exam objectives?$/i.test(l)) continue;
      if (/^learning outcomes?$/i.test(l)) break;
      if (/^\d+\.\d+\s/.test(l)) pts.push(l);
    }
    return pts;
  };

  var HEAD_INTRO = /^(introduction|objectives?|background|scenario|background\s*\/\s*scenario|overview|purpose)$/i;
  var HEAD_EQUIP = /(equipment|resources|materials|requirements)/i;
  var HEAD_INSTR = /^(instructions?|procedures?|steps?|tasks?)$/i;
  var HEAD_REFL = /reflection/i;

  /** Typed blocks from flat lab text when the catalog is the old shape. */
  model.blocksFromText = function (text) {
    var lines = String(text || '').split(/\r?\n/);
    var blocks = [];
    var first = true;
    lines.forEach(function (raw) {
      var l = raw.trim();
      if (!l) return;
      if (first) {
        first = false;
        blocks.push({ t: 'title', text: l });
        return;
      }
      if (HEAD_INTRO.test(l) || HEAD_EQUIP.test(l) || HEAD_INSTR.test(l) || HEAD_REFL.test(l)) {
        blocks.push({ t: 'h1', text: l });
      } else if (/^(part)\s+\d+/i.test(l)) {
        blocks.push({ t: 'h2', text: l });
      } else if (/^(step)\s+\d+/i.test(l)) {
        blocks.push({ t: 'h3', text: l });
      } else if (/^questions?:?$/i.test(l)) {
        blocks.push({ t: 'qhead', text: l.replace(/:$/, '') });
      } else if (/^type your answers? here\.?$/i.test(l)) {
        blocks.push({ t: 'answer', text: '' });
      } else if (/^([a-z]:\\|ps\s|\$\s|c:\\)/i.test(l)) {
        blocks.push({ t: 'cmd', text: l });
      } else if (/\?$/.test(l)) {
        blocks.push({ t: 'question', text: l });
      } else if (/^note:/i.test(l)) {
        blocks.push({ t: 'note', text: l });
      } else {
        blocks.push({ t: 'p', text: l });
      }
    });
    return blocks;
  };

  /**
   * Lab worksheet model.
   * {
   *   title, intro: [block], equipment: [text], reflection: [block],
   *   parts: [{ heading, steps: [{ no, heading, items: [block] }] }],
   *   steps: n, questions: n, minutes: n
   * }
   * Every checkable step gets key "s<n>", every question "q<n>".
   */
  model.labOf = function (item) {
    var blocks =
      item && Array.isArray(item.blocks) && item.blocks.length
        ? item.blocks
        : model.blocksFromText((item && item.content) || '');

    var m = {
      title: (item && item.title) || '',
      intro: [],
      equipment: [],
      reflection: [],
      parts: [],
      steps: 0,
      questions: 0,
      minutes: 0
    };

    // Region pass: h1 headings name regions. Everything before the first
    // "Instructions" heading that is not equipment is intro.
    var region = 'intro';
    var instr = [];
    blocks.forEach(function (b) {
      if (b.t === 'p' && /^type your answers? here\.?$/i.test(b.text || '')) {
        b = { t: 'answer', text: '' };
      }
      if (b.t === 'title') {
        if (!m.title) m.title = b.text;
        return;
      }
      if (b.t === 'h1') {
        if (HEAD_EQUIP.test(b.text)) region = 'equipment';
        else if (HEAD_INSTR.test(b.text)) region = 'instr';
        else if (HEAD_REFL.test(b.text)) region = 'reflection';
        else if (HEAD_INTRO.test(b.text)) region = 'intro';
        else region = region === 'intro' || region === 'equipment' ? 'intro' : 'instr';
        if (region === 'intro' && !HEAD_INTRO.test(b.text)) m.intro.push({ t: 'h', text: b.text });
        if (region === 'instr' && !HEAD_INSTR.test(b.text)) instr.push({ t: 'h2', text: b.text });
        return;
      }
      if (region === 'equipment') {
        if (b.t === 'bullet' || b.t === 'bullet2' || b.t === 'p') m.equipment.push(b.text);
        return;
      }
      if (region === 'reflection') {
        m.reflection.push(b);
        return;
      }
      if (region === 'intro') {
        // A lab with no "Instructions" heading at all still has steps.
        if (b.t === 'step' || b.t === 'h2' || b.t === 'h3' || b.t === 'cmd' || b.t === 'table') {
          region = 'instr';
          instr.push(b);
        } else {
          m.intro.push(b);
        }
        return;
      }
      instr.push(b);
    });

    // Heading levels used inside the instructions decide part vs step.
    var levels = {};
    instr.forEach(function (b) {
      if (b.t === 'h2' || b.t === 'h3' || b.t === 'h4') levels[b.t] = true;
    });
    var used = ['h2', 'h3', 'h4'].filter(function (k) {
      return levels[k];
    });
    var partLevel = used.length >= 2 ? used[0] : null;
    var stepLevel = used.length ? used[used.length - 1] : null;

    var part = null;
    var step = null;
    function ensurePart(heading) {
      part = { heading: heading || '', steps: [] };
      m.parts.push(part);
      step = null;
    }
    function ensureStep(heading) {
      if (!part) ensurePart('');
      step = { no: ++m.steps, heading: heading || '', items: [] };
      part.steps.push(step);
    }
    var stepKey = 0;
    var qKey = 0;
    instr.forEach(function (b) {
      if (b.t === partLevel) {
        ensurePart(b.text);
        return;
      }
      if (b.t === stepLevel || (b.t === 'h2' || b.t === 'h3' || b.t === 'h4')) {
        ensureStep(b.text);
        return;
      }
      if (!step) ensureStep('');
      var copy = { t: b.t, text: b.text };
      if (b.rows) copy.rows = b.rows;
      if (b.t === 'step') copy.key = 's' + ++stepKey;
      if (b.t === 'question') copy.key = 'q' + ++qKey;
      step.items.push(copy);
    });
    m.reflection.forEach(function (b) {
      if (b.t === 'question' || b.t === 'p') {
        b.t = 'question';
        b.key = 'q' + ++qKey;
      }
    });

    m.checkables = stepKey;
    m.questions = qKey;
    m.minutes = Math.max(5, Math.round((stepKey * 1.5 + qKey * 2) / 5) * 5);
    return m;
  };

  /* ------------------------------------------------------------------ */
  /* Markdown (small, safe subset)                                        */
  /* ------------------------------------------------------------------ */

  function inlineMd(s) {
    var out = escapeHTML(s);
    out = out.replace(/`([^`]+)`/g, function (_, c) {
      return '<code>' + c + '</code>';
    });
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, function (_, t, u) {
      return '<a href="' + u + '" target="_blank" rel="noopener">' + t + '</a>';
    });
    out = out.replace(/(^|[\s(])(https?:\/\/[^\s)<]+)/g, function (_, pre, u) {
      return pre + '<a href="' + u + '" target="_blank" rel="noopener">' + u + '</a>';
    });
    return out;
  }

  model.markdown = function (md) {
    var lines = String(md || '').replace(/\r/g, '').split('\n');
    var html = [];
    var i = 0;
    var para = [];
    function flushPara() {
      if (para.length) {
        html.push('<p>' + inlineMd(para.join(' ')) + '</p>');
        para = [];
      }
    }
    while (i < lines.length) {
      var l = lines[i];
      if (/^```/.test(l)) {
        flushPara();
        var code = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
        i++;
        html.push('<pre class="cl-code">' + escapeHTML(code.join('\n')) + '</pre>');
        continue;
      }
      var h = /^(#{1,6})\s+(.*)$/.exec(l);
      if (h) {
        flushPara();
        var lvl = Math.min(6, h[1].length + 3);
        html.push('<h' + lvl + ' class="cl-md-h cl-md-h' + h[1].length + '">' + inlineMd(h[2]) + '</h' + lvl + '>');
        i++;
        continue;
      }
      if (/^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/.test(l)) {
        flushPara();
        html.push('<hr class="cl-md-hr">');
        i++;
        continue;
      }
      if (/^\|/.test(l) && i + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[i + 1])) {
        flushPara();
        var head = l
          .split('|')
          .slice(1, -1)
          .map(function (c) {
            return c.trim();
          });
        i += 2;
        var rows = [];
        while (i < lines.length && /^\|/.test(lines[i])) {
          rows.push(
            lines[i]
              .split('|')
              .slice(1, -1)
              .map(function (c) {
                return c.trim();
              })
          );
          i++;
        }
        var t = '<div class="cl-table-wrap"><table class="cl-table"><thead><tr>';
        head.forEach(function (c) {
          t += '<th>' + inlineMd(c) + '</th>';
        });
        t += '</tr></thead><tbody>';
        rows.forEach(function (r) {
          t += '<tr>';
          r.forEach(function (c) {
            t += '<td>' + inlineMd(c) + '</td>';
          });
          t += '</tr>';
        });
        t += '</tbody></table></div>';
        html.push(t);
        continue;
      }
      if (/^\s*([-*+]|\d+\.)\s+/.test(l)) {
        flushPara();
        var ordered = /^\s*\d+\./.test(l);
        var items = [];
        while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*([-*+]|\d+\.)\s+/, ''));
          i++;
          while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
            items[items.length - 1] += ' ' + lines[i].trim();
            i++;
          }
        }
        html.push(
          '<' +
            (ordered ? 'ol' : 'ul') +
            ' class="cl-md-list">' +
            items
              .map(function (it) {
                return '<li>' + inlineMd(it) + '</li>';
              })
              .join('') +
            '</' +
            (ordered ? 'ol' : 'ul') +
            '>'
        );
        continue;
      }
      if (/^>\s?/.test(l)) {
        flushPara();
        var q = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ''));
        html.push('<blockquote class="cl-note">' + inlineMd(q.join(' ')) + '</blockquote>');
        continue;
      }
      if (!l.trim()) {
        flushPara();
        i++;
        continue;
      }
      para.push(l.trim());
      i++;
    }
    flushPara();
    return html.join('\n');
  };

  /* ------------------------------------------------------------------ */
  /* HTML builders                                                        */
  /* ------------------------------------------------------------------ */

  var html = {};

  var ICON_PREV =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
  var ICON_NEXT =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  var ICON_CHECK =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>';

  function openOriginal(item, label) {
    return (
      '<a class="btn btn-secondary cl-open" href="' +
      encodePath(item.media_path) +
      '" download target="_blank" rel="noopener">' +
      escapeHTML(label || 'Open original') +
      '</a>'
    );
  }

  function bulletsHtml(bullets) {
    if (!bullets.length) return '';
    var out = '';
    var depth = 0;
    bullets.forEach(function (b) {
      var lvl = Math.max(0, Math.min(3, b.level || 0));
      while (depth < lvl + 1) {
        out += '<ul class="cl-bullets cl-bullets-' + depth + '">';
        depth++;
      }
      while (depth > lvl + 1) {
        out += '</ul>';
        depth--;
      }
      out += '<li>' + escapeHTML(b.text) + '</li>';
    });
    while (depth > 0) {
      out += '</ul>';
      depth--;
    }
    return out;
  }

  /** One slide. `at` is 1-based. */
  html.slide = function (item, deck, at) {
    var idx = Math.max(0, Math.min(deck.length - 1, at - 1));
    var s = deck[idx];
    var kind = model.slideKind(s, idx);
    var total = deck.length;
    var out = '<article class="cl-slide cl-slide-' + kind + (s.images.length ? ' has-media' : '') + '" aria-live="polite">';

    if (kind === 'cover') {
      out +=
        '<div class="cl-slide-body"><p class="cl-kicker">' +
        escapeHTML(examLabel(item.exam)) +
        (item.module_no ? ' · Module ' + item.module_no : '') +
        '</p><h4>' +
        escapeHTML(item.short_title || item.title) +
        '</h4><p class="cl-slide-sub">' +
        escapeHTML(s.title + (s.subtitle ? ' · ' + s.subtitle : '')) +
        '</p><p class="cl-slide-hint">' +
        total +
        ' slides. Use the arrow keys or the buttons to move through the deck.</p></div>';
    } else if (kind === 'section') {
      var pts = model.sectionPoints(s.notes);
      out +=
        '<div class="cl-slide-body"><p class="cl-kicker">' +
        escapeHTML(s.subtitle || 'Section') +
        '</p><h4>' +
        escapeHTML(s.title) +
        '</h4>';
      if (pts.length) {
        out += '<p class="cl-slide-sub">Exam objectives covered</p><ul class="cl-objectives">';
        pts.forEach(function (p) {
          out += '<li>' + escapeHTML(p) + '</li>';
        });
        out += '</ul>';
      }
      out += '</div>';
    } else {
      out += '<div class="cl-slide-body"><h4>' + escapeHTML(s.title || 'Slide ' + s.n) + '</h4>';
      if (s.subtitle) out += '<p class="cl-slide-sub">' + escapeHTML(s.subtitle) + '</p>';
      out += bulletsHtml(s.bullets) + '</div>';
      if (s.images.length) {
        out += '<figure class="cl-slide-media">';
        out +=
          '<img src="' +
          encodePath(s.images[0]) +
          '" alt="Figure from slide ' +
          s.n +
          '" loading="lazy" onerror="this.closest(\'figure\').hidden=true">';
        if (s.images.length > 1) {
          out += '<div class="cl-slide-thumbs">';
          s.images.slice(1, 4).forEach(function (src, k) {
            out +=
              '<img src="' +
              encodePath(src) +
              '" alt="Additional figure ' +
              (k + 2) +
              ' from slide ' +
              s.n +
              '" loading="lazy" onerror="this.hidden=true">';
          });
          out += '</div>';
        }
        out += '</figure>';
      }
    }
    out +=
      '<footer class="cl-slide-foot"><span>' +
      escapeHTML(item.short_title || item.title) +
      '</span><span>' +
      s.n +
      ' / ' +
      total +
      '</span></footer></article>';
    return out;
  };

  html.deck = function (item, deck, at, progress) {
    var total = deck.length;
    var idx = Math.max(1, Math.min(total, at));
    var seen = progress && Array.isArray(progress.seen) ? progress.seen.length : 0;
    var pct = total ? Math.round((seen / total) * 100) : 0;
    var s = deck[idx - 1] || { notes: '' };

    var out = '<div class="cl-deck" data-deck="' + escapeHTML(item.id) + '">';
    out += '<header class="cl-head">';
    out += '<span class="cl-badge">' + (item.module_no ? 'M' + pad2(item.module_no) : 'Deck') + '</span>';
    out +=
      '<div class="cl-head-text"><h4>' +
      escapeHTML(item.short_title || item.title) +
      '</h4><p class="cl-meta">' +
      escapeHTML(examLabel(item.exam)) +
      ' · ' +
      total +
      ' slides · ' +
      seen +
      ' viewed</p></div>';
    out += '<div class="cl-head-actions">' + openOriginal(item, 'Open PowerPoint') + '</div>';
    out += '</header>';

    out += '<div class="cl-stage">';
    out +=
      '<button type="button" class="cl-nav cl-nav-prev" data-cl-action="prev" aria-label="Previous slide"' +
      (idx <= 1 ? ' disabled' : '') +
      '>' +
      ICON_PREV +
      '</button>';
    out += '<div class="cl-stage-slot" id="clSlideSlot">' + html.slide(item, deck, idx) + '</div>';
    out +=
      '<button type="button" class="cl-nav cl-nav-next" data-cl-action="next" aria-label="Next slide"' +
      (idx >= total ? ' disabled' : '') +
      '>' +
      ICON_NEXT +
      '</button>';
    out += '</div>';

    out +=
      '<div class="cl-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
      pct +
      '" aria-label="Deck progress"><span style="width:' +
      pct +
      '%"></span></div>';

    out += '<div class="cl-deck-tools">';
    out += '<span class="cl-counter" id="clSlideCounter">Slide ' + idx + ' of ' + total + '</span>';
    out += '<span class="cl-keys">Left and right arrow keys move. Home and End jump.</span>';
    out += '<button type="button" class="cl-link" data-cl-action="reset-deck">Reset progress</button>';
    out += '</div>';

    out +=
      '<details class="cl-notes" id="clNotes"' +
      (s.notes ? '' : ' hidden') +
      '><summary>Speaker notes</summary><div class="cl-notes-body">' +
      escapeHTML(s.notes)
        .split(/\n+/)
        .map(function (p) {
          return '<p>' + p + '</p>';
        })
        .join('') +
      '</div></details>';

    out += '<ol class="cl-filmstrip" id="clFilmstrip" aria-label="Slides in this deck">';
    var seenMap = {};
    (progress && progress.seen ? progress.seen : []).forEach(function (n) {
      seenMap[n] = true;
    });
    deck.forEach(function (sl, i) {
      var kind = model.slideKind(sl, i);
      out +=
        '<li><button type="button" class="cl-film' +
        (i + 1 === idx ? ' is-active' : '') +
        (seenMap[i + 1] ? ' is-seen' : '') +
        (kind !== 'content' ? ' is-' + kind : '') +
        '" data-cl-action="goto" data-n="' +
        (i + 1) +
        '" title="' +
        escapeHTML(sl.title || 'Slide ' + (i + 1)) +
        '"><span class="cl-film-n">' +
        (i + 1) +
        '</span><span class="cl-film-t">' +
        escapeHTML(sl.title || 'Slide ' + (i + 1)) +
        '</span></button></li>';
    });
    out += '</ol></div>';
    return out;
  };

  function terminalHtml(items) {
    var out = '<div class="cl-term"><div class="cl-term-bar"><span>Command Prompt</span>';
    var cmds = items
      .filter(function (b) {
        return b.t === 'cmd';
      })
      .map(function (b) {
        return b.text.replace(/^[^>]*>\s*/, '');
      });
    if (cmds.length) {
      out +=
        '<button type="button" class="cl-link" data-cl-action="copy" data-copy="' +
        escapeHTML(cmds.join('\n')) +
        '">Copy command' +
        (cmds.length > 1 ? 's' : '') +
        '</button>';
    }
    out += '</div><pre class="cl-term-body">';
    items.forEach(function (b) {
      out += '<span class="cl-term-' + (b.t === 'cmd' ? 'cmd' : 'out') + '">' + escapeHTML(b.text) + '</span>\n';
    });
    out += '</pre></div>';
    return out;
  }

  function tableHtml(rows, labId, progress) {
    if (!rows || !rows.length) return '';
    var head = rows[0];
    var body = rows.slice(1);
    var checkCol = -1;
    head.forEach(function (c, i) {
      if (/^(ü|\u2610|\u2611|\u2713|\u2714|done|complete|\s*)$/i.test(c) && i === head.length - 1) checkCol = i;
    });
    var out = '<div class="cl-table-wrap"><table class="cl-table"><thead><tr>';
    head.forEach(function (c, i) {
      out += '<th>' + (i === checkCol ? 'Done' : escapeHTML(c)) + '</th>';
    });
    out += '</tr></thead><tbody>';
    body.forEach(function (r, ri) {
      out += '<tr>';
      r.forEach(function (c, ci) {
        if (ci === checkCol) {
          var key = 't' + ri;
          var done = !!(progress && progress.done && progress.done[key]);
          out +=
            '<td class="cl-table-check"><label class="cl-check' +
            (done ? ' is-done' : '') +
            '"><input type="checkbox" data-cl-step="' +
            key +
            '"' +
            (done ? ' checked' : '') +
            ' aria-label="Mark row ' +
            (ri + 1) +
            ' done"><span class="cl-check-box">' +
            ICON_CHECK +
            '</span></label></td>';
        } else {
          out += '<td>' + escapeHTML(c) + '</td>';
        }
      });
      out += '</tr>';
    });
    out += '</tbody></table></div>';
    return out;
  }

  function itemsHtml(items, progress) {
    var out = '';
    var i = 0;
    var letter = 0;
    var listOpen = false;
    function closeList() {
      if (listOpen) {
        out += '</ol>';
        listOpen = false;
      }
    }
    while (i < items.length) {
      var b = items[i];
      if (b.t === 'cmd' || b.t === 'output') {
        closeList();
        var run = [];
        while (i < items.length && (items[i].t === 'cmd' || items[i].t === 'output')) run.push(items[i++]);
        out += terminalHtml(run);
        continue;
      }
      if (b.t === 'step') {
        if (!listOpen) {
          out += '<ol class="cl-substeps">';
          listOpen = true;
        }
        var done = !!(progress && progress.done && progress.done[b.key]);
        out +=
          '<li class="cl-substep' +
          (done ? ' is-done' : '') +
          '"><label class="cl-check' +
          (done ? ' is-done' : '') +
          '"><input type="checkbox" data-cl-step="' +
          b.key +
          '"' +
          (done ? ' checked' : '') +
          '><span class="cl-check-box">' +
          ICON_CHECK +
          '</span><span class="cl-substep-letter">' +
          String.fromCharCode(97 + (letter++ % 26)) +
          '</span><span class="cl-substep-text">' +
          escapeHTML(b.text) +
          '</span></label></li>';
        i++;
        continue;
      }
      closeList();
      if (b.t === 'qhead') {
        out += '<p class="cl-qhead">' + escapeHTML(b.text) + '</p>';
      } else if (b.t === 'question') {
        var saved = (progress && progress.answers && progress.answers[b.key]) || '';
        out +=
          '<div class="cl-question' +
          (saved.trim() ? ' is-answered' : '') +
          '"><p class="cl-q-text">' +
          escapeHTML(b.text) +
          '</p><textarea class="cl-answer" rows="2" data-cl-answer="' +
          b.key +
          '" placeholder="Type your answer here" aria-label="Your answer">' +
          escapeHTML(saved) +
          '</textarea></div>';
        // swallow the answer placeholder block that follows
        if (i + 1 < items.length && items[i + 1].t === 'answer') i++;
      } else if (b.t === 'answer') {
        if (b.text) out += '<p class="cl-answer-given">' + escapeHTML(b.text) + '</p>';
      } else if (b.t === 'note') {
        out += '<p class="cl-note">' + escapeHTML(b.text.replace(/^note:\s*/i, '')) + '</p>';
      } else if (b.t === 'bullet' || b.t === 'bullet2') {
        var bl = [];
        while (i < items.length && (items[i].t === 'bullet' || items[i].t === 'bullet2')) {
          bl.push({ text: items[i].text, level: items[i].t === 'bullet2' ? 1 : 0 });
          i++;
        }
        out += bulletsHtml(bl);
        continue;
      } else if (b.t === 'table') {
        out += tableHtml(b.rows, null, progress);
      } else if (b.t === 'caption') {
        out += '<p class="cl-caption">' + escapeHTML(b.text) + '</p>';
      } else if (b.t === 'h' || b.t === 'h2' || b.t === 'h3' || b.t === 'h4') {
        out += '<h6 class="cl-sub-h">' + escapeHTML(b.text) + '</h6>';
      } else if (b.text) {
        out += '<p>' + escapeHTML(b.text) + '</p>';
      }
      i++;
    }
    closeList();
    return out;
  }

  html.lab = function (item, lab, progress) {
    var doneCount = 0;
    var total = lab.checkables;
    for (var k in progress.done) {
      if (progress.done[k] && /^s\d+$/.test(k)) doneCount++;
    }
    var answered = 0;
    for (var q in progress.answers) {
      if (String(progress.answers[q] || '').trim()) answered++;
    }
    var pct = total ? Math.round((doneCount / total) * 100) : 0;

    var out = '<div class="cl-lab" data-lab="' + escapeHTML(item.id) + '">';
    out += '<header class="cl-head">';
    out += '<span class="cl-badge">' + (item.lab_no ? 'Lab ' + pad2(item.lab_no) : 'Guide') + '</span>';
    out += '<div class="cl-head-text"><h4>' + escapeHTML(lab.title || item.title) + '</h4><p class="cl-meta">';
    out += escapeHTML(examLabel(item.exam));
    if (total) out += ' · ' + total + ' steps';
    if (lab.questions) out += ' · ' + lab.questions + ' questions';
    if (total || lab.questions) out += ' · about ' + lab.minutes + ' min';
    out += '</p></div>';
    out +=
      '<div class="cl-head-actions">' +
      openOriginal(item, 'Open original') +
      '<button type="button" class="cl-link" data-cl-action="reset-lab">Reset progress</button></div>';
    out += '</header>';

    if (total) {
      out +=
        '<div class="cl-lab-progress"><div class="cl-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
        pct +
        '" aria-label="Lab progress"><span style="width:' +
        pct +
        '%"></span></div><span class="cl-lab-progress-text" id="clLabProgressText">' +
        doneCount +
        ' of ' +
        total +
        ' steps done' +
        (lab.questions ? ' · ' + answered + ' of ' + lab.questions + ' answered' : '') +
        (doneCount === total ? ' · Lab complete' : '') +
        '</span></div>';
    }

    if (lab.intro.length || lab.equipment.length) {
      out += '<section class="cl-panel cl-lab-intro">';
      if (lab.intro.length) {
        out += '<h5>What you will do</h5>';
        lab.intro.forEach(function (b) {
          if (b.t === 'h') out += '<h6 class="cl-sub-h">' + escapeHTML(b.text) + '</h6>';
          else if (b.t === 'note') out += '<p class="cl-note">' + escapeHTML(b.text.replace(/^note:\s*/i, '')) + '</p>';
          else if (b.t === 'bullet' || b.t === 'bullet2') out += '<ul class="cl-bullets cl-bullets-0"><li>' + escapeHTML(b.text) + '</li></ul>';
          else if (b.t === 'table') out += tableHtml(b.rows, item.id, progress);
          else if (b.text) out += '<p>' + escapeHTML(b.text) + '</p>';
        });
      }
      if (lab.equipment.length) {
        out += '<h5>You will need</h5><ul class="cl-equipment">';
        lab.equipment.forEach(function (e) {
          out += '<li>' + escapeHTML(e) + '</li>';
        });
        out += '</ul>';
      }
      out += '</section>';
    }

    lab.parts.forEach(function (part, pi) {
      if (part.heading) {
        out +=
          '<h5 class="cl-part"><span class="cl-part-no">Part ' +
          (pi + 1) +
          '</span>' +
          escapeHTML(part.heading) +
          '</h5>';
      }
      part.steps.forEach(function (st) {
        var stepTotal = 0;
        var stepDone = 0;
        st.items.forEach(function (b) {
          if (b.t === 'step') {
            stepTotal++;
            if (progress.done[b.key]) stepDone++;
          }
        });
        var complete = stepTotal > 0 && stepDone === stepTotal;
        out += '<article class="cl-step' + (complete ? ' is-complete' : '') + '">';
        out +=
          '<header class="cl-step-head"><span class="cl-step-no">Step ' +
          st.no +
          '</span><h6>' +
          escapeHTML(st.heading || '') +
          '</h6>' +
          (stepTotal ? '<span class="cl-step-count">' + stepDone + '/' + stepTotal + '</span>' : '') +
          '</header>';
        out += '<div class="cl-step-body">' + itemsHtml(st.items, progress) + '</div>';
        out += '</article>';
      });
    });

    if (lab.reflection.length) {
      out += '<section class="cl-panel cl-reflection"><h5>Reflection</h5>' + itemsHtml(lab.reflection, progress) + '</section>';
    }

    out += '</div>';
    return out;
  };

  html.markdownLab = function (item) {
    var body = model.markdown(item.content || '');
    var out = '<div class="cl-lab cl-lab-md">';
    out += '<header class="cl-head"><span class="cl-badge">Guide</span>';
    out += '<div class="cl-head-text"><h4>' + escapeHTML(item.title) + '</h4><p class="cl-meta">Reference notes · ' + escapeHTML(examLabel(item.exam)) + '</p></div>';
    out += '<div class="cl-head-actions">' + openOriginal(item, 'Open markdown') + '</div></header>';
    out += '<div class="cl-md">' + body + '</div></div>';
    return out;
  };

  html.video = function (item, progress) {
    var out = '<div class="cl-video-wrap">';
    out += '<header class="cl-head"><span class="cl-badge">Video</span>';
    out +=
      '<div class="cl-head-text"><h4>' +
      escapeHTML(item.title) +
      '</h4><p class="cl-meta">' +
      escapeHTML(examLabel(item.exam)) +
      ' · ' +
      escapeHTML(String(item.size_mb)) +
      ' MB' +
      (progress && progress.played ? ' · Watched' : '') +
      '</p></div></header>';
    out +=
      '<video id="curriculumVideoPlayer" class="curriculum-video" controls playsinline preload="metadata" src="' +
      encodePath(item.media_path) +
      '"></video>';
    out +=
      '<p class="curriculum-hint">If playback fails in the browser build, use the desktop app or the course media pack.</p>';
    out += '</div>';
    return out;
  };

  /** Sidebar entry. */
  html.listItem = function (item, active, progressText) {
    var badge;
    var meta;
    if (item.kind === 'slide') {
      badge = item.module_no ? 'M' + pad2(item.module_no) : 'Deck';
      meta = (item.slides || '?') + ' slides';
    } else if (item.kind === 'lab') {
      badge = item.lab_no ? 'Lab ' + pad2(item.lab_no) : item.format === 'markdown' ? 'Guide' : 'Project';
      meta = item.format === 'markdown' ? 'Reference' : 'Worksheet';
    } else {
      badge = 'Play';
      meta = item.size_mb + ' MB';
    }
    return (
      '<button type="button" class="cl-item' +
      (active ? ' is-active' : '') +
      '" data-id="' +
      escapeHTML(item.id) +
      '" role="option" aria-selected="' +
      (active ? 'true' : 'false') +
      '"><span class="cl-item-badge">' +
      escapeHTML(badge) +
      '</span><span class="cl-item-text"><strong>' +
      escapeHTML(item.kind === 'slide' ? item.short_title || item.title : item.title) +
      '</strong><span class="cl-item-meta">' +
      escapeHTML(examLabel(item.exam)) +
      ' · ' +
      escapeHTML(meta) +
      (progressText ? ' · ' + escapeHTML(progressText) : '') +
      '</span></span></button>'
    );
  };

  /* ------------------------------------------------------------------ */
  /* Controller                                                           */
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
      if (tab === 'labs' || tab === 'slides' || tab === 'videos') this.tab = tab;
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
      ['videos', 'slides', 'labs'].forEach(function (t) {
        var btn = document.getElementById('curriculumTab-' + t);
        if (!btn) return;
        var on = t === self.tab;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
        var countEl = btn.querySelector('.cl-tab-count');
        if (countEl && c && c.stats) countEl.textContent = String(c.stats[t] || 0);
      });
      var search = document.getElementById('curriculumSearch');
      if (search) {
        search.placeholder =
          this.tab === 'labs' ? 'Search labs' : this.tab === 'slides' ? 'Search slide decks' : 'Search videos';
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
        var n = 0;
        for (var k in l.done) if (l.done[k] && /^s\d+$/.test(k)) n++;
        if (!n) return '';
        var lab = model.labOf(item);
        return lab.checkables && n >= lab.checkables ? 'Complete' : n + ' steps done';
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

      if (item.kind === 'video') {
        viewer.innerHTML = html.video(item, store.video(item.id));
        var player = document.getElementById('curriculumVideoPlayer');
        if (player) {
          player.addEventListener('play', function () {
            var v = store.video(item.id);
            if (!v.played) {
              v.played = true;
              store.save();
            }
          });
        }
        viewer.scrollTop = 0;
        return;
      }

      if (item.kind === 'slide') {
        var deck = model.deckOf(item);
        var prog = store.deck(item.id);
        var at = Math.max(1, Math.min(deck.length || 1, prog.at || 1));
        this.markSeen(item.id, at);
        viewer.innerHTML = deck.length
          ? html.deck(item, deck, at, prog)
          : '<div class="cl-empty"><p>No slide text could be read from this deck.</p>' + openOriginal(item, 'Open PowerPoint') + '</div>';
        viewer.scrollTop = 0;
        this.scrollFilmstrip();
        return;
      }

      if (item.format === 'markdown') {
        viewer.innerHTML = html.markdownLab(item);
      } else {
        var lab = model.labOf(item);
        viewer.innerHTML = html.lab(item, lab, store.lab(item.id));
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
      var viewer = document.getElementById('curriculumViewer');
      if (!viewer) return;
      var bar = viewer.querySelector('.cl-lab-progress .cl-bar');
      var pct = lab.checkables ? Math.round((done / lab.checkables) * 100) : 0;
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
