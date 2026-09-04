"""
update_html_with_messer_core2.py
Updates A_Plus_Exam_Simulator.html so the Professor Messer modal supports
Core 1 (220-1201) and Core 2 (220-1202) tabs/filters, and wires the official
objectives checklist modal + scripts.
Idempotent: safe to re-run.
"""

from pathlib import Path

HTML_PATH = Path("A_Plus_Exam_Simulator.html")
html = HTML_PATH.read_text(encoding="utf-8")

# 1) Script tags for objectives
if 'src="objectives_data.js"' not in html:
    anchor = '<script src="exam_data.js"></script>'
    html = html.replace(
        anchor,
        anchor
        + '\n  <script src="objectives_data.js"></script>\n'
        + '  <script src="objectives_tracker.js"></script>',
        1,
    )
    print("Added objectives_data.js and objectives_tracker.js script tags")
else:
    print("Objectives scripts already present")

# 2) Button bar: Messer dual + Objectives
old_btn = (
    '<button type="button" class="btn btn-red" onclick="openMesserModal()">'
    "📺 Professor Messer 220-1201 Videos (63 Lessons)</button>"
)
new_btns = (
    '<button type="button" class="btn btn-red" onclick="openMesserModal()">'
    "📺 Professor Messer Videos (1201 + 1202)</button>\n"
    '          <button type="button" class="btn btn-secondary" onclick="openObjectivesModal()">'
    "🎯 Official Objectives Checklist</button>"
)
if old_btn in html:
    html = html.replace(old_btn, new_btns)
    print("Updated Messer button and added Objectives launcher")
elif "openObjectivesModal()" not in html:
    # Already renamed messer button in a prior run; still add objectives if missing
    marker = "openMesserModal()"
    idx = html.find(marker)
    if idx != -1:
        # insert after the messer button closing tag nearest after marker
        close = html.find("</button>", idx)
        if close != -1:
            insert = (
                '</button>\n          <button type="button" class="btn btn-secondary" '
                'onclick="openObjectivesModal()">🎯 Official Objectives Checklist'
            )
            html = html[: close] + insert + html[close:]
            print("Added Objectives launcher beside existing Messer button")
else:
    print("Launcher buttons already updated")

# 3) Replace Messer modal block
messer_start = html.find('<!-- MODAL: PROFESSOR MESSER')
messer_end = html.find("<footer>", messer_start if messer_start != -1 else 0)
if messer_start != -1 and messer_end != -1:
    new_modal = """<!-- MODAL: PROFESSOR MESSER CORE 1 + CORE 2 VIDEO DIRECTORY -->
  <div id="messerModal" class="modal-overlay">
    <div class="modal-card" style="max-width: 900px;">
      <div class="modal-header">
        <div>
          <h3 style="font-size: 1.3rem; color: var(--accent-red);">📺 Professor Messer CompTIA A+ Video Courses</h3>
          <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.2rem;">Core 1 (220-1201) and Core 2 (220-1202) lessons mapped to exam objectives</p>
        </div>
        <button style="background: none; border: none; color: var(--text-secondary); font-size: 1.6rem; cursor: pointer;" onclick="closeMesserModal()">&times;</button>
      </div>

      <div style="display: flex; gap: 0.5rem; margin-bottom: 0.85rem; flex-wrap: wrap;">
        <button type="button" id="messerTab1201" class="btn" onclick="setMesserExam('1201')">Core 1 · 220-1201</button>
        <button type="button" id="messerTab1202" class="btn btn-secondary" onclick="setMesserExam('1202')">Core 2 · 220-1202</button>
      </div>

      <div style="display: flex; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap;">
        <input type="text" id="messerSearchInput" placeholder="Search videos (e.g. ports, malware, backups)..." oninput="renderMesserVideos()" style="flex: 1; min-width: 200px; background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border-color); padding: 0.55rem 0.85rem; border-radius: 6px; font-size: 0.9rem;">
        <select id="messerDomainFilter" onchange="renderMesserVideos()" style="background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border-color); padding: 0.55rem; border-radius: 6px; font-size: 0.9rem;">
          <option value="all">All Domains</option>
        </select>
      </div>

      <div id="messerVideoListContainer" style="max-height: 480px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; padding-right: 4px;">
        <!-- Filled by JS -->
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
        <span id="messerCountDisplay" style="font-size: 0.85rem; color: var(--text-secondary);">Showing videos</span>
        <a id="messerPlaylistLink" href="https://www.youtube.com/playlist?list=PLG49S3nxzAnnes8ZGI-OBlKEukHCX46N8" target="_blank" class="btn btn-secondary" style="font-size: 0.82rem;">Open Full Playlist on YouTube ↗</a>
      </div>
    </div>
  </div>

  <!-- MODAL: OFFICIAL OBJECTIVES CHECKLIST -->
  <div id="objectivesModal" class="modal-overlay">
    <div class="modal-card" style="max-width: 900px;">
      <div class="modal-header">
        <div>
          <h3 style="font-size: 1.3rem; color: var(--accent-cyan);">🎯 Official Objectives Checklist</h3>
          <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.2rem;">220-1201 and 220-1202 domain objectives. Progress saved in localStorage (comptia_objectives_progress_v1).</p>
        </div>
        <button style="background: none; border: none; color: var(--text-secondary); font-size: 1.6rem; cursor: pointer;" onclick="closeObjectivesModal()">&times;</button>
      </div>
      <div style="display: flex; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap;">
        <input type="text" id="objectivesSearchInput" placeholder="Search objectives..." style="flex: 1; min-width: 180px; background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border-color); padding: 0.55rem 0.85rem; border-radius: 6px; font-size: 0.9rem;">
        <select id="objectivesExamFilter" style="background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border-color); padding: 0.55rem; border-radius: 6px; font-size: 0.9rem;">
          <option value="all">All Exams</option>
          <option value="core1">Core 1 (220-1201)</option>
          <option value="core2">Core 2 (220-1202)</option>
        </select>
        <select id="objectivesDomainFilter" style="background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border-color); padding: 0.55rem; border-radius: 6px; font-size: 0.9rem;">
          <option value="all">All Domains</option>
        </select>
      </div>
      <div id="objectivesListContainer" style="max-height: 480px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.45rem; padding-right: 4px;"></div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
        <span id="objectivesProgressLabel" style="font-size: 0.85rem; color: var(--text-secondary);">0 / 0 objectives checked</span>
        <button type="button" id="objectivesResetBtn" class="btn btn-secondary" style="font-size: 0.82rem;">Reset Progress</button>
      </div>
    </div>
  </div>

  """
    html = html[:messer_start] + new_modal + html[messer_end:]
    print("Replaced Messer modal and added Objectives modal")
else:
    print("Warning: could not locate Messer modal block")

# 4) Replace JS render functions
old_js_start = html.find("    function openMesserModal() {")
old_js_end = html.find("    /* MODERN THEME & AUDIO ENHANCEMENTS */", old_js_start if old_js_start != -1 else 0)
new_js = r'''    var messerExam = '1201';

    var MESSER_DOMAIN_OPTIONS = {
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

    var MESSER_PLAYLISTS = {
      '1201': 'https://www.youtube.com/playlist?list=PLG49S3nxzAnnes8ZGI-OBlKEukHCX46N8',
      '1202': 'https://www.youtube.com/playlist?list=PLG49S3nxzAnn7PDGQ17m5AYbDRhnW7vOb'
    };

    function setMesserExam(exam) {
      messerExam = exam === '1202' ? '1202' : '1201';
      const tab1 = document.getElementById('messerTab1201');
      const tab2 = document.getElementById('messerTab1202');
      if (tab1 && tab2) {
        tab1.className = messerExam === '1201' ? 'btn' : 'btn btn-secondary';
        tab2.className = messerExam === '1202' ? 'btn' : 'btn btn-secondary';
      }
      const sel = document.getElementById('messerDomainFilter');
      if (sel) {
        const opts = MESSER_DOMAIN_OPTIONS[messerExam] || MESSER_DOMAIN_OPTIONS['1201'];
        sel.innerHTML = opts.map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
      }
      const link = document.getElementById('messerPlaylistLink');
      if (link) link.href = MESSER_PLAYLISTS[messerExam];
      renderMesserVideos();
    }

    function openMesserModal() {
      document.getElementById('messerModal').classList.add('active');
      setMesserExam(messerExam || '1201');
    }

    function closeMesserModal() {
      document.getElementById('messerModal').classList.remove('active');
    }

    function renderMesserVideos() {
      const container = document.getElementById('messerVideoListContainer');
      if (!container) return;
      const search = (document.getElementById('messerSearchInput').value || '').toLowerCase();
      const domFilter = document.getElementById('messerDomainFilter').value;
      const videos = messerExam === '1202'
        ? (window.PROFESSOR_MESSER_1202_VIDEOS || [])
        : (window.PROFESSOR_MESSER_1201_VIDEOS || []);

      container.innerHTML = "";
      let visibleCount = 0;

      videos.forEach(v => {
        const matchesSearch = v.title.toLowerCase().includes(search) || String(v.objective).toLowerCase().includes(search);
        const matchesDom = (domFilter === 'all') || String(v.objective).startsWith(domFilter);

        if (matchesSearch && matchesDom) {
          visibleCount++;
          const item = document.createElement('div');
          item.style = "display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.65rem 0.9rem; font-size: 0.9rem; gap: 0.75rem; flex-wrap: wrap;";
          item.innerHTML = `
            <div>
              <span style="background: rgba(6, 182, 212, 0.15); color: var(--accent-cyan); font-weight: 700; padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.78rem; margin-right: 0.5rem;">Obj ${escapeHTML(String(v.objective))}</span>
              <strong>#${v.index}. ${escapeHTML(v.title)}</strong>
              <span style="color: var(--text-secondary); font-size: 0.8rem; margin-left: 0.5rem;">(${escapeHTML(v.duration || '')})</span>
            </div>
            <a href="${v.url}" target="_blank" class="btn btn-red" style="font-size: 0.75rem; padding: 0.25rem 0.6rem; text-decoration: none;">Watch ↗</a>
          `;
          container.appendChild(item);
        }
      });

      document.getElementById('messerCountDisplay').innerText = `Showing ${visibleCount} of ${videos.length} videos (220-${messerExam})`;
    }

    
'''

if old_js_start != -1 and old_js_end != -1:
    html = html[:old_js_start] + new_js + html[old_js_end:]
    print("Updated Messer JS for Core 1 + Core 2 tabs")
else:
    print("Warning: could not locate Messer JS block")

# 5) Neutralize video_reference label so Core 2 refs read correctly
html = html.replace(
    "📺 Professor Messer 220-1201 Reference:",
    "📺 Professor Messer Reference:",
)

HTML_PATH.write_text(html, encoding="utf-8")
print("A_Plus_Exam_Simulator.html updated successfully!")
