"""
update_html_with_messer.py
Updates A_Plus_Exam_Simulator.html with:
1. Video lesson links inside the review accordion.
2. A dedicated Professor Messer Video Course Directory modal and launcher button.
"""

with open("A_Plus_Exam_Simulator.html", "r", encoding="utf-8") as f:
    html = f.read()

# 1. Add video link in review accordion
target_str = """            <div class="explanation-box">
              <div class="explanation-title">Expert Technician Explanation & Breakdown</div>
              <p>${escapeHTML(q.explanation)}</p>
            </div>"""

replacement_str = """            <div class="explanation-box">
              <div class="explanation-title">Expert Technician Explanation & Breakdown</div>
              <p>${escapeHTML(q.explanation)}</p>
            </div>
            ${q.video_reference ? `
              <div style="margin-top: 0.75rem; padding: 0.6rem 0.9rem; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 0.88rem; flex-wrap: wrap; gap: 0.5rem;">
                <div>
                  <span style="color: var(--accent-red); font-weight: 700;">📺 Professor Messer 220-1201 Reference:</span>
                  <span style="margin-left: 0.4rem;">${escapeHTML(q.video_reference.title)}</span>
                  <span style="color: var(--text-secondary); margin-left: 0.3rem;">(${escapeHTML(q.video_reference.duration)})</span>
                </div>
                <a href="${q.video_reference.url}" target="_blank" class="btn btn-red" style="font-size: 0.78rem; padding: 0.3rem 0.7rem; text-decoration: none;">Watch Lesson on YouTube ↗</a>
              </div>
            ` : ''}"""

if target_str in html:
    html = html.replace(target_str, replacement_str)
    print("Added video references to review accordion!")
else:
    print("Warning: target_str not found in html")

# 2. Add header button on Start screen for Professor Messer directory
header_target = '<h3 style="margin-bottom: 1rem; font-size: 1.25rem;">Select Your Exam Mode</h3>'
header_replacement = """<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
        <h3 style="font-size: 1.25rem;">Select Your Exam Mode</h3>
        <button class="btn btn-red" onclick="openMesserModal()">📺 Professor Messer 220-1201 Videos (63 Lessons)</button>
      </div>"""

if header_target in html:
    html = html.replace(header_target, header_replacement)
    print("Added Professor Messer button to home screen header!")

# 3. Add Professor Messer Modal before <footer>
footer_target = '<footer>'
modal_code = """
  <!-- MODAL: PROFESSOR MESSER 220-1201 VIDEO DIRECTORY -->
  <div id="messerModal" class="modal-overlay">
    <div class="modal-card" style="max-width: 850px;">
      <div class="modal-header">
        <div>
          <h3 style="font-size: 1.3rem; color: var(--accent-red);">📺 Professor Messer CompTIA A+ 220-1201 Course</h3>
          <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.2rem;">All 63 lessons systematically mapped to Core 1 objectives</p>
        </div>
        <button style="background: none; border: none; color: var(--text-secondary); font-size: 1.6rem; cursor: pointer;" onclick="closeMesserModal()">&times;</button>
      </div>
      
      <div style="display: flex; gap: 0.75rem; margin-bottom: 1rem;">
        <input type="text" id="messerSearchInput" placeholder="Search videos (e.g. ports, raid, cables, bios)..." oninput="renderMesserVideos()" style="flex: 1; background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border-color); padding: 0.55rem 0.85rem; border-radius: 6px; font-size: 0.9rem;">
        <select id="messerDomainFilter" onchange="renderMesserVideos()" style="background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border-color); padding: 0.55rem; border-radius: 6px; font-size: 0.9rem;">
          <option value="all">All Domains</option>
          <option value="1.">1.0 Mobile Devices</option>
          <option value="2.">2.0 Networking</option>
          <option value="3.">3.0 Hardware</option>
          <option value="4.">4.0 Virtualization & Cloud</option>
          <option value="5.">5.0 Troubleshooting</option>
        </select>
      </div>

      <div id="messerVideoListContainer" style="max-height: 480px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; padding-right: 4px;">
        <!-- Filled by JS -->
      </div>
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.25rem;">
        <span id="messerCountDisplay" style="font-size: 0.85rem; color: var(--text-secondary);">Showing 63 videos</span>
        <a href="https://www.youtube.com/playlist?list=PLG49S3nxzAnnes8ZGI-OBlKEukHCX46N8" target="_blank" class="btn btn-secondary" style="font-size: 0.82rem;">Open Full Playlist on YouTube ↗</a>
      </div>
    </div>
  </div>

  <footer>
"""

if footer_target in html:
    html = html.replace(footer_target, modal_code)
    print("Added Professor Messer modal HTML!")

# 4. Add JS functions for Messer modal before </script>
js_target = 'window.addEventListener(\'DOMContentLoaded\', initExamData);'
js_addition = """
    function openMesserModal() {
      document.getElementById('messerModal').classList.add('active');
      renderMesserVideos();
    }

    function closeMesserModal() {
      document.getElementById('messerModal').classList.remove('active');
    }

    function renderMesserVideos() {
      const container = document.getElementById('messerVideoListContainer');
      const search = (document.getElementById('messerSearchInput').value || '').toLowerCase();
      const domFilter = document.getElementById('messerDomainFilter').value;
      const videos = window.PROFESSOR_MESSER_1201_VIDEOS || [];

      container.innerHTML = "";
      let visibleCount = 0;

      videos.forEach(v => {
        const matchesSearch = v.title.toLowerCase().includes(search) || v.objective.toLowerCase().includes(search);
        const matchesDom = (domFilter === 'all') || v.objective.startsWith(domFilter);

        if (matchesSearch && matchesDom) {
          visibleCount++;
          const item = document.createElement('div');
          item.style = "display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.65rem 0.9rem; font-size: 0.9rem;";
          item.innerHTML = `
            <div>
              <span style="background: rgba(6, 182, 212, 0.15); color: var(--accent-cyan); font-weight: 700; padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.78rem; margin-right: 0.5rem;">Obj ${escapeHTML(v.objective)}</span>
              <strong>#${v.index}. ${escapeHTML(v.title)}</strong>
              <span style="color: var(--text-secondary); font-size: 0.8rem; margin-left: 0.5rem;">(${escapeHTML(v.duration)})</span>
            </div>
            <a href="${v.url}" target="_blank" class="btn btn-red" style="font-size: 0.75rem; padding: 0.25rem 0.6rem; text-decoration: none;">Watch ↗</a>
          `;
          container.appendChild(item);
        }
      });

      document.getElementById('messerCountDisplay').innerText = `Showing ${visibleCount} of ${videos.length} videos`;
    }

    window.addEventListener('DOMContentLoaded', initExamData);
"""

if js_target in html:
    html = html.replace(js_target, js_addition)
    print("Added JavaScript methods for Professor Messer modal!")

with open("A_Plus_Exam_Simulator.html", "w", encoding="utf-8") as f:
    f.write(html)

print("A_Plus_Exam_Simulator.html updated successfully!")
