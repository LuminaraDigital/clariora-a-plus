/**
 * curriculum-model.js - Course library parsers and markdown (pure).
 * Loaded before js/curriculum.js. Attaches APlus._curriculumModel.
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


  window.APlus._curriculumHelpers = {
    escapeHTML: escapeHTML,
    encodePath: encodePath,
    examLabel: examLabel,
    pad2: pad2,
    inlineMd: inlineMd
  };
  window.APlus._curriculumModel = model;
})(typeof window !== 'undefined' ? window : this);
