/**
 * Clariora Exam Simulator v3.0.0
 * studyhub.js - Study Hub Module (Professor Messer Videos, Markdown Notes Browser)
 * File: js/studyhub.js
 */

(function(window) {
  'use strict';

  window.APlus = window.APlus || {};
  const APlus = window.APlus;

  const escapeHTML = (window.APlus.utils && window.APlus.utils.escapeHTML) || ((s) => String(s || ''));

  const StudyHub = {
    activeMesserExam: '1201',

    init() {
      // Setup bindings
    },

    openMesserModal() {
      const modal = document.getElementById('messerModal');
      if (modal) {
        modal.classList.add('active');
        this.setMesserExam(this.activeMesserExam || '1201');
      }
    },

    closeMesserModal() {
      const modal = document.getElementById('messerModal');
      if (modal) modal.classList.remove('active');
    },

    setMesserExam(exam) {
      this.activeMesserExam = (exam === '1202' || exam === 'core2') ? '1202' : '1201';

      const tab1 = document.getElementById('messerTab1201');
      const tab2 = document.getElementById('messerTab1202');
      if (tab1 && tab2) {
        tab1.className = (this.activeMesserExam === '1201') ? 'btn' : 'btn btn-secondary';
        tab2.className = (this.activeMesserExam === '1202') ? 'btn' : 'btn btn-secondary';
      }

      const sel = document.getElementById('messerDomainFilter');
      if (sel) {
        const domainOpts = {
          '1201': [
            ['all', 'All Domains'],
            ['1.', '1.0 Mobile Devices'],
            ['2.', '2.0 Networking'],
            ['3.', '3.0 Hardware'],
            ['4.', '4.0 Virtualization & Cloud'],
            ['5.', '5.0 Troubleshooting']
          ],
          '1202': [
            ['all', 'All Domains'],
            ['1.', '1.0 Operating Systems'],
            ['2.', '2.0 Security'],
            ['3.', '3.0 Software Troubleshooting'],
            ['4.', '4.0 Operational Procedures']
          ]
        };

        const opts = domainOpts[this.activeMesserExam] || domainOpts['1201'];
        sel.innerHTML = opts.map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
      }

      const link = document.getElementById('messerPlaylistLink');
      if (link) {
        link.href = (this.activeMesserExam === '1202')
          ? 'https://www.youtube.com/playlist?list=PLG49S3nxzAnn7PDGQ17m5AYbDRhnW7vOb'
          : 'https://www.youtube.com/playlist?list=PLG49S3nxzAnnes8ZGI-OBlKEukHCX46N8';
      }

      this.renderMesserVideos();
    },

    renderMesserVideos() {
      const container = document.getElementById('messerVideoListContainer');
      if (!container) return;

      const searchInput = document.getElementById('messerSearchInput');
      const domainFilter = document.getElementById('messerDomainFilter');
      const search = (searchInput ? searchInput.value : '').toLowerCase();
      const domFilter = domainFilter ? domainFilter.value : 'all';

      const videos = (this.activeMesserExam === '1202')
        ? (window.PROFESSOR_MESSER_1202_VIDEOS || [])
        : (window.PROFESSOR_MESSER_1201_VIDEOS || []);

      container.innerHTML = '';
      let visibleCount = 0;

      videos.forEach((v) => {
        const title = (v.title || '').toLowerCase();
        const obj = String(v.objective || '').toLowerCase();
        const matchesSearch = !search || title.includes(search) || obj.includes(search);
        const matchesDom = (domFilter === 'all') || obj.startsWith(domFilter);

        if (matchesSearch && matchesDom) {
          visibleCount++;
          const item = document.createElement('div');
          item.style = 'display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.65rem 0.9rem; font-size: 0.88rem; gap: 0.75rem; flex-wrap: wrap;';
          item.innerHTML = `
            <div>
              <span style="background: rgba(6, 182, 212, 0.15); color: var(--accent-cyan); font-weight: 700; padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.78rem; margin-right: 0.5rem;">Obj ${escapeHTML(String(v.objective))}</span>
              <strong>#${v.index}. ${escapeHTML(v.title)}</strong>
              <span style="color: var(--text-secondary); font-size: 0.8rem; margin-left: 0.5rem;">(${escapeHTML(v.duration || '')})</span>
            </div>
            <a href="${v.url}" target="_blank" class="btn btn-red" style="font-size: 0.75rem; padding: 0.25rem 0.6rem; text-decoration: none;">Watch -></a>
          `;
          container.appendChild(item);
        }
      });

      const countDisplay = document.getElementById('messerCountDisplay');
      if (countDisplay) {
        countDisplay.innerText = `Showing ${visibleCount} of ${videos.length} videos (220-${this.activeMesserExam})`;
      }
    }
  };

  APlus.studyHub = StudyHub;

  // Global shims
  window.openMesserModal = () => StudyHub.openMesserModal();
  window.closeMesserModal = () => StudyHub.closeMesserModal();
  window.setMesserExam = (exam) => StudyHub.setMesserExam(exam);
  window.renderMesserVideos = () => StudyHub.renderMesserVideos();

})(typeof window !== 'undefined' ? window : this);
