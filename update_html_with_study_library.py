"""
update_html_with_study_library.py
Injects the Unified Study Library modal and scripts into A_Plus_Exam_Simulator.html
"""

from pathlib import Path

html_path = Path("A_Plus_Exam_Simulator.html")
html = html_path.read_text(encoding="utf-8")

if "study_library.js" not in html:
    html = html.replace(
        '<script src="exam_data.js"></script>',
        '<script src="exam_data.js"></script>\n  <script src="study_library.js"></script>',
    )

if "openStudyLibraryModal" not in html:
    html = html.replace(
        '<button class="btn btn-red" onclick="openMesserModal()">📺 Professor Messer 220-1201 Videos (63 Lessons)</button>',
        '''<div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
          <button class="btn btn-secondary" onclick="openStudyLibraryModal()">📚 Study Library (All Folders)</button>
          <button class="btn btn-red" onclick="openMesserModal()">📺 Professor Messer 220-1201 Videos (63 Lessons)</button>
        </div>''',
    )

STUDY_MODAL = r'''
  <!-- MODAL: UNIFIED STUDY LIBRARY -->
  <div id="studyLibraryModal" class="modal-overlay">
    <div class="modal-card" style="max-width: 980px;">
      <div class="modal-header">
        <div>
          <h3 style="font-size: 1.3rem; color: var(--accent-cyan);">Study Library: All CompTIA A+ Folders</h3>
          <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.2rem;">Searchable notes, lecture extracts, practice exams, and PDF references from every course folder</p>
        </div>
        <button style="background: none; border: none; color: var(--text-secondary); font-size: 1.6rem; cursor: pointer;" onclick="closeStudyLibraryModal()">&times;</button>
      </div>

      <div style="display: flex; gap: 0.75rem; margin-bottom: 0.85rem; flex-wrap: wrap;">
        <input type="text" id="studySearchInput" placeholder="Search notes (ports, RAID, BitLocker, DHCP...)" oninput="renderStudyLibrary()" style="flex: 1; min-width: 220px; background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border-color); padding: 0.55rem 0.85rem; border-radius: 6px; font-size: 0.9rem;">
        <select id="studyCategoryFilter" onchange="renderStudyLibrary()" style="background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border-color); padding: 0.55rem; border-radius: 6px; font-size: 0.9rem;"></select>
        <select id="studyExamFilter" onchange="renderStudyLibrary()" style="background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border-color); padding: 0.55rem; border-radius: 6px; font-size: 0.9rem;">
          <option value="all">All Exams</option>
          <option value="core1">Core 1</option>
          <option value="core2">Core 2</option>
          <option value="both">Both / General</option>
        </select>
      </div>

      <div id="studyLibraryStats" style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 0.75rem;"></div>

      <div style="display: grid; grid-template-columns: 1.1fr 1.4fr; gap: 0.85rem; min-height: 420px;">
        <div id="studyDocList" style="max-height: 480px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.45rem; padding-right: 4px;"></div>
        <div id="studyDocViewer" style="max-height: 480px; overflow-y: auto; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; white-space: pre-wrap; font-size: 0.88rem; line-height: 1.45; color: var(--text-primary);">
          Select a document to read its incorporated study content.
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; gap: 0.75rem; flex-wrap: wrap;">
        <span id="studyCountDisplay" style="font-size: 0.85rem; color: var(--text-secondary);">Showing 0 documents</span>
        <button class="btn btn-secondary" onclick="closeStudyLibraryModal()">Close</button>
      </div>
    </div>
  </div>

'''

if 'id="studyLibraryModal"' not in html:
    html = html.replace(
        "  <!-- MODAL: PROFESSOR MESSER 220-1201 VIDEO DIRECTORY -->",
        STUDY_MODAL + "  <!-- MODAL: PROFESSOR MESSER 220-1201 VIDEO DIRECTORY -->",
    )

STUDY_JS = r'''
    let selectedStudyDocId = null;

    function openStudyLibraryModal() {
      document.getElementById('studyLibraryModal').classList.add('active');
      populateStudyFilters();
      renderStudyLibrary();
    }

    function closeStudyLibraryModal() {
      document.getElementById('studyLibraryModal').classList.remove('active');
    }

    function populateStudyFilters() {
      const lib = window.COMPTIA_STUDY_LIBRARY;
      const catSel = document.getElementById('studyCategoryFilter');
      if (!lib || catSel.options.length > 1) return;
      catSel.innerHTML = '<option value="all">All Categories</option>';
      (lib.categories || []).forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        catSel.appendChild(opt);
      });
      const stats = lib.stats || {};
      document.getElementById('studyLibraryStats').textContent =
        `${stats.total_documents || 0} documents incorporated from ${stats.folders || 0} folders ` +
        `(markdown ${stats.markdown || 0}, DOCX extracts ${stats.docx_text || 0}, PDF refs ${stats.pdf || 0})`;
    }

    function renderStudyLibrary() {
      const lib = window.COMPTIA_STUDY_LIBRARY;
      const list = document.getElementById('studyDocList');
      const viewer = document.getElementById('studyDocViewer');
      if (!lib) {
        list.innerHTML = '<p style="color: var(--accent-amber);">study_library.js not loaded.</p>';
        return;
      }
      const search = (document.getElementById('studySearchInput').value || '').toLowerCase();
      const cat = document.getElementById('studyCategoryFilter').value;
      const exam = document.getElementById('studyExamFilter').value;
      const docs = lib.documents || [];
      list.innerHTML = '';
      let visible = 0;
      let firstVisible = null;

      docs.forEach(doc => {
        const hay = ((doc.title || '') + ' ' + (doc.excerpt || '') + ' ' + (doc.content || '') + ' ' + (doc.folder || '') + ' ' + (doc.domain || '')).toLowerCase();
        const matchSearch = !search || hay.includes(search);
        const matchCat = cat === 'all' || doc.category === cat;
        const matchExam = exam === 'all' || doc.exam === exam || doc.exam === 'both';
        if (!(matchSearch && matchCat && matchExam)) return;
        visible++;
        if (!firstVisible) firstVisible = doc;
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'btn btn-secondary';
        item.style = 'text-align:left; width:100%; padding:0.65rem 0.8rem; font-size:0.84rem; white-space:normal;';
        if (selectedStudyDocId === doc.id) {
          item.style.borderColor = 'var(--accent-cyan)';
        }
        item.innerHTML = `<strong>${escapeHTML(doc.title)}</strong><br><span style="color:var(--text-secondary); font-size:0.75rem;">${escapeHTML(doc.category)} · ${escapeHTML(doc.domain)}</span>`;
        item.onclick = () => showStudyDocument(doc.id);
        list.appendChild(item);
      });

      document.getElementById('studyCountDisplay').textContent = `Showing ${visible} of ${docs.length} documents`;
      if (selectedStudyDocId) {
        const still = docs.find(d => d.id === selectedStudyDocId);
        if (still) showStudyDocument(still.id);
        else if (firstVisible) showStudyDocument(firstVisible.id);
        else viewer.textContent = 'No documents match this filter.';
      } else if (firstVisible) {
        showStudyDocument(firstVisible.id);
      } else {
        viewer.textContent = 'No documents match this filter.';
      }
    }

    function showStudyDocument(docId) {
      const lib = window.COMPTIA_STUDY_LIBRARY;
      if (!lib) return;
      const doc = (lib.documents || []).find(d => d.id === docId);
      if (!doc) return;
      selectedStudyDocId = docId;
      const viewer = document.getElementById('studyDocViewer');
      let body = doc.content && doc.content.trim()
        ? doc.content
        : (doc.excerpt || 'No inline text available for this asset.');
      const openHint = doc.format === 'pdf'
        ? `\n\n---\nSource file: ${doc.path}\nIn the desktop app this PDF is packaged under study_assets and can be opened with the Open File button.`
        : `\n\n---\nSource: ${doc.path}`;
      viewer.textContent = `${doc.title}\n${doc.folder} · ${doc.exam} · ${doc.domain}\n${openHint}\n\n${body}`;
      // refresh highlight in list without full re-filter loop for selection only
      Array.from(document.getElementById('studyDocList').children).forEach(btn => {
        const active = btn.innerHTML.includes(escapeHTML(doc.title));
        btn.style.borderColor = active ? 'var(--accent-cyan)' : '';
      });
    }

'''

if "function openStudyLibraryModal" not in html:
    html = html.replace(
        "    function openMesserModal() {",
        STUDY_JS + "\n    function openMesserModal() {",
    )

html_path.write_text(html, encoding="utf-8")
print("Updated A_Plus_Exam_Simulator.html with Study Library")
