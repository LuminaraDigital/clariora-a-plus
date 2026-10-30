/**
 * Clariora Exam Simulator v3.2.0
 * notes-ui.js - User Interface for Pearson VUE Scratchpad, Question Takeaways & Study Notebook
 * File: js/notes-ui.js
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

  const TEMPLATES = {
    troubleshooting: `=== COMPTIA 6-STEP TROUBLESHOOTING ===\n1. Identify the problem (question user, review logs, BACKUP FIRST)\n2. Establish a theory of probable cause (question the obvious, top-down/bottom-up)\n3. Test the theory to determine cause (if confirmed -> plan; if not -> new theory/escalate)\n4. Establish a plan of action and implement solution\n5. Verify full system functionality & implement preventive measures\n6. Document findings, actions, and outcomes in ticketing KB\n`,
    ports: `=== ESSENTIAL COMPTIA PORTS ===\n20/21 - FTP (File Transfer)\n22    - SSH / SFTP (Secure Shell)\n23    - Telnet (Cleartext terminal)\n25    - SMTP (Simple Mail Transfer)\n53    - DNS (Domain Name System - UDP/TCP)\n67/68 - DHCP (UDP - 67 Server, 68 Client)\n69    - TFTP (UDP PXE Boot)\n80    - HTTP (Cleartext Web)\n110   - POP3 (Email Retrieval)\n123   - NTP (Network Time)\n143   - IMAP (Email Sync)\n161/162 - SNMP (UDP Network Monitoring)\n389   - LDAP (Active Directory)\n443   - HTTPS (Secure Web)\n445   - SMB (Windows File Sharing)\n636   - LDAPS (Secure LDAP)\n3389  - RDP (Remote Desktop Protocol)\n`,
    subnetting: `=== IPv4 CIDR QUICK SUBNETTING ===\nPrefix | Subnet Mask       | Total IPs | Usable Hosts\n/24    | 255.255.255.0     | 256       | 254\n/25    | 255.255.255.128   | 128       | 126\n/26    | 255.255.255.192   | 64        | 62\n/27    | 255.255.255.224   | 32        | 30\n/28    | 255.255.255.240   | 16        | 14\n/29    | 255.255.255.248   | 8         | 6\n/30    | 255.255.255.252   | 4         | 2 (Point-to-point)\n\nAPIPA: 169.254.0.1 - 169.254.255.254 (Subnet 255.255.0.0)\nClass A: 10.0.0.0/8 | Class B: 172.16.0.0/12 | Class C: 192.168.0.0/16\n`,
    laser: `=== 7-STEP LASER PRINTING CYCLE ===\n1. Processing (Raster Image Processor creates page bitmap)\n2. Charging (Primary corona / charge roller puts -600V on drum)\n3. Exposing (Laser writes image, reduces exposed spots to -100V)\n4. Developing (Toner roller applies -600V toner to -100V exposed image)\n5. Transferring (+ charge roller pulls toner from drum to paper)\n6. Fusing (Heat and pressure rollers permanently melt toner)\n7. Cleaning (Rubber blade scrapes residual toner into waste reservoir)\n`,
    raid: `=== RAID MATRIX ===\nRAID 0 : Striping | Min 2 drives | 0 fault tolerance | 100% capacity\nRAID 1 : Mirroring | Min 2 drives | 1 drive failure | 50% capacity\nRAID 5 : Striping w/ Parity | Min 3 drives | 1 drive failure | (N-1)/N capacity\nRAID 10: Striping + Mirroring | Min 4 drives | 1 drive per mirror pair | 50% capacity\n`
  };

  const NotesUI = {
    activeSessionKey: 'global',
    autoSaveTimer: null,
    editingQuestionId: null,

    init() {
      this.injectStyles();
      this.injectScratchpadModal();
      this.injectStudyNotebookModal();
      this.injectQuestionNoteModal();
      this.bindShortcuts();
      this.bindBusEvents();
    },

    bindBusEvents() {
      if (APlus.bus) {
        APlus.bus.on('note:saved', () => {
          this.updateNotebookBadge();
        });
        APlus.bus.on('note:deleted', () => {
          this.updateNotebookBadge();
        });
      }
    },

    bindShortcuts() {
      document.addEventListener('keydown', (e) => {
        // Alt+S or Ctrl+Shift+S toggles Scratchpad
        if ((e.altKey && (e.key === 's' || e.key === 'S')) ||
            (e.ctrlKey && e.shiftKey && (e.key === 's' || e.key === 'S'))) {
          e.preventDefault();
          this.toggleScratchpad();
        }
      });
    },

    /* -------------------------------------------------------------
       1. Pearson VUE Exam Scratchpad / Digital Whiteboard
       ------------------------------------------------------------- */
    injectScratchpadModal() {
      if (document.getElementById('scratchpadModal')) return;

      const modal = document.createElement('div');
      modal.id = 'scratchpadModal';
      modal.className = 'modal-overlay';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'scratchpadTitle');

      modal.innerHTML = `
        <div class="modal-card scratchpad-card" style="max-width: 780px; width: 92%; max-height: 88vh; display: flex; flex-direction: column;">
          <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--card-border); padding-bottom: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              <h3 id="scratchpadTitle" style="margin: 0; font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">
                Exam Whiteboard / Scratchpad
              </h3>
              <span class="badge badge-gold" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">Pearson VUE Mode</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span id="scratchpadSaveIndicator" style="font-size: 0.76rem; color: var(--text-secondary); opacity: 0; transition: opacity 0.3s ease;">Saved</span>
              <button type="button" class="btn btn-secondary btn-icon" onclick="APlus.notesUI.closeScratchpad()" aria-label="Close whiteboard" style="padding: 0.3rem 0.6rem; font-size: 0.85rem;">X</button>
            </div>
          </div>

          <!-- Whiteboard Toolbar -->
          <div class="scratchpad-toolbar" style="display: flex; flex-wrap: wrap; gap: 0.5rem; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color); align-items: center; justify-content: space-between;">
            <div style="display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center;">
              <span style="font-size: 0.78rem; font-weight: 600; color: var(--text-secondary);">Insert Dump:</span>
              <button type="button" class="btn btn-secondary" style="font-size: 0.74rem; padding: 0.2rem 0.5rem;" onclick="APlus.notesUI.insertTemplate('troubleshooting')">6-Step Method</button>
              <button type="button" class="btn btn-secondary" style="font-size: 0.74rem; padding: 0.2rem 0.5rem;" onclick="APlus.notesUI.insertTemplate('ports')">Common Ports</button>
              <button type="button" class="btn btn-secondary" style="font-size: 0.74rem; padding: 0.2rem 0.5rem;" onclick="APlus.notesUI.insertTemplate('subnetting')">Subnet CIDR</button>
              <button type="button" class="btn btn-secondary" style="font-size: 0.74rem; padding: 0.2rem 0.5rem;" onclick="APlus.notesUI.insertTemplate('laser')">Laser Cycle</button>
              <button type="button" class="btn btn-secondary" style="font-size: 0.74rem; padding: 0.2rem 0.5rem;" onclick="APlus.notesUI.insertTemplate('raid')">RAID</button>
            </div>
            <div style="display: flex; gap: 0.4rem; align-items: center;">
              <button type="button" class="btn btn-secondary" style="font-size: 0.74rem; padding: 0.2rem 0.5rem;" onclick="APlus.notesUI.copyScratchpad()">Copy All</button>
              <button type="button" class="btn btn-secondary" style="font-size: 0.74rem; padding: 0.2rem 0.5rem; color: var(--accent-amber);" onclick="APlus.notesUI.clearScratchpad()">Clear</button>
            </div>
          </div>

          <!-- Whiteboard Text Area -->
          <div style="flex: 1; min-height: 280px; padding-top: 0.75rem; display: flex; flex-direction: column;">
            <textarea id="scratchpadTextarea"
              placeholder="Use this digital scratchpad to jot down port numbers, CIDR charts, troubleshooting steps, or key takeaways. Autosaved continuously."
              style="width: 100%; flex: 1; min-height: 320px; background: #080B10; color: #E2E8F0; font-family: 'Consolas', 'Courier New', monospace; font-size: 0.88rem; line-height: 1.5; padding: 0.85rem; border: 1px solid var(--border-strong); border-radius: 6px; resize: vertical; box-sizing: border-box;"
              aria-label="Exam whiteboard content"
            ></textarea>
          </div>

          <div style="padding-top: 0.75rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-secondary);">
            <span>Shortcut: <kbd style="background: var(--surface-2); padding: 2px 5px; border-radius: 3px; border: 1px solid var(--border-color);">Alt + S</kbd> to toggle</span>
            <button type="button" class="btn btn-primary" onclick="APlus.notesUI.closeScratchpad()" style="font-size: 0.82rem; padding: 0.35rem 0.85rem;">Done</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const textarea = document.getElementById('scratchpadTextarea');
      if (textarea) {
        textarea.addEventListener('input', () => {
          this.handleScratchpadInput();
        });
      }
    },

    toggleScratchpad(sessionKey) {
      const modal = document.getElementById('scratchpadModal');
      if (!modal) return;
      if (modal.classList.contains('active')) {
        this.closeScratchpad();
      } else {
        this.openScratchpad(sessionKey);
      }
    },

    openScratchpad(sessionKey) {
      if (sessionKey) this.activeSessionKey = sessionKey;
      else if (APlus.engine && APlus.engine.examType) {
        this.activeSessionKey = APlus.engine.examType;
      } else {
        this.activeSessionKey = 'global';
      }

      const modal = document.getElementById('scratchpadModal');
      const textarea = document.getElementById('scratchpadTextarea');
      if (!modal || !textarea) return;

      const content = APlus.notes.getScratchpad(this.activeSessionKey);
      textarea.value = content || '';
      modal.classList.add('active');
      setTimeout(() => textarea.focus(), 80);
    },

    closeScratchpad() {
      const modal = document.getElementById('scratchpadModal');
      if (modal) modal.classList.remove('active');
    },

    handleScratchpadInput() {
      const textarea = document.getElementById('scratchpadTextarea');
      if (!textarea) return;

      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = setTimeout(() => {
        APlus.notes.saveScratchpad(this.activeSessionKey, textarea.value);
        this.showSaveIndicator();
      }, 250);
    },

    showSaveIndicator() {
      const ind = document.getElementById('scratchpadSaveIndicator');
      if (ind) {
        ind.style.opacity = '1';
        setTimeout(() => { ind.style.opacity = '0'; }, 1200);
      }
    },

    insertTemplate(key) {
      const template = TEMPLATES[key];
      if (!template) return;
      const textarea = document.getElementById('scratchpadTextarea');
      if (!textarea) return;

      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const current = textarea.value;

      textarea.value = current.substring(0, start) + '\n' + template + '\n' + current.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + template.length + 2;
      textarea.focus();
      this.handleScratchpadInput();
    },

    copyScratchpad() {
      const textarea = document.getElementById('scratchpadTextarea');
      if (!textarea) return;
      navigator.clipboard.writeText(textarea.value).then(() => {
        const ind = document.getElementById('scratchpadSaveIndicator');
        if (ind) {
          ind.innerText = 'Copied to clipboard!';
          ind.style.opacity = '1';
          setTimeout(() => {
            ind.innerText = 'Saved';
            ind.style.opacity = '0';
          }, 1500);
        }
      });
    },

    clearScratchpad() {
      if (confirm('Clear the entire whiteboard?')) {
        const textarea = document.getElementById('scratchpadTextarea');
        if (textarea) textarea.value = '';
        APlus.notes.clearScratchpad(this.activeSessionKey);
        this.showSaveIndicator();
      }
    },

    /* -------------------------------------------------------------
       2. Per-Question Note Modal & Review Hook
       ------------------------------------------------------------- */
    injectQuestionNoteModal() {
      if (document.getElementById('questionNoteModal')) return;

      const modal = document.createElement('div');
      modal.id = 'questionNoteModal';
      modal.className = 'modal-overlay';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');

      modal.innerHTML = `
        <div class="modal-card" style="max-width: 600px; width: 92%;">
          <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--card-border); padding-bottom: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold-primary)" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              <h3 id="questionNoteModalTitle" style="margin: 0; font-size: 1.1rem; color: var(--text-primary);">Personal Takeaway</h3>
            </div>
            <button type="button" class="btn btn-secondary btn-icon" onclick="APlus.notesUI.closeQuestionNoteModal()">X</button>
          </div>
          <div style="padding: 1rem 0;">
            <p id="questionNoteStemPreview" style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.85rem; line-height: 1.4; max-height: 80px; overflow-y: auto;"></p>
            <label for="questionNoteInput" style="display: block; font-size: 0.8rem; font-weight: 700; margin-bottom: 0.4rem; color: var(--gold-light);">Your Mnemonic or Takeaway:</label>
            <textarea id="questionNoteInput" rows="5" placeholder="e.g., Remember: T568B pin 1 is White/Orange. Laser printing step 4 is Developing with toner." style="width: 100%; box-sizing: border-box; background: var(--surface-1); color: var(--text-primary); border: 1px solid var(--border-strong); border-radius: 6px; padding: 0.75rem; font-size: 0.9rem; line-height: 1.4;"></textarea>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <button type="button" id="deleteNoteBtn" class="btn btn-secondary" style="color: var(--accent-amber); font-size: 0.82rem;" onclick="APlus.notesUI.deleteCurrentQuestionNote()">Delete Note</button>
            <div style="display: flex; gap: 0.5rem;">
              <button type="button" class="btn btn-secondary" onclick="APlus.notesUI.closeQuestionNoteModal()">Cancel</button>
              <button type="button" class="btn btn-primary" onclick="APlus.notesUI.saveCurrentQuestionNote()">Save Takeaway</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
    },

    openQuestionNoteModal(questionId) {
      if (!questionId) return;
      this.editingQuestionId = String(questionId);

      const modal = document.getElementById('questionNoteModal');
      const title = document.getElementById('questionNoteModalTitle');
      const stem = document.getElementById('questionNoteStemPreview');
      const input = document.getElementById('questionNoteInput');
      const delBtn = document.getElementById('deleteNoteBtn');

      if (!modal || !input) return;

      const note = APlus.notes.getNote(this.editingQuestionId);
      let questionObj = null;

      if (APlus.data && typeof APlus.data.getQuestionById === 'function') {
        questionObj = APlus.data.getQuestionById(this.editingQuestionId);
      }

      title.innerText = `Takeaway for Question ${this.editingQuestionId}`;
      stem.innerText = questionObj ? questionObj.question : (note ? note.questionStem : '');
      input.value = note ? note.text : '';

      if (delBtn) {
        delBtn.style.display = note ? 'inline-block' : 'none';
      }

      modal.classList.add('active');
      setTimeout(() => input.focus(), 80);
    },

    closeQuestionNoteModal() {
      const modal = document.getElementById('questionNoteModal');
      if (modal) modal.classList.remove('active');
      this.editingQuestionId = null;
    },

    saveCurrentQuestionNote() {
      if (!this.editingQuestionId) return;
      const input = document.getElementById('questionNoteInput');
      if (!input) return;

      let questionObj = null;
      if (APlus.data && typeof APlus.data.getQuestionById === 'function') {
        questionObj = APlus.data.getQuestionById(this.editingQuestionId);
      }

      APlus.notes.saveNote(this.editingQuestionId, input.value, {
        questionStem: questionObj ? questionObj.question : '',
        objective: questionObj ? questionObj.objective : '',
        domain: questionObj ? questionObj.domain : '',
        exam: questionObj ? questionObj.exam : ''
      });

      this.closeQuestionNoteModal();

      // Refresh review accordion if open
      if (APlus.ui && typeof APlus.ui.renderReviewAccordion === 'function') {
        const revContainer = document.getElementById('reviewQuestionsList');
        if (revContainer && revContainer.children.length > 0) {
          APlus.ui.renderReviewAccordion(APlus.ui.currentFilter || 'all');
        }
      }

      // Refresh active question in practice if present
      if (APlus.ui && typeof APlus.ui.renderActiveQuestion === 'function') {
        APlus.ui.renderActiveQuestion();
      }
    },

    deleteCurrentQuestionNote() {
      if (!this.editingQuestionId) return;
      if (confirm('Delete your note for this question?')) {
        APlus.notes.deleteNote(this.editingQuestionId);
        this.closeQuestionNoteModal();

        if (APlus.ui && typeof APlus.ui.renderReviewAccordion === 'function') {
          const revContainer = document.getElementById('reviewQuestionsList');
          if (revContainer && revContainer.children.length > 0) {
            APlus.ui.renderReviewAccordion(APlus.ui.currentFilter || 'all');
          }
        }
      }
    },

    /**
     * Render the personal note block inside a review accordion item.
     * @param {Object} q
     * @returns {string} HTML
     */
    renderReviewNoteHtml(q) {
      if (!q || !q.id) return '';
      const note = APlus.notes.getNote(q.id);

      if (note && note.text) {
        return `
          <div class="user-question-note-box" style="margin-top: 0.85rem; background: rgba(212, 175, 55, 0.08); border: 1px solid var(--gold-primary); border-radius: 6px; padding: 0.75rem 0.9rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
              <span style="font-size: 0.78rem; font-weight: 700; color: var(--gold-primary); text-transform: uppercase; letter-spacing: 0.04em;">My Personal Takeaway</span>
              <button type="button" class="btn btn-secondary" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;" onclick="APlus.notesUI.openQuestionNoteModal('${escapeHTML(q.id)}')">Edit Note</button>
            </div>
            <p style="font-size: 0.88rem; color: var(--text-primary); margin: 0; line-height: 1.45; white-space: pre-wrap;">${escapeHTML(note.text)}</p>
          </div>
        `;
      }

      return `
        <div style="margin-top: 0.75rem;">
          <button type="button" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.25rem 0.55rem; color: var(--gold-primary); border-color: var(--card-border);" onclick="APlus.notesUI.openQuestionNoteModal('${escapeHTML(q.id)}')">
            + Add Personal Takeaway
          </button>
        </div>
      `;
    },

    /* -------------------------------------------------------------
       3. Centralized "My Study Notebook" Modal
       ------------------------------------------------------------- */
    injectStudyNotebookModal() {
      if (document.getElementById('studyNotebookModal')) return;

      const modal = document.createElement('div');
      modal.id = 'studyNotebookModal';
      modal.className = 'modal-overlay';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'notebookTitle');

      modal.innerHTML = `
        <div class="modal-card" style="max-width: 900px; width: 94%; max-height: 90vh; display: flex; flex-direction: column;">
          <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--card-border); padding-bottom: 0.85rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>
                <h3 id="notebookTitle" style="margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--text-primary);">
                  My Study Notebook & Cram Sheet
                </h3>
              </div>
              <p id="notebookStats" style="font-size: 0.82rem; color: var(--text-secondary); margin: 0.25rem 0 0 0;">Loading your takeaways...</p>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <button type="button" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.3rem 0.65rem;" onclick="APlus.notesUI.exportMarkdownFile()">Export .MD</button>
              <button type="button" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.3rem 0.65rem;" onclick="APlus.notesUI.copyAllMarkdown()">Copy All</button>
              <button type="button" class="btn btn-secondary btn-icon" onclick="APlus.notesUI.closeStudyNotebook()" aria-label="Close notebook">X</button>
            </div>
          </div>

          <!-- Controls & Filters -->
          <div style="display: flex; gap: 0.75rem; padding: 0.85rem 0; border-bottom: 1px solid var(--border-color); flex-wrap: wrap; align-items: center;">
            <input type="text" id="notebookSearchInput" placeholder="Search my notes and keywords..." style="flex: 1; min-width: 200px; background: var(--surface-1); border: 1px solid var(--border-strong); border-radius: 6px; padding: 0.45rem 0.75rem; color: var(--text-primary); font-size: 0.85rem;" oninput="APlus.notesUI.renderNotebookList()" />
            <select id="notebookExamFilter" style="background: var(--surface-1); border: 1px solid var(--border-strong); border-radius: 6px; padding: 0.45rem 0.75rem; color: var(--text-primary); font-size: 0.85rem;" onchange="APlus.notesUI.renderNotebookList()">
              <option value="all">All Exams</option>
              <option value="core1">Core 1 (220-1201)</option>
              <option value="core2">Core 2 (220-1202)</option>
            </select>
          </div>

          <!-- Notebook List Container -->
          <div id="notebookNotesList" style="flex: 1; overflow-y: auto; padding: 1rem 0; display: flex; flex-direction: column; gap: 0.75rem;">
            <!-- Rendered by JS -->
          </div>

          <div style="padding-top: 0.75rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <button type="button" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.3rem 0.65rem; color: var(--gold-primary);" onclick="APlus.notesUI.openScratchpad()">Open Exam Whiteboard</button>
            <button type="button" class="btn btn-primary" onclick="APlus.notesUI.closeStudyNotebook()" style="font-size: 0.82rem; padding: 0.35rem 0.85rem;">Close</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
    },

    openStudyNotebook() {
      const modal = document.getElementById('studyNotebookModal');
      if (modal) {
        modal.classList.add('active');
        this.renderNotebookList();
      }
    },

    closeStudyNotebook() {
      const modal = document.getElementById('studyNotebookModal');
      if (modal) modal.classList.remove('active');
    },

    renderNotebookList() {
      const container = document.getElementById('notebookNotesList');
      const statsEl = document.getElementById('notebookStats');
      const searchInput = document.getElementById('notebookSearchInput');
      const examFilter = document.getElementById('notebookExamFilter');

      if (!container) return;

      const search = (searchInput ? searchInput.value : '').toLowerCase();
      const selectedExam = examFilter ? examFilter.value : 'all';

      const all = APlus.notes.getAllNotes();
      const keys = Object.keys(all);

      let visibleCount = 0;
      container.innerHTML = '';

      if (statsEl) {
        statsEl.innerText = `${keys.length} total takeaways recorded across practice and review`;
      }

      if (!keys.length) {
        container.innerHTML = `
          <div style="text-align: center; padding: 3rem 1rem; color: var(--text-secondary);">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5" style="margin-bottom: 0.75rem;"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            <p style="font-size: 1rem; color: var(--text-primary); margin: 0 0 0.5rem 0;">No study takeaways recorded yet.</p>
            <p style="font-size: 0.85rem; max-width: 440px; margin: 0 auto; line-height: 1.5;">Click <strong>"+ Add Personal Takeaway"</strong> while reviewing missed exam questions or practicing to compile your customized cram sheet.</p>
          </div>
        `;
        return;
      }

      // Sort newest first
      const sorted = keys.sort((a, b) => new Date(all[b].updatedAt || 0) - new Date(all[a].updatedAt || 0));

      sorted.forEach(id => {
        const note = all[id];
        const text = (note.text || '').toLowerCase();
        const stem = (note.questionStem || '').toLowerCase();
        const dom = (note.domain || '').toLowerCase();
        const obj = (note.objective || '').toLowerCase();

        const matchesSearch = !search || text.includes(search) || stem.includes(search) || dom.includes(search) || obj.includes(search) || id.toLowerCase().includes(search);
        const matchesExam = selectedExam === 'all' || note.exam === selectedExam;

        if (matchesSearch && matchesExam) {
          visibleCount++;
          const card = document.createElement('div');
          card.className = 'card notebook-card';
          card.style = 'padding: 0.9rem; background: var(--surface-2); border: 1px solid var(--border-color); border-radius: 6px;';

          const examLabel = (note.exam === 'core1') ? 'Core 1 (1201)' : (note.exam === 'core2' ? 'Core 2 (1202)' : 'General');
          const dateStr = note.updatedAt ? new Date(note.updatedAt).toLocaleDateString() : '';

          card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.4rem; flex-wrap: wrap; gap: 0.5rem;">
              <div style="display: flex; align-items: center; gap: 0.45rem;">
                <span class="badge badge-gold" style="font-size: 0.74rem; font-weight: 700;">${escapeHTML(id)}</span>
                <span class="badge badge-secondary" style="font-size: 0.74rem;">${escapeHTML(examLabel)}</span>
                ${note.objective ? `<span style="font-size: 0.74rem; color: var(--accent-cyan); font-weight: 600;">Obj ${escapeHTML(note.objective)}</span>` : ''}
              </div>
              <div style="display: flex; gap: 0.4rem; align-items: center;">
                <span style="font-size: 0.72rem; color: var(--text-muted);">${dateStr}</span>
                <button type="button" class="btn btn-secondary" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;" onclick="APlus.notesUI.openQuestionNoteModal('${escapeHTML(id)}')">Edit</button>
                <button type="button" class="btn btn-secondary" style="font-size: 0.72rem; padding: 0.15rem 0.45rem; color: var(--accent-amber);" onclick="APlus.notesUI.deleteNoteDirect('${escapeHTML(id)}')">Delete</button>
              </div>
            </div>
            ${note.questionStem ? `<p style="font-size: 0.82rem; color: var(--text-secondary); margin: 0 0 0.5rem 0; font-style: italic; line-height: 1.4;">${escapeHTML(note.questionStem)}</p>` : ''}
            <div style="background: rgba(212, 175, 55, 0.06); border-left: 3px solid var(--gold-primary); padding: 0.5rem 0.75rem; border-radius: 0 4px 4px 0;">
              <p style="font-size: 0.88rem; color: var(--text-primary); margin: 0; line-height: 1.45; white-space: pre-wrap;">${escapeHTML(note.text)}</p>
            </div>
          `;

          container.appendChild(card);
        }
      });

      if (visibleCount === 0) {
        container.innerHTML = `<p style="color: var(--text-secondary); text-align: center; padding: 2rem 0;">No notes match your filter.</p>`;
      }
    },

    deleteNoteDirect(id) {
      if (confirm(`Delete note for question ${id}?`)) {
        APlus.notes.deleteNote(id);
        this.renderNotebookList();
      }
    },

    exportMarkdownFile() {
      const md = APlus.notes.exportNotesAsMarkdown();
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Clariora_A_Plus_Study_Notes_${new Date().toISOString().slice(0, 10)}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    copyAllMarkdown() {
      const md = APlus.notes.exportNotesAsMarkdown();
      navigator.clipboard.writeText(md).then(() => {
        alert('All notes copied to clipboard as formatted Markdown!');
      });
    },

    updateNotebookBadge() {
      const count = APlus.notes.getNotesCount();
      const badge = document.getElementById('drawerNotebookCountBadge');
      if (badge) {
        badge.innerText = count > 0 ? String(count) : '';
      }
    },

    /* -------------------------------------------------------------
       4. Style Injection (Black & Gold Tokens + Markdown & Whiteboard)
       ------------------------------------------------------------- */
    injectStyles() {
      if (document.getElementById('notesCustomStyles')) return;

      const style = document.createElement('style');
      style.id = 'notesCustomStyles';
      style.textContent = `
        /* Whiteboard Modal */
        .scratchpad-card {
          border: 1px solid var(--gold-primary);
          box-shadow: 0 10px 40px rgba(0,0,0,0.8);
        }
        /* Markdown Rendering Styles */
        .md-table-wrapper {
          width: 100%;
          overflow-x: auto;
          margin: 1.2rem 0;
          border-radius: 6px;
          border: 1px solid var(--border-color);
        }
        .md-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.86rem;
          line-height: 1.4;
          text-align: left;
        }
        .md-table th {
          background: var(--surface-2);
          color: var(--gold-primary);
          font-weight: 700;
          padding: 0.65rem 0.85rem;
          border-bottom: 2px solid var(--card-border);
        }
        .md-table td {
          padding: 0.6rem 0.85rem;
          border-bottom: 1px solid var(--border-color);
          color: var(--text-primary);
        }
        .md-table tr:nth-child(even) td {
          background: rgba(255, 255, 255, 0.02);
        }
        .md-code-block-wrapper {
          margin: 1rem 0;
          background: #080B10;
          border: 1px solid var(--border-strong);
          border-radius: 6px;
          overflow: hidden;
        }
        .md-code-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--surface-2);
          padding: 0.35rem 0.75rem;
          border-bottom: 1px solid var(--border-color);
        }
        .md-code-lang {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
        }
        .md-copy-btn {
          background: transparent;
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          font-size: 0.72rem;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          cursor: pointer;
        }
        .md-copy-btn:hover {
          border-color: var(--gold-primary);
          color: var(--gold-primary);
        }
        .md-pre {
          margin: 0;
          padding: 0.85rem;
          overflow-x: auto;
          font-family: 'Consolas', monospace;
          font-size: 0.86rem;
          line-height: 1.45;
          color: #F8FAFC;
        }
        .md-inline-code {
          background: var(--surface-2);
          color: var(--gold-light);
          padding: 0.15rem 0.35rem;
          border-radius: 4px;
          font-family: 'Consolas', monospace;
          font-size: 0.88em;
          border: 1px solid var(--border-color);
        }
        .md-alert {
          margin: 1rem 0;
          padding: 0.85rem 1rem;
          border-radius: 6px;
          border-left: 4px solid;
          background: var(--surface-2);
        }
        .md-alert-note { border-color: var(--accent-cyan, #06B6D4); }
        .md-alert-tip { border-color: var(--accent-green, #10B981); }
        .md-alert-important { border-color: var(--gold-primary, #D4AF37); }
        .md-alert-warning { border-color: var(--accent-amber, #F59E0B); }
        .md-alert-caution { border-color: var(--accent-red, #EF4444); }
        .md-alert-title {
          font-weight: 700;
          font-size: 0.82rem;
          text-transform: uppercase;
          margin-bottom: 0.35rem;
          letter-spacing: 0.04em;
        }
        .md-alert-note .md-alert-title { color: var(--accent-cyan, #06B6D4); }
        .md-alert-tip .md-alert-title { color: var(--accent-green, #10B981); }
        .md-alert-important .md-alert-title { color: var(--gold-primary, #D4AF37); }
        .md-alert-warning .md-alert-title { color: var(--accent-amber, #F59E0B); }
        .md-alert-caution .md-alert-title { color: var(--accent-red, #EF4444); }
        .md-heading {
          color: var(--text-primary);
          margin-top: 1.5rem;
          margin-bottom: 0.6rem;
          font-weight: 700;
        }
        .md-h1 { font-size: 1.5rem; border-bottom: 1px solid var(--card-border); padding-bottom: 0.4rem; color: var(--gold-primary); }
        .md-h2 { font-size: 1.25rem; color: var(--gold-light); }
        .md-h3 { font-size: 1.05rem; }
        .md-h4 { font-size: 0.95rem; }
        .md-p { margin-bottom: 0.85rem; line-height: 1.6; color: var(--text-primary); }
        .md-list { padding-left: 1.5rem; margin-bottom: 0.85rem; line-height: 1.6; }
        .md-link { color: var(--accent-cyan); text-decoration: underline; }
      `;
      document.head.appendChild(style);
    }
  };

  APlus.notesUI = NotesUI;

  // Global shims for inline onclick handlers
  window.openScratchpadModal = (sessionKey) => NotesUI.openScratchpad(sessionKey);
  window.closeScratchpadModal = () => NotesUI.closeScratchpad();
  window.openStudyNotebookModal = () => NotesUI.openStudyNotebook();
  window.closeStudyNotebookModal = () => NotesUI.closeStudyNotebook();

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => NotesUI.init());
  } else {
    NotesUI.init();
  }

})(typeof window !== 'undefined' ? window : this);
