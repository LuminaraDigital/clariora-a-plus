/**
 * curriculum-html.js - Course library HTML builders (pure).
 * Loaded after curriculum-model.js, before curriculum.js.
 */
(function (window) {
  'use strict';
  window.APlus = window.APlus || {};
  var H = window.APlus._curriculumHelpers || {};
  var model = window.APlus._curriculumModel;
  var escapeHTML = H.escapeHTML || function (s) { return String(s == null ? '' : s); };
  var encodePath = H.encodePath || function (rel) { return String(rel || ''); };
  var examLabel = H.examLabel || function (exam) { return String(exam || ''); };
  var pad2 = H.pad2 || function (n) { return String(n); };
  var inlineMd = H.inlineMd || escapeHTML;
  if (!model) {
    console.warn('[curriculum-html] model missing; load curriculum-model.js first');
    model = {};
  }

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
    } else if (item.kind === 'assessment') {
      badge =
        item.assessment_kind === 'module_quiz'
          ? 'Quiz'
          : item.assessment_kind === 'checkpoint_review'
            ? 'Check'
            : item.assessment_kind === 'exam_practice'
              ? 'Exam'
              : 'Review';
      meta = (item.question_count || '?') + ' Q · ' + (item.estimated_minutes || '?') + ' min';
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


  window.APlus._curriculumHtml = html;
})(typeof window !== 'undefined' ? window : this);
