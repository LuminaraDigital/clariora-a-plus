/**
 * CompTIA A+ Master Exam Simulator v3.0.0
 * srs.js - SM-2 Spaced Repetition Scheduler & Deck Manager
 * File: js/srs.js
 */

(function(window) {
  'use strict';

  window.APlus = window.APlus || {};
  const APlus = window.APlus;

  class SRSScheduler {
    constructor() {
      this.initBusListeners();
    }

    initBusListeners() {
      if (!APlus.bus) return;

      APlus.bus.on('exam:finished', (payload) => {
        this.processExamResults(payload);
        this.renderResultsPanel();
      });
    }

    getDeck() {
      return APlus.storage ? APlus.storage.get('srs_deck', {}) : {};
    }

    saveDeck(deck) {
      if (APlus.storage) {
        APlus.storage.set('srs_deck', deck);
      }
    }

    processExamResults(payload) {
      const deck = this.getDeck();
      const perQuestion = payload.perQuestion || [];

      perQuestion.forEach((item) => {
        const qId = item.id;
        const currentCard = deck[qId] || {
          repetitions: 0,
          interval: 1,
          easeFactor: 2.5,
          nextReviewDate: Date.now()
        };

        const grade = item.correct ? 5 : 1;
        const updated = APlus.engineCore.calcSM2(currentCard, grade);

        deck[qId] = {
          id: qId,
          objective: item.objective,
          domain: item.domain,
          type: item.type,
          ...updated,
          lastReviewed: Date.now()
        };
      });

      this.saveDeck(deck);
    }

    getDueCards(examType = 'both') {
      const deck = this.getDeck();
      const now = Date.now();
      const due = [];

      Object.values(deck).forEach(card => {
        if (card.nextReviewDate <= now) {
          due.push(card);
        }
      });

      return due;
    }

    /**
     * Cards coming due on each of the next 7 days (index 0 is today).
     * Anything already overdue counts against today.
     */
    getUpcomingWeek(now) {
      const deck = this.getDeck();
      const start = new Date(now == null ? Date.now() : now);
      start.setHours(0, 0, 0, 0);
      const dayMs = 86400000;
      const days = [];

      for (let i = 0; i < 7; i++) {
        const from = start.getTime() + (i * dayMs);
        const to = from + dayMs;
        let count = 0;
        Object.values(deck).forEach((card) => {
          const when = Number(card.nextReviewDate) || 0;
          if (i === 0 ? when < to : (when >= from && when < to)) count++;
        });
        days.push({
          offset: i,
          label: new Date(from).toLocaleDateString(undefined, { weekday: 'short' }),
          count: count
        });
      }
      return days;
    }

    renderResultsPanel() {
      const panel = document.getElementById('srsPanels');
      if (!panel) return;

      const dueCards = this.getDueCards('both');
      const week = this.getUpcomingWeek();

      const strip = week.map((d) =>
        '<span class="day' + (d.count > 0 ? ' on' : '') + '" title="' +
          d.label + ': ' + d.count + ' due">' +
          '<span class="label">' + d.label.charAt(0) + '</span>' +
          '<span class="tnum">' + d.count + '</span>' +
        '</span>'
      ).join('');

      panel.innerHTML = `
        <div class="srs-card">
          <div class="label">Spaced repetition</div>
          <p class="srs-due tnum">${dueCards.length} cards due today</p>
          <div class="activity-strip">${strip}</div>
          <button type="button" class="btn btn-secondary" id="srsReviewDueBtn">Review due cards</button>
        </div>
      `;

      const btn = document.getElementById('srsReviewDueBtn');
      if (btn) {
        btn.addEventListener('click', function () {
          if (typeof window.openMemoryModal === 'function') {
            window.openMemoryModal();
          }
        });
      }
    }
  }

  APlus.srs = new SRSScheduler();

})(typeof window !== 'undefined' ? window : this);
