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
    'WO': { name: 'White / Orange', bg: 'linear-gradient(135deg, #fff 50%, #f97316 50%)', border: '#ea580c' },
    'O':  { name: 'Solid Orange',   bg: '#ea580c', border: '#c2410c' },
    'WG': { name: 'White / Green',  bg: 'linear-gradient(135deg, #fff 50%, #22c55e 50%)', border: '#16a34a' },
    'BL': { name: 'Solid Blue',     bg: '#2563eb', border: '#1d4ed8' },
    'WBL':{ name: 'White / Blue',   bg: 'linear-gradient(135deg, #fff 50%, #3b82f6 50%)', border: '#2563eb' },
    'G':  { name: 'Solid Green',    bg: '#16a34a', border: '#15803d' },
    'WBR':{ name: 'White / Brown',  bg: 'linear-gradient(135deg, #fff 50%, #854d0e 50%)', border: '#713f12' },
    'BR': { name: 'Solid Brown',    bg: '#78350f', border: '#451a03' }
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
      }
    },

    /* 1. SOHO Wireless Router Simulation */
    renderSohoRouter(container, state, callbacks) {
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
        if (activeTab === 'wireless') {
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
        } else if (activeTab === 'dhcp') {
          pane.innerHTML = `
            <div style="display: grid; grid-template-columns: 200px 1fr; gap: 0.8rem; align-items: center; font-size: 0.88rem;">
              <label style="font-weight: 600;">Gateway LAN IP:</label>
              <span style="color: var(--text-secondary); font-family: monospace;">192.168.1.1 (Subnet 255.255.255.0)</span>

              <label style="font-weight: 600;">DHCP Server Status:</label>
              <div><span style="color: #10b981; font-weight: 700;">Enabled</span> (Serving /24 Scope)</div>

              <label style="font-weight: 600;">Starting IP Address:</label>
              <input type="text" id="cfg_startip" value="${escapeHTML(state.startingIp || '192.168.1.100')}" style="background: #1e293b; border: 1px solid var(--border-color); color: #fff; padding: 0.45rem 0.6rem; border-radius: 4px; max-width: 220px;" />

              <label style="font-weight: 600;">Ending IP Address:</label>
              <input type="text" id="cfg_endip" value="${escapeHTML(state.endingIp || '192.168.1.254')}" style="background: #1e293b; border: 1px solid var(--border-color); color: #fff; padding: 0.45rem 0.6rem; border-radius: 4px; max-width: 220px;" />
            </div>
          `;
          pane.querySelector('#cfg_startip').oninput = (e) => updateState({ startingIp: e.target.value.trim() });
          pane.querySelector('#cfg_endip').oninput = (e) => updateState({ endingIp: e.target.value.trim() });
        } else if (activeTab === 'nat') {
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

      container.querySelector('#tab_wireless').onclick = () => { updateState({ activeTab: 'wireless' }); this.renderSohoRouter(container, state, callbacks); };
      container.querySelector('#tab_dhcp').onclick = () => { updateState({ activeTab: 'dhcp' }); this.renderSohoRouter(container, state, callbacks); };
      container.querySelector('#tab_nat').onclick = () => { updateState({ activeTab: 'nat' }); this.renderSohoRouter(container, state, callbacks); };

      renderTabContent();
    },

    /* 2. Motherboard Component Assembly Simulation */
    renderMotherboardAssembly(container, state, callbacks) {
      const slots = state.slots || {};
      const lab = PBQ_CATALOG.motherboardAssembly;

      const slotLabels = {
        'socket_cpu': 'CPU Socket (LGA 1700)',
        'slot_ram1': 'DIMM Slot A2 (DDR5)',
        'slot_pcie_top': 'Primary PCIe x16 (Full-Length)',
        'slot_m2_nvme': 'M.2 NVMe Slot (PCIe 4.0 x4)',
        'conn_atx_power': '24-Pin ATX Main Power Connector'
      };

      const updateSlot = (slotKey, compId) => {
        const nextSlots = { ...slots, [slotKey]: compId };
        callbacks.onSelect({ slots: nextSlots });
        this.renderMotherboardAssembly(container, { slots: nextSlots }, callbacks);
      };

      let slotsHtml = '<div style="display: flex; flex-direction: column; gap: 0.6rem;">';
      Object.keys(slotLabels).forEach((slotKey) => {
        const currentCompId = slots[slotKey];
        const assignedComp = lab.components.find(c => c.id === currentCompId);

        slotsHtml += `
          <div style="background: #111827; border: 1px solid ${assignedComp ? 'var(--accent-cyan)' : 'var(--border-color)'}; border-radius: 6px; padding: 0.6rem 0.8rem; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 0.78rem; color: var(--gold-primary); font-weight: 700; text-transform: uppercase;">${escapeHTML(slotLabels[slotKey])}</div>
              <div style="font-size: 0.9rem; font-weight: 600; color: ${assignedComp ? '#fff' : 'var(--text-secondary)'};">
                ${assignedComp ? `[Installed] ${escapeHTML(assignedComp.name)}` : '<em>[Empty Slot - Select component below]</em>'}
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
          <div style="font-weight: 700; color: var(--accent-cyan); margin-bottom: 0.75rem; font-size: 0.95rem;">ATX Workstation Motherboard Sockets and Headers:</div>
          ${slotsHtml}
        </div>
      `;

      container.querySelectorAll('.mb-assign-select').forEach((sel) => {
        sel.onchange = (e) => {
          const slotKey = e.target.getAttribute('data-slot');
          updateSlot(slotKey, e.target.value || null);
        };
      });
    },

    /* 3. Windows Disk Management Console Simulation */
    renderWindowsConsole(container, state, callbacks) {
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
      if (btnReset) btnReset.onclick = () => updateState(JSON.parse(JSON.stringify(PBQ_CATALOG.windowsConsole.defaultState)));
    },

    /* 4. Network Cable Crimping & Pinout Simulation */
    renderCablePinout(container, state, callbacks) {
      const sequence = state.sequence || [null, null, null, null, null, null, null, null];

      const updateSlotWire = (pinIdx, wireKey) => {
        const nextSeq = [...sequence];
        nextSeq[pinIdx] = wireKey || null;
        callbacks.onSelect({ sequence: nextSeq });
        this.renderCablePinout(container, { sequence: nextSeq }, callbacks);
      };

      let pinsHtml = '<div style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 0.4rem; margin-bottom: 1rem;">';
      for (let i = 0; i < 8; i++) {
        const currentWire = sequence[i];
        const wireSpec = currentWire ? WIRE_COLORS[currentWire] : null;

        pinsHtml += `
          <div style="background: #1e293b; border: 1px solid var(--border-color); border-radius: 6px; padding: 0.5rem 0.2rem; text-align: center;">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--accent-cyan); margin-bottom: 0.3rem;">Pin ${i + 1}</div>
            <div style="height: 60px; border-radius: 4px; margin: 0 auto 0.4rem auto; width: 22px; border: 2px solid ${wireSpec ? wireSpec.border : '#475569'}; background: ${wireSpec ? wireSpec.bg : '#0f172a'};"></div>
            <select class="pin-wire-select" data-pin="${i}" style="width: 100%; background: #0f172a; border: 1px solid #334155; color: #fff; font-size: 0.7rem; padding: 0.2rem; border-radius: 3px;">
              <option value="">--</option>
              ${Object.keys(WIRE_COLORS).map(k => `
                <option value="${k}" ${currentWire === k ? 'selected' : ''}>${k} (${WIRE_COLORS[k].name})</option>
              `).join('')}
            </select>
          </div>
        `;
      }
      pinsHtml += '</div>';

      container.innerHTML = `
        <div style="border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; background: #0b0f19;">
          <div style="font-weight: 700; color: var(--accent-cyan); margin-bottom: 0.75rem; font-size: 0.95rem;">RJ-45 (8P8C) Modular Plug Termination:</div>
          ${pinsHtml}
          <div style="font-size: 0.8rem; color: var(--text-secondary); text-align: center;">Standard Pinout Reference: T568B sequence begins with White/Orange, Orange, White/Green...</div>
        </div>
      `;

      container.querySelectorAll('.pin-wire-select').forEach((sel) => {
        sel.onchange = (e) => {
          const pinIdx = parseInt(e.target.getAttribute('data-pin'), 10);
          updateSlotWire(pinIdx, e.target.value);
        };
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

    /* Scoring & Completion */
    score(q, userState) {
      if (!userState) return false;
      const pbqType = q.pbqType || 'sohoRouter';
      const lab = this.getLab(pbqType);

      if (pbqType === 'sohoRouter') {
        const sol = lab.solution;
        const s = userState;
        return (
          (s.ssid || '').toLowerCase() === sol.ssid.toLowerCase() &&
          s.securityMode === sol.securityMode &&
          s.encryption === sol.encryption &&
          s.channelWidth === sol.channelWidth &&
          s.startingIp === sol.startingIp &&
          s.forwardPort === sol.forwardPort &&
          s.forwardIp === sol.forwardIp &&
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
          (s.volumeLabel || '').toUpperCase() === sol.volumeLabel.toUpperCase()
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
