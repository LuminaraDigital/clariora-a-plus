/**
 * Clariora Exam Simulator v3.2.0
 * cram-sheet.js - Interactive High-Yield Quick Reference Cram Tables & Notes Drill
 * File: js/cram-sheet.js
 */

(function(window) {
  'use strict';

  window.APlus = window.APlus || {};
  const APlus = window.APlus;

  const escapeHTML = (window.APlus.utils && window.APlus.utils.escapeHTML) || ((s) => {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  });

  const CramSheet = {
    activeTab: 'ports',

    init() {
      this.injectModal();
    },

    openModal(defaultTab = 'ports') {
      const modal = document.getElementById('cramSheetModal');
      if (modal) {
        modal.classList.add('active');
        this.switchTab(defaultTab);
      }
    },

    closeModal() {
      const modal = document.getElementById('cramSheetModal');
      if (modal) modal.classList.remove('active');
    },

    switchTab(tabId) {
      this.activeTab = tabId;
      document.querySelectorAll('.cram-tab-btn').forEach(btn => {
        const isActive = btn.getAttribute('data-tab') === tabId;
        btn.classList.toggle('active', isActive);
        btn.classList.toggle('btn-primary', isActive);
        btn.classList.toggle('btn-secondary', !isActive);
      });

      const container = document.getElementById('cramSheetContent');
      if (!container) return;

      switch (tabId) {
        case 'ports':
          this.renderPortsTab(container);
          break;
        case 'troubleshooting':
          this.renderTroubleshootingTab(container);
          break;
        case 'cabling':
          this.renderCablingTab(container);
          break;
        case 'wifi':
          this.renderWifiTab(container);
          break;
        case 'raid':
          this.renderRaidTab(container);
          break;
        case 'laser':
          this.renderLaserTab(container);
          break;
        case 'cli':
          this.renderCliTab(container);
          break;
        case 'hardware':
          this.renderHardwareTab(container);
          break;
        default:
          this.renderPortsTab(container);
      }
    },

    async printAll() {
      const L = window.CompTIALedger;
      const owned = L && typeof L.hasActiveUnlock === 'function' && (await L.hasActiveUnlock('CRAM_SHEET'));
      if (!owned) {
        const ui = window.CompTIALedgerUI;
        if (ui && typeof ui.toast === 'function') {
          ui.toast('The printable Cram Sheet export is a store unlock. The interactive sheet stays free.', 'warn');
        }
        if (typeof window.openLedgerModal === 'function') window.openLedgerModal();
        return;
      }

      const tabs = [
        ['Ports & Protocols', 'renderPortsTab'],
        ['6-Step Troubleshooting Method', 'renderTroubleshootingTab'],
        ['Cabling & Pinouts', 'renderCablingTab'],
        ['Wi-Fi Standards', 'renderWifiTab'],
        ['RAID Matrix', 'renderRaidTab'],
        ['Laser Printing Cycle', 'renderLaserTab'],
        ['CLI Commands', 'renderCliTab'],
        ['Hardware & 3D Diagrams', 'renderHardwareTab']
      ];
      const sections = tabs.map(([title, fn]) => {
        const holder = document.createElement('div');
        this[fn](holder);
        holder.querySelectorAll('input, button, select').forEach((el) => el.remove());
        return `<section><h2>${title}</h2>${holder.innerHTML}</section>`;
      }).join('');

      const frame = document.createElement('iframe');
      frame.setAttribute('aria-hidden', 'true');
      frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
      document.body.appendChild(frame);
      const doc = frame.contentWindow.document;
      doc.open();
      doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>CompTIA A+ Cram Sheet</title>
        <style>
          * { color: #000 !important; background: #fff !important; box-shadow: none !important; }
          body { font: 10pt/1.35 system-ui, sans-serif; margin: 12mm; }
          h1 { font-size: 16pt; margin: 0 0 6mm; }
          h2 { font-size: 12pt; margin: 6mm 0 2mm; border-bottom: 1px solid #000; page-break-after: avoid; }
          table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
          th, td { border: 1px solid #999; padding: 2px 4px; text-align: left; vertical-align: top; }
          svg { display: none; }
          section { page-break-inside: auto; }
        </style></head><body><h1>CompTIA A+ Cram Sheet</h1>${sections}</body></html>`);
      doc.close();
      setTimeout(() => {
        frame.contentWindow.focus();
        frame.contentWindow.print();
        setTimeout(() => frame.remove(), 1000);
      }, 150);
    },

    renderPortsTab(container) {
      const ports = [
        { port: '20/21', name: 'FTP', proto: 'TCP', desc: 'File Transfer Protocol (20 Data, 21 Control)', sec: 'Cleartext', secureAlt: 'SFTP (22) / FTPS (989/990)' },
        { port: '22', name: 'SSH / SFTP', proto: 'TCP', desc: 'Secure Shell / Secure File Transfer (encrypted terminal & transfers)', sec: 'Encrypted', secureAlt: 'Primary secure admin protocol' },
        { port: '23', name: 'Telnet', proto: 'TCP', desc: 'Legacy unencrypted terminal communication', sec: 'Insecure', secureAlt: 'Replace with SSH (22)' },
        { port: '25', name: 'SMTP', proto: 'TCP', desc: 'Simple Mail Transfer Protocol (send mail between MTAs)', sec: 'Cleartext', secureAlt: 'SMTPS (465) / STARTTLS (587)' },
        { port: '53', name: 'DNS', proto: 'UDP/TCP', desc: 'Domain Name System (resolves names to IP addresses)', sec: 'Standard', secureAlt: 'DNSSEC / DoH (443)' },
        { port: '67/68', name: 'DHCP', proto: 'UDP', desc: 'Dynamic Host Configuration Protocol (67 Server, 68 Client)', sec: 'LAN Broadcast', secureAlt: 'DHCP Snooping on switches' },
        { port: '69', name: 'TFTP', proto: 'UDP', desc: 'Trivial File Transfer Protocol (PXE boot, router firmware)', sec: 'Insecure', secureAlt: 'No auth, no encryption' },
        { port: '80', name: 'HTTP', proto: 'TCP', desc: 'Hypertext Transfer Protocol (unencrypted web browsing)', sec: 'Cleartext', secureAlt: 'Replace with HTTPS (443)' },
        { port: '110', name: 'POP3', proto: 'TCP', desc: 'Post Office Protocol v3 (download mail to local client)', sec: 'Cleartext', secureAlt: 'POP3S (995)' },
        { port: '123', name: 'NTP', proto: 'UDP', desc: 'Network Time Protocol (clock synchronization across devices)', sec: 'Standard', secureAlt: 'Critical for Kerberos authentication' },
        { port: '143', name: 'IMAP', proto: 'TCP', desc: 'Internet Message Access Protocol (syncs mail on server)', sec: 'Cleartext', secureAlt: 'IMAPS (993)' },
        { port: '161/162', name: 'SNMP', proto: 'UDP', desc: 'Simple Network Management Protocol (161 Poll, 162 Trap)', sec: 'v1/v2 Insecure', secureAlt: 'SNMPv3 (Authentication + Encryption)' },
        { port: '389', name: 'LDAP', proto: 'TCP', desc: 'Lightweight Directory Access Protocol (Active Directory queries)', sec: 'Cleartext', secureAlt: 'LDAPS (636)' },
        { port: '443', name: 'HTTPS', proto: 'TCP', desc: 'HTTP Secure (TLS/SSL encrypted web browser traffic)', sec: 'Encrypted', secureAlt: 'Standard modern web traffic' },
        { port: '445', name: 'SMB', proto: 'TCP', desc: 'Server Message Block (Windows file and print sharing)', sec: 'LAN Protocol', secureAlt: 'SMBv3 with encryption' },
        { port: '636', name: 'LDAPS', proto: 'TCP', desc: 'LDAP over TLS/SSL (encrypted directory queries)', sec: 'Encrypted', secureAlt: 'Replaces port 389' },
        { port: '3389', name: 'RDP', proto: 'TCP', desc: 'Remote Desktop Protocol (Windows GUI remote management)', sec: 'Encrypted', secureAlt: 'Requires NLA (Network Level Auth)' }
      ];

      container.innerHTML = `
        <div style="margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <input type="text" id="cramPortSearch" placeholder="Search port number, protocol, or function..." style="background: var(--surface-1); border: 1px solid var(--border-strong); border-radius: 6px; padding: 0.4rem 0.75rem; color: var(--text-primary); font-size: 0.85rem; width: 280px;" oninput="APlus.cramSheet.filterPorts(this.value)" />
          <span style="font-size: 0.78rem; color: var(--text-secondary);">${ports.length} essential CompTIA exam ports</span>
        </div>
        <div class="md-table-wrapper" style="margin: 0;">
          <table class="md-table" id="cramPortsTable">
            <thead>
              <tr>
                <th style="width: 100px;">Port</th>
                <th style="width: 130px;">Protocol</th>
                <th style="width: 80px;">Transport</th>
                <th>Description & Function</th>
                <th style="width: 180px;">Security / Secure Alt</th>
              </tr>
            </thead>
            <tbody>
              ${ports.map(p => `
                <tr class="cram-port-row">
                  <td style="font-weight: 700; color: var(--gold-primary); font-family: monospace;">${escapeHTML(p.port)}</td>
                  <td style="font-weight: 600;">${escapeHTML(p.name)}</td>
                  <td style="font-family: monospace; font-size: 0.8rem;">${escapeHTML(p.proto)}</td>
                  <td>${escapeHTML(p.desc)}</td>
                  <td style="font-size: 0.8rem; color: ${p.sec === 'Cleartext' || p.sec.includes('Insecure') ? 'var(--accent-amber)' : 'var(--accent-green)'};">${escapeHTML(p.secureAlt)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    },

    filterPorts(query) {
      const q = (query || '').toLowerCase().trim();
      const rows = document.querySelectorAll('.cram-port-row');
      rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = !q || text.includes(q) ? '' : 'none';
      });
    },

    renderTroubleshootingTab(container) {
      const steps = [
        {
          num: 1,
          title: 'Identify the Problem',
          actions: ['Question user and identify user changes to computer', 'Perform backups BEFORE making any modifications', 'Inquire about environmental or infrastructure changes', 'Review system and application event logs'],
          trap: 'Always choose "Perform backup" or "Question the user" if offered as the first step.'
        },
        {
          num: 2,
          title: 'Establish a Theory of Probable Cause',
          actions: ['Question the obvious (cables plugged in, power on)', 'Consider multiple approaches (Top-down / Bottom-up OSI layers)'],
          trap: 'Do not replace parts in step 2! Step 2 is solely forming a hypothesis.'
        },
        {
          num: 3,
          title: 'Test the Theory to Determine Cause',
          actions: ['Once theory is confirmed, determine next steps to resolve', 'If theory is NOT confirmed, re-establish a new theory or escalate'],
          trap: 'If testing disproves the theory, CompTIA requires creating a new theory before taking action.'
        },
        {
          num: 4,
          title: 'Establish a Plan of Action & Implement the Solution',
          actions: ['Determine if escalation is required (corporate policy / beyond scope)', 'Build step-by-step implementation plan', 'Implement fix or test in sandbox'],
          trap: 'Escalation happens at Step 4 if the repair exceeds technician permissions or authorization.'
        },
        {
          num: 5,
          title: 'Verify Full System Functionality & Implement Preventive Measures',
          actions: ['Test thoroughly with the user to verify fix', 'Apply preventive measures to prevent recurrence (e.g. user education, surge protector)'],
          trap: 'A job is NEVER finished after the fix. Step 5 (verification) is mandatory.'
        },
        {
          num: 6,
          title: 'Document Findings, Actions, and Outcomes',
          actions: ['Update ticketing system log', 'Record diagnostic steps taken and parts used', 'Contribute resolution to Knowledge Base (KB)'],
          trap: 'The final step is always documentation for future technicians.'
        }
      ];

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.85rem;">
          <div class="md-alert md-alert-important" style="margin: 0;">
            <div class="md-alert-title">CRITICAL EXAM METHODOLOGY</div>
            <div class="md-alert-body" style="font-size: 0.85rem;">The CompTIA 6-Step process is tested on both Core 1 and Core 2. Every question asking "What should the technician do NEXT?" depends on this strict sequence.</div>
          </div>
          ${steps.map(s => `
            <div class="card" style="padding: 0.85rem 1rem; background: var(--surface-2); border-left: 4px solid var(--gold-primary);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.4rem;">
                <h4 style="margin: 0; color: var(--gold-primary); font-size: 0.95rem;">Step ${s.num}: ${escapeHTML(s.title)}</h4>
                <span class="badge badge-secondary" style="font-size: 0.72rem;">Step ${s.num} of 6</span>
              </div>
              <ul style="margin: 0 0 0.5rem 0; padding-left: 1.25rem; font-size: 0.85rem; line-height: 1.5; color: var(--text-primary);">
                ${s.actions.map(a => `<li>${escapeHTML(a)}</li>`).join('')}
              </ul>
              <div style="background: rgba(212, 175, 55, 0.08); padding: 0.35rem 0.65rem; border-radius: 4px; font-size: 0.78rem; color: var(--gold-light);">
                <strong>Exam Trap:</strong> ${escapeHTML(s.trap)}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    },

    renderCablingTab(container) {
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <h4 style="color: var(--gold-primary); margin: 0;">ANSI/TIA-568 Wiring Pinouts (RJ-45)</h4>
          <div class="md-table-wrapper" style="margin: 0;">
            <table class="md-table">
              <thead>
                <tr>
                  <th>Pin #</th>
                  <th>T568A Standard</th>
                  <th>T568B Standard (Most Common)</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style="font-family: monospace; font-weight: 700;">Pin 1</td><td style="color: #4ADE80;">White / Green</td><td style="color: #FB923C;">White / Orange</td></tr>
                <tr><td style="font-family: monospace; font-weight: 700;">Pin 2</td><td style="color: #22C55E;">Green</td><td style="color: #F97316;">Orange</td></tr>
                <tr><td style="font-family: monospace; font-weight: 700;">Pin 3</td><td style="color: #FB923C;">White / Orange</td><td style="color: #4ADE80;">White / Green</td></tr>
                <tr><td style="font-family: monospace; font-weight: 700;">Pin 4</td><td style="color: #60A5FA;">Blue</td><td style="color: #60A5FA;">Blue</td></tr>
                <tr><td style="font-family: monospace; font-weight: 700;">Pin 5</td><td style="color: #93C5FD;">White / Blue</td><td style="color: #93C5FD;">White / Blue</td></tr>
                <tr><td style="font-family: monospace; font-weight: 700;">Pin 6</td><td style="color: #F97316;">Orange</td><td style="color: #22C55E;">Green</td></tr>
                <tr><td style="font-family: monospace; font-weight: 700;">Pin 7</td><td style="color: #A16207;">White / Brown</td><td style="color: #A16207;">White / Brown</td></tr>
                <tr><td style="font-family: monospace; font-weight: 700;">Pin 8</td><td style="color: #78350F;">Brown</td><td style="color: #78350F;">Brown</td></tr>
              </tbody>
            </table>
          </div>
          <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 0;">
            <strong>Straight-Through:</strong> Same standard on both ends (T568B to T568B). Connects dissimilar devices (PC to Switch).<br>
            <strong>Crossover:</strong> T568A on one end, T568B on other. Connects similar devices (PC to PC, Switch to Switch). Modern switches support Auto-MDIX.
          </p>

          <h4 style="color: var(--gold-primary); margin: 0.5rem 0 0 0;">Ethernet Cable Categories</h4>
          <div class="md-table-wrapper" style="margin: 0;">
            <table class="md-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Max Speed</th>
                  <th>Max Distance</th>
                  <th>Frequency</th>
                  <th>Application</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><strong>Cat 5</strong></td><td>100 Mbps</td><td>100 meters</td><td>100 MHz</td><td>Legacy Fast Ethernet</td></tr>
                <tr><td><strong>Cat 5e</strong></td><td>1 Gbps</td><td>100 meters</td><td>100 MHz</td><td>Standard Gigabit LAN</td></tr>
                <tr><td><strong>Cat 6</strong></td><td>10 Gbps (55m) / 1 Gbps (100m)</td><td>55m @ 10G / 100m @ 1G</td><td>250 MHz</td><td>High performance desktop</td></tr>
                <tr><td><strong>Cat 6a</strong></td><td>10 Gbps</td><td>100 meters</td><td>500 MHz</td><td>Enterprise 10G over full 100m</td></tr>
                <tr><td><strong>Cat 7 / 8</strong></td><td>40 Gbps</td><td>30 meters</td><td>2000 MHz</td><td>Datacenter switch interconnects</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    },

    renderWifiTab(container) {
      container.innerHTML = `
        <div class="md-table-wrapper" style="margin: 0;">
          <table class="md-table">
            <thead>
              <tr>
                <th>Standard</th>
                <th>Brand Name</th>
                <th>Frequencies</th>
                <th>Max Throughput</th>
                <th>Key Features</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>802.11a</strong></td><td>Legacy</td><td>5 GHz</td><td>54 Mbps</td><td>Short range, avoids 2.4 GHz interference</td></tr>
              <tr><td><strong>802.11b</strong></td><td>Legacy</td><td>2.4 GHz</td><td>11 Mbps</td><td>Subject to microwave/cordless phone noise</td></tr>
              <tr><td><strong>802.11g</strong></td><td>Legacy</td><td>2.4 GHz</td><td>54 Mbps</td><td>Backwards compatible with 802.11b</td></tr>
              <tr><td><strong>802.11n</strong></td><td>Wi-Fi 4</td><td>2.4 & 5 GHz</td><td>600 Mbps</td><td>Introduced MIMO (Multiple-Input Multiple-Output)</td></tr>
              <tr><td><strong>802.11ac</strong></td><td>Wi-Fi 5</td><td>5 GHz</td><td>6.9 Gbps</td><td>MU-MIMO, 80/160 MHz channels</td></tr>
              <tr><td><strong>802.11ax</strong></td><td>Wi-Fi 6 / 6E</td><td>2.4, 5 & 6 GHz</td><td>9.6 Gbps</td><td>OFDMA, high density, 6 GHz band (6E)</td></tr>
            </tbody>
          </table>
        </div>
        <div style="margin-top: 1rem; background: var(--surface-2); padding: 0.85rem; border-radius: 6px; font-size: 0.84rem; line-height: 1.5;">
          <strong>Wi-Fi Channels:</strong> 2.4 GHz has only 3 non-overlapping channels in North America: <strong>Channels 1, 6, and 11</strong> (20 MHz width).<br>
          <strong>Security:</strong> WPA3 uses <strong>SAE (Simultaneous Authentication of Equals)</strong> to prevent offline dictionary attacks. WPA2-Enterprise uses <strong>802.1X with RADIUS</strong>.
        </div>
      `;
    },

    renderRaidTab(container) {
      container.innerHTML = `
        <div class="md-table-wrapper" style="margin: 0;">
          <table class="md-table">
            <thead>
              <tr>
                <th>RAID Level</th>
                <th>Configuration</th>
                <th>Min Drives</th>
                <th>Fault Tolerance</th>
                <th>Storage Efficiency</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style="font-weight: 700; color: var(--gold-primary);">RAID 0</td><td>Striping</td><td>2</td><td>0 (1 failure = total data loss)</td><td>100% capacity</td></tr>
              <tr><td style="font-weight: 700; color: var(--gold-primary);">RAID 1</td><td>Mirroring</td><td>2</td><td>1 drive failure</td><td>50% capacity</td></tr>
              <tr><td style="font-weight: 700; color: var(--gold-primary);">RAID 5</td><td>Striping with Distributed Parity</td><td>3</td><td>1 drive failure</td><td>(N - 1) / N</td></tr>
              <tr><td style="font-weight: 700; color: var(--gold-primary);">RAID 6</td><td>Striping with Dual Parity</td><td>4</td><td>2 drive failures</td><td>(N - 2) / N</td></tr>
              <tr><td style="font-weight: 700; color: var(--gold-primary);">RAID 10</td><td>1+0 (Striped Mirror Pairs)</td><td>4</td><td>Up to 1 drive per mirrored pair</td><td>50% capacity</td></tr>
            </tbody>
          </table>
        </div>
      `;
    },

    renderLaserTab(container) {
      const steps = [
        { n: 1, name: 'Processing', detail: 'The printer raster image processor (RIP) translates the print job into a raster raster bitmap in printer memory.' },
        { n: 2, name: 'Charging', detail: 'The primary corona wire or charge roller applies a uniform negative charge (-600V DC) across the entire photosensitive drum surface.' },
        { n: 3, name: 'Exposing', detail: 'The laser beam scans across the rotating drum, neutralizing the charge on the image areas from -600V down to -100V.' },
        { n: 4, name: 'Developing', detail: 'The developing roller applies negatively charged toner particles (-600V), which are attracted to the less negative (-100V) exposed areas of the drum.' },
        { n: 5, name: 'Transferring', detail: 'The transfer roller applies a strong positive charge to the back of the paper, pulling the negative toner from the drum onto the paper.' },
        { n: 6, name: 'Fusing', detail: 'The heat and pressure rollers melt the plastic toner particles permanently into the fibers of the paper (~350-400°F / 175-205°C).' },
        { n: 7, name: 'Cleaning', detail: 'A rubber cleaning blade or wire scrapes leftover toner off the drum into a waste toner reservoir.' }
      ];

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.65rem;">
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0 0 0.5rem 0;">Mnemonic: <strong>P</strong>lease <strong>C</strong>lean <strong>E</strong>very <strong>D</strong>ay <strong>T</strong>o <strong>F</strong>ix <strong>C</strong>logging</p>
          ${steps.map(s => `
            <div style="padding: 0.65rem 0.85rem; background: var(--surface-2); border-left: 3px solid var(--gold-primary); border-radius: 0 4px 4px 0;">
              <strong style="color: var(--gold-primary);">Step ${s.n}: ${escapeHTML(s.name)}</strong>
              <p style="font-size: 0.84rem; color: var(--text-primary); margin: 0.25rem 0 0 0; line-height: 1.45;">${escapeHTML(s.detail)}</p>
            </div>
          `).join('')}
        </div>
      `;
    },

    renderCliTab(container) {
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <h4 style="color: var(--gold-primary); margin: 0;">Essential Windows Diagnostic Commands (CMD / PowerShell)</h4>
          <div class="md-table-wrapper" style="margin: 0;">
            <table class="md-table">
              <thead>
                <tr>
                  <th>Command</th>
                  <th>Syntax / Flags</th>
                  <th>Function</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><code>ipconfig</code></td><td><code>/all</code>, <code>/release</code>, <code>/renew</code>, <code>/flushdns</code></td><td>Inspect IP, gateway, MAC, and refresh DHCP/DNS cache.</td></tr>
                <tr><td><code>ping</code></td><td><code>-t</code>, <code>-n &lt;count&gt;</code></td><td>Test ICMP connectivity to host or default gateway.</td></tr>
                <tr><td><code>tracert</code></td><td><code>tracert &lt;ip/host&gt;</code></td><td>Trace packet route through intermediate router hops.</td></tr>
                <tr><td><code>nslookup</code></td><td><code>nslookup &lt;domain&gt;</code></td><td>Query DNS server to verify hostname-to-IP resolution.</td></tr>
                <tr><td><code>netstat</code></td><td><code>-an</code>, <code>-b</code></td><td>Display active TCP/UDP connections, listening ports, and PIDs.</td></tr>
                <tr><td><code>sfc</code></td><td><code>/scannow</code></td><td>System File Checker: scan & repair corrupted Windows system files.</td></tr>
                <tr><td><code>dism</code></td><td><code>/online /cleanup-image /restorehealth</code></td><td>Restore Windows component store using Windows Update.</td></tr>
                <tr><td><code>chkdsk</code></td><td><code>/f /r</code></td><td>Scan filesystem for metadata errors (/f) and locate bad sectors (/r).</td></tr>
                <tr><td><code>gpupdate</code></td><td><code>/force</code></td><td>Forcefully apply updated local & Active Directory Group Policies.</td></tr>
                <tr><td><code>gpresult</code></td><td><code>/r</code></td><td>Display applied Computer and User Group Policy Objects (GPOs).</td></tr>
              </tbody>
            </table>
          </div>

          <h4 style="color: var(--gold-primary); margin: 0.5rem 0 0 0;">Essential Linux Terminal Commands</h4>
          <div class="md-table-wrapper" style="margin: 0;">
            <table class="md-table">
              <thead>
                <tr>
                  <th>Command</th>
                  <th>Example</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><code>chmod</code></td><td><code>chmod 755 script.sh</code></td><td>Change permissions (7=rwx owner, 5=r-x group, 5=r-x other).</td></tr>
                <tr><td><code>chown</code></td><td><code>chown user:group file</code></td><td>Change file user and group ownership.</td></tr>
                <tr><td><code>grep</code></td><td><code>grep "error" /var/log/syslog</code></td><td>Search for text patterns inside files.</td></tr>
                <tr><td><code>ps</code> / <code>top</code></td><td><code>ps aux</code> / <code>top</code></td><td>List active processes and interactive resource utilization.</td></tr>
                <tr><td><code>df</code></td><td><code>df -h</code></td><td>Display filesystem disk space usage in human-readable GB/MB.</td></tr>
                <tr><td><code>sudo</code></td><td><code>sudo apt update</code></td><td>Execute command with elevated superuser (root) privileges.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    },

    renderHardwareTab(container) {
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">

          <!-- SECTION 1: MOTHERBOARD FORM FACTORS -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
              <h4 style="color: var(--gold-primary); margin: 0; font-size: 1.05rem; display: flex; align-items: center; gap: 0.5rem;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="8" y="8" width="8" height="8"/><path d="M4 9h2M4 15h2M18 9h2M18 15h2M9 4v2M15 4v2M9 18v2M15 18v2"/></svg>
                1. Motherboard Form Factors & Layout Comparison
              </h4>
              <span style="font-size: 0.78rem; color: var(--text-secondary);">CompTIA Objective 3.4 (Motherboard form factors & expansion)</span>
            </div>

            <div class="card" style="padding: 1rem; background: var(--surface-2); margin-bottom: 0.85rem; border: 1px solid var(--border-color);">
              <div style="text-align: center; margin-bottom: 0.75rem;">
                <svg viewBox="0 0 600 240" style="width: 100%; max-width: 580px; height: auto; background: #0b0f19; border-radius: 6px; border: 1px solid #1e293b;">
                  <defs>
                    <pattern id="mbGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" stroke-width="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="600" height="240" fill="url(#mbGrid)"/>

                  <!-- ATX Board (12" x 9.6") -->
                  <rect x="25" y="20" width="160" height="200" rx="4" fill="#064e3b" stroke="#10b981" stroke-width="2" fill-opacity="0.25"/>
                  <text x="105" y="40" fill="#34d399" font-size="11" font-weight="700" text-anchor="middle">ATX (12" x 9.6")</text>
                  <rect x="70" y="55" width="40" height="40" rx="2" fill="#047857" stroke="#10b981" stroke-width="1"/>
                  <text x="90" y="79" fill="#fff" font-size="8" text-anchor="middle">LGA CPU</text>
                  <rect x="120" y="50" width="4" height="50" fill="#10b981"/>
                  <rect x="128" y="50" width="4" height="50" fill="#10b981"/>
                  <rect x="136" y="50" width="4" height="50" fill="#10b981"/>
                  <rect x="144" y="50" width="4" height="50" fill="#10b981"/>
                  <line x1="35" y1="120" x2="115" y2="120" stroke="#34d399" stroke-width="3"/>
                  <line x1="35" y1="135" x2="90" y2="135" stroke="#10b981" stroke-width="2"/>
                  <line x1="35" y1="150" x2="115" y2="150" stroke="#10b981" stroke-width="2"/>
                  <line x1="35" y1="165" x2="90" y2="165" stroke="#10b981" stroke-width="2"/>
                  <line x1="35" y1="180" x2="115" y2="180" stroke="#10b981" stroke-width="2"/>
                  <line x1="35" y1="195" x2="90" y2="195" stroke="#10b981" stroke-width="2"/>
                  <line x1="35" y1="210" x2="115" y2="210" stroke="#10b981" stroke-width="2"/>
                  <text x="105" y="215" fill="#a7f3d0" font-size="8" text-anchor="middle">Up to 7 PCIe Slots</text>

                  <!-- Micro-ATX (9.6" x 9.6") -->
                  <rect x="220" y="40" width="160" height="160" rx="4" fill="#1e3a8a" stroke="#3b82f6" stroke-width="2" fill-opacity="0.25"/>
                  <text x="300" y="60" fill="#60a5fa" font-size="11" font-weight="700" text-anchor="middle">Micro-ATX (9.6" x 9.6")</text>
                  <rect x="265" y="75" width="36" height="36" rx="2" fill="#1d4ed8" stroke="#3b82f6" stroke-width="1"/>
                  <text x="283" y="97" fill="#fff" font-size="8" text-anchor="middle">CPU</text>
                  <rect x="315" y="70" width="4" height="44" fill="#3b82f6"/>
                  <rect x="323" y="70" width="4" height="44" fill="#3b82f6"/>
                  <rect x="331" y="70" width="4" height="44" fill="#3b82f6"/>
                  <rect x="339" y="70" width="4" height="44" fill="#3b82f6"/>
                  <line x1="235" y1="135" x2="305" y2="135" stroke="#60a5fa" stroke-width="3"/>
                  <line x1="235" y1="150" x2="280" y2="150" stroke="#3b82f6" stroke-width="2"/>
                  <line x1="235" y1="165" x2="305" y2="165" stroke="#3b82f6" stroke-width="2"/>
                  <line x1="235" y1="180" x2="280" y2="180" stroke="#3b82f6" stroke-width="2"/>
                  <text x="300" y="195" fill="#bfdbfe" font-size="8" text-anchor="middle">Up to 4 PCIe Slots</text>

                  <!-- Mini-ITX (6.7" x 6.7") -->
                  <rect x="425" y="85" width="115" height="115" rx="4" fill="#78350f" stroke="#f59e0b" stroke-width="2" fill-opacity="0.25"/>
                  <text x="482" y="105" fill="#fbbf24" font-size="11" font-weight="700" text-anchor="middle">Mini-ITX (6.7" x 6.7")</text>
                  <rect x="445" y="118" width="30" height="30" rx="2" fill="#b45309" stroke="#f59e0b" stroke-width="1"/>
                  <text x="460" y="137" fill="#fff" font-size="7" text-anchor="middle">CPU</text>
                  <rect x="485" y="115" width="4" height="36" fill="#f59e0b"/>
                  <rect x="493" y="115" width="4" height="36" fill="#f59e0b"/>
                  <line x1="435" y1="182" x2="525" y2="182" stroke="#fbbf24" stroke-width="3"/>
                  <text x="482" y="194" fill="#fde68a" font-size="7.5" text-anchor="middle">1x PCIe x16 Slot Only</text>
                </svg>
              </div>

              <div class="md-table-wrapper" style="margin: 0;">
                <table class="md-table">
                  <thead>
                    <tr>
                      <th>Form Factor</th>
                      <th>Dimensions</th>
                      <th>Max PCIe Slots</th>
                      <th>RAM Slots</th>
                      <th>Standoff Compatibility</th>
                      <th>Typical Deployment</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style="font-weight: 700; color: #34d399;">Standard ATX</td>
                      <td>12" &times; 9.6" (305 &times; 244 mm)</td>
                      <td>Up to 7 slots</td>
                      <td>4 (sometimes 8)</td>
                      <td>Standard ATX 9/10 hole layout</td>
                      <td>Full/mid tower workstations, CAD, multi-GPU gaming</td>
                    </tr>
                    <tr>
                      <td style="font-weight: 700; color: #60a5fa;">Micro-ATX (mATX)</td>
                      <td>9.6" &times; 9.6" (244 &times; 244 mm)</td>
                      <td>Up to 4 slots</td>
                      <td>2 to 4</td>
                      <td>Shares top/left standoffs with ATX cases</td>
                      <td>Budget gaming, enterprise desktop towers, office PCs</td>
                    </tr>
                    <tr>
                      <td style="font-weight: 700; color: #fbbf24;">Mini-ITX (mITX)</td>
                      <td>6.7" &times; 6.7" (170 &times; 170 mm)</td>
                      <td>1 slot (PCIe x16)</td>
                      <td>2 slots max</td>
                      <td>Uses 4 standard ATX standoff positions</td>
                      <td>Small Form Factor (SFF), HTPC, kiosk, portable LAN rigs</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- SECTION 2: RAM FORM FACTORS & DDR4 VS DDR5 -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
              <h4 style="color: var(--gold-primary); margin: 0; font-size: 1.05rem; display: flex; align-items: center; gap: 0.5rem;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01M6 18v2M10 18v2M14 18v2M18 18v2M6 4v2M10 4v2M14 4v2M18 4v2"/></svg>
                2. RAM Form Factors & DDR4 vs. DDR5 Architecture
              </h4>
              <span style="font-size: 0.78rem; color: var(--text-secondary);">CompTIA Objective 3.2 (System memory types & characteristics)</span>
            </div>

            <div class="card" style="padding: 1rem; background: var(--surface-2); margin-bottom: 0.85rem; border: 1px solid var(--border-color);">
              <div style="text-align: center; margin-bottom: 0.75rem;">
                <svg viewBox="0 0 600 170" style="width: 100%; max-width: 580px; height: auto; background: #0b0f19; border-radius: 6px; border: 1px solid #1e293b;">
                  <!-- DDR4 Module -->
                  <g transform="translate(40, 20)">
                    <rect width="520" height="52" rx="3" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/>
                    <text x="15" y="24" fill="#94a3b8" font-size="10" font-weight="700">DDR4 DIMM (288 Pins | 1.2V | Motherboard VRM Power)</text>
                    <rect x="90" y="8" width="30" height="28" fill="#0f172a" stroke="#334155"/>
                    <rect x="130" y="8" width="30" height="28" fill="#0f172a" stroke="#334155"/>
                    <rect x="170" y="8" width="30" height="28" fill="#0f172a" stroke="#334155"/>
                    <rect x="310" y="8" width="30" height="28" fill="#0f172a" stroke="#334155"/>
                    <rect x="350" y="8" width="30" height="28" fill="#0f172a" stroke="#334155"/>
                    <rect x="390" y="8" width="30" height="28" fill="#0f172a" stroke="#334155"/>
                    <rect x="10" y="44" width="220" height="8" fill="#eab308"/>
                    <rect x="250" y="44" width="260" height="8" fill="#eab308"/>
                    <!-- DDR4 Key Notch -->
                    <path d="M 230 52 L 235 40 L 245 40 L 250 52 Z" fill="#0b0f19"/>
                    <line x1="240" y1="20" x2="240" y2="40" stroke="#f97316" stroke-width="1.5" stroke-dasharray="2,2"/>
                    <text x="240" y="16" fill="#f97316" font-size="8.5" text-anchor="middle">DDR4 Notch (5.5mm Edge Offset)</text>
                  </g>

                  <!-- DDR5 Module -->
                  <g transform="translate(40, 95)">
                    <rect width="520" height="52" rx="3" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
                    <text x="15" y="24" fill="#38bdf8" font-size="10" font-weight="700">DDR5 DIMM (288 Pins | 1.1V | On-DIMM PMIC + On-Die ECC)</text>
                    <rect x="245" y="6" width="30" height="20" rx="2" fill="#0284c7" stroke="#38bdf8" stroke-width="1"/>
                    <text x="260" y="19" fill="#fff" font-size="7.5" font-weight="700" text-anchor="middle">PMIC</text>
                    <rect x="90" y="8" width="30" height="28" fill="#0f172a" stroke="#334155"/>
                    <rect x="130" y="8" width="30" height="28" fill="#0f172a" stroke="#334155"/>
                    <rect x="170" y="8" width="30" height="28" fill="#0f172a" stroke="#334155"/>
                    <rect x="330" y="8" width="30" height="28" fill="#0f172a" stroke="#334155"/>
                    <rect x="370" y="8" width="30" height="28" fill="#0f172a" stroke="#334155"/>
                    <rect x="410" y="8" width="30" height="28" fill="#0f172a" stroke="#334155"/>
                    <rect x="10" y="44" width="245" height="8" fill="#eab308"/>
                    <rect x="270" y="44" width="240" height="8" fill="#eab308"/>
                    <!-- DDR5 Key Notch -->
                    <path d="M 255 52 L 260 40 L 268 40 L 273 52 Z" fill="#0b0f19"/>
                    <line x1="264" y1="28" x2="264" y2="40" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="2,2"/>
                    <text x="315" y="36" fill="#38bdf8" font-size="8.5">DDR5 Notch (Near Center: 1.35mm)</text>
                  </g>
                </svg>
              </div>

              <div class="md-table-wrapper" style="margin: 0;">
                <table class="md-table">
                  <thead>
                    <tr>
                      <th>Specification</th>
                      <th>DDR4 SDRAM</th>
                      <th>DDR5 SDRAM</th>
                      <th>CompTIA Exam High-Yield Fact</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style="font-weight: 700;">Pin Count (Desktop DIMM)</td>
                      <td><strong>288 pins</strong></td>
                      <td><strong>288 pins</strong></td>
                      <td style="color: var(--accent-amber);">Pin counts are identical, but notches differ! They are physically and electrically incompatible.</td>
                    </tr>
                    <tr>
                      <td style="font-weight: 700;">Key Notch Location</td>
                      <td>5.5 mm offset towards edge</td>
                      <td>1.35 mm near center</td>
                      <td>Prevents accidental insertion into incompatible motherboard slots.</td>
                    </tr>
                    <tr>
                      <td style="font-weight: 700;">Operating Voltage</td>
                      <td><strong>1.2 V</strong> standard</td>
                      <td><strong>1.1 V</strong> standard</td>
                      <td>DDR5 reduces operating voltage by ~8%, lowering heat and power consumption.</td>
                    </tr>
                    <tr>
                      <td style="font-weight: 700;">Power Management (PMIC)</td>
                      <td>Motherboard VRM regulates power</td>
                      <td><strong>On-DIMM PMIC</strong> chip</td>
                      <td>DDR5 moves voltage regulation directly onto the memory stick for cleaner signals.</td>
                    </tr>
                    <tr>
                      <td style="font-weight: 700;">Channel Architecture</td>
                      <td>1x 64-bit channel per DIMM</td>
                      <td><strong>2x 32-bit channels</strong> per DIMM</td>
                      <td>A single DDR5 module operates in dual-channel mode internally.</td>
                    </tr>
                    <tr>
                      <td style="font-weight: 700;">Error Correction (ECC)</td>
                      <td>Server ECC modules only (extra chips)</td>
                      <td><strong>On-Die ECC</strong> standard on all modules</td>
                      <td>DDR5 performs internal bit-flip correction directly inside each DRAM chip.</td>
                    </tr>
                    <tr>
                      <td style="font-weight: 700;">Laptop SO-DIMM Pins</td>
                      <td><strong>260 pins</strong></td>
                      <td><strong>262 pins</strong></td>
                      <td>Laptop memory also features distinct pin counts and keying.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- SECTION 3: CONNECTOR & PORT GUIDE -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
              <h4 style="color: var(--gold-primary); margin: 0; font-size: 1.05rem; display: flex; align-items: center; gap: 0.5rem;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                3. Physical Port & Connector Identification Guide
              </h4>
              <span style="font-size: 0.78rem; color: var(--text-secondary);">CompTIA Objective 3.1 (Cable types & physical connectors)</span>
            </div>

            <div class="card" style="padding: 1rem; background: var(--surface-2); margin-bottom: 0.85rem; border: 1px solid var(--border-color);">
              <div class="md-table-wrapper" style="margin: 0;">
                <table class="md-table">
                  <thead>
                    <tr>
                      <th style="width: 140px;">Connector</th>
                      <th>Physical Profile / Shape</th>
                      <th>Speed / Bandwidth</th>
                      <th>Max Distance / Power</th>
                      <th>CompTIA Exam Context & Use Cases</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style="font-weight: 700; color: #38bdf8;">USB-C (Type-C)</td>
                      <td>24-pin oblong, symmetrical reversible connector</td>
                      <td>Up to 40 Gbps (USB4 / Thunderbolt 4)</td>
                      <td>Up to 240W USB-PD (Extended Power Range)</td>
                      <td>Transmits data, power, and DisplayPort/HDMI video (Alt Mode). Universal modern standard.</td>
                    </tr>
                    <tr>
                      <td style="font-weight: 700; color: #818cf8;">DisplayPort (DP)</td>
                      <td>20-pin rectangular with one beveled corner & latch</td>
                      <td>Up to 80 Gbps (DP 2.1)</td>
                      <td>Up to 3m passive (full rate), 15m @ 1080p</td>
                      <td>Packet-based digital audio/video. Supports <strong>Multi-Stream Transport (MST)</strong> daisy chaining.</td>
                    </tr>
                    <tr>
                      <td style="font-weight: 700; color: #f43f5e;">HDMI (Type A)</td>
                      <td>19-pin symmetrical trapezoid (wider top, tapered base)</td>
                      <td>Up to 48 Gbps (HDMI 2.1)</td>
                      <td>Typically 5–10 meters without active repeater</td>
                      <td>Consumer display standard for TVs and PCs. Supports Audio Return Channel (ARC / eARC).</td>
                    </tr>
                    <tr>
                      <td style="font-weight: 700; color: #4ade80;">RJ-45 (8P8C)</td>
                      <td>8-position 8-contact modular clip with retention tab</td>
                      <td>10 Mbps to 10 Gbps (Cat5e–Cat6a)</td>
                      <td><strong>100 meters</strong> (328 feet) standard</td>
                      <td>Standard copper Ethernet networking. Terminates UTP/STP cables (T568A / T568B).</td>
                    </tr>
                    <tr>
                      <td style="font-weight: 700; color: #fbbf24;">RJ-11 (6P2C/6P4C)</td>
                      <td>4 to 6-position compact modular phone jack</td>
                      <td>Up to 24–100 Mbps (DSL)</td>
                      <td>Several kilometers (PSTN loop)</td>
                      <td>Legacy dial-up modems, landline telephones, and DSL broadband Internet uplinks.</td>
                    </tr>
                    <tr>
                      <td style="font-weight: 700; color: #e879f9;">F-Type Coaxial</td>
                      <td>Threaded screw-on cylinder with solid center copper wire</td>
                      <td>Gigabit+ (DOCSIS 3.1/4.0)</td>
                      <td>Hundreds of meters (RG-6 / RG-59)</td>
                      <td>Cable broadband modems, CATV set-top boxes, and satellite dish LNB drops.</td>
                    </tr>
                    <tr>
                      <td style="font-weight: 700; color: #94a3b8;">BNC (Bayonet)</td>
                      <td>Quarter-turn twist-and-lock cylindrical collar</td>
                      <td>Analog / up to 12 Gbps (12G-SDI)</td>
                      <td>Up to 100–300m depending on cable grade</td>
                      <td>Analog/HD-SDI CCTV video surveillance, commercial video, legacy 10BASE2 Thinnet networks.</td>
                    </tr>
                    <tr>
                      <td style="font-weight: 700; color: #fb923c;">DB-9 (DE-9) Serial</td>
                      <td>9-pin D-subminiature trapezoidal male/female hood</td>
                      <td>115.2 Kbps (RS-232)</td>
                      <td>15 meters (50 feet) RS-232 standard</td>
                      <td>Out-of-band console management for switches, routers, and legacy industrial hardware.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- SECTION 4: 42U DATACENTER RACK ELEVATION DIAGRAM -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
              <h4 style="color: var(--gold-primary); margin: 0; font-size: 1.05rem; display: flex; align-items: center; gap: 0.5rem;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="16" y2="18"/></svg>
                4. 42U Datacenter Server Rack Elevation & Thermal Layout
              </h4>
              <span style="font-size: 0.78rem; color: var(--text-secondary);">CompTIA Objective 3.3 (Cabling, cooling & datacenter safety)</span>
            </div>

            <div class="card" style="padding: 1rem; background: var(--surface-2); margin-bottom: 0.85rem; border: 1px solid var(--border-color);">
              <div style="display: grid; grid-template-columns: 280px 1fr; gap: 1.25rem; align-items: start;">
                <!-- Rack SVG Drawing -->
                <div style="text-align: center;">
                  <svg viewBox="0 0 260 480" style="width: 100%; height: auto; background: #080c14; border-radius: 6px; border: 1px solid #1e293b;">
                    <rect x="25" y="15" width="210" height="450" rx="4" fill="#0f172a" stroke="#334155" stroke-width="2"/>
                    <path d="M 10 240 L 22 240" stroke="#38bdf8" stroke-width="2"/>
                    <text x="12" y="232" fill="#38bdf8" font-size="8" font-weight="700">COLD</text>
                    <text x="12" y="252" fill="#38bdf8" font-size="7">Intake</text>

                    <path d="M 238 240 L 252 240" stroke="#ef4444" stroke-width="2"/>
                    <text x="238" y="232" fill="#ef4444" font-size="8" font-weight="700">HOT</text>
                    <text x="238" y="252" fill="#ef4444" font-size="7">Exhaust</text>

                    <rect x="35" y="25" width="190" height="430" fill="#020617" stroke="#1e293b" stroke-width="1"/>
                    
                    <!-- U41-U42: Top-of-Rack Switch -->
                    <g transform="translate(40, 32)">
                      <rect width="180" height="24" rx="2" fill="#0369a1" stroke="#38bdf8" stroke-width="1"/>
                      <text x="8" y="16" fill="#fff" font-size="9" font-weight="700">U41-U42: 10GbE ToR Switch</text>
                      <circle cx="165" cy="12" r="3" fill="#4ade80"/>
                    </g>
                    
                    <!-- U39-U40: Patch Panel -->
                    <g transform="translate(40, 60)">
                      <rect width="180" height="20" rx="2" fill="#334155" stroke="#64748b" stroke-width="1"/>
                      <text x="8" y="14" fill="#e2e8f0" font-size="8.5" font-weight="700">U39-U40: Cat6A Patch Panel</text>
                      <circle cx="145" cy="10" r="1.5" fill="#38bdf8"/>
                      <circle cx="152" cy="10" r="1.5" fill="#38bdf8"/>
                      <circle cx="159" cy="10" r="1.5" fill="#38bdf8"/>
                      <circle cx="166" cy="10" r="1.5" fill="#38bdf8"/>
                    </g>

                    <!-- U38: Blanking Panel -->
                    <g transform="translate(40, 84)">
                      <rect width="180" height="12" fill="#1e293b" stroke="#0f172a" stroke-width="0.5"/>
                      <text x="90" y="9" fill="#64748b" font-size="7" text-anchor="middle">1U Blanking Panel (Thermal Barrier)</text>
                    </g>

                    <!-- U28-U32: Mid-Rack Servers -->
                    <g transform="translate(40, 102)">
                      <rect width="180" height="38" rx="2" fill="#1e1b4b" stroke="#818cf8" stroke-width="1"/>
                      <text x="8" y="16" fill="#c7d2fe" font-size="8.5" font-weight="700">U30-U32: App Server 01 (2U)</text>
                      <text x="8" y="30" fill="#94a3b8" font-size="7.5">Dual Redundant PSUs | SAS Drives</text>
                    </g>

                    <!-- U24-U27: Compute Node -->
                    <g transform="translate(40, 144)">
                      <rect width="180" height="38" rx="2" fill="#1e1b4b" stroke="#818cf8" stroke-width="1"/>
                      <text x="8" y="16" fill="#c7d2fe" font-size="8.5" font-weight="700">U26-U28: App Server 02 (2U)</text>
                      <text x="8" y="30" fill="#94a3b8" font-size="7.5">Dual Redundant PSUs | SAS Drives</text>
                    </g>

                    <!-- U16-U23: Blanking Panels -->
                    <g transform="translate(40, 186)">
                      <rect width="180" height="70" fill="#0f172a" stroke="#1e293b" stroke-dasharray="3,3"/>
                      <text x="90" y="38" fill="#475569" font-size="8" text-anchor="middle">Blanking Panels (U16-U25)</text>
                      <text x="90" y="50" fill="#475569" font-size="7" text-anchor="middle">Prevents Hot Air Recirculation</text>
                    </g>

                    <!-- U9-U14: SAN Storage -->
                    <g transform="translate(40, 260)">
                      <rect width="180" height="58" rx="2" fill="#451a03" stroke="#f59e0b" stroke-width="1"/>
                      <text x="8" y="18" fill="#fde68a" font-size="9" font-weight="700">U9-U14: 4U SAN Storage Array</text>
                      <text x="8" y="32" fill="#fcd34d" font-size="7.5">24x Hot-Swap Enterprise SSD/HDDs</text>
                      <text x="8" y="46" fill="#f59e0b" font-size="7">Heavy Weight (~45 kg) | Mid-Low Rack</text>
                    </g>

                    <!-- U5-U8: Secondary Storage -->
                    <g transform="translate(40, 322)">
                      <rect width="180" height="40" rx="2" fill="#451a03" stroke="#f59e0b" stroke-width="1"/>
                      <text x="8" y="18" fill="#fde68a" font-size="8.5" font-weight="700">U5-U8: Disk Expansion Tier</text>
                      <text x="8" y="32" fill="#fcd34d" font-size="7">Direct-Attached Storage Enclosure</text>
                    </g>

                    <!-- U1-U4: Heavy UPS Base -->
                    <g transform="translate(40, 366)">
                      <rect width="180" height="80" rx="2" fill="#14532d" stroke="#22c55e" stroke-width="2"/>
                      <text x="8" y="20" fill="#86efac" font-size="9.5" font-weight="800">U1-U4: 4U Enterprise UPS & Battery</text>
                      <text x="8" y="36" fill="#bbf7d0" font-size="8">Lead-Acid / Li-ion Battery Packs (~80 kg)</text>
                      <rect x="8" y="48" width="164" height="24" rx="2" fill="#052e16" stroke="#16a34a"/>
                      <text x="90" y="64" fill="#4ade80" font-size="8" font-weight="700" text-anchor="middle">BASE MOUNT: ANTI-TIPPING SAFETY</text>
                    </g>
                  </svg>
                </div>

                <!-- Datacenter Engineering Best Practices -->
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                  <div class="md-alert md-alert-important" style="margin: 0;">
                    <div class="md-alert-title">SAFETY RULE: CENTER OF GRAVITY & ANTI-TIPPING</div>
                    <div class="md-alert-body" style="font-size: 0.84rem; line-height: 1.45;">
                      <strong>Uninterruptible Power Supplies (UPS) and battery enclosures must always be installed in the lowest possible rack units (U1–U4).</strong>
                      Mounting heavy batteries high in a 42U rack raises the center of gravity, creating a catastrophic tipping hazard during seismic activity or when servers are pulled forward on slide rails for servicing.
                    </div>
                  </div>

                  <div style="background: var(--surface-1); padding: 0.85rem; border-radius: 6px; border-left: 4px solid #38bdf8;">
                    <div style="font-weight: 700; color: #38bdf8; font-size: 0.88rem; margin-bottom: 0.25rem;">Hot Aisle / Cold Aisle Containment</div>
                    <p style="font-size: 0.82rem; color: var(--text-primary); margin: 0; line-height: 1.45;">
                      Racks are oriented in alternating rows so cold air intake fronts face each other (<strong>Cold Aisle</strong>: 68°F–72°F / 20°C–22°C, fed via perforated raised floor tiles) and hot air exhaust backs face each other (<strong>Hot Aisle</strong>, returned to CRAC/CRAH chilling units).
                    </p>
                  </div>

                  <div style="background: var(--surface-1); padding: 0.85rem; border-radius: 6px; border-left: 4px solid var(--gold-primary);">
                    <div style="font-weight: 700; color: var(--gold-primary); font-size: 0.88rem; margin-bottom: 0.25rem;">Airflow Blanking Panels</div>
                    <p style="font-size: 0.82rem; color: var(--text-primary); margin: 0; line-height: 1.45;">
                      Any unused vertical rack space (empty U slots) must be sealed with <strong>blanking panels</strong>. Without blanking panels, hot exhaust air loops back through the empty U openings into cold equipment intakes, causing thermal throttling and premature component failure.
                    </p>
                  </div>

                  <div style="background: var(--surface-1); padding: 0.85rem; border-radius: 6px; border-left: 4px solid #818cf8;">
                    <div style="font-weight: 700; color: #818cf8; font-size: 0.88rem; margin-bottom: 0.25rem;">Top-of-Rack (ToR) Switching</div>
                    <p style="font-size: 0.82rem; color: var(--text-primary); margin: 0; line-height: 1.45;">
                      Placing network switches and patch panels at U40–U42 minimizes patch cable run lengths to servers within the same rack, reduces vertical cable bulk in side managers, and connects cleanly to overhead basket trays.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      `;
    },

    /* -------------------------------------------------------------
       Quick Practice Drill Launcher for Questions with Notes or Flags
       ------------------------------------------------------------- */
    startNotesAndFlagsDrill() {
      if (!window.COMPTIA_EXAM_DATA) {
        alert('Question bank not loaded.');
        return;
      }

      const allNotes = APlus.notes.getAllNotes();
      const noteQIds = new Set(Object.keys(allNotes));

      const bank = (window.COMPTIA_EXAM_DATA.questions || []).concat(
        (window.COMPTIA_EXAM_DATA.core1 || []),
        (window.COMPTIA_EXAM_DATA.core2 || [])
      );

      // Unique questions by id
      const uniqueMap = new Map();
      bank.forEach(q => {
        if (q && q.id && !uniqueMap.has(q.id)) {
          uniqueMap.set(q.id, q);
        }
      });

      // Filter for questions with notes
      const matched = [];
      uniqueMap.forEach((q, id) => {
        if (noteQIds.has(id)) {
          matched.push(q);
        }
      });

      if (!matched.length) {
        alert('You have not added any personal notes yet. Add notes to questions during practice or review, then run this drill to reinforce them!');
        return;
      }

      this.closeModal();

      if (APlus.engine && typeof APlus.engine.start === 'function') {
        APlus.engine.start({
          type: 'notes',
          customPool: matched,
          questionCount: matched.length,
          timeMinutes: Math.max(15, Math.ceil((matched.length * 75) / 60))
        });
      } else if (typeof window.startCustomPractice === 'function') {
        window.startCustomPractice(matched);
      } else {
        alert(`Found ${matched.length} questions with notes!`);
      }
    },

    injectModal() {
      if (document.getElementById('cramSheetModal')) return;

      const modal = document.createElement('div');
      modal.id = 'cramSheetModal';
      modal.className = 'modal-overlay';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'cramSheetTitle');

      modal.innerHTML = `
        <div class="modal-card" style="max-width: 960px; width: 95%; max-height: 90vh; display: flex; flex-direction: column;">
          <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--card-border); padding-bottom: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold-primary)" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>
              <h3 id="cramSheetTitle" style="margin: 0; font-size: 1.2rem; font-weight: 700; color: var(--text-primary);">
                High-Yield CompTIA A+ Quick Cram Sheet
              </h3>
            </div>
            <button type="button" class="btn btn-secondary btn-icon" onclick="APlus.cramSheet.closeModal()">X</button>
          </div>

          <!-- Navigation Tabs -->
          <div style="display: flex; gap: 0.4rem; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color); overflow-x: auto; white-space: nowrap;">
            <button type="button" class="btn cram-tab-btn active btn-primary" data-tab="ports" onclick="APlus.cramSheet.switchTab('ports')" style="font-size: 0.78rem; padding: 0.3rem 0.65rem;">Ports & Protocols</button>
            <button type="button" class="btn cram-tab-btn btn-secondary" data-tab="troubleshooting" onclick="APlus.cramSheet.switchTab('troubleshooting')" style="font-size: 0.78rem; padding: 0.3rem 0.65rem;">6-Step Method</button>
            <button type="button" class="btn cram-tab-btn btn-secondary" data-tab="cabling" onclick="APlus.cramSheet.switchTab('cabling')" style="font-size: 0.78rem; padding: 0.3rem 0.65rem;">Cabling & Pinouts</button>
            <button type="button" class="btn cram-tab-btn btn-secondary" data-tab="wifi" onclick="APlus.cramSheet.switchTab('wifi')" style="font-size: 0.78rem; padding: 0.3rem 0.65rem;">Wi-Fi Standards</button>
            <button type="button" class="btn cram-tab-btn btn-secondary" data-tab="raid" onclick="APlus.cramSheet.switchTab('raid')" style="font-size: 0.78rem; padding: 0.3rem 0.65rem;">RAID Matrix</button>
            <button type="button" class="btn cram-tab-btn btn-secondary" data-tab="laser" onclick="APlus.cramSheet.switchTab('laser')" style="font-size: 0.78rem; padding: 0.3rem 0.65rem;">Laser Cycle</button>
            <button type="button" class="btn cram-tab-btn btn-secondary" data-tab="cli" onclick="APlus.cramSheet.switchTab('cli')" style="font-size: 0.78rem; padding: 0.3rem 0.65rem;">CLI Commands</button>
            <button type="button" class="btn btn-secondary cram-tab-btn" data-tab="hardware" onclick="window.APlus.cramSheet.switchTab('hardware')" style="font-size: 0.78rem; padding: 0.3rem 0.65rem;">Hardware & Motherboard</button>
          </div>

          <!-- Tab Content Mount -->
          <div id="cramSheetContent" style="flex: 1; overflow-y: auto; padding: 1rem 0;">
            <!-- Rendered by JS -->
          </div>

          <div style="padding-top: 0.75rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <button type="button" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.3rem 0.65rem; color: var(--gold-primary);" onclick="APlus.cramSheet.startNotesAndFlagsDrill()">Practice My Notes Questions</button>
            <div style="display: flex; gap: 0.4rem;">
              <button type="button" class="btn btn-secondary" onclick="APlus.cramSheet.printAll()" style="font-size: 0.82rem; padding: 0.35rem 0.85rem;">Print full sheet</button>
              <button type="button" class="btn btn-primary" onclick="APlus.cramSheet.closeModal()" style="font-size: 0.82rem; padding: 0.35rem 0.85rem;">Done</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
    }
  };

  APlus.cramSheet = CramSheet;

  window.openCramSheetModal = (tab) => CramSheet.openModal(tab);
  window.closeCramSheetModal = () => CramSheet.closeModal();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CramSheet.init());
  } else {
    CramSheet.init();
  }

})(typeof window !== 'undefined' ? window : this);
