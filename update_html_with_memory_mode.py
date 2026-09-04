"""
update_html_with_memory_mode.py
Inject Memory Mode (SRS + Daily Memory Raid) into A_Plus_Exam_Simulator.html
"""

from pathlib import Path

html_path = Path("A_Plus_Exam_Simulator.html")
html = html_path.read_text(encoding="utf-8")

if "memory_srs.js" not in html:
    html = html.replace(
        '<script src="exam_a11y.js"></script>',
        '<script src="exam_a11y.js"></script>\n  <script src="memory_srs.js"></script>\n  <script src="memory_mode_ui.js"></script>',
    )

# Memory mode card before featureCards
MEMORY_CARD = '''
        <!-- Memory Mode Card -->
        <div class="card" style="border: 1px solid var(--accent-amber); background-image: radial-gradient(circle at top right, rgba(245, 158, 11, 0.12), transparent 60%);">
          <div>
            <div class="card-title" style="color: var(--accent-amber);">🧠 Memory Mode (SRS)</div>
            <div class="card-meta">Spaced repetition · Daily Memory Raid · APX for recalls</div>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
              Due <strong id="memoryDueCount">0</strong> · Queue <strong id="memoryTotalCount">0</strong> ·
              Learning <strong id="memoryLearningCount">0</strong> · Mature <strong id="memoryMatureCount">0</strong>
            </p>
            <p id="memoryRaidStatus" style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 1rem;">
              Build your SRS queue from missed exam items, then raid daily for long-term memory.
            </p>
          </div>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
            <button id="memoryRaidBtn" class="btn btn-amber" onclick="startMemoryRaid()">Start Daily Memory Raid</button>
            <button class="btn btn-secondary" onclick="openMemoryModal()">Memory Hub</button>
          </div>
        </div>

'''

if 'id="memoryDueCount"' not in html:
    html = html.replace(
        '        <!-- Dynamic Extensible Feature Cards Container -->',
        MEMORY_CARD + '        <!-- Dynamic Extensible Feature Cards Container -->',
    )

MEMORY_MODAL = r'''
  <!-- MODAL: MEMORY MODE HUB -->
  <div id="memoryModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="memoryModalTitle">
    <div class="modal-card" style="max-width: 720px;">
      <div class="modal-header">
        <div>
          <h3 id="memoryModalTitle" style="font-size: 1.3rem; color: var(--accent-amber);">Memory Mode Hub</h3>
          <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.2rem;">SM-2 spaced repetition. Successful recalls mint APX. Daily raid bonus once per day.</p>
        </div>
        <button type="button" style="background: none; border: none; color: var(--text-secondary); font-size: 1.6rem; cursor: pointer;" onclick="closeMemoryModal()" aria-label="Close">&times;</button>
      </div>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; margin-bottom: 1rem;">
        <div class="card" style="padding:0.85rem;"><div style="font-size:0.75rem;color:var(--text-secondary);">Due now</div><div style="font-size:1.4rem;font-weight:800;" id="memoryModalDue">0</div></div>
        <div class="card" style="padding:0.85rem;"><div style="font-size:0.75rem;color:var(--text-secondary);">In queue</div><div style="font-size:1.4rem;font-weight:800;" id="memoryModalTotal">0</div></div>
        <div class="card" style="padding:0.85rem;"><div style="font-size:0.75rem;color:var(--text-secondary);">APX / correct recall</div><div style="font-size:1.05rem;font-weight:700;">3-7 APX</div></div>
        <div class="card" style="padding:0.85rem;"><div style="font-size:0.75rem;color:var(--text-secondary);">Daily raid bonus</div><div style="font-size:1.05rem;font-weight:700;">+15 APX (+10 perfect)</div></div>
      </div>
      <ul style="font-size:0.88rem;color:var(--text-secondary);margin:0 0 1rem 1.1rem;line-height:1.5;">
        <li>Missed exam questions enter the SRS queue automatically.</li>
        <li>Intervals: 1 day → 3 days → growing by ease factor (SM-2).</li>
        <li>Wrong answers reset the card to due tomorrow.</li>
        <li>Memory Raid pulls up to 10 due cards (fills from weak/new if needed).</li>
      </ul>
      <div style="display:flex; gap:0.5rem; flex-wrap:wrap; justify-content:flex-end;">
        <button type="button" class="btn btn-secondary" onclick="closeMemoryModal()">Close</button>
        <button type="button" class="btn btn-amber" onclick="closeMemoryModal(); startMemoryRaid();">Start Memory Raid</button>
      </div>
    </div>
  </div>

'''

if 'id="memoryModal"' not in html:
    html = html.replace(
        "  <!-- MODAL: PROOF-OF-MASTERY LEDGER -->",
        MEMORY_MODAL + "  <!-- MODAL: PROOF-OF-MASTERY LEDGER -->",
    )

# init hook
if "CompTIAMemoryMode" not in html or "CompTIAMemoryMode.init()" not in html:
    html = html.replace(
        "      if (window.CompTIALedgerUI) CompTIALedgerUI.init();",
        "      if (window.CompTIALedgerUI) CompTIALedgerUI.init();\n      if (window.CompTIAMemoryMode) CompTIAMemoryMode.init();",
        1,
    )

# finishExam: enqueue missed into SRS always
if "CompTIAMemorySRS.enqueueMissed" not in html:
    html = html.replace(
        "      // Save to missed questions store\n      saveMissedQuestions(newlyMissedIds);",
        """      // Save to missed questions store
      saveMissedQuestions(newlyMissedIds);
      if (window.CompTIAMemorySRS && newlyMissedIds.length) {
        CompTIAMemorySRS.enqueueMissed(newlyMissedIds, (id) => {
          const q = questions.find(x => x.id === id);
          return q ? { domain: q.domain, exam: q.exam } : {};
        });
        if (window.CompTIAMemoryMode) CompTIAMemoryMode.refreshMemoryHome();
      }""",
    )

# finishExam ledger branch for memory
OLD_LEDGER = """      // Proof-of-Mastery ledger reward (async)
      (async () => {
        if (!window.CompTIALedgerUI) return;
        let domainKey = currentExamSession.domainKey || null;"""

NEW_LEDGER = """      // Proof-of-Mastery ledger reward (async)
      (async () => {
        if (currentExamSession.type === 'memory' && window.CompTIAMemoryMode) {
          document.getElementById('passFailTitle').innerText = 'MEMORY RAID COMPLETE';
          document.getElementById('scoreSubtitle').innerText = 'Spaced repetition session · APX for successful recalls';
          await CompTIAMemoryMode.settleMemorySession({
            questions,
            userAnswers: currentExamSession.userAnswers,
            rawCorrect,
            total
          });
          return;
        }
        if (!window.CompTIALedgerUI) return;
        let domainKey = currentExamSession.domainKey || null;"""

if "settleMemorySession" not in html:
    html = html.replace(OLD_LEDGER, NEW_LEDGER)

# refresh modal stats when opening - patch openMemoryModal via extra script at end before DOMContentLoaded
HOOK = """
    // Keep memory modal counters in sync when hub opens
    (function () {
      const _open = window.openMemoryModal;
      window.openMemoryModal = function () {
        if (window.CompTIAMemoryMode) CompTIAMemoryMode.refreshMemoryHome();
        const s = window.CompTIAMemorySRS && CompTIAMemorySRS.getStats();
        if (s) {
          const d = document.getElementById('memoryModalDue');
          const t = document.getElementById('memoryModalTotal');
          if (d) d.textContent = String(s.due);
          if (t) t.textContent = String(s.total);
        }
        if (typeof _open === 'function') _open();
        else {
          const modal = document.getElementById('memoryModal');
          if (modal) modal.classList.add('active');
        }
      };
    })();
"""

if "memoryModalDue" in html and "Keep memory modal counters" not in html:
    html = html.replace(
        "    window.addEventListener('DOMContentLoaded', initExamData);",
        HOOK + "\n    window.addEventListener('DOMContentLoaded', initExamData);",
    )

# ledger type filter option
if 'value="MEMORY_RECALL"' not in html and "ledgerTypeFilter" in html:
    html = html.replace(
        '<option value="GENESIS">GENESIS</option>',
        '<option value="MEMORY_RECALL">MEMORY_RECALL</option>\n          <option value="MEMORY_RAID_COMPLETE">MEMORY_RAID_COMPLETE</option>\n          <option value="GENESIS">GENESIS</option>',
    )

html_path.write_text(html, encoding="utf-8")
print("Memory Mode injected into A_Plus_Exam_Simulator.html")
