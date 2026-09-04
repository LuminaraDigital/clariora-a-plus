"""
upgrade_to_modern_app.py
Enhances A_Plus_Exam_Simulator.html with:
1. Dark/Light theme toggle with CSS custom properties.
2. Interactive PBQ (Performance-Based Questions) Lab Center with 3 hands-on drills.
3. Animated Circular SVG Score Gauge (100 to 900 scale).
4. Audio feedback engine using Web Audio API synthesis.
5. Printable Scorecard export styles.
"""

with open("A_Plus_Exam_Simulator.html", "r", encoding="utf-8") as f:
    html = f.read()

# 1. Update CSS styles for light mode and modern components
theme_styles = """
    :root {
      --bg-primary: #0b0f19;
      --bg-secondary: #131b2e;
      --bg-card: #1a233a;
      --border-color: #2a3655;
      --text-primary: #f1f5f9;
      --text-secondary: #94a3b8;
      --accent-cyan: #06b6d4;
      --accent-blue: #3b82f6;
      --accent-green: #10b981;
      --accent-red: #ef4444;
      --accent-amber: #f59e0b;
      --accent-purple: #8b5cf6;
      --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    [data-theme="light"] {
      --bg-primary: #f8fafc;
      --bg-secondary: #ffffff;
      --bg-card: #f1f5f9;
      --border-color: #cbd5e1;
      --text-primary: #0f172a;
      --text-secondary: #475569;
      --accent-cyan: #0891b2;
      --accent-blue: #2563eb;
      --accent-green: #059669;
      --accent-red: #dc2626;
      --accent-amber: #d97706;
      --accent-purple: #7c3aed;
    }

    /* Print styling */
    @media print {
      header, footer, .nav-bar, .review-filter, #retakeCurrentExamBtn, #retakeMissedFromResultsBtn, .q-actions, .btn {
        display: none !important;
      }
      body {
        background: #fff !important;
        color: #000 !important;
      }
      .container {
        max-width: 100% !important;
        padding: 0 !important;
      }
      .score-hero, .domain-report, .review-accordion {
        border: 1px solid #ccc !important;
        box-shadow: none !important;
        background: #fff !important;
        color: #000 !important;
      }
      .review-body {
        display: block !important;
      }
    }
"""

# Replace :root section with new theme styles
idx_root_start = html.find(":root {")
idx_root_end = html.find("/* Screen management */")
if idx_root_start != -1 and idx_root_end != -1:
    # We replace from :root { up to * { box-sizing: border-box; }
    box_sizing_pos = html.find("* {", idx_root_start)
    html = html[:idx_root_start] + theme_styles.strip() + "\n\n    " + html[box_sizing_pos:]
    print("Updated CSS with Dark/Light theme & print stylesheet!")

# 2. Add Theme Toggle and Sound Toggle to Header
header_right_target = '<div class="brand">'
header_right_replacement = """<div class="brand">"""

header_controls_target = '<div id="examHeaderControls" style="display: none; align-items: center; gap: 1rem;">'
header_controls_replacement = """<div style="display: flex; align-items: center; gap: 0.6rem;">
      <button id="soundToggleBtn" onclick="toggleSound()" class="btn btn-secondary" style="padding: 0.4rem 0.75rem; font-size: 0.82rem;" title="Toggle Audio Chimes">🔊 Sound</button>
      <button id="themeToggleBtn" onclick="toggleAppTheme()" class="btn btn-secondary" style="padding: 0.4rem 0.75rem; font-size: 0.82rem;" title="Toggle Dark/Light Mode">🌓 Theme</button>
    </div>
    <div id="examHeaderControls" style="display: none; align-items: center; gap: 1rem;">"""

if header_controls_target in html:
    html = html.replace(header_controls_target, header_controls_replacement)
    print("Added Sound and Theme toggles to header!")

# 3. Add PBQ Lab Card to Start Screen
pbq_card = """
        <!-- PBQ Lab Card -->
        <div class="card" style="border: 1px solid var(--accent-cyan); background-image: radial-gradient(circle at top right, rgba(6, 182, 212, 0.15), transparent 60%);">
          <div>
            <div class="card-title" style="color: var(--accent-cyan);">🛠️ Performance-Based Labs (PBQs)</div>
            <div class="card-meta">Hands-on interactive CompTIA simulations</div>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.5rem;">
              Practice realistic CompTIA PBQ simulations: Interactive Port Matcher, Laser Printing Sequence Order, and Windows CLI Command Terminal.
            </p>
          </div>
          <button class="btn" style="background-color: var(--accent-cyan); color: #000;" onclick="openPBQModal()">Launch PBQ Labs 🛠️</button>
        </div>
"""

# Insert PBQ card before Retake Missed Questions Card
missed_card_marker = "<!-- Retake Missed Questions Card -->"
if missed_card_marker in html:
    html = html.replace(missed_card_marker, pbq_card + "\n        " + missed_card_marker)
    print("Added PBQ Lab Card to Start Screen!")

# 4. Add Circular Radial SVG Gauge to Results Screen
results_hero_target = '<div class="score-dial" id="scaledScoreDisplay">785 / 900</div>'
results_hero_replacement = """
        <!-- Modern Circular Animated Gauge -->
        <div style="display: flex; justify-content: center; align-items: center; margin: 1rem 0;">
          <div style="position: relative; width: 180px; height: 180px;">
            <svg viewBox="0 0 100 100" style="transform: rotate(-90deg); width: 100%; height: 100%;">
              <circle cx="50" cy="50" r="42" stroke="var(--border-color)" stroke-width="8" fill="transparent" />
              <circle id="scoreGaugeCircle" cx="50" cy="50" r="42" stroke="var(--accent-green)" stroke-width="8" stroke-dasharray="264" stroke-dashoffset="60" stroke-linecap="round" fill="transparent" style="transition: stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.5s;" />
            </svg>
            <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;">
              <span id="scaledScoreDisplay" style="font-size: 2rem; font-weight: 900; font-family: 'Courier New', Courier, monospace; line-height: 1;">785</span>
              <span style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px;">out of 900</span>
            </div>
          </div>
        </div>
"""

if results_hero_target in html:
    html = html.replace(results_hero_target, results_hero_replacement)
    print("Replaced static score text with modern Circular SVG radial gauge!")

# Add Print Scorecard button to Results Screen
actions_target = '<button class="btn" onclick="showScreen(\'startScreen\')">← Back to Menu</button>'
actions_replacement = """<button class="btn" onclick="showScreen('startScreen')">← Back to Menu</button>
        <button class="btn btn-secondary" onclick="window.print()">🖨️ Print / Save Scorecard as PDF</button>"""

if actions_target in html:
    html = html.replace(actions_target, actions_replacement)
    print("Added Print / PDF Export button to Results Screen!")

# 5. Add PBQ Modal HTML before <footer>
pbq_modal_html = """
  <!-- MODAL: PERFORMANCE-BASED QUESTIONS (PBQs) LAB -->
  <div id="pbqModal" class="modal-overlay">
    <div class="modal-card" style="max-width: 900px; max-height: 90vh;">
      <div class="modal-header">
        <div>
          <h3 style="font-size: 1.3rem; color: var(--accent-cyan); display: flex; align-items: center; gap: 0.5rem;">
            <span>🛠️ CompTIA A+ Performance-Based Question (PBQ) Labs</span>
          </h3>
          <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.2rem;">Hands-on interactive lab exercises mirroring Pearson VUE practical test scenarios</p>
        </div>
        <button style="background: none; border: none; color: var(--text-secondary); font-size: 1.6rem; cursor: pointer;" onclick="closePBQModal()">&times;</button>
      </div>

      <!-- Lab Selector Tabs -->
      <div style="display: flex; gap: 0.5rem; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
        <button id="pbqTab1" onclick="switchPBQLab(1)" class="btn btn-secondary" style="font-size: 0.85rem; padding: 0.4rem 0.8rem;">Lab 1: Port Matcher</button>
        <button id="pbqTab2" onclick="switchPBQLab(2)" class="btn btn-secondary" style="font-size: 0.85rem; padding: 0.4rem 0.8rem;">Lab 2: Laser Printer Cycle</button>
        <button id="pbqTab3" onclick="switchPBQLab(3)" class="btn btn-secondary" style="font-size: 0.85rem; padding: 0.4rem 0.8rem;">Lab 3: Command Line CLI</button>
      </div>

      <!-- LAB 1: Port Matcher -->
      <div id="pbqContent1">
        <div style="background: var(--bg-card); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.9rem;">
          <strong>Objective:</strong> Match each networking service/protocol to its default TCP/UDP port number by clicking the matching port button.
        </div>
        <div id="portMatcherContainer" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.9rem;">
          <!-- Generated by JS -->
        </div>
        <div id="portMatcherResult" style="margin-top: 1rem; font-weight: 700;"></div>
      </div>

      <!-- LAB 2: Laser Printer Process -->
      <div id="pbqContent2" style="display: none;">
        <div style="background: var(--bg-card); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.9rem;">
          <strong>Objective:</strong> Place the 6 primary steps of the laser printing electrophotographic cycle in the exact chronological order.
        </div>
        <div id="printerStepsContainer" style="display: flex; flex-direction: column; gap: 0.5rem;">
          <!-- Generated by JS -->
        </div>
        <div style="margin-top: 1rem; display: flex; gap: 0.75rem;">
          <button class="btn btn-green" onclick="verifyPrinterOrder()">Check Order</button>
          <button class="btn btn-secondary" onclick="resetPrinterOrder()">Reset</button>
        </div>
        <div id="printerResult" style="margin-top: 0.75rem; font-weight: 700;"></div>
      </div>

      <!-- LAB 3: CLI Prompt Simulator -->
      <div id="pbqContent3" style="display: none;">
        <div style="background: var(--bg-card); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.9rem;">
          <strong>Objective:</strong> Practice essential CompTIA troubleshooting commands. Type a command (e.g. <code>sfc /scannow</code>, <code>ipconfig /all</code>, <code>bootrec /rebuildbcd</code>, <code>chkdsk /f</code>, <code>help</code>) and press Enter.
        </div>
        <div style="background: #020617; border: 1px solid #334155; border-radius: 8px; padding: 1rem; font-family: monospace; font-size: 0.88rem; color: #38bdf8; min-height: 240px; max-height: 320px; overflow-y: auto;" id="terminalWindow">
          <div>Microsoft Windows [Version 10.0.19045.3803]</div>
          <div>(c) Microsoft Corporation. All rights reserved. Datacenter Terminal.</div>
          <div style="color: #94a3b8; margin: 0.5rem 0;">Type 'help' for a list of available diagnostic commands.</div>
          <div id="terminalOutput"></div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem;">
            <span style="color: #f8fafc;">C:\\Users\\Administrator&gt;</span>
            <input type="text" id="terminalInput" onkeydown="handleTerminalKey(event)" style="flex: 1; background: transparent; border: none; outline: none; color: #38bdf8; font-family: monospace; font-size: 0.88rem;" autofocus>
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; margin-top: 1.5rem;">
        <button class="btn btn-secondary" onclick="closePBQModal()">Close PBQ Lab</button>
      </div>
    </div>
  </div>
"""

footer_marker = "<!-- MODAL: PROFESSOR MESSER"
if footer_marker in html:
    html = html.replace(footer_marker, pbq_modal_html + "\n  " + footer_marker)
    print("Added PBQ Lab Modal HTML!")

# 6. Add JavaScript for Theme, Audio, Radial Gauge, and PBQ Labs
js_modern = """
    /* MODERN THEME & AUDIO ENHANCEMENTS */
    let isSoundEnabled = true;
    let audioCtx = null;

    function initTheme() {
      const savedTheme = localStorage.getItem('comptia_theme') || 'dark';
      document.documentElement.setAttribute('data-theme', savedTheme);
      updateThemeBtn(savedTheme);
    }

    function toggleAppTheme() {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = (current === 'dark') ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('comptia_theme', next);
      updateThemeBtn(next);
    }

    function updateThemeBtn(theme) {
      const btn = document.getElementById('themeToggleBtn');
      if (btn) btn.innerHTML = (theme === 'dark') ? '☀️ Light' : '🌙 Dark';
    }

    function toggleSound() {
      isSoundEnabled = !isSoundEnabled;
      const btn = document.getElementById('soundToggleBtn');
      if (btn) btn.innerHTML = isSoundEnabled ? '🔊 Sound' : '🔇 Muted';
    }

    function playTone(freq, type = 'sine', duration = 0.15) {
      if (!isSoundEnabled) return;
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
      } catch(e) {}
    }

    function playClickSound() { playTone(580, 'triangle', 0.08); }
    function playSuccessSound() { 
      playTone(523.25, 'sine', 0.1); 
      setTimeout(() => playTone(659.25, 'sine', 0.15), 100);
      setTimeout(() => playTone(783.99, 'sine', 0.25), 200);
    }

    /* PBQ LAB SIMULATION LOGIC */
    function openPBQModal() {
      document.getElementById('pbqModal').classList.add('active');
      switchPBQLab(1);
    }

    function closePBQModal() {
      document.getElementById('pbqModal').classList.remove('active');
    }

    function switchPBQLab(num) {
      [1, 2, 3].forEach(n => {
        document.getElementById(`pbqContent${n}`).style.display = (n === num) ? 'block' : 'none';
        const tab = document.getElementById(`pbqTab${n}`);
        if (tab) {
          if (n === num) {
            tab.className = "btn";
            tab.style.backgroundColor = "var(--accent-cyan)";
            tab.style.color = "#000";
          } else {
            tab.className = "btn btn-secondary";
            tab.style.backgroundColor = "";
            tab.style.color = "";
          }
        }
      });
      if (num === 1) renderPortMatcher();
      if (num === 2) renderPrinterOrder();
      if (num === 3) setTimeout(() => document.getElementById('terminalInput').focus(), 100);
    }

    // Lab 1: Port Matcher
    const portPairs = [
      { name: "SSH (Secure Shell)", port: "22" },
      { name: "DNS (Domain Name System)", port: "53" },
      { name: "DHCP Server", port: "67" },
      { name: "HTTPS (Secure Web)", port: "443" },
      { name: "RDP (Remote Desktop)", port: "3389" },
      { name: "SNMP (Simple Network Mgmt)", port: "161" }
    ];
    let selectedPortProtocol = null;
    let matchedPorts = {};

    function renderPortMatcher() {
      const cont = document.getElementById('portMatcherContainer');
      cont.innerHTML = "";
      matchedPorts = {};
      selectedPortProtocol = null;
      document.getElementById('portMatcherResult').innerText = "";

      const leftCol = document.createElement('div');
      leftCol.style = "display: flex; flex-direction: column; gap: 0.5rem;";
      portPairs.forEach((p, idx) => {
        const b = document.createElement('button');
        b.id = `protBtn_${idx}`;
        b.className = "btn btn-secondary";
        b.style = "text-align: left; justify-content: space-between; font-size: 0.85rem;";
        b.innerHTML = `<span>${p.name}</span> <span id="matchBadge_${idx}" style="font-weight: 700; color: var(--accent-cyan);"></span>`;
        b.onclick = () => selectProtocolForPort(idx);
        leftCol.appendChild(b);
      });

      const rightCol = document.createElement('div');
      rightCol.style = "display: flex; flex-direction: column; gap: 0.5rem;";
      const shuffledPorts = [...portPairs].sort(() => Math.random() - 0.5);
      shuffledPorts.forEach((p) => {
        const pb = document.createElement('button');
        pb.className = "btn btn-secondary";
        pb.style = "font-family: monospace; font-size: 1rem; font-weight: 700; justify-content: center;";
        pb.innerText = `Port ${p.port}`;
        pb.onclick = () => matchPortNumber(p.port);
        rightCol.appendChild(pb);
      });

      cont.appendChild(leftCol);
      cont.appendChild(rightCol);
    }

    function selectProtocolForPort(idx) {
      selectedPortProtocol = idx;
      portPairs.forEach((_, i) => {
        const btn = document.getElementById(`protBtn_${i}`);
        if (btn) btn.style.borderColor = (i === idx) ? "var(--accent-cyan)" : "var(--border-color)";
      });
      playClickSound();
    }

    function matchPortNumber(port) {
      if (selectedPortProtocol === null) {
        alert("Click a protocol on the left first, then click its corresponding port!");
        return;
      }
      matchedPorts[selectedPortProtocol] = port;
      document.getElementById(`matchBadge_${selectedPortProtocol}`).innerText = `→ Port ${port}`;
      playClickSound();

      // Check if all matched
      if (Object.keys(matchedPorts).length === portPairs.length) {
        let correctCount = 0;
        portPairs.forEach((p, idx) => {
          if (matchedPorts[idx] === p.port) correctCount++;
        });
        const resEl = document.getElementById('portMatcherResult');
        if (correctCount === portPairs.length) {
          resEl.innerHTML = `<span style="color: var(--accent-green);">🎉 Excellent! All ${correctCount}/${portPairs.length} ports matched accurately!</span>`;
          playSuccessSound();
        } else {
          resEl.innerHTML = `<span style="color: var(--accent-amber);">You got ${correctCount} of ${portPairs.length} correct. Try again!</span>`;
        }
      }
    }

    // Lab 2: Laser Printer Order
    const correctPrinterSteps = [
      "1. Processing / Cleaning",
      "2. Charging (-600V Primary Corona)",
      "3. Exposing (Laser Discharging)",
      "4. Developing (Toner Adherence)",
      "5. Transferring (Toner to Paper)",
      "6. Fusing (Heat and Pressure Roller)"
    ];
    let userPrinterSteps = [];

    function renderPrinterOrder() {
      userPrinterSteps = [...correctPrinterSteps].sort(() => Math.random() - 0.5);
      renderPrinterUI();
    }

    function renderPrinterUI() {
      const cont = document.getElementById('printerStepsContainer');
      cont.innerHTML = "";
      document.getElementById('printerResult').innerText = "";

      userPrinterSteps.forEach((step, idx) => {
        const div = document.createElement('div');
        div.style = "display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); border: 1px solid var(--border-color); padding: 0.6rem 0.9rem; border-radius: 6px; font-size: 0.9rem;";
        div.innerHTML = `
          <span><strong>Position ${idx + 1}:</strong> ${step.split(' ')[1]}</span>
          <div style="display: flex; gap: 0.3rem;">
            <button class="btn btn-secondary" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="movePrinterStep(${idx}, -1)" ${idx === 0 ? 'disabled' : ''}>▲</button>
            <button class="btn btn-secondary" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="movePrinterStep(${idx}, 1)" ${idx === userPrinterSteps.length - 1 ? 'disabled' : ''}>▼</button>
          </div>
        `;
        cont.appendChild(div);
      });
    }

    function movePrinterStep(idx, delta) {
      const target = idx + delta;
      if (target >= 0 && target < userPrinterSteps.length) {
        const temp = userPrinterSteps[idx];
        userPrinterSteps[idx] = userPrinterSteps[target];
        userPrinterSteps[target] = temp;
        renderPrinterUI();
        playClickSound();
      }
    }

    function verifyPrinterOrder() {
      let correct = true;
      userPrinterSteps.forEach((step, idx) => {
        if (!step.startsWith(`${idx + 1}.`)) correct = false;
      });
      const res = document.getElementById('printerResult');
      if (correct) {
        res.innerHTML = `<span style="color: var(--accent-green);">🎉 100% Correct! You have mastered the Laser Printing cycle sequence!</span>`;
        playSuccessSound();
      } else {
        res.innerHTML = `<span style="color: var(--accent-red);">❌ Incorrect sequence. Remember: Cleaning -> Charging -> Exposing -> Developing -> Transferring -> Fusing.</span>`;
      }
    }

    function resetPrinterOrder() {
      renderPrinterOrder();
    }

    // Lab 3: Terminal CLI Simulator
    function handleTerminalKey(e) {
      if (e.key === 'Enter') {
        const input = document.getElementById('terminalInput');
        const cmd = (input.value || '').trim();
        input.value = '';
        executeTerminalCommand(cmd);
      }
    }

    function executeTerminalCommand(cmd) {
      const out = document.getElementById('terminalOutput');
      const cmdLine = document.createElement('div');
      cmdLine.innerHTML = `<span style="color: #f8fafc;">C:\\\\Users\\\\Administrator&gt;</span> <span style="color: #fff;">${escapeHTML(cmd)}</span>`;
      out.appendChild(cmdLine);

      const resp = document.createElement('div');
      resp.style = "color: #94a3b8; margin: 0.25rem 0 0.5rem 0;";

      const lower = cmd.toLowerCase();
      if (lower === 'help') {
        resp.innerHTML = `
          Commands available in this drill:<br>
          &nbsp;&nbsp;sfc /scannow&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- Scans and repairs protected system files<br>
          &nbsp;&nbsp;dism /online ...&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- Repairs the Windows Component Store (WinSxS)<br>
          &nbsp;&nbsp;ipconfig /all&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- Shows full network adapter IP, MAC, DHCP configuration<br>
          &nbsp;&nbsp;chkdsk /f /r&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- Checks disk filesystem and recovers bad sectors<br>
          &nbsp;&nbsp;bootrec /rebuildbcd&nbsp;&nbsp;- Scans and rebuilds the Boot Configuration Data store<br>
          &nbsp;&nbsp;gpresult /r&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- Displays applied Group Policy Objects<br>
          &nbsp;&nbsp;robocopy&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- Robust file mirroring command<br>
          &nbsp;&nbsp;cls&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- Clears the terminal screen
        `;
      } else if (lower === 'cls') {
        out.innerHTML = '';
        return;
      } else if (lower.startsWith('sfc')) {
        resp.innerHTML = `Beginning system scan. This process will take some time.<br>Beginning verification phase of system scan.<br>Verification 100% complete.<br><span style="color: #4ade80;">Windows Resource Protection found corrupt files and successfully repaired them.</span>`;
      } else if (lower.startsWith('ipconfig')) {
        resp.innerHTML = `Ethernet adapter Ethernet 1:<br>&nbsp;&nbsp;IPv4 Address . . . . . : 192.168.1.140<br>&nbsp;&nbsp;Subnet Mask . . . . . : 255.255.255.0<br>&nbsp;&nbsp;Default Gateway . . . : 192.168.1.1<br>&nbsp;&nbsp;DHCP Server . . . . . : 192.168.1.1<br>&nbsp;&nbsp;DNS Servers . . . . . : 8.8.8.8, 1.1.1.1`;
      } else if (lower.startsWith('bootrec')) {
        resp.innerHTML = `Scanning all disks for Windows installations...<br>Total identified Windows installations: 1<br>[1] C:\\\\Windows<br>Add installation to boot list? Yes(Y)/No(N)/All(A): Y<br><span style="color: #4ade80;">The operation completed successfully. BCD rebuilt.</span>`;
      } else if (lower.startsWith('chkdsk')) {
        resp.innerHTML = `The type of the file system is NTFS.<br>Stage 1: Examining basic file system structure...<br>Stage 2: Examining file name linkage...<br>Stage 3: Examining security descriptors...<br><span style="color: #4ade80;">Windows has scanned the file system and found no problems.</span>`;
      } else {
        resp.innerHTML = `'${escapeHTML(cmd)}' is not recognized. Type 'help' for CompTIA A+ diagnostic command drills.`;
      }

      out.appendChild(resp);
      const win = document.getElementById('terminalWindow');
      win.scrollTop = win.scrollHeight;
      playClickSound();
    }

    /* GAUGE UPDATE IN FINISH EXAM */
    function updateScoreGauge(score, max = 900) {
      const circle = document.getElementById('scoreGaugeCircle');
      if (!circle) return;
      // Circumference = 2 * PI * 42 = 263.89 ~ 264
      const circumference = 264;
      // Proportion from 100 to 900
      const pct = Math.max(0, Math.min(1, (score - 100) / 800));
      const offset = circumference - (pct * circumference);
      circle.style.strokeDashoffset = offset;

      if (score >= 700) {
        circle.style.stroke = "var(--accent-green)";
      } else if (score >= 675) {
        circle.style.stroke = "var(--accent-cyan)";
      } else {
        circle.style.stroke = "var(--accent-red)";
      }
    }
"""

# Hook updateScoreGauge into finishExam
finish_exam_marker = "document.getElementById('scaledScoreDisplay').innerText = `${scaledScore} / 900`;"
finish_exam_replacement = """document.getElementById('scaledScoreDisplay').innerText = `${scaledScore}`;
      updateScoreGauge(scaledScore);
      if (isPassed) { playSuccessSound(); }"""

if finish_exam_marker in html:
    html = html.replace(finish_exam_marker, finish_exam_replacement)
    print("Hooked updateScoreGauge & audio into finishExam!")

# Add js_modern before window.addEventListener('DOMContentLoaded', initExamData);
init_marker = "window.addEventListener('DOMContentLoaded', initExamData);"
html = html.replace(init_marker, js_modern + "\n    " + init_marker)
print("Inserted modern JS functions!")

# Also call initTheme inside initExamData
init_exam_marker = "function initExamData() {"
html = html.replace(init_exam_marker, "function initExamData() {\n      initTheme();")

with open("A_Plus_Exam_Simulator.html", "w", encoding="utf-8") as f:
    f.write(html)

print("A_Plus_Exam_Simulator.html upgraded to Modern Desktop Spec successfully!")
