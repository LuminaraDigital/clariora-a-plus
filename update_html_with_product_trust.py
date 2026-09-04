"""
update_html_with_product_trust.py
Wires profiles, full backup/restore, signed-ledger UI, study plan, readiness,
and optional cloud-folder sync into A_Plus_Exam_Simulator.html.
Idempotent: safe to re-run.
"""

from pathlib import Path

html_path = Path("A_Plus_Exam_Simulator.html")
html = html_path.read_text(encoding="utf-8")

# --- Scripts ---
SCRIPT_BLOCK = """  <script src="exam_data.js"></script>
  <script src="study_library.js"></script>
  <script src="profiles.js"></script>
  <script src="ledger_engine.js"></script>
  <script src="ledger_ui.js"></script>
  <script src="learner_state.js"></script>
  <script src="study_plan.js"></script>
  <script src="readiness.js"></script>
  <script src="product_trust_ui.js"></script>
"""

if "profiles.js" not in html:
    html = html.replace(
        """  <script src="exam_data.js"></script>
  <script src="study_library.js"></script>
  <script src="ledger_engine.js"></script>
  <script src="ledger_ui.js"></script>
""",
        SCRIPT_BLOCK,
    )

CSS = """
    .trust-panel {
      margin: 1rem 0 1.25rem;
      padding: 1rem 1.1rem;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      background: var(--bg-secondary);
    }
    .trust-panel h3 {
      font-size: 1.05rem;
      margin-bottom: 0.65rem;
    }
    .trust-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
      margin-bottom: 0.65rem;
    }
    #readinessHomeBanner, #readinessLedgerBanner {
      font-size: 0.88rem;
      line-height: 1.45;
    }
    #profileSelect {
      background: var(--bg-card);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
      padding: 0.4rem 0.65rem;
      border-radius: 6px;
      min-width: 160px;
    }
"""

if ".trust-panel" not in html:
    html = html.replace("  </style>", CSS + "\n  </style>")

TRUST_PANEL = r'''
      <!-- PRODUCT TRUST: profiles / backup / plan / readiness -->
      <div class="trust-panel" id="productTrustPanel">
        <h3>Learner Accounts · Backup · Readiness</h3>
        <div class="trust-row">
          <label for="profileSelect" style="font-size:0.85rem;color:var(--text-secondary);">Profile</label>
          <select id="profileSelect" onchange="CompTIAProductTrust.onProfileSwitch()"></select>
          <span id="activeProfileLabel" style="font-size:0.8rem;color:var(--text-secondary);"></span>
          <button class="btn btn-secondary" style="padding:0.35rem 0.65rem;font-size:0.8rem;" onclick="CompTIAProductTrust.onCreateProfile()">New</button>
          <button class="btn btn-secondary" style="padding:0.35rem 0.65rem;font-size:0.8rem;" onclick="CompTIAProductTrust.onRenameProfile()">Rename</button>
          <button class="btn btn-secondary" style="padding:0.35rem 0.65rem;font-size:0.8rem;" onclick="CompTIAProductTrust.onDeleteProfile()">Delete</button>
        </div>
        <div class="trust-row">
          <button class="btn btn-secondary" style="padding:0.35rem 0.65rem;font-size:0.8rem;" onclick="CompTIAProductTrust.onExportBackup()">Export Full Backup</button>
          <button class="btn btn-secondary" style="padding:0.35rem 0.65rem;font-size:0.8rem;" onclick="CompTIAProductTrust.onImportBackup()">Import Full Backup</button>
          <button class="btn btn-secondary" style="padding:0.35rem 0.65rem;font-size:0.8rem;" onclick="CompTIAProductTrust.onSaveSync()">Save Sync File</button>
          <button class="btn btn-secondary" style="padding:0.35rem 0.65rem;font-size:0.8rem;" onclick="CompTIAProductTrust.onLoadSync()">Load Sync File</button>
          <button class="btn" style="padding:0.35rem 0.65rem;font-size:0.8rem;" onclick="openStudyPlanModal()">Study Plan</button>
        </div>
        <div id="readinessHomeBanner" style="margin:0.5rem 0 0.75rem;padding:0.75rem;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-card);"></div>
        <div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:0.35rem;">Study plan: <span id="studyPlanHomeSummary">No study plan set</span></div>
        <details style="margin-top:0.5rem;">
          <summary style="cursor:pointer;font-size:0.9rem;font-weight:600;">Objectives checklist (feeds readiness)</summary>
          <div id="objectivesChecklist" style="margin-top:0.65rem;"></div>
        </details>
      </div>

'''

if 'id="productTrustPanel"' not in html:
    html = html.replace(
        """      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
        <h3 style="font-size: 1.25rem;">Select Your Exam Mode</h3>""",
        TRUST_PANEL
        + """      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
        <h3 style="font-size: 1.25rem;">Select Your Exam Mode</h3>""",
    )

STUDY_PLAN_MODAL = r'''
  <!-- MODAL: STUDY PLAN -->
  <div id="studyPlanModal" class="modal-overlay">
    <div class="modal-card" style="max-width: 860px;">
      <div class="modal-header">
        <div>
          <h3 style="font-size: 1.3rem; color: var(--accent-cyan);">Study Plan Engine</h3>
          <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.2rem;">Set exam date, target (Core 1 / Core 2 / both), and hours per week. Completing tasks can award +5 APX.</p>
        </div>
        <button style="background: none; border: none; color: var(--text-secondary); font-size: 1.6rem; cursor: pointer;" onclick="closeStudyPlanModal()">&times;</button>
      </div>
      <div class="trust-row" style="margin-bottom:1rem;">
        <label style="font-size:0.85rem;">Exam date <input id="studyPlanExamDate" type="date" style="margin-left:0.35rem;background:var(--bg-card);color:var(--text-primary);border:1px solid var(--border-color);padding:0.35rem;border-radius:6px;" /></label>
        <label style="font-size:0.85rem;">Target
          <select id="studyPlanTarget" style="margin-left:0.35rem;background:var(--bg-card);color:var(--text-primary);border:1px solid var(--border-color);padding:0.35rem;border-radius:6px;">
            <option value="both">Both Core 1 + Core 2</option>
            <option value="core1">Core 1 only</option>
            <option value="core2">Core 2 only</option>
          </select>
        </label>
        <label style="font-size:0.85rem;">Hours/week <input id="studyPlanHours" type="number" min="1" max="40" value="7" style="width:4rem;margin-left:0.35rem;background:var(--bg-card);color:var(--text-primary);border:1px solid var(--border-color);padding:0.35rem;border-radius:6px;" /></label>
        <button class="btn" onclick="CompTIAProductTrust.onGenerateStudyPlan()">Generate Plan</button>
      </div>
      <div id="studyPlanPanelBody" style="max-height:420px;overflow-y:auto;"></div>
      <div style="display:flex;justify-content:flex-end;margin-top:1rem;">
        <button class="btn btn-secondary" onclick="closeStudyPlanModal()">Close</button>
      </div>
    </div>
  </div>

'''

if 'id="studyPlanModal"' not in html:
    html = html.replace(
        "  <!-- MODAL: PROOF-OF-MASTERY LEDGER -->",
        STUDY_PLAN_MODAL + "  <!-- MODAL: PROOF-OF-MASTERY LEDGER -->",
    )

# Ledger filter: study plan tasks
if 'value="STUDY_PLAN_TASK"' not in html:
    html = html.replace(
        '<option value="GENESIS">GENESIS</option>',
        '<option value="STUDY_PLAN_TASK">STUDY_PLAN_TASK</option>\n          <option value="GENESIS">GENESIS</option>',
    )

# Ledger subtitle honesty
if "ECDSA P-256 signed" not in html:
    html = html.replace(
        "Hash-chained learning ledger (SHA-256). Mimics crypto accounting for study motivation.",
        "Signed local ledger (SHA-256 + ECDSA P-256). Local Proof-of-Mastery accounting, not a distributed chain.",
    )

# Scoped storage helpers for history/missed
OLD_MISSED_GET = """    function getStoredMissedQuestions() {
      try {
        const raw = localStorage.getItem('comptia_a_plus_missed');
        return raw ? JSON.parse(raw) : [];
      } catch(e) {
        return [];
      }
    }"""

NEW_MISSED_GET = """    function getStoredMissedQuestions() {
      try {
        const raw = (window.CompTIAProfiles)
          ? CompTIAProfiles.scopedGet('comptia_a_plus_missed')
          : localStorage.getItem('comptia_a_plus_missed');
        return raw ? JSON.parse(raw) : [];
      } catch(e) {
        return [];
      }
    }"""

OLD_MISSED_SAVE = """        localStorage.setItem('comptia_a_plus_missed', JSON.stringify(Array.from(set)));"""
NEW_MISSED_SAVE = """        const payload = JSON.stringify(Array.from(set));
        if (window.CompTIAProfiles) CompTIAProfiles.scopedSet('comptia_a_plus_missed', payload);
        else localStorage.setItem('comptia_a_plus_missed', payload);"""

OLD_HIST_GET = """    function getHistoryRecords() {
      try {
        const raw = localStorage.getItem('comptia_a_plus_history');
        return raw ? JSON.parse(raw) : [];
      } catch(e) {
        return [];
      }
    }"""

NEW_HIST_GET = """    function getHistoryRecords() {
      try {
        const raw = (window.CompTIAProfiles)
          ? CompTIAProfiles.scopedGet('comptia_a_plus_history')
          : localStorage.getItem('comptia_a_plus_history');
        return raw ? JSON.parse(raw) : [];
      } catch(e) {
        return [];
      }
    }"""

OLD_HIST_SAVE = """        localStorage.setItem('comptia_a_plus_history', JSON.stringify(list));"""
NEW_HIST_SAVE = """        const payload = JSON.stringify(list);
        if (window.CompTIAProfiles) CompTIAProfiles.scopedSet('comptia_a_plus_history', payload);
        else localStorage.setItem('comptia_a_plus_history', payload);"""

OLD_CLEAR = """        localStorage.removeItem('comptia_a_plus_history');
        localStorage.removeItem('comptia_a_plus_missed');"""

NEW_CLEAR = """        if (window.CompTIAProfiles) {
          CompTIAProfiles.scopedRemove('comptia_a_plus_history');
          CompTIAProfiles.scopedRemove('comptia_a_plus_missed');
        } else {
          localStorage.removeItem('comptia_a_plus_history');
          localStorage.removeItem('comptia_a_plus_missed');
        }"""

if "CompTIAProfiles.scopedGet('comptia_a_plus_missed')" not in html:
    html = html.replace(OLD_MISSED_GET, NEW_MISSED_GET)
    html = html.replace(OLD_MISSED_SAVE, NEW_MISSED_SAVE)
    html = html.replace(OLD_HIST_GET, NEW_HIST_GET)
    html = html.replace(OLD_HIST_SAVE, NEW_HIST_SAVE)
    html = html.replace(OLD_CLEAR, NEW_CLEAR)

# initExamData: product trust init (tolerate tutor/a11y hooks after ledger init)
if "CompTIAProductTrust.init()" not in html:
    if "if (window.CompTIALedgerUI) CompTIALedgerUI.init();" in html:
        html = html.replace(
            "      if (window.CompTIALedgerUI) CompTIALedgerUI.init();\n",
            "      if (window.CompTIALedgerUI) CompTIALedgerUI.init();\n"
            "      if (window.CompTIAProductTrust) CompTIAProductTrust.init();\n",
            1,
        )

# Deduplicate accidental double learner_state script tag
while html.count('<script src="learner_state.js"></script>') > 1:
    first = html.find('<script src="learner_state.js"></script>')
    second = html.find('<script src="learner_state.js"></script>', first + 1)
    if second < 0:
        break
    html = html[:second] + html[second + len('<script src="learner_state.js"></script>\n'):]

# Persist domainStats into history when available (helps readiness)
# Look for saveHistoryRecord call pattern in finishExam
if "domainStats: domainStats" not in html:
    # Try common history record shape
    needle = "saveHistoryRecord({"
    idx = html.find(needle)
    if idx != -1:
        # Find closing of that object roughly - inject domainStats if examType line exists nearby
        chunk = html[idx : idx + 500]
        if "domainStats" not in chunk and "examType:" in chunk:
            html = html.replace(
                "saveHistoryRecord({",
                "saveHistoryRecord({\n        domainStats: domainStats,",
                1,
            )

html_path.write_text(html, encoding="utf-8")
print("Injected product/trust features into A_Plus_Exam_Simulator.html")
