/**
 * Clariora Exam Simulator v3.2.0
 * notes-engine.js - Data Layer & Persistence for Learner Notes & Exam Scratchpad
 * File: js/notes-engine.js
 */

(function(window) {
  'use strict';

  window.APlus = window.APlus || {};
  const APlus = window.APlus;

  const NOTES_STORAGE_KEY = 'user_notes';
  const SCRATCHPAD_STORAGE_KEY = 'scratchpad';

  // In-memory fallback cache for Node tests or environments without persistent storage
  let _memNotes = null;
  let _memScratchpad = {};

  function getStorageAdapter() {
    if (APlus.storage && typeof APlus.storage.get === 'function') {
      return APlus.storage;
    }
    // Fallback if core.js is not loaded yet or in mock test environment
    return {
      get(key, fallback) {
        try {
          if (typeof localStorage !== 'undefined') {
            const val = localStorage.getItem('aplus3_' + key);
            return val ? JSON.parse(val) : fallback;
          }
        } catch (_) {}
        return fallback;
      },
      set(key, val) {
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('aplus3_' + key, JSON.stringify(val));
          }
        } catch (_) {}
      }
    };
  }

  const NotesEngine = {
    /**
     * Retrieve all saved question notes.
     * @returns {Object} Map of questionId -> Note Object
     */
    getAllNotes() {
      if (_memNotes !== null) return _memNotes;
      const storage = getStorageAdapter();
      const notes = storage.get(NOTES_STORAGE_KEY, {});
      _memNotes = (notes && typeof notes === 'object') ? notes : {};
      return _memNotes;
    },

    /**
     * Get note for a specific question.
     * @param {string} questionId
     * @returns {Object|null}
     */
    getNote(questionId) {
      if (!questionId) return null;
      const all = this.getAllNotes();
      return all[String(questionId)] || null;
    },

    /**
     * Check if a question has an associated note.
     * @param {string} questionId
     * @returns {boolean}
     */
    hasNote(questionId) {
      if (!questionId) return false;
      const note = this.getNote(questionId);
      return Boolean(note && note.text && note.text.trim().length > 0);
    },

    /**
     * Save or update a note for a question.
     * @param {string} questionId
     * @param {string} text
     * @param {Object} metadata (questionStem, objective, domain, exam, tags)
     * @returns {Object} Saved note object
     */
    saveNote(questionId, text, metadata = {}) {
      if (!questionId) throw new Error('questionId is required to save a note');
      const all = this.getAllNotes();
      const cleanText = String(text || '').trim();

      if (!cleanText) {
        // Empty text acts as delete
        return this.deleteNote(questionId);
      }

      const existing = all[String(questionId)] || {};
      const note = {
        questionId: String(questionId),
        text: cleanText,
        updatedAt: new Date().toISOString(),
        createdAt: existing.createdAt || new Date().toISOString(),
        questionStem: metadata.questionStem || existing.questionStem || '',
        objective: metadata.objective || existing.objective || '',
        domain: metadata.domain || existing.domain || '',
        exam: metadata.exam || existing.exam || '',
        tags: Array.isArray(metadata.tags) ? metadata.tags : (existing.tags || [])
      };

      all[String(questionId)] = note;
      _memNotes = all;

      const storage = getStorageAdapter();
      storage.set(NOTES_STORAGE_KEY, all);

      if (APlus.bus && typeof APlus.bus.emit === 'function') {
        APlus.bus.emit('note:saved', { questionId: String(questionId), note });
      }

      return note;
    },

    /**
     * Delete a note by question ID.
     * @param {string} questionId
     * @returns {boolean} True if deleted
     */
    deleteNote(questionId) {
      if (!questionId) return false;
      const all = this.getAllNotes();
      const id = String(questionId);
      if (!(id in all)) return false;

      delete all[id];
      _memNotes = all;

      const storage = getStorageAdapter();
      storage.set(NOTES_STORAGE_KEY, all);

      if (APlus.bus && typeof APlus.bus.emit === 'function') {
        APlus.bus.emit('note:deleted', { questionId: id });
      }

      return true;
    },

    /**
     * Total number of notes recorded.
     * @returns {number}
     */
    getNotesCount() {
      const all = this.getAllNotes();
      return Object.keys(all).length;
    },

    /**
     * Get scratchpad contents for an exam session or global whiteboard.
     * @param {string} sessionKey ('global', 'core1', 'core2', etc.)
     * @returns {string}
     */
    getScratchpad(sessionKey = 'global') {
      const storage = getStorageAdapter();
      const all = storage.get(SCRATCHPAD_STORAGE_KEY, {});
      if (all && typeof all === 'object' && typeof all[sessionKey] === 'string') {
        return all[sessionKey];
      }
      return _memScratchpad[sessionKey] || '';
    },

    /**
     * Save scratchpad text.
     * @param {string} sessionKey
     * @param {string} text
     * @returns {string}
     */
    saveScratchpad(sessionKey = 'global', text = '') {
      const storage = getStorageAdapter();
      const all = storage.get(SCRATCHPAD_STORAGE_KEY, {});
      const cleanAll = (all && typeof all === 'object') ? all : {};
      cleanAll[sessionKey] = String(text || '');
      _memScratchpad[sessionKey] = cleanAll[sessionKey];

      storage.set(SCRATCHPAD_STORAGE_KEY, cleanAll);

      if (APlus.bus && typeof APlus.bus.emit === 'function') {
        APlus.bus.emit('scratchpad:updated', { sessionKey, text: cleanAll[sessionKey] });
      }

      return cleanAll[sessionKey];
    },

    /**
     * Clear scratchpad text.
     * @param {string} sessionKey
     */
    clearScratchpad(sessionKey = 'global') {
      return this.saveScratchpad(sessionKey, '');
    },

    /**
     * Export all learner notes as a structured Markdown study guide / cram sheet.
     * @returns {string}
     */
    exportNotesAsMarkdown() {
      const all = this.getAllNotes();
      const keys = Object.keys(all);

      if (!keys.length) {
        return '# Clariora A+ Study Notes\n\n*No personal study notes recorded yet. Add notes to questions during practice or review to generate your customized cram sheet.*';
      }

      // Group notes by Exam then Domain
      const grouped = {};
      keys.forEach(id => {
        const note = all[id];
        const exam = note.exam || 'General';
        const domain = note.domain || 'General Domain';
        grouped[exam] = grouped[exam] || {};
        grouped[exam][domain] = grouped[exam][domain] || [];
        grouped[exam][domain].push(note);
      });

      let md = '# Clariora A+ Personal Study Notes & Cram Sheet\n\n';
      md += `*Generated on ${new Date().toLocaleDateString()} · Total Notes: ${keys.length}*\n\n---\n\n`;

      Object.keys(grouped).sort().forEach(examKey => {
        const examTitle = (examKey === 'core1') ? 'Core 1 (220-1201)' : (examKey === 'core2' ? 'Core 2 (220-1202)' : examKey);
        md += `## ${examTitle}\n\n`;

        Object.keys(grouped[examKey]).sort().forEach(domainKey => {
          md += `### ${domainKey}\n\n`;
          grouped[examKey][domainKey].forEach(note => {
            const objBadge = note.objective ? `**[Obj ${note.objective}]** ` : '';
            md += `#### ${objBadge}Question ${note.questionId}\n\n`;
            if (note.questionStem) {
              md += `> *${note.questionStem}*\n\n`;
            }
            md += `**My Takeaway:**\n${note.text}\n\n`;
            md += `*Last updated: ${new Date(note.updatedAt).toLocaleString()}*\n\n`;
          });
        });
      });

      return md;
    },

    /**
     * Export all notes as JSON string.
     * @returns {string}
     */
    exportNotesAsJson() {
      return JSON.stringify(this.getAllNotes(), null, 2);
    },

    /**
     * Import notes from JSON string (merges with existing).
     * @param {string} jsonString
     * @returns {number} Number of notes imported
     */
    importNotesFromJson(jsonString) {
      if (!jsonString) return 0;
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') throw new Error('Invalid notes JSON format');

      const all = this.getAllNotes();
      let importedCount = 0;

      Object.keys(parsed).forEach(id => {
        const item = parsed[id];
        if (item && item.text) {
          all[id] = {
            questionId: id,
            text: String(item.text).trim(),
            updatedAt: item.updatedAt || new Date().toISOString(),
            createdAt: item.createdAt || new Date().toISOString(),
            questionStem: item.questionStem || '',
            objective: item.objective || '',
            domain: item.domain || '',
            exam: item.exam || '',
            tags: Array.isArray(item.tags) ? item.tags : []
          };
          importedCount++;
        }
      });

      _memNotes = all;
      const storage = getStorageAdapter();
      storage.set(NOTES_STORAGE_KEY, all);

      if (APlus.bus && typeof APlus.bus.emit === 'function') {
        APlus.bus.emit('notes:imported', { count: importedCount });
      }

      return importedCount;
    }
  };

  APlus.notes = NotesEngine;

  // Node module export for unit tests
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotesEngine;
  }

})(typeof window !== 'undefined' ? window : this);
