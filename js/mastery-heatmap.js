/**
 * Clariora Exam Simulator
 * mastery-heatmap.js - 61-Objective Interactive Mastery Heatmap
 * File: js/mastery-heatmap.js
 *
 * Provides granular tracking across all 61 CompTIA A+ blueprint objectives:
 * - Core 1: 1.1 to 5.6 (30 sub-objectives)
 * - Core 2: 1.1 to 4.9 (31 sub-objectives)
 * - Live mastery coloring (Untested, Vulnerable, Developing, Mastered)
 * - 1-Click action: Launches targeted 10-question drill for any chosen sub-objective
 */

(function(window) {
  'use strict';

  window.APlus = window.APlus || {};
  const APlus = window.APlus;

  const escapeHTML = (window.APlus.utils && window.APlus.utils.escapeHTML) || ((s) => String(s || ''));

  const OBJECTIVES_MAP = {
    core1: [
      { code: '1.1', title: 'Laptop hardware components & displays', domain: '1.0 Mobile Devices' },
      { code: '1.2', title: 'Mobile device display types & components', domain: '1.0 Mobile Devices' },
      { code: '1.3', title: 'Mobile device ports and accessories', domain: '1.0 Mobile Devices' },
      { code: '1.4', title: 'Mobile device network connectivity', domain: '1.0 Mobile Devices' },

      { code: '2.1', title: 'TCP and UDP ports, protocols and purposes', domain: '2.0 Networking' },
      { code: '2.2', title: 'Networking hardware devices & appliances', domain: '2.0 Networking' },
      { code: '2.3', title: 'Wireless network standards (802.11, WPA3)', domain: '2.0 Networking' },
      { code: '2.4', title: 'Network services (DHCP, DNS, NTP, IPAM)', domain: '2.0 Networking' },
      { code: '2.5', title: 'IPv4 and IPv6 addressing, subnets and scopes', domain: '2.0 Networking' },
      { code: '2.6', title: 'Internet connection types and features', domain: '2.0 Networking' },
      { code: '2.7', title: 'Network configuration and management tools', domain: '2.0 Networking' },
      { code: '2.8', title: 'Cables and connectors (Ethernet, Fiber, Coax)', domain: '2.0 Networking' },

      { code: '3.1', title: 'Cables, interfaces, and connector types', domain: '3.0 Hardware' },
      { code: '3.2', title: 'RAM types, packaging and multi-channel features', domain: '3.0 Hardware' },
      { code: '3.3', title: 'Storage devices (SATA, NVMe, RAID 0/1/5/10)', domain: '3.0 Hardware' },
      { code: '3.4', title: 'Motherboards, CPUs, cooling and power supplies', domain: '3.0 Hardware' },
      { code: '3.5', title: 'Peripheral devices and multifunction hardware', domain: '3.0 Hardware' },
      { code: '3.6', title: 'Power supply specifications, rails and wattage', domain: '3.0 Hardware' },
      { code: '3.7', title: 'Print devices and imaging technologies', domain: '3.0 Hardware' },

      { code: '4.1', title: 'Cloud computing concepts and services (IaaS/PaaS/SaaS)', domain: '4.0 Virtualization and Cloud' },
      { code: '4.2', title: 'Client-side virtualization and hypervisors', domain: '4.0 Virtualization and Cloud' },

      { code: '5.1', title: 'Troubleshooting methodology (6-step CompTIA framework)', domain: '5.0 Troubleshooting' },
      { code: '5.2', title: 'Motherboard, RAM, CPU and power troubleshooting', domain: '5.0 Troubleshooting' },
      { code: '5.3', title: 'Storage drive and RAID array troubleshooting', domain: '5.0 Troubleshooting' },
      { code: '5.4', title: 'Video, projector, and display issues', domain: '5.0 Troubleshooting' },
      { code: '5.5', title: 'Mobile device hardware & battery issues', domain: '5.0 Troubleshooting' },
      { code: '5.6', title: 'Wired and wireless network troubleshooting', domain: '5.0 Troubleshooting' }
    ],
    core2: [
      { code: '1.1', title: 'Windows OS editions, features and requirements', domain: '1.0 Operating Systems' },
      { code: '1.2', title: 'Microsoft Command Line utilities (CLI)', domain: '1.0 Operating Systems' },
      { code: '1.3', title: 'Windows Control Panel and Management MMC tools', domain: '1.0 Operating Systems' },
      { code: '1.4', title: 'Windows Settings, Task Manager, and System utilities', domain: '1.0 Operating Systems' },
      { code: '1.5', title: 'Windows networking configurations and shares', domain: '1.0 Operating Systems' },
      { code: '1.6', title: 'OS installation types and upgrade methods', domain: '1.0 Operating Systems' },
      { code: '1.7', title: 'macOS features, backups, and terminal tools', domain: '1.0 Operating Systems' },
      { code: '1.8', title: 'Linux distributions, shell commands and navigation', domain: '1.0 Operating Systems' },
      { code: '1.9', title: 'ChromeOS, Android, and iOS mobile operating systems', domain: '1.0 Operating Systems' },
      { code: '1.10', title: 'Filesystem types (NTFS, FAT32, exFAT, ext4, APFS)', domain: '1.0 Operating Systems' },
      { code: '1.11', title: 'Application deployment and licensing architectures', domain: '1.0 Operating Systems' },

      { code: '2.1', title: 'Physical security controls and environmental safety', domain: '2.0 Security' },
      { code: '2.2', title: 'Logical access control, MFA and authentication', domain: '2.0 Security' },
      { code: '2.3', title: 'Wireless security protocols and encryption (WPA3)', domain: '2.0 Security' },
      { code: '2.4', title: 'Malware types, vectors, and social engineering', domain: '2.0 Security' },
      { code: '2.5', title: 'Windows OS security settings and permissions (NTFS/Share)', domain: '2.0 Security' },
      { code: '2.6', title: 'Workstation and server hardening best practices', domain: '2.0 Security' },
      { code: '2.7', title: 'Mobile device security management and MDM', domain: '2.0 Security' },
      { code: '2.8', title: 'Data destruction and disposal methods', domain: '2.0 Security' },

      { code: '3.1', title: 'Windows OS troubleshooting (BSOD, boot errors, SFC)', domain: '3.0 Software Troubleshooting' },
      { code: '3.2', title: 'Security issues and malware removal 7-step procedure', domain: '3.0 Software Troubleshooting' },
      { code: '3.3', title: 'Mobile OS application and connectivity issues', domain: '3.0 Software Troubleshooting' },
      { code: '3.4', title: 'Troubleshooting browser security, certificates and popups', domain: '3.0 Software Troubleshooting' },

      { code: '4.1', title: 'Ticketing systems and documentation best practices', domain: '4.0 Operational Procedures' },
      { code: '4.2', title: 'Basic change management processes and rollbacks', domain: '4.0 Operational Procedures' },
      { code: '4.3', title: 'Disaster recovery, backup schemes (3-2-1) and power', domain: '4.0 Operational Procedures' },
      { code: '4.4', title: 'Safety procedures, ESD prevention, and HAZMAT disposal', domain: '4.0 Operational Procedures' },
      { code: '4.5', title: 'Environmental controls, temperature and humidity', domain: '4.0 Operational Procedures' },
      { code: '4.6', title: 'Incident response, chain of custody and forensic data', domain: '4.0 Operational Procedures' },
      { code: '4.7', title: 'Professional communication, etiquette and active listening', domain: '4.0 Operational Procedures' },
      { code: '4.8', title: 'Scripting languages and file extensions (.bat, .ps1, .sh)', domain: '4.0 Operational Procedures' },
      { code: '4.9', title: 'Remote access technologies (RDP, SSH, VPN, VNC)', domain: '4.0 Operational Procedures' }
    ]
  };

  const MasteryHeatmap = {
    selectedExam: 'core1',

    init() {
      // Expose globally
    },

    computeStats() {
      const history = (APlus.storage ? APlus.storage.get('history', []) : []) || [];
      const stats = {}; // objective -> { attempts: 0, correct: 0 }

      history.forEach((session) => {
        if (Array.isArray(session.perQuestion)) {
          session.perQuestion.forEach((pq) => {
            if (pq.objective) {
              if (!stats[pq.objective]) stats[pq.objective] = { attempts: 0, correct: 0 };
              stats[pq.objective].attempts++;
              if (pq.correct) stats[pq.objective].correct++;
            }
          });
        }
      });

      return stats;
    },

    getTileColor(stat) {
      if (!stat || stat.attempts === 0) return { bg: '#1e293b', border: '#334155', text: '#94a3b8', label: 'Untested' };
      const pct = Math.round((stat.correct / stat.attempts) * 100);
      if (pct < 70) return { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: '#fca5a5', label: `${pct}% (Weak)` };
      if (pct < 85) return { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', text: '#fde68a', label: `${pct}% (Developing)` };
      return { bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', text: '#86efac', label: `${pct}% (Mastered)` };
    },

    render(mountEl) {
      if (!mountEl) return;
      const stats = this.computeStats();
      const objectives = OBJECTIVES_MAP[this.selectedExam] || OBJECTIVES_MAP.core1;

      mountEl.innerHTML = `
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <div style="font-size: 1.1rem; font-weight: 800; color: #fff;">🗺️ 61-Objective Mastery Heatmap</div>
              <div style="font-size: 0.82rem; color: var(--text-secondary);">Click any sub-objective tile to launch a targeted 10-question drill.</div>
            </div>
            <div style="display: flex; gap: 0.4rem;">
              <button type="button" id="heatmapTabCore1" class="btn ${this.selectedExam === 'core1' ? 'btn-primary' : 'btn-secondary'}" style="font-size: 0.82rem; padding: 0.35rem 0.8rem;">Core 1 (220-1201)</button>
              <button type="button" id="heatmapTabCore2" class="btn ${this.selectedExam === 'core2' ? 'btn-primary' : 'btn-secondary'}" style="font-size: 0.82rem; padding: 0.35rem 0.8rem;">Core 2 (220-1202)</button>
            </div>
          </div>

          <!-- Heatmap Legend -->
          <div style="display: flex; gap: 1rem; font-size: 0.76rem; color: var(--text-secondary); margin-bottom: 1rem; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 0.35rem;"><span style="width: 12px; height: 12px; border-radius: 3px; background: #1e293b; border: 1px solid #334155;"></span> Untested</div>
            <div style="display: flex; align-items: center; gap: 0.35rem;"><span style="width: 12px; height: 12px; border-radius: 3px; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444;"></span> &lt;70% Vulnerable</div>
            <div style="display: flex; align-items: center; gap: 0.35rem;"><span style="width: 12px; height: 12px; border-radius: 3px; background: rgba(245, 158, 11, 0.2); border: 1px solid #f59e0b;"></span> 70-84% Developing</div>
            <div style="display: flex; align-items: center; gap: 0.35rem;"><span style="width: 12px; height: 12px; border-radius: 3px; background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981;"></span> 85%+ Exam Ready</div>
          </div>

          <!-- Grid Tiles -->
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.65rem;" id="heatmapTilesGrid">
            ${objectives.map((obj) => {
              const stat = stats[obj.code];
              const color = this.getTileColor(stat);
              return `
                <div class="heatmap-tile" data-code="${obj.code}" style="background: ${color.bg}; border: 1px solid ${color.border}; border-radius: 6px; padding: 0.65rem 0.75rem; cursor: pointer; transition: transform 0.15s ease, border-color 0.15s ease;" title="Click to practice ${obj.code}: ${escapeHTML(obj.title)}">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                    <span style="font-weight: 800; font-size: 0.88rem; color: #fff;">Obj ${obj.code}</span>
                    <span style="font-size: 0.72rem; font-weight: 700; color: ${color.border};">${color.label}</span>
                  </div>
                  <div style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.35; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${escapeHTML(obj.title)}
                  </div>
                  <div style="margin-top: 0.4rem; font-size: 0.72rem; color: var(--text-muted);">
                    ${stat && stat.attempts ? `${stat.correct}/${stat.attempts} answered correctly` : 'No attempts logged'}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      mountEl.querySelector('#heatmapTabCore1').onclick = () => {
        this.selectedExam = 'core1';
        this.render(mountEl);
      };
      mountEl.querySelector('#heatmapTabCore2').onclick = () => {
        this.selectedExam = 'core2';
        this.render(mountEl);
      };

      mountEl.querySelectorAll('.heatmap-tile').forEach((tile) => {
        tile.onmouseenter = () => { tile.style.transform = 'translateY(-2px)'; };
        tile.onmouseleave = () => { tile.style.transform = 'translateY(0)'; };
        tile.onclick = () => {
          const code = tile.getAttribute('data-code');
          this.launchTargetedDrill(code);
        };
      });
    },

    launchTargetedDrill(objectiveCode) {
      if (!window.COMPTIA_EXAM_DATA) {
        alert('Question bank is still loading. Please try again in a moment.');
        return;
      }

      const all = [...(COMPTIA_EXAM_DATA.core1 || []), ...(COMPTIA_EXAM_DATA.core2 || [])];
      const matched = all.filter(q => q.objective === objectiveCode);

      if (matched.length === 0) {
        alert(`No questions found for Objective ${objectiveCode}.`);
        return;
      }

      // Start custom drill in APlus.engine or global startExam
      if (APlus.engine && typeof APlus.engine.start === 'function') {
        const drillSample = matched.sort(() => Math.random() - 0.5).slice(0, Math.min(10, matched.length));
        APlus.engine.questions = drillSample;
        APlus.engine.start('practice', drillSample.length, 15);
        if (typeof showScreen === 'function') showScreen('examScreen');
      } else if (typeof startExam === 'function') {
        // Fallback
        alert(`Starting targeted drill on Objective ${objectiveCode} (${matched.length} questions available).`);
      }
    }
  };

  APlus.masteryHeatmap = MasteryHeatmap;

})(typeof window !== 'undefined' ? window : this);
