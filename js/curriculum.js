/**
 * curriculum.js - Datacentre Academy Labs / Slides / Videos hub
 */
(function (window) {
  'use strict';

  window.APlus = window.APlus || {};

  const escapeHTML =
    (window.APlus.utils && window.APlus.utils.escapeHTML) ||
    function (s) {
      return String(s || '')
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

  const Curriculum = {
    tab: 'videos',
    selectedId: null,

    catalog() {
      return window.COMPTIA_CURRICULUM || null;
    },

    itemsForTab(tab) {
      const c = this.catalog();
      if (!c) return [];
      if (tab === 'labs') return c.labs || [];
      if (tab === 'slides') return c.slides || [];
      return c.videos || [];
    },

    open(tab) {
      if (tab === 'labs' || tab === 'slides' || tab === 'videos') this.tab = tab;
      const modal = document.getElementById('curriculumModal');
      if (!modal) return;
      modal.classList.add('active');
      this.selectedId = null;
      this.syncTabs();
      this.render();
      if (window.CompTIALedgerUI && typeof CompTIALedgerUI.onStudyOpen === 'function') {
        CompTIALedgerUI.onStudyOpen({
          id: 'curriculum-hub',
          title: 'Course library',
          category: 'Curriculum',
          path: 'curriculum',
        });
      }
    },

    close() {
      const modal = document.getElementById('curriculumModal');
      if (modal) modal.classList.remove('active');
      const player = document.getElementById('curriculumVideoPlayer');
      if (player) {
        try {
          player.pause();
          player.removeAttribute('src');
          player.load();
        } catch (_) {}
      }
    },

    setTab(tab) {
      this.tab = tab;
      this.selectedId = null;
      this.syncTabs();
      this.render();
    },

    syncTabs() {
      ['videos', 'slides', 'labs'].forEach((t) => {
        const btn = document.getElementById('curriculumTab-' + t);
        if (!btn) return;
        btn.className = t === this.tab ? 'btn' : 'btn btn-secondary';
      });
      const c = this.catalog();
      const stats = document.getElementById('curriculumStats');
      if (stats && c && c.stats) {
        stats.textContent =
          (c.stats.videos || 0) +
          ' videos · ' +
          (c.stats.slides || 0) +
          ' slide decks · ' +
          (c.stats.labs || 0) +
          ' labs';
      }
    },

    render() {
      const list = document.getElementById('curriculumList');
      const viewer = document.getElementById('curriculumViewer');
      const count = document.getElementById('curriculumCount');
      if (!list || !viewer) return;

      const c = this.catalog();
      if (!c) {
        list.innerHTML =
          '<p style="color:var(--accent-amber);padding:0.5rem;">curriculum_data.js not loaded. Run python tools/build_curriculum.py</p>';
        viewer.innerHTML = '';
        return;
      }

      const search = (
        (document.getElementById('curriculumSearch') || {}).value || ''
      ).toLowerCase();
      const exam = (document.getElementById('curriculumExamFilter') || {}).value || 'all';
      const items = this.itemsForTab(this.tab);
      list.innerHTML = '';
      let visible = 0;
      let first = null;

      items.forEach((item) => {
        const hay = (
          (item.title || '') +
          ' ' +
          (item.excerpt || '') +
          ' ' +
          (item.source || '')
        ).toLowerCase();
        const matchSearch = !search || hay.includes(search);
        const matchExam =
          exam === 'all' || item.exam === exam || item.exam === 'both';
        if (!(matchSearch && matchExam)) return;
        visible++;
        if (!first) first = item;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-secondary curriculum-item';
        if (this.selectedId === item.id) btn.classList.add('is-active');
        const meta =
          item.kind === 'video'
            ? item.size_mb + ' MB'
            : item.kind === 'slide'
              ? (item.slides || '?') + ' slides · ' + item.size_mb + ' MB'
              : item.format;
        btn.innerHTML =
          '<strong>' +
          escapeHTML(item.title) +
          '</strong><span class="curriculum-item-meta">' +
          escapeHTML(String(item.exam || 'both')) +
          ' · ' +
          escapeHTML(meta) +
          '</span>';
        btn.addEventListener('click', () => this.show(item.id));
        list.appendChild(btn);
      });

      if (count) {
        count.textContent =
          'Showing ' + visible + ' of ' + items.length + ' ' + this.tab;
      }

      if (this.selectedId && items.some((i) => i.id === this.selectedId)) {
        this.show(this.selectedId);
      } else if (first) {
        this.show(first.id);
      } else {
        viewer.innerHTML =
          '<p class="curriculum-empty">No items match this filter.</p>';
      }
    },

    show(id) {
      const items = this.itemsForTab(this.tab);
      const item = items.find((i) => i.id === id);
      const viewer = document.getElementById('curriculumViewer');
      if (!item || !viewer) return;
      this.selectedId = id;
      this.renderListSelectionOnly();

      const href = encodePath(item.media_path);
      if (item.kind === 'video') {
        viewer.innerHTML =
          '<div class="curriculum-viewer-head">' +
          '<h4>' +
          escapeHTML(item.title) +
          '</h4>' +
          '<p>' +
          escapeHTML(item.size_mb + ' MB') +
          ' · ' +
          escapeHTML(item.exam) +
          '</p></div>' +
          '<video id="curriculumVideoPlayer" class="curriculum-video" controls playsinline preload="metadata" src="' +
          href +
          '"></video>' +
          '<p class="curriculum-hint">If playback fails in the browser build, use the desktop app or serve the full project folder (videos live under Videos For A+ / media/videos).</p>';
        return;
      }

      const openBtn =
        '<a class="btn btn-secondary curriculum-open-file" href="' +
        href +
        '" download target="_blank" rel="noopener">Open original file</a>';
      const body = item.content
        ? escapeHTML(item.content)
        : 'No extracted text for this item.';
      viewer.innerHTML =
        '<div class="curriculum-viewer-head">' +
        '<div><h4>' +
        escapeHTML(item.title) +
        '</h4>' +
        '<p>' +
        escapeHTML(item.source || '') +
        '</p></div>' +
        openBtn +
        '</div>' +
        '<pre class="curriculum-text">' +
        body +
        '</pre>';
    },

    renderListSelectionOnly() {
      const list = document.getElementById('curriculumList');
      if (!list) return;
      Array.prototype.forEach.call(list.querySelectorAll('.curriculum-item'), (el) => {
        el.classList.toggle('is-active', el.querySelector('strong') && false);
      });
      // Re-mark by re-querying buttons with data - simpler: re-add class by title match via rebuild light
      Array.prototype.forEach.call(list.children, (btn) => {
        const strong = btn.querySelector('strong');
        const items = this.itemsForTab(this.tab);
        const item = items.find((i) => i.id === this.selectedId);
        if (!item || !strong) return;
        btn.classList.toggle('is-active', strong.textContent === item.title);
      });
    },
  };

  APlus.curriculum = Curriculum;
  window.openCurriculumModal = function (tab) {
    Curriculum.open(tab || 'videos');
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
