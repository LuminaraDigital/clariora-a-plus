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
        ['CLI Commands', 'renderCliTab']
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
