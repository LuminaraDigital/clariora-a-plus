/**
 * Clariora Exam Simulator
 * pbq-engine.js - Performance-Based Question (PBQ) Simulation Engine
 * File: js/pbq-engine.js
 *
 * Provides interactive, real-world simulations for:
 * 1. SOHO Wireless Router Configuration (SSID, WPA3, 80MHz, DHCP, Port Forwarding)
 * 2. Motherboard & Hardware Component Assembly (LGA Socket, DDR5, PCIe x16, M.2 NVMe, ATX Power)
 * 3. Windows System & Storage Console (Disk Management initialization, partition, format)
 * 4. Network Cable Crimping & Pinout (T568A vs T568B RJ45 color coding)
 * 5. Port Matching ACLs (Switch port security & protocol assignment)
 * 6. Laser Print Cycle Sequencing (7-stage electrophotographic process)
 * 7. System Recovery & Diagnostics CLI (sfc, dism, chkdsk, bootrec, gpresult)
 */

(function(window) {
  'use strict';

  window.APlus = window.APlus || {};
  const APlus = window.APlus;

  const escapeHTML = (window.APlus.utils && window.APlus.utils.escapeHTML) || ((s) => String(s || ''));

  // Wire Color Definitions for T568A / T568B
  const WIRE_COLORS = {
    'WO': { name: 'White / Orange', bg: 'linear-gradient(135deg, #fff 50%, #f97316 50%)', stripeBg: 'repeating-linear-gradient(45deg, #ffffff 0px, #ffffff 5px, #f97316 5px, #f97316 10px)', border: '#ea580c' },
    'O':  { name: 'Solid Orange',   bg: '#ea580c', stripeBg: '#ea580c', border: '#c2410c' },
    'WG': { name: 'White / Green',  bg: 'linear-gradient(135deg, #fff 50%, #22c55e 50%)', stripeBg: 'repeating-linear-gradient(45deg, #ffffff 0px, #ffffff 5px, #16a34a 5px, #16a34a 10px)', border: '#16a34a' },
    'BL': { name: 'Solid Blue',     bg: '#2563eb', stripeBg: '#2563eb', border: '#1d4ed8' },
    'WBL':{ name: 'White / Blue',   bg: 'linear-gradient(135deg, #fff 50%, #3b82f6 50%)', stripeBg: 'repeating-linear-gradient(45deg, #ffffff 0px, #ffffff 5px, #2563eb 5px, #2563eb 10px)', border: '#2563eb' },
    'G':  { name: 'Solid Green',    bg: '#16a34a', stripeBg: '#16a34a', border: '#15803d' },
    'WBR':{ name: 'White / Brown',  bg: 'linear-gradient(135deg, #fff 50%, #854d0e 50%)', stripeBg: 'repeating-linear-gradient(45deg, #ffffff 0px, #ffffff 5px, #78350f 5px, #78350f 10px)', border: '#713f12' },
    'BR': { name: 'Solid Brown',    bg: '#78350f', stripeBg: '#78350f', border: '#451a03' }
  };

  const T568B_SEQUENCE = ['WO', 'O', 'WG', 'BL', 'WBL', 'G', 'WBR', 'BR'];
  const T568A_SEQUENCE = ['WG', 'G', 'WO', 'BL', 'WBL', 'O', 'WBR', 'BR'];

  const PBQ_CATALOG = {
    // 1. SOHO Wireless Router Lab
    sohoRouter: {
      id: 'pbq-soho-router',
      title: 'Ticket DC-5102: Branch Office SOHO Gateway & Wi-Fi Hardening',
      domain: '2.0 Networking',
      objective: '2.3',
      defaultState: {
        activeTab: 'wireless',
        ssid: '',
        securityMode: 'WPA2-PSK',
        encryption: 'TKIP',
        channelWidth: '20 MHz',
        broadcastSSID: true,
        dhcpEnabled: true,
        startingIp: '192.168.1.2',
        endingIp: '192.168.1.254',
        forwardService: 'HTTPS',
        forwardPort: '443',
        forwardIp: '',
        forwardProtocol: 'TCP',
        forwardEnabled: false
      },
      solution: {
        ssid: 'Corp-Secure',
        securityMode: 'WPA3-Personal',
        encryption: 'AES',
        channelWidth: '80 MHz',
        startingIp: '192.168.1.100',
        forwardPort: '443',
        forwardIp: '192.168.1.50',
        forwardProtocol: 'TCP',
        forwardEnabled: true
      },
      brief: {
        ticket: 'Ticket DC-5102',
        where: 'SOHO Gateway 192.168.1.1',
        report: 'A branch office requires immediate network hardening. Audit and reconfigure the SOHO gateway to comply with modern enterprise security standards.',
        task: '1. Set Wireless SSID to Corp-Secure with WPA3-Personal (AES) and 80 MHz channel width.\n2. Configure DHCP starting address to 192.168.1.100 to reserve lower pool for servers.\n3. Forward HTTPS (TCP port 443) to internal server 192.168.1.50.'
      }
    },

    // 2. Motherboard Component Assembly Lab
    motherboardAssembly: {
      id: 'pbq-motherboard-assembly',
      title: 'Ticket DC-5109: Engineering Workstation Hardware Upgrade',
      domain: '3.0 Hardware',
      objective: '3.4',
      defaultState: {
        slots: {
          'socket_cpu': null,
          'slot_ram1': null,
          'slot_pcie_top': null,
          'slot_m2_nvme': null,
          'conn_atx_power': null
        }
      },
      solution: {
        'socket_cpu': 'comp_cpu',
        'slot_ram1': 'comp_ram',
        'slot_pcie_top': 'comp_gpu',
        'slot_m2_nvme': 'comp_nvme',
        'conn_atx_power': 'comp_atx'
      },
      components: [
        { id: 'comp_cpu', name: 'Intel Core i7 LGA 1700 CPU', type: 'CPU' },
        { id: 'comp_ram', name: 'DDR5 32GB 6000MHz DIMM', type: 'RAM' },
        { id: 'comp_gpu', name: 'PCIe 4.0 x16 Discrete GPU', type: 'Expansion' },
        { id: 'comp_nvme', name: 'M.2 2280 NVMe SSD (PCIe x4)', type: 'Storage' },
        { id: 'comp_atx', name: '24-Pin ATX Main Power Cable', type: 'Power' },
        { id: 'comp_sata_hdd', name: '3.5-inch 7200RPM SATA HDD', type: 'Storage' },
        { id: 'comp_pcie_x1', name: 'PCIe x1 Sound Card', type: 'Expansion' }
      ],
      brief: {
        ticket: 'Ticket DC-5109',
        where: 'Hardware Workbench Bay 3',
        report: 'A custom CAD workstation requires core component installation on an ATX motherboard prior to chassis installation.',
        task: 'Select and place the 5 correct primary components into their designated sockets, slots, and power headers on the motherboard diagram.'
      }
    },

    // 3. Windows Disk Management Console Lab
    windowsConsole: {
      id: 'pbq-windows-storage',
      title: 'Ticket DC-5114: Secondary NVMe Storage Initialization & Volume Setup',
      domain: '1.0 Operating Systems',
      objective: '1.4',
      defaultState: {
        diskInitialized: false,
        partitionStyle: null,      // 'MBR' or 'GPT'
        volumeCreated: false,
        driveLetter: null,         // 'D:'
        fileSystem: null,          // 'NTFS' or 'FAT32' or 'exFAT'
        volumeLabel: ''
      },
      solution: {
        diskInitialized: true,
        partitionStyle: 'GPT',
        volumeCreated: true,
        driveLetter: 'D:',
        fileSystem: 'NTFS',
        volumeLabel: 'DATA_STORE'
      },
      brief: {
        ticket: 'Ticket DC-5114',
        where: 'Host WORKSTATION-08',
        report: 'A new 2TB NVMe SSD has been installed as Disk 1. The user requires it prepared for large video production files.',
        task: '1. Initialize Disk 1 using GPT partition style (supporting volumes > 2TB).\n2. Create a New Simple Volume spanning the full disk.\n3. Assign Drive Letter D:, format as NTFS, and name the volume DATA_STORE.'
      }
    },

    // 4. Network Cable Crimping & Pinout Lab
    cablePinout: {
      id: 'pbq-cable-pinout',
      title: 'Ticket DC-5120: T568B Patch Cable Termination',
      domain: '2.0 Networking',
      objective: '2.1',
      defaultState: {
        sequence: [null, null, null, null, null, null, null, null]
      },
      solution: {
        sequence: T568B_SEQUENCE
      },
      brief: {
        ticket: 'Ticket DC-5120',
        where: 'Server Room Patch Panel',
        report: 'A replacement Category 6 UTP patch cord is being terminated with an RJ-45 modular plug according to company T568B cabling standard.',
        task: 'Arrange the 8 colored wire conductors from left to right (Pin 1 to Pin 8) to match the T568B standard sequence.'
      }
    },

    // 5. Port Matcher (unified)
    portMatcher: {
      id: 'pbq-port-matcher',
      title: 'Ticket DC-4471: Rack Switch Port Assignments',
      domain: '2.0 Networking',
      objective: '2.1',
      pairs: [
        { name: 'SSH (Secure Shell)', port: '22' },
        { name: 'DNS (Domain Name System)', port: '53' },
        { name: 'DHCP Server', port: '67' },
        { name: 'HTTPS (Secure Web)', port: '443' },
        { name: 'RDP (Remote Desktop)', port: '3389' },
        { name: 'SNMP (Simple Network Mgmt)', port: '161' },
        { name: 'LDAP (Directory Services)', port: '389' },
        { name: 'SMB (Server Message Block)', port: '445' }
      ],
      brief: {
        ticket: 'Ticket DC-4471',
        where: 'Rack A14, top-of-rack switch',
        report: 'Network lead needs the inbound ACL for the new switch before the change window closes.',
        task: 'Match each service to the default TCP or UDP port it listens on.'
      }
    },

    // 6. Laser Printer Cycle Order
    printerOrder: {
      id: 'pbq-laser-printer',
      title: 'Ticket DC-4488: Laser Printer Diagnostics',
      domain: '3.0 Hardware',
      objective: '3.7',
      steps: [
        '1. Processing / Raster Image Generation',
        '2. Charging (-600V Primary Corona / Conditioning Roller)',
        '3. Exposing (Laser Discharging Latent Electrostatic Image)',
        '4. Developing (Toner Powder Attraction to Discharged Areas)',
        '5. Transferring (+600V Transfer Corona Attracting Toner to Paper)',
        '6. Fusing (Heat and Pressure Rollers Melting Toner into Fibers)',
        '7. Cleaning (Physical Scraper Blade and Discharge Lamp Reset)'
      ],
      brief: {
        ticket: 'Ticket DC-4488',
        where: 'Building B print room',
        report: 'A user reports faint, smudging output from the shared laser printer.',
        task: 'Put the seven stages of the laser print cycle in the order they run, then check the order.'
      }
    },

    // 7. CLI Diagnostic Terminal
    cliTerminal: {
      id: 'pbq-cli-terminal',
      title: 'Ticket DC-4502: Console Session on DC-NODE-01',
      domain: '3.0 Software Troubleshooting',
      objective: '3.1',
      commands: {
        'sfc /scannow': 'Beginning system scan. This process will take some time.\nVerification 100% complete.\nWindows Resource Protection found corrupt files and successfully repaired them.',
        'dism /online /cleanup-image /restorehealth': 'Deployment Image Servicing and Management tool\n[==========================100.0%==========================]\nThe restore operation completed successfully. The component store corruption was repaired.',
        'ipconfig /all': 'Windows IP Configuration\n   Host Name . . . . . . . . . . . . : DC-NODE-01\n   Primary Dns Suffix  . . . . . . . : corp.datacenter.local\n\nEthernet adapter Ethernet 1:\n   IPv4 Address. . . . . . . . . . . : 192.168.10.45(Preferred)\n   Subnet Mask . . . . . . . . . . . : 255.255.255.0\n   Default Gateway . . . . . . . . . : 192.168.10.1\n   DHCP Server . . . . . . . . . . . : 192.168.10.2\n   DNS Servers . . . . . . . . . . . : 192.168.10.2, 1.1.1.1',
        'bootrec /rebuildbcd': 'Scanning all disks for Windows installations...\nTotal identified Windows installations: 1\n[1] C:\\Windows\nAdd installation to boot list? Yes(Y)/No(N)/All(A): Y\nThe operation completed successfully. BCD store rebuilt.',
        'chkdsk /f /r': 'The type of the file system is NTFS.\nVolume label is SYSTEM_OS.\nStage 1: Examining basic file system structure...\nStage 2: Examining file name linkage...\nStage 3: Examining security descriptors...\nStage 4: Looking for bad clusters in user file data...\nWindows has scanned the file system and found no problems.',
        'gpresult /r': 'Microsoft (R) Windows (R) Operating System Group Policy Result tool v2.0\nUSER SETTINGS\n------------------\nApplied Group Policy Objects:\n   Default Domain Policy\n   Workstation Baseline Security GPO\n   Firewall Baseline Configuration'
      },
      brief: {
        ticket: 'Ticket DC-4502',
        where: 'Rack A14, host DC-NODE-01',
        report: 'Overnight patching left the host booting slowly with intermittent errors.',
        task: 'Run diagnostic and repair commands (sfc, dism, chkdsk, bootrec, gpresult, ipconfig) from the console.'
      }
    },

    // 8. 42U Datacenter Server Rack Infrastructure & Density Deployment
    datacenterRack: {
      id: 'pbq-datacenter-rack',
      title: '42U Datacenter Rack Lab',
      domain: '3.0 Hardware & Networking',
      objective: '3.4',
      defaultState: {
        slots: {
          'u41_42_tor': null,
          'u40_patch': null,
          'u36_37_server': null,
          'u34_storage': null,
          'u1_3_ups': null
        }
      },
      solution: {
        'u41_42_tor': 'comp_tor_switch',
        'u40_patch': 'comp_patch_panel',
        'u36_37_server': 'comp_compute_server',
        'u34_storage': 'comp_nvme_san',
        'u1_3_ups': 'comp_ups_battery'
      },
      components: [
        { id: 'comp_tor_switch', name: '1U 48-Port 10GbE Switch', type: 'Networking', uHeight: 1, desc: 'Top-of-Rack aggregation switch with 48x 10GbE ports and 4x 100GbE QSFP uplinks' },
        { id: 'comp_patch_panel', name: '1U Cat6A Keystone Patch Panel', type: 'Cabling', uHeight: 1, desc: '48-port high-density Cat6A keystone patch panel for structured rack distribution' },
        { id: 'comp_compute_server', name: '2U Dual-Xeon Compute Server', type: 'Compute', uHeight: 2, desc: 'Enterprise 2U dual-socket Xeon virtualization server with 16x 2.5-inch SAS/SATA bays' },
        { id: 'comp_nvme_san', name: '1U All-Flash NVMe Storage Array', type: 'Storage', uHeight: 1, desc: 'High-throughput 1U SAN tier with 24x hot-swappable PCIe 4.0 NVMe SSD sleds' },
        { id: 'comp_ups_battery', name: '3U 3000VA Smart-UPS Battery Backup', type: 'Power', uHeight: 3, desc: 'Heavy double-conversion online battery backup (42 kg) for conditioned rack power' },
        { id: 'comp_kvm_console', name: '1U Fold-out KVM Console', type: 'Management', uHeight: 1, desc: 'Fold-out 1U rackmount 17-inch LCD, keyboard, and touchpad for out-of-band maintenance' },
        { id: 'comp_blanking_panel', name: '1U Blanking Airflow Panel', type: 'Thermal', uHeight: 1, desc: '1U toolless blanking filler panel preventing cold aisle exhaust bypass' }
      ],
      brief: {
        ticket: 'Ticket DC-5130',
        where: 'Datacenter Row B, Rack 04 (42U EIA-310 Enclosure)',
        report: 'Deploy core networking, storage, compute, and backup power into an empty 42U enclosure following ASHRAE thermal standards and Datacentre Academy safety protocols.',
        task: '1. Place 3U Smart-UPS at rack base (U1-U3) to maintain a low center of gravity.\n2. Install 1U ToR switch and Cat6A patch panel at top of rack (U40-U42) for short patch leads.\n3. Mount 2U compute server at U36-U37 and 1U NVMe storage at U34.'
      }
    }
  };

  const PBQEngine = {
    catalog: PBQ_CATALOG,

    getLab(pbqType) {
      return PBQ_CATALOG[pbqType] || PBQ_CATALOG.sohoRouter;
    },

    /**
     * Render a PBQ simulation inside any container element
     */
    render(q, userState, mountEl, callbacks) {
      const pbqType = q.pbqType || 'sohoRouter';
      const lab = this.getLab(pbqType);
      const state = userState || JSON.parse(JSON.stringify(lab.defaultState || {}));

      mountEl.innerHTML = '';

      // Render Simulation Header / Ticket Banner
      const headerBox = document.createElement('div');
      headerBox.className = 'pbq-sim-header';
      headerBox.style = 'background: rgba(212, 160, 23, 0.08); border: 1px solid var(--gold-primary); border-radius: 8px; padding: 0.85rem 1rem; margin-bottom: 1rem;';
      headerBox.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
          <span style="background: var(--gold-primary); color: #000; font-weight: 800; font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 4px; text-transform: uppercase;">Performance-Based Question</span>
          <span style="color: var(--text-secondary); font-size: 0.82rem; font-weight: 600;">Objective ${escapeHTML(q.objective || lab.objective || '')}</span>
        </div>
        <div style="font-weight: 700; font-size: 1rem; color: #fff; margin-bottom: 0.3rem;">${escapeHTML(lab.title)}</div>
        <div style="font-size: 0.86rem; color: var(--text-secondary); line-height: 1.45; white-space: pre-line;">${escapeHTML(lab.brief.task)}</div>
      `;
      mountEl.appendChild(headerBox);

      // Render Specialized Interactive Simulator
      const simContainer = document.createElement('div');
      simContainer.className = 'pbq-sim-body';
      mountEl.appendChild(simContainer);

      if (pbqType === 'sohoRouter') {
        this.renderSohoRouter(simContainer, state, callbacks);
      } else if (pbqType === 'motherboardAssembly') {
        this.renderMotherboardAssembly(simContainer, state, callbacks);
      } else if (pbqType === 'windowsConsole') {
        this.renderWindowsConsole(simContainer, state, callbacks);
      } else if (pbqType === 'cablePinout') {
        this.renderCablePinout(simContainer, state, callbacks);
      } else if (pbqType === 'portMatcher') {
        this.renderPortMatcher(simContainer, state, callbacks);
      } else if (pbqType === 'printerOrder') {
        this.renderPrinterOrder(simContainer, state, callbacks);
      } else if (pbqType === 'cliTerminal') {
        this.renderCliTerminal(simContainer, state, callbacks);
      } else if (pbqType === 'datacenterRack') {
        this.renderDatacenterRack(simContainer, state, callbacks);
      }
    },

    /**
     * Render the unified Action Toolbar for interactive PBQ simulations:
     * - "Verify & Submit Configuration" button
     * - "Reset Lab" button
     * - Evaluation feedback container (#pbqEvalResult)
     */
    renderActionToolbar(container, pbqType, state, callbacks, resetFn) {
      callbacks = callbacks || {};
      if (typeof callbacks.onSelect !== 'function') callbacks.onSelect = () => {};
      if (typeof callbacks.onSubmit !== 'function') callbacks.onSubmit = () => {};

      const lab = this.getLab(pbqType);
      const toolbar = document.createElement('div');
      toolbar.className = 'pbq-action-toolbar';
      toolbar.style = 'margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 0.75rem;';
      toolbar.innerHTML = `
        <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
          <button type="button" class="btn btn-green pbq-verify-btn" style="padding: 0.55rem 1.25rem; font-weight: 700; font-size: 0.88rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.45rem;">
            <span>✔</span> <span>Verify &amp; Submit Configuration</span>
          </button>
          <button type="button" class="btn btn-secondary pbq-reset-btn" style="padding: 0.55rem 1.1rem; font-size: 0.85rem; cursor: pointer;">
            Reset Lab
          </button>
        </div>
        <div id="pbqEvalResult" class="pbq-eval-result" aria-live="polite"></div>
      `;
      container.appendChild(toolbar);

      const verifyBtn = toolbar.querySelector('.pbq-verify-btn');
      const resetBtn = toolbar.querySelector('.pbq-reset-btn');
      const evalBox = toolbar.querySelector('#pbqEvalResult');

      verifyBtn.onclick = () => {
        const passed = this.score({ pbqType }, state);
        if (passed) {
          evalBox.innerHTML = `
            <div style="border-radius: 6px; border: 1px solid #10b981; background: rgba(16, 185, 129, 0.15); padding: 0.85rem 1.1rem; margin-top: 0.5rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 700; color: #10b981; font-size: 0.95rem;">
                <span>✔</span> <span>CONFIGURATION VERIFIED - 100% COMPLETE</span>
              </div>
              <div style="font-size: 0.85rem; color: #e2e8f0; margin-top: 0.4rem; line-height: 1.45;">
                All parameters match enterprise specifications. Ticket validated and committed to the ledger (+18 APX).
              </div>
            </div>
          `;
          if (window.APlus && window.APlus.sound && typeof window.APlus.sound.playSuccess === 'function') {
            window.APlus.sound.playSuccess();
          }
          if (window.CompTIALedgerUI && typeof window.CompTIALedgerUI.onPbqComplete === 'function') {
            window.CompTIALedgerUI.onPbqComplete(lab.title);
          } else if (window.CompTIALedger && typeof window.CompTIALedger.recordPbqComplete === 'function') {
            window.CompTIALedger.recordPbqComplete(lab.title);
          }
          if (window.APlus && window.APlus.bus && typeof window.APlus.bus.emit === 'function') {
            window.APlus.bus.emit('pbq:completed', { lab: pbqType, correct: true, score: 100 });
          }
          if (typeof callbacks.onSubmit === 'function') {
            callbacks.onSubmit({ passed: true, state, score: 100 });
          }
        } else {
          const diagnostics = this.getDiagnostics(pbqType, state);
          evalBox.innerHTML = `
            <div style="border-radius: 6px; border: 1px solid #ef4444; background: rgba(239, 68, 68, 0.15); padding: 0.85rem 1.1rem; margin-top: 0.5rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 700; color: #ef4444; font-size: 0.95rem;">
                <span>✖</span> <span>CONFIGURATION INCOMPLETE OR INCORRECT</span>
              </div>
              <div style="font-size: 0.85rem; color: #cbd5e1; margin-top: 0.4rem;">
                Please resolve the following ${diagnostics.length} issue${diagnostics.length === 1 ? '' : 's'}:
              </div>
              <ul style="margin: 0.4rem 0 0 1.2rem; padding: 0; font-size: 0.84rem; color: #fca5a5; line-height: 1.5;">
                ${diagnostics.map(d => `<li>${escapeHTML(d)}</li>`).join('')}
              </ul>
            </div>
          `;
          if (window.APlus && window.APlus.sound && typeof window.APlus.sound.playClick === 'function') {
            window.APlus.sound.playClick();
          }
          if (typeof callbacks.onSubmit === 'function') {
            callbacks.onSubmit({ passed: false, state, score: 0, diagnostics });
          }
        }
      };

      resetBtn.onclick = () => {
        if (window.APlus && window.APlus.sound && typeof window.APlus.sound.playClick === 'function') {
          window.APlus.sound.playClick();
        }
        evalBox.innerHTML = '';
        if (typeof resetFn === 'function') {
          resetFn();
        }
      };
    },

    /**
     * Compute specific diagnostic feedback for incomplete or misconfigured simulations
     */
    getDiagnostics(pbqType, userState) {
      const lab = this.getLab(pbqType);
      const s = userState || {};
      const sol = lab.solution;
      const issues = [];

      if (pbqType === 'sohoRouter') {
        const currentSsid = (s.ssid || '').trim();
        if (!currentSsid) {
          issues.push("Wireless SSID (Network Name) is not configured. Expected '" + sol.ssid + "'.");
        } else if (currentSsid.toLowerCase() !== sol.ssid.toLowerCase()) {
          issues.push("Wireless SSID is '" + currentSsid + "' (expected '" + sol.ssid + "').");
        }

        if (s.securityMode !== sol.securityMode) {
          issues.push("Security mode is '" + (s.securityMode || 'Disabled') + "' (expected '" + sol.securityMode + "').");
        }

        if (s.encryption !== sol.encryption) {
          issues.push("Encryption cipher is '" + (s.encryption || 'None') + "' (expected '" + sol.encryption + "' / AES-CCMP).");
        }

        if (s.channelWidth !== sol.channelWidth) {
          issues.push("5 GHz channel width is '" + (s.channelWidth || '20 MHz') + "' (expected '" + sol.channelWidth + "' for high throughput).");
        }

        const currentStartIp = (s.startingIp || '').trim();
        if (currentStartIp !== sol.startingIp) {
          issues.push("DHCP starting IP is '" + (currentStartIp || 'empty') + "' (expected '" + sol.startingIp + "' to reserve 192.168.1.2-.99 for servers).");
        }

        const currentPort = (s.forwardPort || '').trim();
        if (currentPort !== sol.forwardPort) {
          issues.push("Port forwarding port is '" + (currentPort || 'empty') + "' (expected '" + sol.forwardPort + "' for HTTPS).");
        }

        const currentFwdIp = (s.forwardIp || '').trim();
        if (currentFwdIp !== sol.forwardIp) {
          issues.push("Port forwarding destination IP is '" + (currentFwdIp || 'empty') + "' (expected '" + sol.forwardIp + "').");
        }

        if (!s.forwardEnabled) {
          issues.push("Port forwarding HTTPS rule is not active. Check the 'Active' checkbox in the NAT table.");
        }
      } else if (pbqType === 'cablePinout') {
        const seq = s.sequence || [];
        const solSeq = T568B_SEQUENCE;

        for (let i = 0; i < 8; i++) {
          const wire = seq[i];
          const exp = solSeq[i];
          const expName = (WIRE_COLORS[exp] && WIRE_COLORS[exp].name) || exp;
          if (!wire) {
            issues.push("Pin " + (i + 1) + " is unassigned (expected " + exp + " - " + expName + ").");
          } else if (wire !== exp) {
            const actName = (WIRE_COLORS[wire] && WIRE_COLORS[wire].name) || wire;
            issues.push("Pin " + (i + 1) + " has " + wire + " (" + actName + "), expected " + exp + " (" + expName + ").");
          }
        }

        if (seq.length === 8 && seq.every((w, i) => w === T568A_SEQUENCE[i])) {
          issues.unshift("Standard mismatch: Wires currently match T568A pinout. Reconfigure according to T568B standard.");
        }
      } else if (pbqType === 'motherboardAssembly') {
        const slots = s.slots || {};
        const solSlots = lab.solution;
        const slotLabels = {
          'socket_cpu': 'CPU Socket (LGA 1700)',
          'slot_ram1': 'DIMM Slot A2 (DDR5)',
          'slot_pcie_top': 'Primary PCIe x16 Slot',
          'slot_m2_nvme': 'M.2 NVMe Slot (PCIe 4.0 x4)',
          'conn_atx_power': '24-Pin ATX Main Power Header'
        };

        Object.keys(solSlots).forEach((k) => {
          const assigned = slots[k];
          const expected = solSlots[k];
          const expComp = lab.components.find(c => c.id === expected);
          const expName = expComp ? expComp.name : expected;
          const slotName = slotLabels[k] || k;

          if (!assigned) {
            issues.push(slotName + " is unpopulated (requires " + expName + ").");
          } else if (assigned !== expected) {
            const actComp = lab.components.find(c => c.id === assigned);
            const actName = actComp ? actComp.name : assigned;
            issues.push(slotName + " has incorrect component '" + actName + "' (expected " + expName + ").");
          }
        });
      } else if (pbqType === 'windowsConsole') {
        if (!s.diskInitialized) {
          issues.push("Disk 1 is Not Initialized. Click 'Initialize Disk 1 as GPT'.");
        } else if (s.partitionStyle !== sol.partitionStyle) {
          issues.push("Disk 1 partition style is " + s.partitionStyle + " (expected " + sol.partitionStyle + " to support volumes >2 TB).");
        }

        if (!s.volumeCreated) {
          issues.push("No volume created on Disk 1. Click 'Run New Simple Volume Wizard'.");
        } else {
          if (s.driveLetter !== sol.driveLetter) {
            issues.push("Drive letter is '" + (s.driveLetter || 'unassigned') + "' (expected '" + sol.driveLetter + "').");
          }
          if (s.fileSystem !== sol.fileSystem) {
            issues.push("File system is '" + (s.fileSystem || 'unformatted') + "' (expected '" + sol.fileSystem + "').");
          }
          if ((s.volumeLabel || '').trim().toUpperCase() !== sol.volumeLabel.toUpperCase()) {
            issues.push("Volume label is '" + (s.volumeLabel || '') + "' (expected '" + sol.volumeLabel + "').");
          }
        }
      } else if (pbqType === 'datacenterRack') {
        const slots = s.slots || {};
        const solSlots = lab.solution;
        const slotLabels = {
          'u41_42_tor': 'Top-of-Rack Switch Slot (U41-U42)',
          'u40_patch': 'Structured Patch Panel Slot (U40)',
          'u36_37_server': '2U Compute Server Zone (U36-U37)',
          'u34_storage': '1U NVMe Storage Array Slot (U34)',
          'u1_3_ups': 'Rack Base UPS Battery Slot (U1-U3)'
        };

        const upperSlots = ['u41_42_tor', 'u40_patch', 'u36_37_server', 'u34_storage'];
        const hasUpperUps = upperSlots.some(k => slots[k] === 'comp_ups_battery' || slots[k] === 'comp_ups');
        if (hasUpperUps) {
          issues.push('Safety Tipping Hazard: Heavy UPS battery backup must be installed at the base of the rack (U1-U3) to maintain stability.');
        }

        Object.keys(solSlots).forEach((k) => {
          const assigned = slots[k];
          const expected = solSlots[k];
          const expComp = lab.components.find(c => c.id === expected);
          const expName = expComp ? expComp.name : expected;
          const slotName = slotLabels[k] || k;

          if (!assigned) {
            issues.push(slotName + ' is unpopulated (requires ' + expName + ').');
          } else if (assigned !== expected) {
            const actComp = lab.components.find(c => c.id === assigned);
            const actName = actComp ? actComp.name : assigned;
            issues.push(slotName + " has incorrect component '" + actName + "' (expected " + expName + ").");
          }
        });
      }

      return issues;
    },

    /* 1. SOHO Wireless Router Simulation */
    renderSohoRouter(container, state, callbacks) {
      callbacks = callbacks || {};
      if (typeof callbacks.onSelect !== 'function') callbacks.onSelect = () => {};
      if (typeof callbacks.onSubmit !== 'function') callbacks.onSubmit = () => {};

      const lab = PBQ_CATALOG.sohoRouter;
      const activeTab = state.activeTab || 'wireless';
      const updateState = (updates) => {
        Object.assign(state, updates);
        callbacks.onSelect(state);
      };

      container.innerHTML = `
        <div style="border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; background: #0f141c;">
          <div style="background: #18202c; padding: 0.6rem 1rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <div style="font-weight: 700; color: var(--accent-cyan); font-size: 0.9rem;">SOHO Gateway Web Administration [v1.4.2]</div>
            <div style="font-size: 0.8rem; color: #10b981;">● Connected (192.168.1.1)</div>
          </div>
          <div style="display: flex; background: #121822; border-bottom: 1px solid var(--border-color);">
            <button type="button" id="tab_wireless" class="btn ${activeTab === 'wireless' ? 'btn-primary' : 'btn-secondary'}" style="border-radius: 0; padding: 0.55rem 1rem; font-size: 0.85rem;">Wireless (Wi-Fi)</button>
            <button type="button" id="tab_dhcp" class="btn ${activeTab === 'dhcp' ? 'btn-primary' : 'btn-secondary'}" style="border-radius: 0; padding: 0.55rem 1rem; font-size: 0.85rem;">LAN & DHCP Server</button>
            <button type="button" id="tab_nat" class="btn ${activeTab === 'nat' ? 'btn-primary' : 'btn-secondary'}" style="border-radius: 0; padding: 0.55rem 1rem; font-size: 0.85rem;">Port Forwarding / NAT</button>
          </div>
          <div id="router_pane" style="padding: 1.2rem;"></div>
        </div>
      `;

      const pane = container.querySelector('#router_pane');

      const renderTabContent = () => {
        const curTab = state.activeTab || 'wireless';
        if (curTab === 'wireless') {
          pane.innerHTML = `
            <div style="display: grid; grid-template-columns: 180px 1fr; gap: 0.8rem; align-items: center; font-size: 0.88rem;">
              <label style="font-weight: 600;">Wireless Network Name (SSID):</label>
              <input type="text" id="cfg_ssid" value="${escapeHTML(state.ssid || '')}" placeholder="Enter SSID..." style="background: #1e293b; border: 1px solid var(--border-color); color: #fff; padding: 0.45rem 0.6rem; border-radius: 4px; max-width: 280px;" />

              <label style="font-weight: 600;">Security Mode:</label>
              <select id="cfg_sec" style="background: #1e293b; border: 1px solid var(--border-color); color: #fff; padding: 0.45rem 0.6rem; border-radius: 4px; max-width: 280px;">
                <option value="Disabled" ${state.securityMode === 'Disabled' ? 'selected' : ''}>Disabled (Open)</option>
                <option value="WEP" ${state.securityMode === 'WEP' ? 'selected' : ''}>WEP (Deprecated)</option>
                <option value="WPA2-PSK" ${state.securityMode === 'WPA2-PSK' ? 'selected' : ''}>WPA2-Personal (PSK)</option>
                <option value="WPA3-Personal" ${state.securityMode === 'WPA3-Personal' ? 'selected' : ''}>WPA3-Personal (SAE)</option>
                <option value="WPA3-Enterprise" ${state.securityMode === 'WPA3-Enterprise' ? 'selected' : ''}>WPA3-Enterprise (802.1X)</option>
              </select>

              <label style="font-weight: 600;">Encryption Cipher:</label>
              <select id="cfg_enc" style="background: #1e293b; border: 1px solid var(--border-color); color: #fff; padding: 0.45rem 0.6rem; border-radius: 4px; max-width: 280px;">
                <option value="TKIP" ${state.encryption === 'TKIP' ? 'selected' : ''}>TKIP (Legacy)</option>
                <option value="AES" ${state.encryption === 'AES' ? 'selected' : ''}>AES / CCMP</option>
              </select>

              <label style="font-weight: 600;">5 GHz Channel Width:</label>
              <select id="cfg_width" style="background: #1e293b; border: 1px solid var(--border-color); color: #fff; padding: 0.45rem 0.6rem; border-radius: 4px; max-width: 280px;">
                <option value="20 MHz" ${state.channelWidth === '20 MHz' ? 'selected' : ''}>20 MHz</option>
                <option value="40 MHz" ${state.channelWidth === '40 MHz' ? 'selected' : ''}>40 MHz</option>
                <option value="80 MHz" ${state.channelWidth === '80 MHz' ? 'selected' : ''}>80 MHz (High Throughput)</option>
                <option value="160 MHz" ${state.channelWidth === '160 MHz' ? 'selected' : ''}>160 MHz</option>
              </select>
            </div>
          `;

          pane.querySelector('#cfg_ssid').oninput = (e) => updateState({ ssid: e.target.value.trim() });
          pane.querySelector('#cfg_sec').onchange = (e) => updateState({ securityMode: e.target.value });
          pane.querySelector('#cfg_enc').onchange = (e) => updateState({ encryption: e.target.value });
          pane.querySelector('#cfg_width').onchange = (e) => updateState({ channelWidth: e.target.value });
        } else if (curTab === 'dhcp') {
          pane.innerHTML = `
            <div style="display: grid; grid-template-columns: 200px 1fr; gap: 0.8rem; align-items: center; font-size: 0.88rem;">
              <label style="font-weight: 600;">Gateway LAN IP:</label>
              <span style="color: var(--text-secondary); font-family: monospace;">192.168.1.1 (Subnet 255.255.255.0)</span>

              <label style="font-weight: 600;">DHCP Server Status:</label>
              <div><span style="color: #10b981; font-weight: 700;">Enabled</span> (Serving /24 Scope)</div>

              <label style="font-weight: 600;">Starting IP Address:</label>
              <input type="text" id="cfg_startip" value="${escapeHTML(state.startingIp || '192.168.1.2')}" style="background: #1e293b; border: 1px solid var(--border-color); color: #fff; padding: 0.45rem 0.6rem; border-radius: 4px; max-width: 220px;" />

              <label style="font-weight: 600;">Ending IP Address:</label>
              <input type="text" id="cfg_endip" value="${escapeHTML(state.endingIp || '192.168.1.254')}" style="background: #1e293b; border: 1px solid var(--border-color); color: #fff; padding: 0.45rem 0.6rem; border-radius: 4px; max-width: 220px;" />
            </div>
          `;
          pane.querySelector('#cfg_startip').oninput = (e) => updateState({ startingIp: e.target.value.trim() });
          pane.querySelector('#cfg_endip').oninput = (e) => updateState({ endingIp: e.target.value.trim() });
        } else if (curTab === 'nat') {
          pane.innerHTML = `
            <div style="font-size: 0.88rem; margin-bottom: 0.8rem;">Configure inbound Virtual Server / Port Forwarding table:</div>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.84rem; text-align: left;">
              <thead>
                <tr style="background: #1e293b; border-bottom: 1px solid var(--border-color);">
                  <th style="padding: 0.45rem;">Service</th>
                  <th style="padding: 0.45rem;">Port Range</th>
                  <th style="padding: 0.45rem;">Server IP</th>
                  <th style="padding: 0.45rem;">Protocol</th>
                  <th style="padding: 0.45rem;">Active</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 0.45rem;">HTTPS Web</td>
                  <td style="padding: 0.45rem;">
                    <input type="text" id="cfg_fwdport" value="${escapeHTML(state.forwardPort || '443')}" style="width: 70px; background: #121822; border: 1px solid var(--border-color); color: #fff; padding: 0.25rem 0.4rem; border-radius: 3px;" />
                  </td>
                  <td style="padding: 0.45rem;">
                    <input type="text" id="cfg_fwdip" value="${escapeHTML(state.forwardIp || '')}" placeholder="192.168.1.50" style="width: 130px; background: #121822; border: 1px solid var(--border-color); color: #fff; padding: 0.25rem 0.4rem; border-radius: 3px;" />
                  </td>
                  <td style="padding: 0.45rem;">
                    <select id="cfg_fwdproto" style="background: #121822; border: 1px solid var(--border-color); color: #fff; padding: 0.25rem; border-radius: 3px;">
                      <option value="TCP" ${state.forwardProtocol === 'TCP' ? 'selected' : ''}>TCP</option>
                      <option value="UDP" ${state.forwardProtocol === 'UDP' ? 'selected' : ''}>UDP</option>
                      <option value="BOTH" ${state.forwardProtocol === 'BOTH' ? 'selected' : ''}>BOTH</option>
                    </select>
                  </td>
                  <td style="padding: 0.45rem;">
                    <input type="checkbox" id="cfg_fwdenable" ${state.forwardEnabled ? 'checked' : ''} style="cursor: pointer; transform: scale(1.2);" />
                  </td>
                </tr>
              </tbody>
            </table>
          `;
          pane.querySelector('#cfg_fwdport').oninput = (e) => updateState({ forwardPort: e.target.value.trim() });
          pane.querySelector('#cfg_fwdip').oninput = (e) => updateState({ forwardIp: e.target.value.trim() });
          pane.querySelector('#cfg_fwdproto').onchange = (e) => updateState({ forwardProtocol: e.target.value });
          pane.querySelector('#cfg_fwdenable').onchange = (e) => updateState({ forwardEnabled: e.target.checked });
        }
      };

      const setTab = (tabName) => {
        state.activeTab = tabName;
        updateState({ activeTab: tabName });
        ['wireless', 'dhcp', 'nat'].forEach((t) => {
          const btn = container.querySelector('#tab_' + t);
          if (btn) btn.className = 'btn ' + (t === tabName ? 'btn-primary' : 'btn-secondary');
        });
        renderTabContent();
      };

      container.querySelector('#tab_wireless').onclick = () => setTab('wireless');
      container.querySelector('#tab_dhcp').onclick = () => setTab('dhcp');
      container.querySelector('#tab_nat').onclick = () => setTab('nat');

      renderTabContent();

      this.renderActionToolbar(container, 'sohoRouter', state, callbacks, () => {
        const def = JSON.parse(JSON.stringify(lab.defaultState));
        Object.keys(state).forEach(k => delete state[k]);
        Object.assign(state, def);
        callbacks.onSelect(state);
        this.renderSohoRouter(container, state, callbacks);
      });
    },

    /* 2. Motherboard Component Assembly Simulation */
    renderMotherboardAssembly(container, state, callbacks) {
      callbacks = callbacks || {};
      if (typeof callbacks.onSelect !== 'function') callbacks.onSelect = () => {};
      if (typeof callbacks.onSubmit !== 'function') callbacks.onSubmit = () => {};

      const slots = state.slots || {};
      state.slots = slots;
      const lab = PBQ_CATALOG.motherboardAssembly;

      const slotLabels = {
        'socket_cpu': 'CPU Socket (LGA 1700)',
        'slot_ram1': 'DIMM Slot A2 (DDR5)',
        'slot_pcie_top': 'Primary PCIe x16 (Full-Length)',
        'slot_m2_nvme': 'M.2 NVMe Slot (PCIe 4.0 x4)',
        'conn_atx_power': '24-Pin ATX Main Power Connector'
      };

      const updateSlot = (slotKey, compId) => {
        slots[slotKey] = compId || null;
        callbacks.onSelect({ slots });
        this.renderMotherboardAssembly(container, state, callbacks);
      };

      const selectedTrayComp = state._selectedTrayCompId || null;

      // Helper to find slot key where a component is currently installed
      const findSlotForComp = (compId) => {
        for (const [k, v] of Object.entries(slots)) {
          if (v === compId) return k;
        }
        return null;
      };

      // Generate HTML for PCB visual slot badge
      const renderSlotBadge = (slotKey, expectedId, labelShort) => {
        const assignedId = slots[slotKey];
        const assignedComp = lab.components.find(c => c.id === assignedId);
        const isCorrect = assignedId === expectedId;
        const isHoveredOrTarget = selectedTrayComp !== null;

        if (!assignedComp) {
          return `
            <div class="mb-pcb-slot-empty" data-slot="${slotKey}" style="border: 2px dashed ${isHoveredOrTarget ? '#eab308' : '#38bdf8'}; background: rgba(56, 189, 248, 0.05); border-radius: 6px; padding: 0.5rem; text-align: center; cursor: pointer; transition: all 0.2s ease;">
              <div style="font-size: 0.72rem; font-weight: 700; color: ${isHoveredOrTarget ? '#facc15' : 'var(--accent-cyan)'};">${escapeHTML(labelShort)}</div>
              <div style="font-size: 0.65rem; color: #94a3b8; margin-top: 2px;">${isHoveredOrTarget ? '▶ Click to Mount Selected' : '[ Empty Slot - Click to Install ]'}</div>
            </div>
          `;
        }

        if (isCorrect) {
          let specificVisual = '';
          if (slotKey === 'socket_cpu') {
            specificVisual = `
              <div style="background: linear-gradient(135deg, #475569 0%, #334155 50%, #1e293b 100%); border: 2px solid #94a3b8; border-radius: 6px; padding: 0.45rem; box-shadow: 0 4px 12px rgba(0,0,0,0.6); position: relative;">
                <div style="font-weight: 800; font-size: 0.75rem; color: #38bdf8; letter-spacing: 0.5px;">INTEL® CORE™ i7</div>
                <div style="font-size: 0.62rem; color: #cbd5e1;">LGA 1700 // 3.40 GHz</div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                  <span style="font-size: 0.6rem; color: #10b981; font-weight: 700; background: rgba(16,185,129,0.2); padding: 1px 4px; border-radius: 3px;">✔ SEATED &amp; LOCKED</span>
                  <button type="button" class="mb-pcb-eject-btn" data-slot="${slotKey}" style="background: rgba(239,68,68,0.25); border: 1px solid #ef4444; color: #fca5a5; font-size: 0.6rem; padding: 1px 4px; border-radius: 3px; cursor: pointer;">✕ Eject</button>
                </div>
              </div>
            `;
          } else if (slotKey === 'slot_ram1') {
            specificVisual = `
              <div style="background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border: 2px solid #38bdf8; border-radius: 4px; padding: 0.45rem; box-shadow: 0 0 12px rgba(56,189,248,0.25); position: relative;">
                <div style="height: 3px; background: linear-gradient(90deg, #ec4899, #8b5cf6, #3b82f6); border-radius: 2px; margin-bottom: 3px;"></div>
                <div style="font-weight: 800; font-size: 0.72rem; color: #fff;">DDR5 32GB 6000MHz</div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                  <span style="font-size: 0.6rem; color: #10b981; font-weight: 700; background: rgba(16,185,129,0.2); padding: 1px 4px; border-radius: 3px;">✔ CLIPPED IN A2</span>
                  <button type="button" class="mb-pcb-eject-btn" data-slot="${slotKey}" style="background: rgba(239,68,68,0.25); border: 1px solid #ef4444; color: #fca5a5; font-size: 0.6rem; padding: 1px 4px; border-radius: 3px; cursor: pointer;">✕ Eject</button>
                </div>
              </div>
            `;
          } else if (slotKey === 'slot_pcie_top') {
            specificVisual = `
              <div style="background: linear-gradient(90deg, #1e1b4b 0%, #0f172a 100%); border: 2px solid #a855f7; border-radius: 6px; padding: 0.45rem 0.6rem; box-shadow: 0 0 16px rgba(168,85,247,0.3); display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-weight: 800; font-size: 0.75rem; color: #d8b4fe;">PCIe 4.0 x16 Discrete GPU</div>
                  <div style="font-size: 0.62rem; color: #10b981; font-weight: 700;">✔ STEEL ARMOR &amp; BRACKET LOCKED</div>
                </div>
                <button type="button" class="mb-pcb-eject-btn" data-slot="${slotKey}" style="background: rgba(239,68,68,0.25); border: 1px solid #ef4444; color: #fca5a5; font-size: 0.6rem; padding: 1px 5px; border-radius: 3px; cursor: pointer;">✕ Eject</button>
              </div>
            `;
          } else if (slotKey === 'slot_m2_nvme') {
            specificVisual = `
              <div style="background: linear-gradient(90deg, #064e3b 0%, #022c22 100%); border: 2px solid #10b981; border-radius: 4px; padding: 0.4rem 0.6rem; box-shadow: 0 0 14px rgba(16,185,129,0.3); display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-weight: 800; font-size: 0.72rem; color: #6ee7b7;">M.2 2280 NVMe SSD (PCIe x4)</div>
                  <div style="font-size: 0.6rem; color: #cbd5e1;">✔ 2280 Standoff &amp; Screw Secured</div>
                </div>
                <button type="button" class="mb-pcb-eject-btn" data-slot="${slotKey}" style="background: rgba(239,68,68,0.25); border: 1px solid #ef4444; color: #fca5a5; font-size: 0.6rem; padding: 1px 4px; border-radius: 3px; cursor: pointer;">✕ Eject</button>
              </div>
            `;
          } else if (slotKey === 'conn_atx_power') {
            specificVisual = `
              <div style="background: #0f172a; border: 2px solid #f59e0b; border-radius: 4px; padding: 0.45rem; box-shadow: 0 0 12px rgba(245,158,11,0.25); position: relative;">
                <div style="font-weight: 800; font-size: 0.72rem; color: #fbbf24;">24-Pin ATX Main Power Cable</div>
                <div style="font-size: 0.6rem; color: #10b981; font-weight: 700; margin-top: 2px;">✔ LATCHED &amp; ENERGIZED</div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                  <span style="font-size: 0.58rem; color: #94a3b8;">+12V / +5V / +3.3V</span>
                  <button type="button" class="mb-pcb-eject-btn" data-slot="${slotKey}" style="background: rgba(239,68,68,0.25); border: 1px solid #ef4444; color: #fca5a5; font-size: 0.6rem; padding: 1px 4px; border-radius: 3px; cursor: pointer;">✕ Eject</button>
                </div>
              </div>
            `;
          }
          return specificVisual;
        }

        // Mismatched component assigned
        return `
          <div style="background: rgba(239, 68, 68, 0.18); border: 2px solid #ef4444; border-radius: 6px; padding: 0.45rem; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 0.65rem; color: #fca5a5; font-weight: 700;">⚠ MISMATCHED HARDWARE</div>
              <div style="font-size: 0.74rem; font-weight: 600; color: #fff;">${escapeHTML(assignedComp.name)}</div>
            </div>
            <button type="button" class="mb-pcb-eject-btn" data-slot="${slotKey}" style="background: rgba(239,68,68,0.3); border: 1px solid #ef4444; color: #fff; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; cursor: pointer;">✕ Remove</button>
          </div>
        `;
      };

      // Silkscreen Traces SVG Overlay
      const svgTraces = `
        <svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; opacity: 0.16;" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="mbGrid" width="16" height="16" patternUnits="userSpaceOnUse">
              <path d="M 16 0 L 0 0 0 16" fill="none" stroke="#38bdf8" stroke-width="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#mbGrid)"/>
          <path d="M 30 50 L 120 50 L 140 70 L 140 180" stroke="#ca8a04" stroke-width="2" fill="none"/>
          <path d="M 220 30 L 220 50 L 250 80 L 280 80" stroke="#38bdf8" stroke-width="1.5" fill="none"/>
          <path d="M 400 60 L 400 190 L 320 230" stroke="#ca8a04" stroke-width="2" fill="none"/>
          <path d="M 80 280 L 80 320 L 240 320" stroke="#10b981" stroke-width="1.5" fill="none"/>
          <path d="M 350 290 L 420 290 L 440 310 L 440 350" stroke="#a855f7" stroke-width="1.5" fill="none"/>
        </svg>
      `;

      // Visual PCB Board HTML
      const pcbHtml = `
        <div class="mb-pcb-board" style="position: relative; background: #07121b; border: 2px solid #334155; border-radius: 10px; padding: 1.1rem; box-shadow: inset 0 0 50px rgba(0,0,0,0.85), 0 8px 30px rgba(0,0,0,0.5); overflow: hidden; margin-bottom: 1.25rem;">
          ${svgTraces}

          <!-- Corner Ground Screws -->
          <div style="position: absolute; top: 8px; left: 8px; width: 12px; height: 12px; border: 2px solid #eab308; border-radius: 50%; background: #713f12;"></div>
          <div style="position: absolute; top: 8px; right: 8px; width: 12px; height: 12px; border: 2px solid #eab308; border-radius: 50%; background: #713f12;"></div>
          <div style="position: absolute; bottom: 8px; left: 8px; width: 12px; height: 12px; border: 2px solid #eab308; border-radius: 50%; background: #713f12;"></div>
          <div style="position: absolute; bottom: 8px; right: 8px; width: 12px; height: 12px; border: 2px solid #eab308; border-radius: 50%; background: #713f12;"></div>

          <!-- Silkscreen Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.4rem; margin-bottom: 0.9rem;">
            <div style="font-family: monospace; font-size: 0.78rem; color: #94a3b8;">
              <span style="color: var(--accent-cyan); font-weight: 700;">CLARIORA Z790-PRO WORKSTATION</span> // ATX EIA-310 ARCHITECTURE
            </div>
            <div style="font-family: monospace; font-size: 0.7rem; color: #ca8a04; font-weight: 700;">
              PCB REV 4.2 // LGA 1700 + DDR5
            </div>
          </div>

          <!-- Upper Section: I/O + VRM + CPU Socket + DDR5 Slots + 24-Pin ATX -->
          <div style="display: grid; grid-template-columns: 80px 1fr 140px 110px; gap: 0.75rem; margin-bottom: 1rem; align-items: start;">
            <!-- Rear I/O Panel & VRM -->
            <div style="background: linear-gradient(180deg, #1e293b, #0f172a); border: 1px solid #475569; border-radius: 4px; padding: 0.4rem; font-size: 0.65rem; color: #94a3b8; text-align: center; height: 155px; display: flex; flex-direction: column; justify-content: space-around;">
              <div style="font-weight: 700; color: #cbd5e1; border-bottom: 1px solid #334155; padding-bottom: 2px;">REAR I/O</div>
              <div style="background: #0284c7; color: #fff; border-radius: 2px; padding: 1px;">2.5G LAN</div>
              <div style="background: #334155; color: #cbd5e1; border-radius: 2px; padding: 1px;">USB 3.2</div>
              <div style="background: #334155; color: #cbd5e1; border-radius: 2px; padding: 1px;">USB-C 20G</div>
              <div style="background: #475569; color: #cbd5e1; border-radius: 2px; padding: 1px;">AUDIO 7.1</div>
            </div>

            <!-- CPU Socket (LGA 1700) Zone -->
            <div style="background: rgba(15, 23, 42, 0.85); border: 2px solid #475569; border-radius: 6px; padding: 0.6rem; min-height: 155px; position: relative;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <span style="font-size: 0.72rem; font-weight: 700; color: var(--gold-primary);">CPU SOCKET (LGA 1700)</span>
                <span style="font-size: 0.65rem; color: #94a3b8;">Intel 12/13/14th Gen</span>
              </div>
              <div class="mb-pcb-slot-target" data-slot="socket_cpu">
                ${renderSlotBadge('socket_cpu', 'comp_cpu', 'LGA 1700 Socket (Pin Array & Lever)')}
              </div>
              <!-- Pin 1 Marker & Lever Graphic -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.4rem; font-size: 0.62rem; color: #64748b;">
                <span>▲ Pin 1 Alignment Notch</span>
                <span>Socket Retention Lever ▶</span>
              </div>
            </div>

            <!-- DIMM Slot A2 (DDR5) Zone -->
            <div style="background: rgba(15, 23, 42, 0.85); border: 2px solid #475569; border-radius: 6px; padding: 0.5rem; min-height: 155px; display: flex; flex-direction: column;">
              <div style="font-size: 0.7rem; font-weight: 700; color: var(--gold-primary); margin-bottom: 0.35rem; text-align: center;">DIMM A2 (DDR5)</div>
              <!-- Top clip -->
              <div style="height: 4px; background: #e2e8f0; border-radius: 2px 2px 0 0; margin-bottom: 2px;"></div>
              <div class="mb-pcb-slot-target" data-slot="slot_ram1" style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
                ${renderSlotBadge('slot_ram1', 'comp_ram', 'DIMM Slot A2 (DDR5)')}
              </div>
              <!-- Bottom clip -->
              <div style="height: 4px; background: #e2e8f0; border-radius: 0 0 2px 2px; margin-top: 2px;"></div>
              <div style="font-size: 0.58rem; color: #64748b; text-align: center; margin-top: 3px;">Channel A Primary</div>
            </div>

            <!-- 24-Pin ATX Main Power Header Zone -->
            <div style="background: rgba(15, 23, 42, 0.85); border: 2px solid #475569; border-radius: 6px; padding: 0.5rem; min-height: 155px; display: flex; flex-direction: column;">
              <div style="font-size: 0.68rem; font-weight: 700; color: var(--gold-primary); margin-bottom: 0.35rem; text-align: center;">24-PIN ATX PWR</div>
              <div class="mb-pcb-slot-target" data-slot="conn_atx_power" style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
                ${renderSlotBadge('conn_atx_power', 'comp_atx', '2x12 ATX Power Header')}
              </div>
              <div style="font-size: 0.58rem; color: #64748b; text-align: center; margin-top: 3px;">Main PSU 24P</div>
            </div>
          </div>

          <!-- Middle Section: M.2 NVMe Slot (PCIe 4.0 x4) -->
          <div style="background: rgba(15, 23, 42, 0.85); border: 2px solid #475569; border-radius: 6px; padding: 0.6rem 0.8rem; margin-bottom: 0.85rem; display: flex; justify-content: space-between; align-items: center; gap: 0.75rem;">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--gold-primary); white-space: nowrap;">
              M.2 NVMe Slot (PCIe 4.0 x4):
            </div>
            <div class="mb-pcb-slot-target" data-slot="slot_m2_nvme" style="flex: 1;">
              ${renderSlotBadge('slot_m2_nvme', 'comp_nvme', 'M.2 2280 NVMe Slot (Standoff & M-Key)')}
            </div>
            <div style="font-size: 0.65rem; color: #64748b; white-space: nowrap;">Form Factor 2280 (80mm)</div>
          </div>

          <!-- Lower Section: Primary PCIe 4.0 x16 Slot + Chipset Heatsink -->
          <div style="display: grid; grid-template-columns: 1fr 140px; gap: 0.75rem; align-items: center;">
            <!-- Primary PCIe x16 Slot Zone -->
            <div style="background: rgba(15, 23, 42, 0.85); border: 2px solid #475569; border-radius: 6px; padding: 0.6rem 0.8rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                <span style="font-size: 0.75rem; font-weight: 700; color: var(--gold-primary);">PRIMARY PCIe 4.0 x16 SLOT</span>
                <span style="font-size: 0.65rem; color: #94a3b8;">Steel Armor / Full-Length</span>
              </div>
              <div class="mb-pcb-slot-target" data-slot="slot_pcie_top">
                ${renderSlotBadge('slot_pcie_top', 'comp_gpu', 'PCIe 4.0 x16 Slot (Retention Bracket)')}
              </div>
            </div>

            <!-- Chipset Heatsink Block -->
            <div style="background: linear-gradient(135deg, #1e293b, #0f172a); border: 1px solid #475569; border-radius: 6px; padding: 0.5rem; text-align: center;">
              <div style="font-size: 0.68rem; font-weight: 700; color: #94a3b8;">Z790 CHIPSET</div>
              <div style="height: 18px; background: repeating-linear-gradient(90deg, #334155, #334155 6px, #1e293b 6px, #1e293b 10px); border-radius: 3px; margin: 4px 0;"></div>
              <div style="font-size: 0.58rem; color: #64748b;">DMI 4.0 x8 Bus</div>
            </div>
          </div>
        </div>
      `;

      // Component Staging Tray HTML
      let trayHtml = `
        <div style="background: #111827; border: 1px solid var(--border-color); border-radius: 8px; padding: 0.85rem; margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
            <div style="font-weight: 700; color: var(--accent-cyan); font-size: 0.88rem;">Hardware Component Staging Tray:</div>
            <div style="font-size: 0.78rem; color: ${selectedTrayComp ? '#facc15' : 'var(--text-secondary)'}; font-weight: 600;">
              ${selectedTrayComp ? `Selected: [${escapeHTML(lab.components.find(c => c.id === selectedTrayComp)?.name || '')}] - Click target slot above to install` : 'Click a component to pick it up, then click any slot above'}
            </div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 0.5rem;">
      `;

      lab.components.forEach((c) => {
        const installedInSlot = findSlotForComp(c.id);
        const isSelected = selectedTrayComp === c.id;
        trayHtml += `
          <div class="mb-tray-item" data-comp="${c.id}" style="background: ${isSelected ? 'rgba(212, 160, 23, 0.2)' : '#1e293b'}; border: 1px solid ${isSelected ? 'var(--gold-primary)' : (installedInSlot ? '#475569' : 'var(--border-color)')}; border-radius: 6px; padding: 0.45rem 0.65rem; cursor: pointer; transition: all 0.15s ease; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 0.8rem; font-weight: 700; color: ${isSelected ? '#facc15' : '#fff'};">${escapeHTML(c.name)}</div>
              <div style="font-size: 0.7rem; color: ${installedInSlot ? '#10b981' : 'var(--text-secondary)'}; font-weight: 600;">
                ${installedInSlot ? `● Mounted in ${escapeHTML(slotLabels[installedInSlot] || installedInSlot)}` : '○ Available on Bench'}
              </div>
            </div>
            <span style="font-size: 0.68rem; background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan); padding: 2px 5px; border-radius: 3px; font-weight: 700;">${escapeHTML(c.type)}</span>
          </div>
        `;
      });
      trayHtml += '</div></div>';

      // Backward compatible Slot Control Cards HTML
      let slotsHtml = '<div style="display: flex; flex-direction: column; gap: 0.55rem;">';
      Object.keys(slotLabels).forEach((slotKey) => {
        const currentCompId = slots[slotKey];
        const assignedComp = lab.components.find(c => c.id === currentCompId);

        slotsHtml += `
          <div class="mb-slot-card" data-slot="${slotKey}" style="background: #111827; border: 1px solid ${assignedComp ? 'var(--accent-cyan)' : 'var(--border-color)'}; border-radius: 6px; padding: 0.55rem 0.8rem; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 0.76rem; color: var(--gold-primary); font-weight: 700; text-transform: uppercase;">${escapeHTML(slotLabels[slotKey])}</div>
              <div class="mb-slot-status" style="font-size: 0.88rem; font-weight: 600; color: ${assignedComp ? '#fff' : 'var(--text-secondary)'};">
                ${assignedComp ? `[Installed] ${escapeHTML(assignedComp.name)}` : '<em>[Empty Slot - Select component below or click PCB above]</em>'}
              </div>
            </div>
            <div>
              <select class="mb-assign-select" data-slot="${slotKey}" style="background: #1e293b; border: 1px solid var(--border-color); color: #fff; padding: 0.35rem 0.5rem; border-radius: 4px; font-size: 0.82rem;">
                <option value="">-- Assign Component --</option>
                ${lab.components.map(c => `
                  <option value="${c.id}" ${currentCompId === c.id ? 'selected' : ''}>${escapeHTML(c.name)}</option>
                `).join('')}
              </select>
            </div>
          </div>
        `;
      });
      slotsHtml += '</div>';

      container.innerHTML = `
        <div style="border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; background: #0b0f19;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <div style="font-weight: 700; color: var(--accent-cyan); font-size: 0.95rem;">ATX Workstation Motherboard Architecture &amp; Component Installation:</div>
            <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
              <button type="button" class="btn btn-secondary app-3d-open-btn" data-model="mobo" data-hotspot="socket" style="font-size: 0.75rem; padding: 4px 10px; border-color: rgba(212,175,55,0.4); color: var(--gold-light); display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
                <span style="font-weight: 800; background: rgba(212,175,55,0.2); padding: 1px 5px; border-radius: 3px;">3D</span> Inspect 3D HD Model
              </button>
              <button type="button" class="btn btn-primary app-3d-assemble-btn" data-model="mobo" style="font-size: 0.75rem; padding: 4px 12px; background: var(--gold-primary, #d4af37); color: #000; font-weight: 700; border: none; border-radius: 4px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; box-shadow: 0 2px 8px rgba(212,175,55,0.3);">
                <span style="font-weight: 800; background: rgba(0,0,0,0.2); padding: 1px 5px; border-radius: 3px;">SIM</span> Launch 3D Assembly Simulator
              </button>
            </div>
          </div>
          ${pcbHtml}
          ${trayHtml}
          <div style="font-weight: 700; color: var(--text-secondary); margin-bottom: 0.5rem; font-size: 0.85rem;">Slot Assignment Controls &amp; Status Cards:</div>
          ${slotsHtml}
        </div>
      `;

      // Event Listeners: 3D Inspection & Assembly Simulator Triggers
      container.querySelectorAll('.app-3d-open-btn').forEach((btn) => {
        btn.onclick = () => {
          const model = btn.getAttribute('data-model') || 'mobo';
          const hotspot = btn.getAttribute('data-hotspot') || null;
          if (window.APlus && window.APlus.App3DStage) {
            window.APlus.App3DStage.openModal(model, hotspot, {
              assemblyMode: false,
              slots: state.slots,
              onSlotUpdate: (updatedSlots) => {
                state.slots = Object.assign({}, updatedSlots);
                callbacks.onSelect({ slots: state.slots });
                this.renderMotherboardAssembly(container, state, callbacks);
              }
            });
          }
        };
      });

      container.querySelectorAll('.app-3d-assemble-btn').forEach((btn) => {
        btn.onclick = () => {
          if (window.APlus && window.APlus.App3DStage) {
            window.APlus.App3DStage.openModal('mobo', null, {
              assemblyMode: true,
              slots: state.slots,
              onSlotUpdate: (updatedSlots) => {
                state.slots = Object.assign({}, updatedSlots);
                callbacks.onSelect({ slots: state.slots });
                this.renderMotherboardAssembly(container, state, callbacks);
              }
            });
          }
        };
      });

      // Event Listeners: PCB Slots Click-to-Assign
      container.querySelectorAll('.mb-pcb-slot-empty, .mb-pcb-slot-target').forEach((targetEl) => {
        targetEl.onclick = () => {
          const slotKey = targetEl.getAttribute('data-slot');
          if (slotKey) {
            if (state._selectedTrayCompId) {
              updateSlot(slotKey, state._selectedTrayCompId);
              state._selectedTrayCompId = null;
            } else if (slots[slotKey]) {
              updateSlot(slotKey, null);
            }
          }
        };
      });

      // Event Listeners: Eject Buttons on PCB Badges
      container.querySelectorAll('.mb-pcb-eject-btn').forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const slotKey = btn.getAttribute('data-slot');
          if (slotKey) updateSlot(slotKey, null);
        };
      });

      // Event Listeners: Component Tray Click-to-Select
      container.querySelectorAll('.mb-tray-item').forEach((item) => {
        item.onclick = () => {
          const compId = item.getAttribute('data-comp');
          state._selectedTrayCompId = (state._selectedTrayCompId === compId) ? null : compId;
          this.renderMotherboardAssembly(container, state, callbacks);
        };
      });

      // Event Listeners: Dropdown selects on slot cards
      container.querySelectorAll('.mb-assign-select').forEach((sel) => {
        sel.onchange = (e) => {
          const slotKey = e.target.getAttribute('data-slot');
          updateSlot(slotKey, e.target.value || null);
        };
      });

      this.renderActionToolbar(container, 'motherboardAssembly', state, callbacks, () => {
        state.slots = { socket_cpu: null, slot_ram1: null, slot_pcie_top: null, slot_m2_nvme: null, conn_atx_power: null };
        state._selectedTrayCompId = null;
        callbacks.onSelect({ slots: state.slots });
        this.renderMotherboardAssembly(container, state, callbacks);
      });
    },

    /* 3. Windows Disk Management Console Simulation */
    renderWindowsConsole(container, state, callbacks) {
      callbacks = callbacks || {};
      if (typeof callbacks.onSelect !== 'function') callbacks.onSelect = () => {};
      if (typeof callbacks.onSubmit !== 'function') callbacks.onSubmit = () => {};

      const lab = PBQ_CATALOG.windowsConsole;
      const isInit = Boolean(state.diskInitialized);
      const isVol = Boolean(state.volumeCreated);

      const updateState = (updates) => {
        Object.assign(state, updates);
        callbacks.onSelect(state);
        this.renderWindowsConsole(container, state, callbacks);
      };

      container.innerHTML = `
        <div style="border: 1px solid #334155; border-radius: 8px; overflow: hidden; background: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="background: #1e293b; padding: 0.5rem 0.8rem; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.85rem; font-weight: 700; color: #94a3b8;">Computer Management (Local) > Disk Management</span>
            <span style="font-size: 0.78rem; color: #64748b;">Action | View | Help</span>
          </div>

          <div style="padding: 1rem;">
            <div style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem; margin-bottom: 0.8rem; border: 1px solid #334155; border-radius: 4px; overflow: hidden;">
              <div style="background: #1e293b; padding: 0.5rem; font-size: 0.8rem; border-right: 1px solid #334155;">
                <strong>Disk 0</strong><br>Basic 500 GB<br><span style="color: #10b981;">Online</span>
              </div>
              <div style="background: #092e20; padding: 0.5rem; font-size: 0.85rem; display: flex; align-items: center;">
                <strong>(C:) 500 GB NTFS</strong> &nbsp; Healthy (Boot, Page File, Crash Dump)
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem; margin-bottom: 1rem; border: 1px solid #334155; border-radius: 4px; overflow: hidden;">
              <div style="background: #1e293b; padding: 0.5rem; font-size: 0.8rem; border-right: 1px solid #334155;">
                <strong>Disk 1</strong><br>2048 GB<br>
                ${isInit ? `<span style="color: #10b981;">Online [${escapeHTML(state.partitionStyle || 'GPT')}]</span>` : '<span style="color: #ef4444; font-weight: 700;">Not Initialized</span>'}
              </div>
              <div style="background: ${isVol ? '#082f49' : '#1f2937'}; padding: 0.5rem; font-size: 0.85rem; display: flex; align-items: center; justify-content: space-between;">
                ${isVol ? `
                  <div>
                    <strong>(${escapeHTML(state.driveLetter || 'D:')}) ${escapeHTML(state.volumeLabel || 'DATA_STORE')}</strong> 2048 GB ${escapeHTML(state.fileSystem || 'NTFS')}<br>
                    <span style="color: #38bdf8; font-size: 0.78rem;">Healthy (Primary Partition)</span>
                  </div>
                ` : `
                  <div style="color: #94a3b8;">
                    <strong>2048.00 GB</strong><br>Unallocated
                  </div>
                `}
              </div>
            </div>

            <div style="background: #1e293b; border-radius: 6px; padding: 0.8rem; display: flex; flex-direction: column; gap: 0.6rem;">
              <div style="font-weight: 700; font-size: 0.85rem; color: var(--accent-cyan);">Available Administrative Actions:</div>
              <div style="display: flex; gap: 0.6rem; flex-wrap: wrap;">
                ${!isInit ? `
                  <button type="button" id="btn_init_gpt" class="btn btn-primary" style="font-size: 0.82rem;">Initialize Disk 1 as GPT</button>
                  <button type="button" id="btn_init_mbr" class="btn btn-secondary" style="font-size: 0.82rem;">Initialize Disk 1 as MBR</button>
                ` : !isVol ? `
                  <button type="button" id="btn_create_vol" class="btn btn-primary" style="font-size: 0.82rem;">Run New Simple Volume Wizard</button>
                ` : `
                  <div style="color: #10b981; font-weight: 700; font-size: 0.88rem;">Configured: Volume (${escapeHTML(state.driveLetter)}) configured with ${escapeHTML(state.fileSystem)} and labeled ${escapeHTML(state.volumeLabel)}.</div>
                  <button type="button" id="btn_reset_disk" class="btn btn-secondary" style="font-size: 0.78rem;">Reset Disk 1</button>
                `}
              </div>
            </div>
          </div>
        </div>
      `;

      const btnGpt = container.querySelector('#btn_init_gpt');
      if (btnGpt) btnGpt.onclick = () => updateState({ diskInitialized: true, partitionStyle: 'GPT' });

      const btnMbr = container.querySelector('#btn_init_mbr');
      if (btnMbr) btnMbr.onclick = () => updateState({ diskInitialized: true, partitionStyle: 'MBR' });

      const btnVol = container.querySelector('#btn_create_vol');
      if (btnVol) {
        btnVol.onclick = () => {
          updateState({
            volumeCreated: true,
            driveLetter: 'D:',
            fileSystem: 'NTFS',
            volumeLabel: 'DATA_STORE'
          });
        };
      }

      const btnReset = container.querySelector('#btn_reset_disk');
      if (btnReset) btnReset.onclick = () => updateState(JSON.parse(JSON.stringify(lab.defaultState)));

      this.renderActionToolbar(container, 'windowsConsole', state, callbacks, () => {
        Object.keys(state).forEach(k => delete state[k]);
        Object.assign(state, JSON.parse(JSON.stringify(lab.defaultState)));
        callbacks.onSelect(state);
        this.renderWindowsConsole(container, state, callbacks);
      });
    },

    /* 4. Network Cable Crimping & Pinout Simulation */
    renderCablePinout(container, state, callbacks) {
      callbacks = callbacks || {};
      if (typeof callbacks.onSelect !== 'function') callbacks.onSelect = () => {};
      if (typeof callbacks.onSubmit !== 'function') callbacks.onSubmit = () => {};

      const lab = PBQ_CATALOG.cablePinout;
      const sequence = state.sequence || [null, null, null, null, null, null, null, null];
      state.sequence = sequence;

      const updateSlotWire = (pinIdx, wireKey) => {
        sequence[pinIdx] = wireKey || null;
        state.sequence = sequence;
        callbacks.onSelect({ sequence });
        this.renderCablePinout(container, state, callbacks);
      };

      const selectedWireKey = state._selectedWireKey || null;
      const refStandard = state._refStandard || 'T568B';
      const testerRun = Boolean(state._testerRun);

      // Find which pin currently holds a wire code
      const findPinForWire = (wireCode) => {
        return sequence.indexOf(wireCode);
      };

      // 1. RJ-45 Modular Plug with 8 Conductor Channels & Gold Pins
      let plugChannelsHtml = '<div style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 0.35rem; position: relative; z-index: 2;">';
      for (let i = 0; i < 8; i++) {
        const currentWire = sequence[i];
        const wireSpec = currentWire ? WIRE_COLORS[currentWire] : null;
        const bgStyle = wireSpec ? (wireSpec.stripeBg || wireSpec.bg) : 'rgba(15, 23, 42, 0.6)';
        const borderStyle = wireSpec ? `2px solid ${wireSpec.border}` : '1px dashed #475569';
        const isTarget = selectedWireKey !== null;

        plugChannelsHtml += `
          <div style="display: flex; flex-direction: column; align-items: center;">
            <!-- Gold Contact Head -->
            <div style="width: 100%; font-weight: 800; font-size: 0.72rem; color: #fbbf24; background: linear-gradient(180deg, #d97706 0%, #78350f 100%); border: 1px solid #f59e0b; border-radius: 4px 4px 0 0; padding: 3px 0; text-align: center; box-shadow: 0 0 8px rgba(251,191,36,0.3);">
              ${i + 1}
            </div>

            <!-- Wire Conductor Channel -->
            <div class="pin-wire-channel" data-pin="${i}" style="width: 100%; height: 110px; background: rgba(15, 23, 42, 0.7); border-left: 1px solid rgba(255,255,255,0.08); border-right: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 4px 2px; cursor: pointer; position: relative;">
              <!-- Visual Wire Swatch -->
              <div class="pin-swatch" data-pin="${i}" style="width: 22px; height: 75px; border-radius: 3px; border: ${borderStyle}; background: ${bgStyle}; box-shadow: ${wireSpec ? '0 0 8px rgba(0,0,0,0.5)' : 'none'}; display: flex; align-items: center; justify-content: center;">
                ${currentWire ? `<span style="font-size: 0.62rem; font-weight: 800; color: #fff; background: rgba(0,0,0,0.6); padding: 1px 3px; border-radius: 2px;">${currentWire}</span>` : ''}
              </div>

              <!-- Channel Label or Remove Button -->
              ${currentWire ? `
                <button type="button" class="pin-clear-btn" data-pin="${i}" style="background: rgba(239, 68, 68, 0.3); border: 1px solid #ef4444; color: #fca5a5; font-size: 0.58rem; padding: 1px 4px; border-radius: 3px; cursor: pointer; margin-top: 2px;">✕ Clear</button>
              ` : `
                <div style="font-size: 0.58rem; color: ${isTarget ? '#facc15' : '#64748b'}; text-align: center;">${isTarget ? '▶ Place' : 'Empty'}</div>
              `}
            </div>

            <!-- Backward Compatible Wire Select Dropdown -->
            <div style="width: 100%; margin-top: 4px;">
              <select class="pin-wire-select" data-pin="${i}" style="width: 100%; background: #0f172a; border: 1px solid #334155; color: #fff; font-size: 0.68rem; padding: 0.2rem 0; text-align: center; border-radius: 3px;">
                <option value="">--</option>
                ${Object.keys(WIRE_COLORS).map(k => `
                  <option value="${k}" ${currentWire === k ? 'selected' : ''}>${k}</option>
                `).join('')}
              </select>
            </div>
          </div>
        `;
      }
      plugChannelsHtml += '</div>';

      // Transparent RJ-45 Plug Housing Container HTML
      const plugHousingHtml = `
        <div style="background: rgba(15, 23, 42, 0.7); border: 2px solid #64748b; border-radius: 12px 12px 0 0; padding: 1rem; position: relative; box-shadow: inset 0 0 30px rgba(255,255,255,0.03), 0 8px 24px rgba(0,0,0,0.4); margin-bottom: 0;">
          <!-- Polycarbonate Sheen Highlight -->
          <div style="position: absolute; top: 0; left: 0; right: 0; height: 18px; background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 100%); border-radius: 10px 10px 0 0; pointer-events: none;"></div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.4rem;">
            <div style="font-weight: 700; color: #e2e8f0; font-size: 0.86rem; display: flex; align-items: center; gap: 0.4rem;">
              <span>RJ-45 (8P8C) Modular Plug Housing</span>
              <span style="font-size: 0.72rem; color: #94a3b8; font-weight: 400;">(Top Contacts 1-8)</span>
            </div>
            <div style="font-size: 0.75rem; color: #ca8a04; font-weight: 700; font-family: monospace;">GOLD-PLATED 50µm PINS</div>
          </div>

          ${plugChannelsHtml}
        </div>

        <!-- Strain Relief Crimp Collar & Cat6 Cable Sleeve -->
        <div style="background: linear-gradient(180deg, #0369a1 0%, #0c4a6e 100%); border: 2px solid #38bdf8; border-top: none; border-radius: 0 0 10px 10px; padding: 0.6rem 1rem; display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
          <div style="font-size: 0.75rem; color: #e0f2fe; font-weight: 700;">
            CAT6 UTP 4-PAIR 24AWG SOLID COPPER CABLE
          </div>
          <div style="font-size: 0.72rem; color: #bae6fd; font-family: monospace;">
            1000BASE-T // 550MHz // ANSI/TIA-568.2-D
          </div>
        </div>
      `;

      // 2. Wire Staging Rack Palette HTML
      let rackHtml = `
        <div style="background: #111827; border: 1px solid var(--border-color); border-radius: 8px; padding: 0.85rem; margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <div style="font-weight: 700; color: var(--accent-cyan); font-size: 0.88rem;">Twisted-Pair Conductor Wire Staging Rack:</div>
              <div style="font-size: 0.76rem; color: ${selectedWireKey ? '#facc15' : 'var(--text-secondary)'}; font-weight: 600;">
                ${selectedWireKey ? `Selected: [${selectedWireKey} - ${WIRE_COLORS[selectedWireKey]?.name}] - Click any pin above to insert or swap` : 'Click a wire to pick it up, then click Pin 1 to Pin 8'}
              </div>
            </div>
            <div style="display: flex; gap: 0.4rem;">
              <button type="button" id="wire_btn_clear_all" class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.55rem;">Clear All</button>
              <button type="button" id="wire_btn_fill_t568b" class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.55rem; color: #10b981;">Fill T568B</button>
              <button type="button" id="wire_btn_fill_t568a" class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.55rem;">Fill T568A</button>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 0.45rem;">
      `;

      Object.keys(WIRE_COLORS).forEach((k) => {
        const wire = WIRE_COLORS[k];
        const isSelected = selectedWireKey === k;
        const assignedPin = findPinForWire(k);

        rackHtml += `
          <div class="wire-rack-item" data-wire="${k}" style="background: ${isSelected ? 'rgba(212, 160, 23, 0.2)' : '#1e293b'}; border: 1px solid ${isSelected ? 'var(--gold-primary)' : (assignedPin >= 0 ? '#475569' : 'var(--border-color)')}; border-radius: 6px; padding: 0.45rem 0.6rem; cursor: pointer; transition: all 0.15s ease; display: flex; align-items: center; gap: 0.55rem;">
            <div style="width: 16px; height: 36px; border-radius: 3px; border: 2px solid ${wire.border}; background: ${wire.stripeBg || wire.bg}; flex-shrink: 0;"></div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 0.78rem; font-weight: 700; color: ${isSelected ? '#facc15' : '#fff'};">${k} (${escapeHTML(wire.name)})</div>
              <div style="font-size: 0.68rem; color: ${assignedPin >= 0 ? '#10b981' : 'var(--text-secondary)'}; font-weight: 600;">
                ${assignedPin >= 0 ? `● Placed in Pin ${assignedPin + 1}` : '○ In Rack'}
              </div>
            </div>
          </div>
        `;
      });
      rackHtml += '</div></div>';

      // 3. T568A vs T568B Standard Reference Guide HTML
      const isRefB = refStandard === 'T568B';
      const refSeq = isRefB ? T568B_SEQUENCE : T568A_SEQUENCE;
      const refTitle = isRefB ? 'ANSI/TIA-568.2-D T568B Commercial Standard' : 'ANSI/TIA-568.2-D T568A Residential & Legacy Standard';

      const refGuideHtml = `
        <div style="background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 0.85rem; margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; flex-wrap: wrap; gap: 0.4rem;">
            <div style="font-weight: 700; font-size: 0.85rem; color: var(--gold-primary);">Official CompTIA Standard Reference Guide:</div>
            <div style="display: flex; gap: 0.35rem;">
              <button type="button" id="toggle_ref_t568b" class="btn ${isRefB ? 'btn-primary' : 'btn-secondary'}" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;">T568B Standard (Exam Focus)</button>
              <button type="button" id="toggle_ref_t568a" class="btn ${!isRefB ? 'btn-primary' : 'btn-secondary'}" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;">T568A Standard</button>
            </div>
          </div>

          <div style="font-size: 0.78rem; color: #94a3b8; margin-bottom: 0.55rem;">
            <strong>${refTitle}:</strong> ${isRefB ? 'Required for ticket DC-5120.' : 'Pairs 2 and 3 swapped.'}
          </div>

          <!-- Color Swatch Sequence Bar -->
          <div style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 0.3rem; margin-bottom: 0.6rem;">
            ${refSeq.map((code, idx) => {
              const spec = WIRE_COLORS[code];
              return `
                <div style="background: #1e293b; border: 1px solid #334155; border-radius: 4px; padding: 0.35rem 0.2rem; text-align: center;">
                  <div style="font-size: 0.65rem; color: #94a3b8; font-weight: 700;">P${idx + 1}</div>
                  <div style="width: 14px; height: 26px; margin: 3px auto; border-radius: 2px; border: 1px solid ${spec.border}; background: ${spec.stripeBg || spec.bg};"></div>
                  <div style="font-size: 0.65rem; font-weight: 700; color: #fff;">${code}</div>
                </div>
              `;
            }).join('')}
          </div>

          <div style="font-size: 0.74rem; color: #cbd5e1; background: rgba(56, 189, 248, 0.08); border-left: 3px solid var(--accent-cyan); padding: 0.4rem 0.6rem;">
            <strong>CompTIA Mnemonic:</strong> T568A vs T568B swap <em>ONLY</em> Pair 2 (Orange) and Pair 3 (Green). Pins 1 &amp; 2 swap with Pins 3 &amp; 6. Pair 1 (Blue - Pins 4 &amp; 5) and Pair 4 (Brown - Pins 7 &amp; 8) remain strictly identical in both standards.
          </div>
        </div>
      `;

      // 4. Interactive Continuity Cable Tester Simulation HTML
      let testerResultsHtml = '';
      if (testerRun) {
        let passCount = 0;
        let isT568A = true;
        let isT568B = true;

        const pinStatuses = [];
        for (let i = 0; i < 8; i++) {
          const wire = sequence[i];
          const expB = T568B_SEQUENCE[i];
          const expA = T568A_SEQUENCE[i];

          if (wire !== expA) isT568A = false;
          if (wire !== expB) isT568B = false;

          if (!wire) {
            pinStatuses.push({ pin: i + 1, status: 'OPEN', color: '#f59e0b', text: 'OPEN' });
          } else if (wire === expB) {
            passCount++;
            pinStatuses.push({ pin: i + 1, status: 'PASS', color: '#10b981', text: 'PASS' });
          } else {
            pinStatuses.push({ pin: i + 1, status: 'FAULT', color: '#ef4444', text: 'MISWIRE' });
          }
        }

        let verdictText = '';
        let verdictColor = '#ef4444';
        if (isT568B) {
          verdictColor = '#10b981';
          verdictText = 'CONTINUITY OK: All 8 pins match T568B. 1000BASE-T Gigabit certified straight-through cable!';
        } else if (isT568A) {
          verdictColor = '#eab308';
          verdictText = 'STANDARDS MISMATCH: Continuity valid for T568A, but ticket DC-5120 requires T568B sequence.';
        } else {
          verdictText = `CONTINUITY FAULT: ${passCount} of 8 pins correct. Review pin LEDs below to correct miswired or open conductors.`;
        }

        testerResultsHtml = `
          <div style="margin-top: 0.65rem; background: #080d14; border: 1px solid #334155; border-radius: 6px; padding: 0.65rem;">
            <div style="font-size: 0.8rem; font-weight: 700; color: ${verdictColor}; margin-bottom: 0.5rem;">
              ${escapeHTML(verdictText)}
            </div>

            <!-- LED Strip 1-8 -->
            <div style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 0.35rem; text-align: center;">
              ${pinStatuses.map(p => `
                <div style="background: #1e293b; border: 1px solid ${p.color}; border-radius: 4px; padding: 0.35rem 0.2rem;">
                  <div style="width: 10px; height: 10px; border-radius: 50%; background: ${p.color}; box-shadow: 0 0 8px ${p.color}; margin: 0 auto 3px auto;"></div>
                  <div style="font-size: 0.65rem; font-weight: 700; color: #fff;">Pin ${p.pin}</div>
                  <div style="font-size: 0.58rem; font-weight: 800; color: ${p.color};">${p.text}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      const testerHtml = `
        <div style="background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 0.85rem; margin-bottom: 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 700; font-size: 0.85rem; color: var(--accent-cyan); display: flex; align-items: center; gap: 0.4rem;">
                <span>Digital Continuity Cable Tester Simulation</span>
                <span style="font-size: 0.7rem; color: #10b981;">● Ready</span>
              </div>
              <div style="font-size: 0.75rem; color: var(--text-secondary);">Verify electrical continuity across all 8 pins before submitting ticket.</div>
            </div>
            <button type="button" id="btn_run_cable_tester" class="btn btn-primary" style="font-size: 0.8rem; padding: 0.4rem 0.85rem; display: inline-flex; align-items: center; gap: 0.35rem;">
              <span>⚡</span> <span>Run Cable Continuity Test</span>
            </button>
          </div>
          ${testerResultsHtml}
        </div>
      `;

      container.innerHTML = `
        <div style="border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; background: #0b0f19;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <div style="font-weight: 700; color: var(--accent-cyan); font-size: 0.95rem;">RJ-45 Modular Plug Termination &amp; T568B Pinout Simulator:</div>
            <button type="button" class="btn btn-secondary app-3d-open-btn" data-model="rj45" data-hotspot="pins" style="font-size: 0.75rem; padding: 4px 10px; border-color: rgba(212,175,55,0.4); color: var(--gold-light); display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
              <span style="font-weight: 800; background: rgba(212,175,55,0.2); padding: 1px 5px; border-radius: 3px;">3D</span> Inspect 3D HD Plug
            </button>
          </div>
          ${plugHousingHtml}
          ${rackHtml}
          ${refGuideHtml}
          ${testerHtml}
        </div>
      `;

      // Event Listeners: 3D Inspection Trigger
      container.querySelectorAll('.app-3d-open-btn').forEach((btn) => {
        btn.onclick = () => {
          const model = btn.getAttribute('data-model') || 'rj45';
          const hotspot = btn.getAttribute('data-hotspot') || null;
          if (window.APlus && window.APlus.App3DStage) {
            window.APlus.App3DStage.openModal(model, hotspot);
          }
        };
      });

      // Event Listeners: Plug wire channels click
      container.querySelectorAll('.pin-wire-channel').forEach((ch) => {
        ch.onclick = () => {
          const pinIdx = parseInt(ch.getAttribute('data-pin'), 10);
          if (state._selectedWireKey) {
            // Assign selected wire from rack
            const oldWire = sequence[pinIdx];
            updateSlotWire(pinIdx, state._selectedWireKey);
            state._selectedWireKey = null;
          } else if (sequence[pinIdx]) {
            // Pick up current wire to swap
            state._selectedWireKey = sequence[pinIdx];
            this.renderCablePinout(container, state, callbacks);
          }
        };
      });

      // Event Listeners: Clear pin button
      container.querySelectorAll('.pin-clear-btn').forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const pinIdx = parseInt(btn.getAttribute('data-pin'), 10);
          updateSlotWire(pinIdx, null);
        };
      });

      // Event Listeners: Wire rack item click
      container.querySelectorAll('.wire-rack-item').forEach((item) => {
        item.onclick = () => {
          const wireCode = item.getAttribute('data-wire');
          state._selectedWireKey = (state._selectedWireKey === wireCode) ? null : wireCode;
          this.renderCablePinout(container, state, callbacks);
        };
      });

      // Event Listeners: Quick helper buttons
      const btnClearAll = container.querySelector('#wire_btn_clear_all');
      if (btnClearAll) {
        btnClearAll.onclick = () => {
          state.sequence = [null, null, null, null, null, null, null, null];
          state._selectedWireKey = null;
          callbacks.onSelect({ sequence: state.sequence });
          this.renderCablePinout(container, state, callbacks);
        };
      }

      const btnFillT568B = container.querySelector('#wire_btn_fill_t568b');
      if (btnFillT568B) {
        btnFillT568B.onclick = () => {
          state.sequence = [...T568B_SEQUENCE];
          state._selectedWireKey = null;
          callbacks.onSelect({ sequence: state.sequence });
          this.renderCablePinout(container, state, callbacks);
        };
      }

      const btnFillT568A = container.querySelector('#wire_btn_fill_t568a');
      if (btnFillT568A) {
        btnFillT568A.onclick = () => {
          state.sequence = [...T568A_SEQUENCE];
          state._selectedWireKey = null;
          callbacks.onSelect({ sequence: state.sequence });
          this.renderCablePinout(container, state, callbacks);
        };
      }

      // Event Listeners: Reference Guide Toggles
      const toggleB = container.querySelector('#toggle_ref_t568b');
      if (toggleB) {
        toggleB.onclick = () => {
          state._refStandard = 'T568B';
          this.renderCablePinout(container, state, callbacks);
        };
      }

      const toggleA = container.querySelector('#toggle_ref_t568a');
      if (toggleA) {
        toggleA.onclick = () => {
          state._refStandard = 'T568A';
          this.renderCablePinout(container, state, callbacks);
        };
      }

      // Event Listeners: Continuity Tester Run Button
      const btnTester = container.querySelector('#btn_run_cable_tester');
      if (btnTester) {
        btnTester.onclick = () => {
          state._testerRun = true;
          this.renderCablePinout(container, state, callbacks);
        };
      }

      // Backward compatible dropdown change
      container.querySelectorAll('.pin-wire-select').forEach((sel) => {
        sel.onchange = (e) => {
          const pinIdx = parseInt(e.target.getAttribute('data-pin'), 10);
          updateSlotWire(pinIdx, e.target.value || null);
        };
      });

      this.renderActionToolbar(container, 'cablePinout', state, callbacks, () => {
        state.sequence = [null, null, null, null, null, null, null, null];
        state._selectedWireKey = null;
        state._testerRun = false;
        callbacks.onSelect({ sequence: state.sequence });
        this.renderCablePinout(container, state, callbacks);
      });
    },

    /* 5. Port Matcher (Unified) */
    renderPortMatcher(container, state, callbacks) {
      const pairs = PBQ_CATALOG.portMatcher.pairs;
      const matches = (state && state.matches) ? state.matches : (state || {});
      let selectedLeft = null;

      container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 0.5rem;" id="port_grid">
          <div id="port_left" style="display: flex; flex-direction: column; gap: 0.5rem;"></div>
          <div id="port_right" style="display: flex; flex-direction: column; gap: 0.5rem;"></div>
        </div>
      `;

      const leftCol = container.querySelector('#port_left');
      const rightCol = container.querySelector('#port_right');

      pairs.forEach((pair, idx) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-secondary';
        b.style = 'text-align: left; justify-content: space-between; font-size: 0.85rem; padding: 0.55rem 0.8rem;';
        const matched = matches[pair.name];
        b.innerHTML = `<span>${escapeHTML(pair.name)}</span> <span style="font-weight: 700; color: var(--accent-cyan);">${matched ? '-> ' + escapeHTML(matched) : ''}</span>`;

        b.onclick = () => {
          selectedLeft = pair.name;
          leftCol.querySelectorAll('button').forEach((btn, i) => {
            btn.style.borderColor = (i === idx) ? 'var(--accent-cyan)' : 'var(--border-color)';
          });
        };
        leftCol.appendChild(b);
      });

      const shuffledPorts = (container._shuffled || [...pairs].map(p => p.port).sort(() => Math.random() - 0.5));
      container._shuffled = shuffledPorts;

      shuffledPorts.forEach((portVal) => {
        const rb = document.createElement('button');
        rb.type = 'button';
        rb.className = 'btn btn-secondary';
        rb.style = 'font-size: 0.85rem; font-weight: 600; justify-content: center; padding: 0.55rem;';
        rb.innerText = portVal;

        rb.onclick = () => {
          if (!selectedLeft) {
            alert('Select a service protocol on the left column first, then match it to the port number.');
            return;
          }
          const nextMatches = { ...matches, [selectedLeft]: portVal };
          callbacks.onSelect({ matches: nextMatches });
          this.renderPortMatcher(container, { matches: nextMatches }, callbacks);
        };
        rightCol.appendChild(rb);
      });
    },

    /* 6. Printer Order (Unified) */
    renderPrinterOrder(container, state, callbacks) {
      const correctSteps = PBQ_CATALOG.printerOrder.steps;
      let order = (state && Array.isArray(state.sequence)) ? [...state.sequence] : (Array.isArray(state) ? [...state] : [...correctSteps].sort(() => Math.random() - 0.5));

      container.innerHTML = `
        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem;">Arrange the laser print cycle stages in sequence from 1 to 7:</div>
        <div id="printer_steps_list" style="display: flex; flex-direction: column; gap: 0.5rem;"></div>
      `;

      const list = container.querySelector('#printer_steps_list');
      order.forEach((stepText, idx) => {
        const item = document.createElement('div');
        item.style = 'display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); border: 1px solid var(--border-color); padding: 0.6rem 0.8rem; border-radius: 6px; font-size: 0.88rem;';
        item.innerHTML = `
          <div style="flex: 1;"><span style="background: rgba(212, 160, 23, 0.2); color: var(--gold-primary); font-weight: 700; padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.78rem; margin-right: 0.5rem;">Stage ${idx + 1}</span> <span>${escapeHTML(stepText)}</span></div>
          <div style="display: flex; gap: 0.3rem;">
            <button type="button" class="btn btn-secondary up-btn" style="padding: 0.2rem 0.5rem;" ${idx === 0 ? 'disabled' : ''}>▲</button>
            <button type="button" class="btn btn-secondary down-btn" style="padding: 0.2rem 0.5rem;" ${idx === order.length - 1 ? 'disabled' : ''}>▼</button>
          </div>
        `;

        item.querySelector('.up-btn').onclick = () => {
          if (idx > 0) {
            const next = [...order];
            [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
            callbacks.onSelect({ sequence: next });
            this.renderPrinterOrder(container, { sequence: next }, callbacks);
          }
        };

        item.querySelector('.down-btn').onclick = () => {
          if (idx < order.length - 1) {
            const next = [...order];
            [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
            callbacks.onSelect({ sequence: next });
            this.renderPrinterOrder(container, { sequence: next }, callbacks);
          }
        };

        list.appendChild(item);
      });
    },

    /* 7. CLI Diagnostic Terminal */
    renderCliTerminal(container, state, callbacks) {
      const history = (state && Array.isArray(state.history)) ? state.history : ['Microsoft Windows [Version 10.0.22631.3007]', '(c) Microsoft Corporation. All rights reserved.', ''];
      const cmds = PBQ_CATALOG.cliTerminal.commands;

      container.innerHTML = `
        <div style="background: #000; border: 1px solid #334155; border-radius: 6px; font-family: 'Consolas', 'Courier New', monospace; padding: 0.8rem; color: #f8fafc; font-size: 0.85rem; min-height: 220px; max-height: 320px; overflow-y: auto;" id="term_screen">
          ${history.map(line => `<div>${escapeHTML(line)}</div>`).join('')}
          <div style="display: flex; align-items: center; margin-top: 0.5rem;">
            <span style="color: var(--gold-primary); margin-right: 0.4rem;">C:\\Windows\\system32></span>
            <input type="text" id="term_cli_input" style="flex: 1; background: transparent; border: none; color: #fff; font-family: inherit; font-size: inherit; outline: none;" placeholder="Type command..." />
          </div>
        </div>
      `;

      const inp = container.querySelector('#term_cli_input');
      const screen = container.querySelector('#term_screen');

      inp.onkeydown = (e) => {
        if (e.key === 'Enter') {
          const raw = inp.value.trim().toLowerCase();
          inp.value = '';
          if (!raw) return;

          const nextHist = [...history, `C:\\Windows\\system32>${raw}`];
          if (cmds[raw]) {
            nextHist.push(cmds[raw]);
          } else if (raw === 'help') {
            nextHist.push('Supported Commands: ' + Object.keys(cmds).join(', '));
          } else {
            nextHist.push(`'${raw}' is not recognized as an internal or external command, operable program or batch file.`);
          }
          nextHist.push('');

          callbacks.onSelect({ history: nextHist, lastCommand: raw });
          this.renderCliTerminal(container, { history: nextHist }, callbacks);
          setTimeout(() => {
            const newInp = container.querySelector('#term_cli_input');
            if (newInp) newInp.focus();
            screen.scrollTop = screen.scrollHeight;
          }, 50);
        }
      };
    },

    /* 8. 42U Datacenter Server Rack Simulation */
    renderDatacenterRack(container, state, callbacks) {
      callbacks = callbacks || {};
      if (typeof callbacks.onSelect !== 'function') callbacks.onSelect = () => {};
      if (typeof callbacks.onSubmit !== 'function') callbacks.onSubmit = () => {};

      const slots = state.slots || {};
      state.slots = slots;
      const lab = PBQ_CATALOG.datacenterRack;

      const slotLabels = {
        'u41_42_tor': 'Top-of-Rack Switch Slot (U41-U42)',
        'u40_patch': 'Structured Patch Panel Slot (U40)',
        'u36_37_server': '2U Compute Server Zone (U36-U37)',
        'u34_storage': '1U NVMe Storage Array Slot (U34)',
        'u1_3_ups': 'Rack Base UPS Battery Slot (U1-U3)'
      };

      const slotHints = {
        'u41_42_tor': 'High bandwidth aggregation; short patch leads to servers and overhead cable trays.',
        'u40_patch': 'Cat6A keystone patch panel directly adjacent to top-of-rack switch.',
        'u36_37_server': '2U virtualization server for primary host compute workloads.',
        'u34_storage': 'High-IOPS all-flash storage tier with fast PCIe interconnects.',
        'u1_3_ups': 'Critical safety rule: Heaviest equipment placed at the base to prevent tipping hazards.'
      };

      const selectedTrayComp = state._selectedRackCompId || null;

      const updateSlot = (slotKey, compId) => {
        slots[slotKey] = compId || null;
        callbacks.onSelect({ slots });
        this.renderDatacenterRack(container, state, callbacks);
      };

      // Helper to find slot key where a component is currently installed
      const findSlotForComp = (compId) => {
        for (const [k, v] of Object.entries(slots)) {
          if (v === compId) return k;
        }
        return null;
      };

      // Safety Monitor: Check if heavy UPS is in upper rack (>U20)
      const upperSlots = ['u41_42_tor', 'u40_patch', 'u36_37_server', 'u34_storage'];
      const hasUpperUps = upperSlots.some(k => slots[k] === 'comp_ups_battery');
      const hasBaseUps = slots.u1_3_ups === 'comp_ups_battery';

      let stabilityBanner = '';
      if (hasUpperUps) {
        stabilityBanner = `
          <div style="background: rgba(239, 68, 68, 0.2); border: 2px solid #ef4444; border-radius: 6px; padding: 0.6rem 0.85rem; margin-bottom: 0.9rem; display: flex; align-items: center; gap: 0.6rem;">
            <span style="font-size: 1.2rem;">⚠</span>
            <div>
              <div style="font-weight: 800; color: #ef4444; font-size: 0.84rem;">CRITICAL SAFETY WARNING: TIPPING HAZARD DETECTED</div>
              <div style="font-size: 0.76rem; color: #fca5a5;">Tipping Hazard: Heavy UPS battery backup must be installed at the base of the rack (U1-U3) to maintain stability.</div>
            </div>
          </div>
        `;
      } else if (hasBaseUps) {
        stabilityBanner = `
          <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; border-radius: 6px; padding: 0.5rem 0.85rem; margin-bottom: 0.9rem; display: flex; align-items: center; gap: 0.5rem;">
            <span style="color: #10b981; font-weight: 800;">✔</span>
            <div style="font-size: 0.78rem; color: #e2e8f0;">
              <strong>Center of Gravity Optimal:</strong> 42kg UPS battery backup anchored at U1-U3 base. Enclosure complies with EIA-310 &amp; ASHRAE seismic safety guidelines.
            </div>
          </div>
        `;
      } else {
        stabilityBanner = `
          <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid #334155; border-radius: 6px; padding: 0.45rem 0.85rem; margin-bottom: 0.9rem; display: flex; align-items: center; gap: 0.5rem;">
            <span style="color: var(--accent-cyan);">ℹ</span>
            <div style="font-size: 0.76rem; color: #94a3b8;">
              <strong>Enclosure Stability Monitor:</strong> Base power reserve pending. Place heavy battery backup at U1-U3 to stabilize the cabinet.
            </div>
          </div>
        `;
      }

      // Render Faceplate Graphic for a slot bay
      const renderFaceplate = (slotKey, expectedId, uSizeText, bayName) => {
        const assignedId = slots[slotKey];
        const assignedComp = lab.components.find(c => c.id === assignedId);
        const isCorrect = assignedId === expectedId;
        const isTarget = selectedTrayComp !== null;

        if (!assignedComp) {
          return `
            <div class="rack-bay-target" data-slot="${slotKey}" style="background: rgba(15, 23, 42, 0.6); border: 2px dashed ${isTarget ? '#eab308' : '#38bdf8'}; border-radius: 4px; padding: 0.6rem 0.8rem; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: all 0.15s ease;">
              <div>
                <div style="font-size: 0.78rem; font-weight: 700; color: ${isTarget ? '#facc15' : 'var(--accent-cyan)'};">${escapeHTML(bayName)} (${uSizeText})</div>
                <div style="font-size: 0.68rem; color: #94a3b8;">${isTarget ? '▶ Click to mount selected hardware' : '[ Empty Bay - Click to Install ]'}</div>
              </div>
              <span style="font-size: 0.68rem; background: #1e293b; color: #94a3b8; padding: 2px 6px; border-radius: 3px;">${uSizeText} Empty</span>
            </div>
          `;
        }

        if (isCorrect) {
          let deviceGraphic = '';
          if (slotKey === 'u41_42_tor') {
            deviceGraphic = `
              <div style="background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border: 2px solid #38bdf8; border-radius: 4px; padding: 0.45rem 0.75rem; box-shadow: 0 0 14px rgba(56,189,248,0.25); display: flex; justify-content: space-between; align-items: center; gap: 0.6rem;">
                <div style="flex: 1;">
                  <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 2px;">
                    <span style="font-weight: 800; font-size: 0.78rem; color: #38bdf8;">1U 48-Port 10GbE Switch (ToR Managed)</span>
                    <span style="font-size: 0.6rem; color: #10b981; font-weight: 700; background: rgba(16,185,129,0.2); padding: 1px 4px; border-radius: 3px;">✔ MOUNTED U41-U42</span>
                  </div>
                  <!-- Simulated 48 RJ45 Port Matrix with Link LEDs -->
                  <div style="display: flex; gap: 2px; align-items: center; margin-top: 3px;">
                    <div style="display: grid; grid-template-columns: repeat(12, 1fr); gap: 2px; background: #080d14; border: 1px solid #334155; padding: 2px 4px; border-radius: 2px; flex: 1;">
                      ${Array.from({ length: 24 }).map((_, i) => `<div style="height: 5px; background: #10b981; border-radius: 1px; box-shadow: 0 0 3px #10b981;"></div>`).join('')}
                    </div>
                    <span style="font-size: 0.6rem; color: #94a3b8; font-family: monospace; white-space: nowrap;">4x QSFP28 Uplink</span>
                  </div>
                </div>
                <button type="button" class="rack-unmount-btn" data-slot="${slotKey}" style="background: rgba(239,68,68,0.25); border: 1px solid #ef4444; color: #fca5a5; font-size: 0.65rem; padding: 2px 6px; border-radius: 3px; cursor: pointer; flex-shrink: 0;">✕ Unmount</button>
              </div>
            `;
          } else if (slotKey === 'u40_patch') {
            deviceGraphic = `
              <div style="background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border: 2px solid #ca8a04; border-radius: 4px; padding: 0.45rem 0.75rem; box-shadow: 0 0 14px rgba(202,138,4,0.25); display: flex; justify-content: space-between; align-items: center; gap: 0.6rem;">
                <div style="flex: 1;">
                  <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 2px;">
                    <span style="font-weight: 800; font-size: 0.78rem; color: #facc15;">1U Cat6A Keystone Patch Panel (48-Port)</span>
                    <span style="font-size: 0.6rem; color: #10b981; font-weight: 700; background: rgba(16,185,129,0.2); padding: 1px 4px; border-radius: 3px;">✔ MOUNTED U40</span>
                  </div>
                  <!-- Keystone Port Array Graphic -->
                  <div style="display: flex; gap: 6px; margin-top: 3px;">
                    ${[1, 2, 3, 4, 5, 6].map(b => `
                      <div style="background: #080d14; border: 1px solid #475569; padding: 2px 4px; border-radius: 2px; font-size: 0.55rem; color: #94a3b8; font-family: monospace;">[Ports ${((b - 1) * 8) + 1}-${b * 8}]</div>
                    `).join('')}
                  </div>
                </div>
                <button type="button" class="rack-unmount-btn" data-slot="${slotKey}" style="background: rgba(239,68,68,0.25); border: 1px solid #ef4444; color: #fca5a5; font-size: 0.65rem; padding: 2px 6px; border-radius: 3px; cursor: pointer; flex-shrink: 0;">✕ Unmount</button>
              </div>
            `;
          } else if (slotKey === 'u36_37_server') {
            deviceGraphic = `
              <div style="background: linear-gradient(180deg, #1e293b 0%, #090e17 100%); border: 2px solid #8b5cf6; border-radius: 4px; padding: 0.6rem 0.8rem; box-shadow: 0 0 16px rgba(139,92,246,0.25); display: flex; justify-content: space-between; align-items: center; gap: 0.6rem;">
                <div style="flex: 1;">
                  <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 3px;">
                    <span style="font-weight: 800; font-size: 0.8rem; color: #c4b5fd;">2U Dual-Xeon Enterprise Compute Server</span>
                    <span style="font-size: 0.6rem; color: #10b981; font-weight: 700; background: rgba(16,185,129,0.2); padding: 1px 4px; border-radius: 3px;">✔ MOUNTED U36-U37</span>
                  </div>
                  <!-- 2.5" Drive Bay Sleds Graphic -->
                  <div style="display: flex; gap: 3px; align-items: center; margin-top: 4px;">
                    <div style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; background: #000; border: 1px solid #334155; padding: 2px 5px; border-radius: 2px; flex: 1;">
                      ${Array.from({ length: 8 }).map((_, i) => `
                        <div style="background: #1e293b; border: 1px solid #475569; height: 12px; border-radius: 1px; display: flex; align-items: center; justify-content: center;">
                          <div style="width: 3px; height: 3px; border-radius: 50%; background: #10b981; box-shadow: 0 0 2px #10b981;"></div>
                        </div>
                      `).join('')}
                    </div>
                    <div style="display: flex; gap: 3px; align-items: center;">
                      <span style="font-size: 0.62rem; color: #10b981;">● PWR</span>
                      <span style="font-size: 0.62rem; color: #38bdf8;">● UID</span>
                    </div>
                  </div>
                </div>
                <button type="button" class="rack-unmount-btn" data-slot="${slotKey}" style="background: rgba(239,68,68,0.25); border: 1px solid #ef4444; color: #fca5a5; font-size: 0.65rem; padding: 2px 6px; border-radius: 3px; cursor: pointer; flex-shrink: 0;">✕ Unmount</button>
              </div>
            `;
          } else if (slotKey === 'u34_storage') {
            deviceGraphic = `
              <div style="background: linear-gradient(180deg, #064e3b 0%, #022c22 100%); border: 2px solid #10b981; border-radius: 4px; padding: 0.45rem 0.75rem; box-shadow: 0 0 14px rgba(16,185,129,0.25); display: flex; justify-content: space-between; align-items: center; gap: 0.6rem;">
                <div style="flex: 1;">
                  <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 2px;">
                    <span style="font-weight: 800; font-size: 0.78rem; color: #6ee7b7;">1U All-Flash NVMe Storage Array</span>
                    <span style="font-size: 0.6rem; color: #10b981; font-weight: 700; background: rgba(16,185,129,0.2); padding: 1px 4px; border-radius: 3px;">✔ MOUNTED U34</span>
                  </div>
                  <!-- NVMe Sleds Graphic -->
                  <div style="display: grid; grid-template-columns: repeat(12, 1fr); gap: 2px; background: #000; border: 1px solid #134e4a; padding: 2px 4px; border-radius: 2px; margin-top: 3px;">
                    ${Array.from({ length: 12 }).map((_, i) => `
                      <div style="height: 6px; background: #0284c7; border-radius: 1px; box-shadow: 0 0 3px #0284c7;"></div>
                    `).join('')}
                  </div>
                </div>
                <button type="button" class="rack-unmount-btn" data-slot="${slotKey}" style="background: rgba(239,68,68,0.25); border: 1px solid #ef4444; color: #fca5a5; font-size: 0.65rem; padding: 2px 6px; border-radius: 3px; cursor: pointer; flex-shrink: 0;">✕ Unmount</button>
              </div>
            `;
          } else if (slotKey === 'u1_3_ups') {
            deviceGraphic = `
              <div style="background: linear-gradient(180deg, #18181b 0%, #09090b 100%); border: 2px solid #eab308; border-radius: 4px; padding: 0.7rem 0.85rem; box-shadow: 0 0 16px rgba(234,179,8,0.25); display: flex; justify-content: space-between; align-items: center; gap: 0.6rem;">
                <div style="flex: 1;">
                  <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 4px;">
                    <span style="font-weight: 800; font-size: 0.82rem; color: #fef08a;">3U 3000VA Smart-UPS Battery Backup</span>
                    <span style="font-size: 0.6rem; color: #10b981; font-weight: 700; background: rgba(16,185,129,0.2); padding: 1px 4px; border-radius: 3px;">✔ ANCHORED AT BASE U1-U3</span>
                  </div>
                  <!-- UPS LCD Telemetry Screen -->
                  <div style="display: flex; gap: 8px; align-items: center; background: #022c22; border: 1px solid #059669; padding: 3px 6px; border-radius: 3px; margin-top: 3px; font-family: monospace; font-size: 0.65rem; color: #34d399;">
                    <span>STATUS: ONLINE</span>
                    <span>VAC IN: 230V</span>
                    <span>LOAD: 42%</span>
                    <span>BATT: 100%</span>
                    <span style="color: #6ee7b7;">RUNTIME: 48 MIN</span>
                  </div>
                </div>
                <button type="button" class="rack-unmount-btn" data-slot="${slotKey}" style="background: rgba(239,68,68,0.25); border: 1px solid #ef4444; color: #fca5a5; font-size: 0.65rem; padding: 2px 6px; border-radius: 3px; cursor: pointer; flex-shrink: 0;">✕ Unmount</button>
              </div>
            `;
          }
          return deviceGraphic;
        }

        // Mismatched hardware installed
        return `
          <div style="background: rgba(239, 68, 68, 0.18); border: 2px solid #ef4444; border-radius: 4px; padding: 0.5rem 0.75rem; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 0.65rem; color: #fca5a5; font-weight: 700;">⚠ MISMATCHED RACK EQUIPMENT</div>
              <div style="font-size: 0.78rem; font-weight: 600; color: #fff;">${escapeHTML(assignedComp.name)} (${assignedComp.uHeight}U)</div>
            </div>
            <button type="button" class="rack-unmount-btn" data-slot="${slotKey}" style="background: rgba(239,68,68,0.3); border: 1px solid #ef4444; color: #fff; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; cursor: pointer;">✕ Remove</button>
          </div>
        `;
      };

      // Visual 42U Server Rack Rails Diagram HTML
      const rackDiagramHtml = `
        <div style="background: #080d14; border: 3px solid #334155; border-radius: 8px; padding: 0.85rem; margin-bottom: 1.25rem; box-shadow: inset 0 0 40px rgba(0,0,0,0.85), 0 8px 30px rgba(0,0,0,0.5);">
          <!-- Top Rack Header Rail -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #475569; padding-bottom: 0.4rem; margin-bottom: 0.75rem; font-family: monospace; font-size: 0.72rem; color: #94a3b8;">
            <span>TOP OF RACK (U42) // OVERHEAD CABLE TRAYS</span>
            <span style="color: var(--accent-cyan);">EIA-310-D 19-INCH ENCLOSURE</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.45rem;">
            <!-- U41-U42 Bay: ToR Switch -->
            <div style="display: grid; grid-template-columns: 55px 1fr; gap: 0.5rem; align-items: center;">
              <div style="font-family: monospace; font-size: 0.72rem; font-weight: 700; color: var(--gold-primary); text-align: right; padding-right: 4px; border-right: 2px solid #334155;">U41-42</div>
              <div>${renderFaceplate('u41_42_tor', 'comp_tor_switch', '1U', 'Top-of-Rack Switch Bay')}</div>
            </div>

            <!-- U40 Bay: Patch Panel -->
            <div style="display: grid; grid-template-columns: 55px 1fr; gap: 0.5rem; align-items: center;">
              <div style="font-family: monospace; font-size: 0.72rem; font-weight: 700; color: var(--gold-primary); text-align: right; padding-right: 4px; border-right: 2px solid #334155;">U40</div>
              <div>${renderFaceplate('u40_patch', 'comp_patch_panel', '1U', 'Structured Cabling Patch Panel Bay')}</div>
            </div>

            <!-- U38-U39 Airflow Spacer -->
            <div style="display: grid; grid-template-columns: 55px 1fr; gap: 0.5rem; align-items: center;">
              <div style="font-family: monospace; font-size: 0.65rem; color: #475569; text-align: right; padding-right: 4px; border-right: 2px solid #334155;">U38-39</div>
              <div style="background: rgba(15, 23, 42, 0.4); border: 1px dashed #334155; border-radius: 3px; padding: 0.3rem 0.6rem; font-size: 0.65rem; color: #64748b; font-family: monospace;">[ 2U Toolless Airflow Blanking Panels Installed ]</div>
            </div>

            <!-- U36-U37 Bay: Compute Server -->
            <div style="display: grid; grid-template-columns: 55px 1fr; gap: 0.5rem; align-items: center;">
              <div style="font-family: monospace; font-size: 0.72rem; font-weight: 700; color: var(--gold-primary); text-align: right; padding-right: 4px; border-right: 2px solid #334155;">U36-37</div>
              <div>${renderFaceplate('u36_37_server', 'comp_compute_server', '2U', 'Enterprise Compute Server Bay')}</div>
            </div>

            <!-- U35 Airflow Spacer -->
            <div style="display: grid; grid-template-columns: 55px 1fr; gap: 0.5rem; align-items: center;">
              <div style="font-family: monospace; font-size: 0.65rem; color: #475569; text-align: right; padding-right: 4px; border-right: 2px solid #334155;">U35</div>
              <div style="background: rgba(15, 23, 42, 0.4); border: 1px dashed #334155; border-radius: 3px; padding: 0.3rem 0.6rem; font-size: 0.65rem; color: #64748b; font-family: monospace;">[ 1U Thermal Blanking Panel ]</div>
            </div>

            <!-- U34 Bay: NVMe Storage -->
            <div style="display: grid; grid-template-columns: 55px 1fr; gap: 0.5rem; align-items: center;">
              <div style="font-family: monospace; font-size: 0.72rem; font-weight: 700; color: var(--gold-primary); text-align: right; padding-right: 4px; border-right: 2px solid #334155;">U34</div>
              <div>${renderFaceplate('u34_storage', 'comp_nvme_san', '1U', 'SAN NVMe All-Flash Storage Tier')}</div>
            </div>

            <!-- U4-U33 Middle Rack Zone Indicator -->
            <div style="display: grid; grid-template-columns: 55px 1fr; gap: 0.5rem; align-items: center; margin: 0.3rem 0;">
              <div style="font-family: monospace; font-size: 0.65rem; color: #475569; text-align: right; padding-right: 4px; border-right: 2px solid #334155;">U4-33</div>
              <div style="background: repeating-linear-gradient(45deg, rgba(15,23,42,0.6) 0px, rgba(15,23,42,0.6) 8px, rgba(30,41,59,0.4) 8px, rgba(30,41,59,0.4) 16px); border: 1px solid #334155; border-radius: 4px; padding: 0.6rem; text-align: center;">
                <div style="font-size: 0.72rem; color: #94a3b8; font-weight: 600;">30U Mid-Rack Expansion &amp; ASHRAE Front-to-Back Airflow Corridor</div>
                <div style="font-size: 0.62rem; color: #64748b;">Cold Aisle Containment // Heavy equipment strictly prohibited in upper rack</div>
              </div>
            </div>

            <!-- U1-U3 Bay: Base UPS Battery -->
            <div style="display: grid; grid-template-columns: 55px 1fr; gap: 0.5rem; align-items: center;">
              <div style="font-family: monospace; font-size: 0.72rem; font-weight: 700; color: var(--gold-primary); text-align: right; padding-right: 4px; border-right: 2px solid #334155;">U1-3</div>
              <div>${renderFaceplate('u1_3_ups', 'comp_ups_battery', '3U', 'Rack Base Power & Battery Backup Bay')}</div>
            </div>
          </div>

          <!-- Bottom Rack Footer Rail -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #475569; padding-top: 0.4rem; margin-top: 0.75rem; font-family: monospace; font-size: 0.72rem; color: #94a3b8;">
            <span>RACK BASE (U1) // LEVELED CASTERS &amp; EARTH GROUNDING BUSBAR</span>
            <span style="color: #10b981;">HEAVIEST MASS AT BASE</span>
          </div>
        </div>
      `;

      // Component Staging Tray HTML
      let trayHtml = `
        <div style="background: #111827; border: 1px solid var(--border-color); border-radius: 8px; padding: 0.85rem; margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; flex-wrap: wrap; gap: 0.4rem;">
            <div style="font-weight: 700; color: var(--accent-cyan); font-size: 0.88rem;">Datacenter Staging Inventory:</div>
            <div style="font-size: 0.76rem; color: ${selectedTrayComp ? '#facc15' : 'var(--text-secondary)'}; font-weight: 600;">
              ${selectedTrayComp ? `Selected: [${escapeHTML(lab.components.find(c => c.id === selectedTrayComp)?.name || '')}] - Click target rack bay above to mount` : 'Click hardware to select, then click target rack bay'}
            </div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.45rem;">
      `;

      lab.components.forEach((c) => {
        const installedInSlot = findSlotForComp(c.id);
        const isSelected = selectedTrayComp === c.id;

        trayHtml += `
          <div class="rack-tray-item" data-comp="${c.id}" style="background: ${isSelected ? 'rgba(212, 160, 23, 0.2)' : '#1e293b'}; border: 1px solid ${isSelected ? 'var(--gold-primary)' : (installedInSlot ? '#475569' : 'var(--border-color)')}; border-radius: 6px; padding: 0.45rem 0.65rem; cursor: pointer; transition: all 0.15s ease; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
            <div style="min-width: 0; flex: 1;">
              <div style="font-size: 0.8rem; font-weight: 700; color: ${isSelected ? '#facc15' : '#fff'};">${escapeHTML(c.name)}</div>
              <div style="font-size: 0.68rem; color: ${installedInSlot ? '#10b981' : 'var(--text-secondary)'}; font-weight: 600;">
                ${installedInSlot ? `● Installed in ${escapeHTML(slotLabels[installedInSlot] || installedInSlot)}` : '○ In Staging Stash'}
              </div>
            </div>
            <span style="font-size: 0.65rem; background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan); padding: 2px 5px; border-radius: 3px; font-weight: 700; white-space: nowrap;">${c.uHeight}U · ${escapeHTML(c.type)}</span>
          </div>
        `;
      });
      trayHtml += '</div></div>';

      // Backward compatible Slot Control Cards HTML
      let slotsHtml = '<div style="display: flex; flex-direction: column; gap: 0.55rem;">';
      Object.keys(slotLabels).forEach((slotKey) => {
        const currentCompId = slots[slotKey];
        const assignedComp = lab.components.find(c => c.id === currentCompId);

        slotsHtml += `
          <div class="rack-slot-card" data-slot="${slotKey}" style="background: #111827; border: 1px solid ${assignedComp ? 'var(--accent-cyan)' : 'var(--border-color)'}; border-radius: 6px; padding: 0.6rem 0.85rem; display: flex; justify-content: space-between; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 220px;">
              <div style="display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.2rem;">
                <span style="font-size: 0.74rem; background: var(--surface-1); border: 1px solid var(--border-color); color: var(--gold-primary); font-weight: 700; padding: 0.15rem 0.4rem; border-radius: 4px; text-transform: uppercase;">${escapeHTML(slotLabels[slotKey])}</span>
              </div>
              <div class="rack-slot-status" style="font-size: 0.88rem; font-weight: 600; color: ${assignedComp ? '#fff' : 'var(--text-secondary)'};">
                ${assignedComp ? `[Installed] ${escapeHTML(assignedComp.name)}` : '<em>[Empty Slot - Select hardware component]</em>'}
              </div>
              <div style="font-size: 0.74rem; color: var(--text-secondary); margin-top: 0.15rem;">
                ${escapeHTML(slotHints[slotKey] || '')}
              </div>
            </div>
            <div>
              <select class="rack-assign-select" data-slot="${slotKey}" style="background: #1e293b; border: 1px solid var(--border-color); color: #fff; padding: 0.35rem 0.5rem; border-radius: 4px; font-size: 0.82rem; max-width: 260px;">
                <option value="">-- Assign Rack Component --</option>
                ${lab.components.map(c => `
                  <option value="${c.id}" ${currentCompId === c.id ? 'selected' : ''}>${escapeHTML(c.name)} (${c.uHeight}U)</option>
                `).join('')}
              </select>
            </div>
          </div>
        `;
      });
      slotsHtml += '</div>';

      container.innerHTML = `
        <div style="border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; background: #0b0f19;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.4rem;">
            <div>
              <div style="font-weight: 700; color: var(--accent-cyan); font-size: 0.95rem;">42U EIA-310 Datacenter Server Cabinet Deployment:</div>
              <div style="font-size: 0.78rem; color: var(--text-secondary);">Center-of-gravity stabilization, short-run structured cabling, and compute tier distribution</div>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
              <button type="button" class="btn btn-secondary app-3d-open-btn" data-model="rack" data-hotspot="switch" style="font-size: 0.75rem; padding: 4px 10px; border-color: rgba(212,175,55,0.4); color: var(--gold-light); display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
                <span style="font-weight: 800; background: rgba(212,175,55,0.2); padding: 1px 5px; border-radius: 3px;">3D</span> Inspect 3D HD Rack
              </button>
              <div style="display: flex; gap: 0.35rem; font-size: 0.72rem;">
                <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); padding: 0.2rem 0.45rem; border-radius: 4px;">Cold Aisle (Front)</span>
                <span style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); padding: 0.2rem 0.45rem; border-radius: 4px;">Hot Aisle (Rear)</span>
              </div>
            </div>
          </div>

          ${stabilityBanner}
          ${rackDiagramHtml}
          ${trayHtml}
          <div style="font-weight: 700; color: var(--text-secondary); margin-bottom: 0.45rem; font-size: 0.85rem;">Slot Control Cards &amp; Status Readouts:</div>
          ${slotsHtml}
        </div>
      `;

      // Event Listeners: 3D Inspection Trigger
      container.querySelectorAll('.app-3d-open-btn').forEach((btn) => {
        btn.onclick = () => {
          const model = btn.getAttribute('data-model') || 'rack';
          const hotspot = btn.getAttribute('data-hotspot') || null;
          if (window.APlus && window.APlus.App3DStage) {
            window.APlus.App3DStage.openModal(model, hotspot);
          }
        };
      });

      // Event Listeners: Rack bay targets click
      container.querySelectorAll('.rack-bay-target').forEach((bay) => {
        bay.onclick = () => {
          const slotKey = bay.getAttribute('data-slot');
          if (slotKey) {
            if (state._selectedRackCompId) {
              updateSlot(slotKey, state._selectedRackCompId);
              state._selectedRackCompId = null;
            } else if (slots[slotKey]) {
              updateSlot(slotKey, null);
            }
          }
        };
      });

      // Event Listeners: Unmount buttons
      container.querySelectorAll('.rack-unmount-btn').forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const slotKey = btn.getAttribute('data-slot');
          if (slotKey) updateSlot(slotKey, null);
        };
      });

      // Event Listeners: Staging inventory items click
      container.querySelectorAll('.rack-tray-item').forEach((item) => {
        item.onclick = () => {
          const compId = item.getAttribute('data-comp');
          state._selectedRackCompId = (state._selectedRackCompId === compId) ? null : compId;
          this.renderDatacenterRack(container, state, callbacks);
        };
      });

      // Event Listeners: Dropdown selects on slot cards
      container.querySelectorAll('.rack-assign-select').forEach((sel) => {
        sel.onchange = (e) => {
          const slotKey = e.target.getAttribute('data-slot');
          updateSlot(slotKey, e.target.value || null);
        };
      });

      this.renderActionToolbar(container, 'datacenterRack', state, callbacks, () => {
        state.slots = { u41_42_tor: null, u40_patch: null, u36_37_server: null, u34_storage: null, u1_3_ups: null };
        state._selectedRackCompId = null;
        callbacks.onSelect({ slots: state.slots });
        this.renderDatacenterRack(container, state, callbacks);
      });
    },

    /* Scoring & Completion */
    score(q, userState) {
      if (!userState) return false;
      const pbqType = q.pbqType || 'sohoRouter';
      const lab = this.getLab(pbqType);

      if (pbqType === 'sohoRouter') {
        const sol = lab.solution;
        const s = userState;
        return (
          (s.ssid || '').trim().toLowerCase() === sol.ssid.toLowerCase() &&
          s.securityMode === sol.securityMode &&
          s.encryption === sol.encryption &&
          s.channelWidth === sol.channelWidth &&
          (s.startingIp || '').trim() === sol.startingIp &&
          (s.forwardPort || '').trim() === sol.forwardPort &&
          (s.forwardIp || '').trim() === sol.forwardIp &&
          (s.forwardProtocol === 'TCP' || s.forwardProtocol === 'BOTH') &&
          s.forwardEnabled === true
        );
      }

      if (pbqType === 'motherboardAssembly') {
        const sol = lab.solution;
        const slots = userState.slots || {};
        return Object.keys(sol).every(k => slots[k] === sol[k]);
      }

      if (pbqType === 'windowsConsole') {
        const sol = lab.solution;
        const s = userState;
        return (
          s.diskInitialized === sol.diskInitialized &&
          s.partitionStyle === sol.partitionStyle &&
          s.volumeCreated === sol.volumeCreated &&
          s.driveLetter === sol.driveLetter &&
          s.fileSystem === sol.fileSystem &&
          (s.volumeLabel || '').trim().toUpperCase() === sol.volumeLabel.toUpperCase()
        );
      }

      if (pbqType === 'cablePinout') {
        const seq = userState.sequence || [];
        const sol = T568B_SEQUENCE;
        if (seq.length !== 8) return false;
        return seq.every((wire, i) => wire === sol[i]);
      }

      if (pbqType === 'portMatcher') {
        const matches = userState.matches || userState;
        const pairs = lab.pairs;
        return pairs.every(p => matches[p.name] === p.port);
      }

      if (pbqType === 'printerOrder') {
        const seq = userState.sequence || userState;
        const target = lab.steps;
        if (!Array.isArray(seq) || seq.length !== target.length) return false;
        return seq.every((step, i) => step === target[i]);
      }

      if (pbqType === 'cliTerminal') {
        return Boolean(userState.lastCommand && lab.commands[userState.lastCommand]);
      }

      if (pbqType === 'datacenterRack') {
        const sol = lab.solution;
        const slots = userState.slots || {};
        return Object.keys(sol).every(k => slots[k] === sol[k]);
      }

      return false;
    },

    isComplete(q, userState) {
      if (!userState) return false;
      const pbqType = q.pbqType || 'sohoRouter';

      if (pbqType === 'sohoRouter') {
        return Boolean(userState.ssid && userState.forwardIp);
      }
      if (pbqType === 'motherboardAssembly') {
        const slots = userState.slots || {};
        return Object.values(slots).filter(Boolean).length >= 3;
      }
      if (pbqType === 'windowsConsole') {
        return Boolean(userState.diskInitialized && userState.volumeCreated);
      }
      if (pbqType === 'cablePinout') {
        const seq = userState.sequence || [];
        return seq.filter(Boolean).length === 8;
      }
      if (pbqType === 'portMatcher') {
        const matches = userState.matches || userState;
        return Object.keys(matches).length >= 5;
      }
      if (pbqType === 'printerOrder') {
        return Boolean(userState.sequence || Array.isArray(userState));
      }
      if (pbqType === 'cliTerminal') {
        return Boolean(userState.lastCommand);
      }
      if (pbqType === 'datacenterRack') {
        const slots = userState.slots || {};
        return Object.values(slots).filter(Boolean).length >= 3;
      }

      return true;
    },

    renderReview(q, userState, mountEl) {
      const isPassed = this.score(q, userState);
      const pbqType = q.pbqType || 'sohoRouter';
      const lab = this.getLab(pbqType);

      mountEl.innerHTML = `
        <div style="border-radius: 6px; border: 1px solid ${isPassed ? 'var(--accent-green)' : 'var(--accent-red)'}; background: ${isPassed ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)'}; padding: 0.8rem 1rem; margin-bottom: 0.8rem;">
          <div style="font-weight: 700; color: ${isPassed ? 'var(--accent-green)' : 'var(--accent-red)'}; font-size: 0.95rem; margin-bottom: 0.3rem;">
            ${isPassed ? 'PASS: PBQ Simulation Solved Successfully' : 'INCOMPLETE: PBQ Simulation Incomplete or Incorrect Configuration'}
          </div>
          <div style="font-size: 0.86rem; color: var(--text-secondary); line-height: 1.5;">
            <strong>Lab:</strong> ${escapeHTML(lab.title)}<br>
            <strong>Official CompTIA Recommendation:</strong> ${escapeHTML(q.explanation || '')}
          </div>
        </div>
      `;
    }
  };

  APlus.pbqEngine = PBQEngine;

  if (typeof module === 'object' && module.exports) {
    module.exports = PBQEngine;
  }

})(typeof window !== 'undefined' ? window : this);
