"""
update_html_with_ledger.py
Injects Proof-of-Mastery ledger + APX token economy into A_Plus_Exam_Simulator.html
"""

from pathlib import Path

html_path = Path("A_Plus_Exam_Simulator.html")
html = html_path.read_text(encoding="utf-8")

if "ledger_engine.js" not in html:
    html = html.replace(
        '<script src="study_library.js"></script>',
        '<script src="study_library.js"></script>\n  <script src="ledger_engine.js"></script>\n  <script src="ledger_ui.js"></script>',
    )

CSS = """
    .wallet-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 999px;
      padding: 0.35rem 0.7rem;
      font-size: 0.78rem;
      cursor: pointer;
    }
    .wallet-chip strong { color: var(--accent-cyan); font-family: monospace; }
    #apxExamRewardBanner {
      display: none;
      margin: 1rem 0 0;
      padding: 0.85rem 1rem;
      border-radius: 8px;
      border: 1px solid var(--accent-cyan);
      background: rgba(6, 182, 212, 0.08);
      font-size: 0.9rem;
    }
"""

if ".wallet-chip" not in html:
    html = html.replace("  </style>", CSS + "\n  </style>")

if 'id="apxBalanceBadge"' not in html:
    html = html.replace(
        """    <div style="display: flex; align-items: center; gap: 0.6rem;">
      <button id="soundToggleBtn" onclick="toggleSound()" class="btn btn-secondary" style="padding: 0.4rem 0.75rem; font-size: 0.82rem;" title="Toggle Audio Chimes">🔊 Sound</button>
      <button id="themeToggleBtn" onclick="toggleAppTheme()" class="btn btn-secondary" style="padding: 0.4rem 0.75rem; font-size: 0.82rem;" title="Toggle Dark/Light Mode">🌓 Theme</button>
    </div>""",
        """    <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; justify-content: flex-end;">
      <button class="wallet-chip" onclick="openLedgerModal()" title="Open Proof-of-Mastery Ledger">
        <strong id="apxBalanceBadge">0 APX</strong>
        <span id="apxStreakBadge">🔥 0d</span>
        <span id="apxRankBadge">🎫 L1</span>
        <span id="apxChainBadge" style="color: var(--text-secondary);">#0</span>
      </button>
      <button id="soundToggleBtn" onclick="toggleSound()" class="btn btn-secondary" style="padding: 0.4rem 0.75rem; font-size: 0.82rem;" title="Toggle Audio Chimes">🔊 Sound</button>
      <button id="themeToggleBtn" onclick="toggleAppTheme()" class="btn btn-secondary" style="padding: 0.4rem 0.75rem; font-size: 0.82rem;" title="Toggle Dark/Light Mode">🌓 Theme</button>
    </div>""",
    )

if 'id="ledgerModal"' not in html:
    MODAL = r'''
  <!-- MODAL: PROOF-OF-MASTERY LEDGER -->
  <div id="ledgerModal" class="modal-overlay">
    <div class="modal-card" style="max-width: 980px;">
      <div class="modal-header">
        <div>
          <h3 style="font-size: 1.3rem; color: var(--accent-cyan);">Proof-of-Mastery Ledger · APX Token Economy</h3>
          <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.2rem;">Hash-chained learning ledger (SHA-256). Mimics crypto accounting for study motivation.</p>
        </div>
        <button style="background: none; border: none; color: var(--text-secondary); font-size: 1.6rem; cursor: pointer;" onclick="closeLedgerModal()">&times;</button>
      </div>

      <div id="ledgerWalletSummary" style="margin-bottom: 1rem;"></div>

      <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom: 1rem;">
        <button class="btn" onclick="claimDailyApx()">Claim Daily APX</button>
        <button class="btn btn-secondary" onclick="verifyPomLedger()">Verify Chain</button>
        <button class="btn btn-secondary" onclick="exportPomLedger()">Export Ledger JSON</button>
        <select id="ledgerTypeFilter" onchange="renderLedgerModal()" style="background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border-color); padding: 0.45rem 0.7rem; border-radius: 6px;">
          <option value="all">All block types</option>
          <option value="EXAM_COMPLETE">EXAM_COMPLETE</option>
          <option value="STUDY_OPEN">STUDY_OPEN</option>
          <option value="PBQ_COMPLETE">PBQ_COMPLETE</option>
          <option value="ACHIEVEMENT_MINT">ACHIEVEMENT_MINT</option>
          <option value="DAILY_CHECKIN">DAILY_CHECKIN</option>
          <option value="DOMAIN_STAKE_LOCK">DOMAIN_STAKE_LOCK</option>
          <option value="DOMAIN_STAKE_RESOLVE">DOMAIN_STAKE_RESOLVE</option>
          <option value="GENESIS">GENESIS</option>
        </select>
      </div>

      <h4 style="margin-bottom: 0.5rem;">Achievements (on-chain mints)</h4>
      <div id="ledgerAchievements" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.5rem; margin-bottom: 1rem;"></div>

      <h4 style="margin-bottom: 0.5rem;">Block Explorer</h4>
      <div id="ledgerBlockList" style="max-height: 340px; overflow-y: auto; display:flex; flex-direction:column; gap:0.45rem;"></div>

      <div style="display:flex; justify-content:flex-end; margin-top:1rem;">
        <button class="btn btn-secondary" onclick="closeLedgerModal()">Close</button>
      </div>
    </div>
  </div>

'''
    html = html.replace(
        "  <!-- MODAL: UNIFIED STUDY LIBRARY -->",
        MODAL + "  <!-- MODAL: UNIFIED STUDY LIBRARY -->",
    )

# Hero badge for ledger
if "APX Proof-of-Mastery" not in html:
    html = html.replace(
        '<span class="badge">Scaled: 100 - 900</span>',
        '<span class="badge">Scaled: 100 - 900</span>\n          <span class="badge">APX Proof-of-Mastery Ledger</span>',
    )

# Domain stake button
if "stakeSelectedDomain()" not in html:
    html = html.replace(
        '<button class="btn btn-amber" onclick="startDomainDrill()">Start Domain Drill</button>',
        '''<div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
            <button class="btn btn-amber" onclick="startDomainDrill()">Start Domain Drill</button>
            <button class="btn btn-secondary" onclick="stakeSelectedDomain()" title="Lock 30 APX. Score 80%+ to earn yield.">Stake 30 APX</button>
          </div>''',
    )

# Results reward banner
if 'id="apxExamRewardBanner"' not in html:
    html = html.replace(
        '<div class="score-subtitle" id="scoreSubtitle">Passing Score: 675 · Scale 100 to 900</div>',
        '''<div class="score-subtitle" id="scoreSubtitle">Passing Score: 675 · Scale 100 to 900</div>
        <div id="apxExamRewardBanner"></div>''',
    )

# initExamData hook
if "CompTIALedgerUI.init()" not in html:
    html = html.replace(
        "      updateMissedCountDisplay();\n      renderHistoryTable();\n    }",
        "      updateMissedCountDisplay();\n      renderHistoryTable();\n      if (window.CompTIALedgerUI) CompTIALedgerUI.init();\n    }",
    )

# startDomainDrill: store domainKey
old_domain_session = """      currentExamSession = {
        type: 'domain',
        questions: pool,
        currentIndex: 0,
        userAnswers: {},
        eliminatedOptions: {},
        flaggedQuestions: new Set(),
        totalSeconds: pool.length * 60,
        remainingSeconds: pool.length * 60,
        timerInterval: null,
        isPaused: false,
        passingScore: spec.exam === 'core2' ? 700 : 675
      };"""

new_domain_session = """      const domainKeyMap = {
        'c1_1': '1.0 Mobile Devices',
        'c1_2': '2.0 Networking',
        'c1_3': '3.0 Hardware',
        'c1_4': '4.0 Virtualization and Cloud Computing',
        'c1_5': '5.0 Hardware and Network Troubleshooting',
        'c2_1': '1.0 Operating Systems',
        'c2_2': '2.0 Security',
        'c2_3': '3.0 Software Troubleshooting',
        'c2_4': '4.0 Operational Procedures'
      };

      currentExamSession = {
        type: 'domain',
        domainKey: domainKeyMap[val] || spec.filter,
        questions: pool,
        currentIndex: 0,
        userAnswers: {},
        eliminatedOptions: {},
        flaggedQuestions: new Set(),
        totalSeconds: pool.length * 60,
        remainingSeconds: pool.length * 60,
        timerInterval: null,
        isPaused: false,
        passingScore: spec.exam === 'core2' ? 700 : 675
      };"""

if "domainKey:" not in html:
    html = html.replace(old_domain_session, new_domain_session)

# finishExam: make async ledger reward (replace save history section with hook after)
FINISH_HOOK = """
      // Proof-of-Mastery ledger reward (async)
      (async () => {
        if (!window.CompTIALedgerUI) return;
        let domainKey = currentExamSession.domainKey || null;
        let domainPct = 0;
        if (domainKey && domainStats[domainKey]) {
          const s = domainStats[domainKey];
          domainPct = s.total ? (s.correct / s.total) * 100 : 0;
        } else if (currentExamSession.type === 'domain') {
          const keys = Object.keys(domainStats);
          if (keys.length === 1) {
            domainKey = keys[0];
            const s = domainStats[domainKey];
            domainPct = s.total ? (s.correct / s.total) * 100 : 0;
          }
        }
        await CompTIALedgerUI.onExamComplete({
          examType: currentExamSession.type,
          scaledScore,
          rawCorrect,
          total,
          passed: isPassed,
          passingScore,
          domainStats,
          domainKey,
          domainPct
        });
      })();
"""

if "CompTIALedgerUI.onExamComplete" not in html:
    html = html.replace(
        "      document.getElementById('resultsMissedCount').innerText = newlyMissedIds.length;",
        "      document.getElementById('resultsMissedCount').innerText = newlyMissedIds.length;\n" + FINISH_HOOK,
    )

# Study open reward
if "CompTIALedgerUI.onStudyOpen" not in html:
    html = html.replace(
        "      viewer.textContent = `${doc.title}\\n${doc.folder} · ${doc.exam} · ${doc.domain}\\n${openHint}\\n\\n${body}`;",
        """      viewer.textContent = `${doc.title}\\n${doc.folder} · ${doc.exam} · ${doc.domain}\\n${openHint}\\n\\n${body}`;
      if (window.CompTIALedgerUI) CompTIALedgerUI.onStudyOpen(doc);""",
    )

# PBQ rewards
if "Port Matcher Lab" not in html or "onPbqComplete('Port Matcher" not in html:
    html = html.replace(
        """        if (correctCount === portPairs.length) {
          resEl.innerHTML = `<span style="color: var(--accent-green);">🎉 Excellent! All ${correctCount}/${portPairs.length} ports matched accurately!</span>`;
          playSuccessSound();
        }""",
        """        if (correctCount === portPairs.length) {
          resEl.innerHTML = `<span style="color: var(--accent-green);">🎉 Excellent! All ${correctCount}/${portPairs.length} ports matched accurately!</span>`;
          playSuccessSound();
          if (window.CompTIALedgerUI) CompTIALedgerUI.onPbqComplete('Port Matcher Lab');
        }""",
    )

if "onPbqComplete('Laser Printer" not in html:
    html = html.replace(
        """        res.innerHTML = `<span style="color: var(--accent-green);">🎉 100% Correct! You have mastered the Laser Printing cycle sequence!</span>`;""",
        """        res.innerHTML = `<span style="color: var(--accent-green);">🎉 100% Correct! You have mastered the Laser Printing cycle sequence!</span>`;
        if (window.CompTIALedgerUI) CompTIALedgerUI.onPbqComplete('Laser Printer Cycle Lab');""",
    )

# clearHistory note: do not wipe ledger by default
if "Proof-of-Mastery ledger is kept" not in html:
    html = html.replace(
        'if (confirm("Are you sure you want to clear your exam attempt history and missed question pool?")) {',
        'if (confirm("Clear exam attempt history and missed question pool? (Proof-of-Mastery ledger is kept)")) {',
    )

html_path.write_text(html, encoding="utf-8")
print("Injected Proof-of-Mastery ledger into A_Plus_Exam_Simulator.html")
