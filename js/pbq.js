/**
 * CompTIA A+ Master Exam Simulator v3.0.0
 * pbq.js - Performance-Based Question (PBQ) Interactive Simulation Labs
 * File: js/pbq.js
 */

(function(window) {
  'use strict';

  window.APlus = window.APlus || {};
  const APlus = window.APlus;

  const escapeHTML = (window.APlus.utils && window.APlus.utils.escapeHTML) || ((s) => String(s || ''));

  const PBQ_LABS = {
    portMatcher: {
      id: 'pbq-port-matcher',
      title: 'Lab 1: Ticket DC-4471, port assignments for the new rack switch',
      objective: '2.1',
      domain: '2.0 Networking',
      pairs: [
        { name: 'SSH (Secure Shell)', port: '22' },
        { name: 'DNS (Domain Name System)', port: '53' },
        { name: 'DHCP Server', port: '67' },
        { name: 'HTTPS (Secure Web)', port: '443' },
        { name: 'RDP (Remote Desktop)', port: '3389' },
        { name: 'SNMP (Simple Network Mgmt)', port: '161' },
        { name: 'LDAP (Directory Services)', port: '389' },
        { name: 'SMB (Server Message Block)', port: '445' }
      ]
    },

    printerOrder: {
      id: 'pbq-laser-printer',
      title: 'Lab 2: Ticket DC-4488, laser printer in Building B print room',
      objective: '3.4',
      domain: '3.0 Hardware',
      steps: [
        '1. Processing / Raster Image Generation',
        '2. Charging (-600V Primary Corona / Conditioning Roller)',
        '3. Exposing (Laser Discharging Latent Electrostatic Image)',
        '4. Developing (Toner Powder Attraction to Discharged Areas)',
        '5. Transferring (+600V Transfer Corona Attracting Toner to Paper)',
        '6. Fusing (Heat and Pressure Rollers Melting Toner into Fibers)',
        '7. Cleaning (Physical Scraper Blade and Discharge Lamp Reset)'
      ]
    },

    cliTerminal: {
      id: 'pbq-cli-terminal',
      title: 'Lab 3: Ticket DC-4502, console session on DC-NODE-01 in rack A14',
      objective: '3.1',
      domain: '3.0 Software Troubleshooting',
      commands: {
        'sfc /scannow': 'Beginning system scan. This process will take some time.\nVerification 100% complete.\nWindows Resource Protection found corrupt files and successfully repaired them.',
        'dism /online /cleanup-image /restorehealth': 'Deployment Image Servicing and Management tool\n[==========================100.0%==========================]\nThe restore operation completed successfully. The component store corruption was repaired.',
        'ipconfig /all': 'Windows IP Configuration\n   Host Name . . . . . . . . . . . . : DC-NODE-01\n   Primary Dns Suffix  . . . . . . . : corp.datacenter.local\n\nEthernet adapter Ethernet 1:\n   IPv4 Address. . . . . . . . . . . : 192.168.10.45(Preferred)\n   Subnet Mask . . . . . . . . . . . : 255.255.255.0\n   Default Gateway . . . . . . . . . : 192.168.10.1\n   DHCP Server . . . . . . . . . . . : 192.168.10.2\n   DNS Servers . . . . . . . . . . . : 192.168.10.2, 1.1.1.1',
        'bootrec /rebuildbcd': 'Scanning all disks for Windows installations...\nTotal identified Windows installations: 1\n[1] C:\\Windows\nAdd installation to boot list? Yes(Y)/No(N)/All(A): Y\nThe operation completed successfully. BCD store rebuilt.',
        'chkdsk /f /r': 'The type of the file system is NTFS.\nVolume label is SYSTEM_OS.\nStage 1: Examining basic file system structure...\nStage 2: Examining file name linkage...\nStage 3: Examining security descriptors...\nStage 4: Looking for bad clusters in user file data...\nWindows has scanned the file system and found no problems.',
        'gpresult /r': 'Microsoft (R) Windows (R) Operating System Group Policy Result tool v2.0\nUSER SETTINGS\n------------------\nApplied Group Policy Objects:\n   Default Domain Policy\n   Workstation Baseline Security GPO\n   Firewall Baseline Configuration',
        'robocopy': 'ROBOCOPY     ::     Robust File Copy for Windows\nUsage: ROBOCOPY source destination [file [file]...] [options]\nSyntax accepted. No source or destination supplied, so nothing was copied.'
      }
    }
  };

  // Ticket briefs shown above each lab. Imperative voice, one job per lab.
  const LAB_BRIEFS = {
    1: {
      ticket: 'Ticket DC-4471',
      where: 'Rack A14, top-of-rack switch',
      report: 'Network lead needs the inbound ACL for the new switch before the change window closes.',
      task: 'Match each service to the default TCP or UDP port it listens on. Click a service, then click its port.'
    },
    2: {
      ticket: 'Ticket DC-4488',
      where: 'Building B print room',
      report: 'A user reports faint, smudging output from the shared laser printer.',
      task: 'Put the seven stages of the laser print cycle in the order they run, then check the order.'
    },
    3: {
      ticket: 'Ticket DC-4502',
      where: 'Rack A14, host DC-NODE-01',
      report: 'Overnight patching left the host booting slowly with intermittent name resolution failures.',
      task: 'Run the diagnostic commands from the console. Type help to list what this console accepts.'
    }
  };

  let selectedPortProtocol = null;
  let matchedPorts = {};
  let currentPrinterSteps = [];

  const PBQEngine = {
    labs: PBQ_LABS,

    init() {
      // Setup bindings
    },

    openModal(labIndex = 1) {
      const modal = document.getElementById('pbqModal');
      if (modal) {
        modal.classList.add('active');
        this.switchLab(labIndex);
      }
    },

    closeModal() {
      const modal = document.getElementById('pbqModal');
      if (modal) modal.classList.remove('active');
    },

    /** Put the ticket brief at the top of each lab pane. Idempotent. */
    renderLabBriefs() {
      [1, 2, 3].forEach((n) => {
        const pane = document.getElementById(`pbqContent${n}`);
        const brief = LAB_BRIEFS[n];
        if (!pane || !brief) return;

        let box = document.getElementById(`pbqBrief${n}`);
        if (!box) {
          box = document.createElement('div');
          box.id = `pbqBrief${n}`;
          box.className = 'pbq-brief';
          pane.insertBefore(box, pane.firstChild);
        }
        box.innerHTML =
          '<div class="label">' + escapeHTML(brief.ticket) + ' - ' + escapeHTML(brief.where) + '</div>' +
          '<p>' + escapeHTML(brief.report) + '</p>' +
          '<p>' + escapeHTML(brief.task) + '</p>';

        // The shell ships a static objective blurb above each lab; the brief replaces it.
        Array.prototype.forEach.call(pane.children, function (child) {
          if (child === box) return;
          if (child.dataset && child.dataset.pbqLegacyBlurb === 'hidden') return;
          const strong = child.querySelector && child.querySelector('strong');
          if (strong && /^Objective:/i.test((strong.textContent || '').trim())) {
            child.dataset.pbqLegacyBlurb = 'hidden';
            child.hidden = true;
          }
        });
      });
    },

    switchLab(labNum) {
      this.renderLabBriefs();
      [1, 2, 3].forEach(n => {
        const content = document.getElementById(`pbqContent${n}`);
        const tab = document.getElementById(`pbqTab${n}`);
        if (content) content.style.display = (n === labNum) ? 'block' : 'none';
        if (tab) {
          if (n === labNum) {
            tab.className = 'btn';
            tab.style.backgroundColor = 'var(--accent-cyan)';
            tab.style.color = '#000';
          } else {
            tab.className = 'btn btn-secondary';
            tab.style.backgroundColor = '';
            tab.style.color = '';
          }
        }
      });

      if (labNum === 1) this.renderPortMatcher();
      if (labNum === 2) this.renderPrinterOrder();
      if (labNum === 3) {
        setTimeout(() => {
          const inp = document.getElementById('terminalInput');
          if (inp) inp.focus();
        }, 100);
      }
    },

    /* LAB 1: Port Matcher */
    renderPortMatcher() {
      const cont = document.getElementById('portMatcherContainer');
      if (!cont) return;
      cont.innerHTML = '';
      matchedPorts = {};
      selectedPortProtocol = null;
      const resEl = document.getElementById('portMatcherResult');
      if (resEl) resEl.innerText = '';

      const pairs = PBQ_LABS.portMatcher.pairs;

      const leftCol = document.createElement('div');
      leftCol.style = 'display: flex; flex-direction: column; gap: 0.5rem;';
      pairs.forEach((p, idx) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.id = `protBtn_${idx}`;
        b.className = 'btn btn-secondary';
        b.style = 'text-align: left; justify-content: space-between; font-size: 0.85rem; padding: 0.55rem 0.8rem;';
        b.innerHTML = `<span>${escapeHTML(p.name)}</span> <span id="matchBadge_${idx}" style="font-weight: 700; color: var(--accent-cyan);"></span>`;
        b.onclick = () => this.selectPortProtocol(idx);
        leftCol.appendChild(b);
      });

      const rightCol = document.createElement('div');
      rightCol.style = 'display: flex; flex-direction: column; gap: 0.5rem;';
      const shuffledPorts = [...pairs].sort(() => Math.random() - 0.5);
      shuffledPorts.forEach((p) => {
        const pb = document.createElement('button');
        pb.type = 'button';
        pb.className = 'btn btn-secondary';
        pb.style = 'font-family: monospace; font-size: 0.95rem; font-weight: 700; justify-content: center; padding: 0.55rem 0.8rem;';
        pb.innerText = `Port ${p.port}`;
        pb.onclick = () => this.matchPort(p.port);
        rightCol.appendChild(pb);
      });

      cont.appendChild(leftCol);
      cont.appendChild(rightCol);
    },

    selectPortProtocol(idx) {
      selectedPortProtocol = idx;
      const pairs = PBQ_LABS.portMatcher.pairs;
      pairs.forEach((_, i) => {
        const btn = document.getElementById(`protBtn_${i}`);
        if (btn) btn.style.borderColor = (i === idx) ? 'var(--accent-cyan)' : 'var(--border-color)';
      });
      if (window.APlus && window.APlus.sound) window.APlus.sound.playClick();
    },

    matchPort(port) {
      if (selectedPortProtocol === null) {
        alert('Pick a service on the left, then pick the port it listens on.');
        return;
      }
      matchedPorts[selectedPortProtocol] = port;
      const badge = document.getElementById(`matchBadge_${selectedPortProtocol}`);
      if (badge) badge.innerText = `-> Port ${port}`;
      if (window.APlus && window.APlus.sound) window.APlus.sound.playClick();

      const pairs = PBQ_LABS.portMatcher.pairs;
      if (Object.keys(matchedPorts).length === pairs.length) {
        let correctCount = 0;
        pairs.forEach((p, idx) => {
          if (matchedPorts[idx] === p.port) correctCount++;
        });

        const resEl = document.getElementById('portMatcherResult');
        if (correctCount === pairs.length) {
          resEl.innerHTML = `<span class="pbq-result ok">All ${correctCount} of ${pairs.length} ports correct. The ACL is ready to apply.</span>`;
          if (window.APlus && window.APlus.sound) window.APlus.sound.playSuccess();
          if (window.CompTIALedgerUI) CompTIALedgerUI.onPbqComplete('Port Matcher Lab');
          APlus.bus.emit('pbq:completed', { lab: 'portMatcher', correct: true, score: 100 });
        } else {
          resEl.innerHTML = `<span class="pbq-result">Matched ${correctCount} of ${pairs.length}. Fix the wrong rows and submit again.</span>`;
        }
      }
    },

    /* LAB 2: Laser Printer Sequence */
    renderPrinterOrder() {
      currentPrinterSteps = [...PBQ_LABS.printerOrder.steps].sort(() => Math.random() - 0.5);
      this.renderPrinterUI();
    },

    renderPrinterUI() {
      const cont = document.getElementById('printerStepsContainer');
      if (!cont) return;
      cont.innerHTML = '';
      const res = document.getElementById('printerResult');
      if (res) res.innerText = '';

      currentPrinterSteps.forEach((step, idx) => {
        const div = document.createElement('div');
        div.style = 'display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); border: 1px solid var(--border-color); padding: 0.65rem 0.9rem; border-radius: 6px; font-size: 0.88rem; gap: 0.75rem;';
        div.innerHTML = `
          <div style="flex: 1;">
            <span style="background: rgba(6, 182, 212, 0.15); color: var(--accent-cyan); font-weight: 700; padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.78rem; margin-right: 0.5rem;">Slot ${idx + 1}</span>
            <span>${escapeHTML(step)}</span>
          </div>
          <div style="display: flex; gap: 0.3rem;">
            <button type="button" class="btn btn-secondary" style="padding: 0.25rem 0.55rem; font-size: 0.8rem;" onclick="APlus.pbq.movePrinterStep(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} aria-label="Move up">Up</button>
            <button type="button" class="btn btn-secondary" style="padding: 0.25rem 0.55rem; font-size: 0.8rem;" onclick="APlus.pbq.movePrinterStep(${idx}, 1)" ${idx === currentPrinterSteps.length - 1 ? 'disabled' : ''} aria-label="Move down">Down</button>
          </div>
        `;
        cont.appendChild(div);
      });
    },

    movePrinterStep(idx, delta) {
      const target = idx + delta;
      if (target >= 0 && target < currentPrinterSteps.length) {
        const temp = currentPrinterSteps[idx];
        currentPrinterSteps[idx] = currentPrinterSteps[target];
        currentPrinterSteps[target] = temp;
        this.renderPrinterUI();
        if (window.APlus && window.APlus.sound) window.APlus.sound.playClick();
      }
    },

    verifyPrinterOrder() {
      let isAllCorrect = true;
      currentPrinterSteps.forEach((step, idx) => {
        if (!step.startsWith(`${idx + 1}.`)) isAllCorrect = false;
      });

      const res = document.getElementById('printerResult');
      if (isAllCorrect) {
        res.innerHTML = `<span class="pbq-result ok">Sequence correct. You can now explain the fault to the user.</span>`;
        if (window.APlus && window.APlus.sound) window.APlus.sound.playSuccess();
        if (window.CompTIALedgerUI) CompTIALedgerUI.onPbqComplete('Laser Printer Cycle Lab');
        APlus.bus.emit('pbq:completed', { lab: 'printerOrder', correct: true, score: 100 });
      } else {
        res.innerHTML = `<span class="pbq-result">Not the right order. Work forward from the image data to the finished page.</span>`;
      }
    },

    /* LAB 3: CLI Simulator */
    handleTerminalKey(e) {
      if (e.key === 'Enter') {
        const input = document.getElementById('terminalInput');
        const cmd = (input.value || '').trim();
        input.value = '';
        this.executeCommand(cmd);
      }
    },

    executeCommand(cmd) {
      const out = document.getElementById('terminalOutput');
      if (!out) return;

      const cmdLine = document.createElement('div');
      cmdLine.innerHTML = `<span style="color: #f8fafc;">C:\\Users\\Administrator&gt;</span> <span style="color: #fff;">${escapeHTML(cmd)}</span>`;
      out.appendChild(cmdLine);

      const resp = document.createElement('div');
      resp.style = 'color: #94a3b8; margin: 0.25rem 0 0.5rem 0; white-space: pre-wrap; font-family: monospace; font-size: 0.84rem;';

      const lower = cmd.toLowerCase().trim();
      const commands = PBQ_LABS.cliTerminal.commands;

      if (lower === 'help') {
        resp.textContent = `Commands available in this session:\n  sfc /scannow                     - Scans and repairs protected system files\n  dism /online /cleanup-image ...  - Repairs Windows Component Store (WinSxS)\n  ipconfig /all                    - Displays full network adapter TCP/IP config\n  bootrec /rebuildbcd              - Rebuilds Boot Configuration Data store\n  chkdsk /f /r                     - Scans filesystem integrity and bad sectors\n  gpresult /r                      - Displays applied Group Policy Objects\n  robocopy                         - Robust file copy utility\n  cls                              - Clears the terminal screen`;
      } else if (lower === 'cls') {
        out.innerHTML = '';
        return;
      } else if (commands[lower]) {
        resp.textContent = commands[lower];
        if (window.CompTIALedgerUI) CompTIALedgerUI.onPbqComplete(`CLI Drill: ${cmd}`);
      } else if (lower.startsWith('sfc')) {
        resp.textContent = commands['sfc /scannow'];
      } else if (lower.startsWith('ipconfig')) {
        resp.textContent = commands['ipconfig /all'];
      } else if (lower.startsWith('bootrec')) {
        resp.textContent = commands['bootrec /rebuildbcd'];
      } else if (lower.startsWith('chkdsk')) {
        resp.textContent = commands['chkdsk /f /r'];
      } else if (lower.startsWith('dism')) {
        resp.textContent = commands['dism /online /cleanup-image /restorehealth'];
      } else {
        resp.textContent = `'${cmd}' is not recognized as an internal or external command. Type 'help' to list what this console accepts.`;
      }

      out.appendChild(resp);
      const win = document.getElementById('terminalWindow');
      if (win) win.scrollTop = win.scrollHeight;
      if (window.APlus && window.APlus.sound) window.APlus.sound.playClick();
    },

    /**
     * PBQ Exam Pool Hook: exports PBQ lab specifications formatted for timed mock exams
     */
    examPool() {
      return [
        {
          id: 'PBQ-001',
          exam: 'core1',
          domain: '2.0 Networking',
          objective: '2.1',
          type: 'match',
          question: 'You are writing the ACL for a new top-of-rack switch. Match each service to the default TCP or UDP port it listens on.',
          pairs: PBQ_LABS.portMatcher.pairs.map(p => ({ left: p.name, right: p.port })),
          explanation: 'Standard CompTIA networking ports: SSH=22, DNS=53, DHCP Server=67, HTTPS=443, RDP=3389, SNMP=161, LDAP=389, SMB=445.',
          difficulty: 'medium'
        },
        {
          id: 'PBQ-002',
          exam: 'core1',
          domain: '3.0 Hardware',
          objective: '3.4',
          type: 'order',
          question: 'A user reports faint output from the laser printer in Building B. Put the seven stages of the laser print cycle in the order they run.',
          sequence: PBQ_LABS.printerOrder.steps,
          explanation: 'The standard laser printing cycle is: 1. Processing, 2. Charging, 3. Exposing, 4. Developing, 5. Transferring, 6. Fusing, 7. Cleaning.',
          difficulty: 'hard'
        }
      ];
    }
  };

  APlus.pbq = PBQEngine;

  // Global compatibility hooks
  // The shell declares its own openPBQModal/switchPBQLab inline, later in the page.
  // Wrap them (names unchanged) so the ticket briefs render either way.
  function wrapLabGlobal(name) {
    const original = window[name];
    if (typeof original !== 'function' || original._pbqBriefWrapped) return;
    const wrapped = function () {
      const out = original.apply(this, arguments);
      try { PBQEngine.renderLabBriefs(); } catch (err) {
        console.error('[pbq] brief render failed for ' + name + ':', err);
      }
      return out;
    };
    wrapped._pbqBriefWrapped = true;
    window[name] = wrapped;
  }

  function bootBriefs() {
    setTimeout(function () {
      wrapLabGlobal('openPBQModal');
      wrapLabGlobal('switchPBQLab');
      try { PBQEngine.renderLabBriefs(); } catch (_) {}
    }, 0);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bootBriefs);
    } else {
      bootBriefs();
    }
  }

  window.openPBQModal = () => PBQEngine.openModal();
  window.closePBQModal = () => PBQEngine.closeModal();
  window.switchPBQLab = (n) => PBQEngine.switchLab(n);
  window.selectProtocolForPort = (idx) => PBQEngine.selectPortProtocol(idx);
  window.matchPortNumber = (port) => PBQEngine.matchPort(port);
  window.movePrinterStep = (idx, delta) => PBQEngine.movePrinterStep(idx, delta);
  window.verifyPrinterOrder = () => PBQEngine.verifyPrinterOrder();
  window.resetPrinterOrder = () => PBQEngine.renderPrinterOrder();
  window.handleTerminalKey = (e) => PBQEngine.handleTerminalKey(e);

})(typeof window !== 'undefined' ? window : this);
