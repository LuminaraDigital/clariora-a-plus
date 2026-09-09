/**
 * Clariora Exam Simulator v3.0.0
 * qtypes.js - Modular Handlers for Question Types (single, multi, match, order)
 * File: js/qtypes.js
 */

(function(window) {
  'use strict';

  window.APlus = window.APlus || {};
  const APlus = window.APlus;

  const escapeHTML = (window.APlus.utils && window.APlus.utils.escapeHTML) || ((s) => String(s || ''));

  /**
   * Type Handlers
   */
  const Handlers = {
    /**
     * Single Choice (Standard 4 options, 1 answer)
     */
    single: {
      render(q, userState, mountEl, callbacks) {
        mountEl.innerHTML = '';
        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
        const selected = userState.answer;
        const eliminated = userState.eliminated || new Set();

        const list = document.createElement('div');
        list.className = 'options-list';
        list.setAttribute('role', 'radiogroup');
        list.setAttribute('aria-label', 'Answer choices');

        (q.options || []).forEach((optText, optIdx) => {
          const item = document.createElement('div');
          item.className = 'option-item';
          item.setAttribute('role', 'radio');
          item.setAttribute('tabindex', '0');
          item.setAttribute('aria-checked', selected === optIdx ? 'true' : 'false');
          item.setAttribute('aria-label', `Option ${letters[optIdx]}: ${optText}`);

          if (selected === optIdx) item.classList.add('selected');
          if (eliminated.has(optIdx)) item.classList.add('eliminated');

          item.onclick = (e) => {
            if (!e.target.closest('.strike-btn')) {
              callbacks.onSelect(optIdx);
            }
          };

          item.innerHTML = `
            <div class="option-letter" aria-hidden="true">${letters[optIdx]}</div>
            <div class="option-content">${escapeHTML(optText)}</div>
            <button type="button" class="strike-btn" title="Eliminate / restore choice" aria-label="Eliminate option ${letters[optIdx]}"><s>S</s></button>
          `;

          const strikeBtn = item.querySelector('.strike-btn');
          strikeBtn.onclick = (e) => {
            e.stopPropagation();
            callbacks.onToggleEliminate(optIdx);
          };

          list.appendChild(item);
        });

        mountEl.appendChild(list);
      },

      score(q, userState) {
        if (userState === undefined || userState === null) return false;
        const ans = typeof userState === 'object' && userState.answer !== undefined ? userState.answer : userState;
        return ans === q.answer;
      },

      isComplete(q, userState) {
        if (userState === undefined || userState === null) return false;
        const ans = typeof userState === 'object' ? userState.answer : userState;
        return ans !== undefined && ans !== null;
      },

      renderReview(q, userState, mountEl) {
        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
        const userAns = typeof userState === 'object' && userState !== null ? userState.answer : userState;
        const isCorrect = userAns === q.answer;

        let html = '<div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem;">';
        (q.options || []).forEach((opt, oIdx) => {
          let borderStyle = '1px solid var(--border-color)';
          let bgStyle = 'var(--bg-card)';
          let tag = '';

          if (oIdx === q.answer) {
            borderStyle = '1px solid var(--accent-green)';
            bgStyle = 'rgba(16, 185, 129, 0.15)';
            tag = ' <strong style="color: var(--accent-green);">[CORRECT ANSWER]</strong>';
          }
          if (userAns === oIdx && !isCorrect) {
            borderStyle = '1px solid var(--accent-red)';
            bgStyle = 'rgba(239, 68, 68, 0.15)';
            tag = ' <strong style="color: var(--accent-red);">[YOUR ANSWER]</strong>';
          }

          let distractorNote = '';
          if (q.distractor_analysis && q.distractor_analysis[String(oIdx)]) {
            distractorNote = `<div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;"><em>Analysis:</em> ${escapeHTML(q.distractor_analysis[String(oIdx)])}</div>`;
          }

          html += `
            <div style="padding: 0.6rem 0.8rem; border-radius: 6px; border: ${borderStyle}; background: ${bgStyle}; font-size: 0.9rem;">
              <div><strong>${letters[oIdx]}.</strong> ${escapeHTML(opt)} ${tag}</div>
              ${distractorNote}
            </div>
          `;
        });
        html += '</div>';
        mountEl.innerHTML = html;
      }
    },

    /**
     * Multi Choice (5 options, Select TWO, all-or-nothing scoring)
     */
    multi: {
      render(q, userState, mountEl, callbacks) {
        mountEl.innerHTML = '';
        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
        const rawAnswers = userState.answers || (Array.isArray(userState) ? userState : []);
        const selected = new Set(rawAnswers);
        const eliminated = userState.eliminated || new Set();

        const instructions = document.createElement('div');
        instructions.style = 'font-size: 0.85rem; color: var(--accent-cyan); font-weight: 700; margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;';
        instructions.textContent = 'Select TWO options to complete this answer:';
        mountEl.appendChild(instructions);

        const list = document.createElement('div');
        list.className = 'options-list';
        list.setAttribute('role', 'group');
        list.setAttribute('aria-label', 'Multi-choice answer choices');

        (q.options || []).forEach((optText, optIdx) => {
          const item = document.createElement('div');
          item.className = 'option-item';
          item.setAttribute('role', 'checkbox');
          item.setAttribute('tabindex', '0');
          item.setAttribute('aria-checked', selected.has(optIdx) ? 'true' : 'false');
          item.setAttribute('aria-label', `Option ${letters[optIdx]}: ${optText}`);

          if (selected.has(optIdx)) item.classList.add('selected');
          if (eliminated.has(optIdx)) item.classList.add('eliminated');

          item.onclick = (e) => {
            if (!e.target.closest('.strike-btn')) {
              const current = new Set(selected);
              if (current.has(optIdx)) {
                current.delete(optIdx);
              } else {
                if (current.size >= 2) {
                  const first = Array.from(current)[0];
                  current.delete(first);
                }
                current.add(optIdx);
              }
              callbacks.onSelect(Array.from(current).sort((a, b) => a - b));
            }
          };

          item.innerHTML = `
            <div class="option-letter" style="border-radius: 4px;" aria-hidden="true">${letters[optIdx]}</div>
            <div class="option-content">${escapeHTML(optText)}</div>
            <button type="button" class="strike-btn" title="Eliminate / restore choice"><s>S</s></button>
          `;

          const strikeBtn = item.querySelector('.strike-btn');
          strikeBtn.onclick = (e) => {
            e.stopPropagation();
            callbacks.onToggleEliminate(optIdx);
          };

          list.appendChild(item);
        });

        mountEl.appendChild(list);
      },

      score(q, userState) {
        if (!userState) return false;
        const answers = Array.isArray(userState) ? userState : (userState.answers || []);
        if (!Array.isArray(q.answers) || answers.length !== q.answers.length) return false;

        const targetSet = new Set(q.answers);
        return answers.every(ans => targetSet.has(ans));
      },

      isComplete(q, userState) {
        if (!userState) return false;
        const answers = Array.isArray(userState) ? userState : (userState.answers || []);
        return answers.length === (Array.isArray(q.answers) ? q.answers.length : 2);
      },

      renderReview(q, userState, mountEl) {
        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
        const userAnswers = Array.isArray(userState) ? userState : (userState && userState.answers ? userState.answers : []);
        const targetSet = new Set(q.answers || []);
        const userSet = new Set(userAnswers);

        let html = '<div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem;">';
        (q.options || []).forEach((opt, oIdx) => {
          let borderStyle = '1px solid var(--border-color)';
          let bgStyle = 'var(--bg-card)';
          let tag = '';

          const isTarget = targetSet.has(oIdx);
          const isChosen = userSet.has(oIdx);

          if (isTarget) {
            borderStyle = '1px solid var(--accent-green)';
            bgStyle = 'rgba(16, 185, 129, 0.15)';
            tag += ' <strong style="color: var(--accent-green);">[CORRECT ANSWER]</strong>';
          }
          if (isChosen && !isTarget) {
            borderStyle = '1px solid var(--accent-red)';
            bgStyle = 'rgba(239, 68, 68, 0.15)';
            tag += ' <strong style="color: var(--accent-red);">[YOUR INCORRECT CHOICE]</strong>';
          } else if (isChosen && isTarget) {
            tag += ' <span style="color: var(--accent-cyan); font-weight: 700;">(Selected)</span>';
          }

          let distractorNote = '';
          if (q.distractor_analysis && q.distractor_analysis[String(oIdx)]) {
            distractorNote = `<div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;"><em>Analysis:</em> ${escapeHTML(q.distractor_analysis[String(oIdx)])}</div>`;
          }

          html += `
            <div style="padding: 0.6rem 0.8rem; border-radius: 6px; border: ${borderStyle}; background: ${bgStyle}; font-size: 0.9rem;">
              <div><strong>${letters[oIdx]}.</strong> ${escapeHTML(opt)} ${tag}</div>
              ${distractorNote}
            </div>
          `;
        });
        html += '</div>';
        mountEl.innerHTML = html;
      }
    },

    /**
     * Match Question (Pair matching left items to right items)
     */
    match: {
      render(q, userState, mountEl, callbacks) {
        mountEl.innerHTML = '';
        const pairs = q.pairs || [];
        const stateMap = (userState && userState.matches) ? userState.matches : (typeof userState === 'object' && userState !== null && !Array.isArray(userState) ? userState : {});

        const container = document.createElement('div');
        container.style = 'display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 0.5rem;';

        const leftCol = document.createElement('div');
        leftCol.style = 'display: flex; flex-direction: column; gap: 0.5rem;';

        const rightCol = document.createElement('div');
        rightCol.style = 'display: flex; flex-direction: column; gap: 0.5rem;';

        let selectedLeft = null;

        pairs.forEach((pair, idx) => {
          const leftBtn = document.createElement('button');
          leftBtn.type = 'button';
          leftBtn.className = 'btn btn-secondary';
          leftBtn.style = 'text-align: left; justify-content: space-between; font-size: 0.85rem; padding: 0.6rem 0.8rem;';
          const matchedRight = stateMap[pair.left];
          leftBtn.innerHTML = `<span>${escapeHTML(pair.left)}</span> <span style="color: var(--accent-cyan); font-weight: 700;">${matchedRight ? '-> ' + escapeHTML(matchedRight) : ''}</span>`;

          leftBtn.onclick = () => {
            selectedLeft = pair.left;
            leftCol.querySelectorAll('button').forEach((b, i) => {
              b.style.borderColor = (i === idx) ? 'var(--accent-cyan)' : 'var(--border-color)';
            });
          };

          leftCol.appendChild(leftBtn);
        });

        // Right column options
        const rightOptions = (q._shuffledRight || pairs.map(p => p.right).sort(() => Math.random() - 0.5));
        q._shuffledRight = rightOptions;

        rightOptions.forEach((rVal) => {
          const rightBtn = document.createElement('button');
          rightBtn.type = 'button';
          rightBtn.className = 'btn btn-secondary';
          rightBtn.style = 'font-size: 0.85rem; font-weight: 600; justify-content: center; padding: 0.6rem 0.8rem;';
          rightBtn.innerText = rVal;

          rightBtn.onclick = () => {
            if (!selectedLeft) {
              alert('Select an item on the left column first, then match it to the right.');
              return;
            }
            const updated = { ...stateMap, [selectedLeft]: rVal };
            callbacks.onSelect(updated);
          };

          rightCol.appendChild(rightBtn);
        });

        container.appendChild(leftCol);
        container.appendChild(rightCol);
        mountEl.appendChild(container);
      },

      score(q, userState) {
        if (!userState) return false;
        const matches = userState.matches || userState;
        const pairs = q.pairs || [];
        if (pairs.length === 0) return false;

        return pairs.every(p => matches[p.left] === p.right);
      },

      isComplete(q, userState) {
        if (!userState) return false;
        const matches = userState.matches || userState;
        const pairs = q.pairs || [];
        return pairs.every(p => Boolean(matches[p.left]));
      },

      renderReview(q, userState, mountEl) {
        const matches = (userState && userState.matches) ? userState.matches : (userState || {});
        const pairs = q.pairs || [];

        let html = '<div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem;">';
        pairs.forEach(p => {
          const userMatch = matches[p.left];
          const isCorrect = userMatch === p.right;
          const borderStyle = isCorrect ? '1px solid var(--accent-green)' : '1px solid var(--accent-red)';
          const bgStyle = isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';

          html += `
            <div style="padding: 0.6rem 0.8rem; border-radius: 6px; border: ${borderStyle}; background: ${bgStyle}; font-size: 0.9rem;">
              <strong>${escapeHTML(p.left)}</strong> -> 
              <span style="color: ${isCorrect ? 'var(--accent-green)' : 'var(--accent-red)'}; font-weight: 700;">${escapeHTML(userMatch || 'Unanswered')}</span>
              ${!isCorrect ? `<span style="margin-left: 0.5rem; color: var(--accent-green);">(Correct target: <strong>${escapeHTML(p.right)}</strong>)</span>` : ''}
            </div>
          `;
        });
        html += '</div>';
        mountEl.innerHTML = html;
      }
    },

    /**
     * Order Question (Step sequencing with full step descriptions)
     */
    order: {
      render(q, userState, mountEl, callbacks) {
        mountEl.innerHTML = '';
        const correctSequence = q.sequence || [];
        let currentOrder = [];

        if (userState && Array.isArray(userState.sequence)) {
          currentOrder = [...userState.sequence];
        } else if (Array.isArray(userState)) {
          currentOrder = [...userState];
        } else {
          // Initialize randomized order if not set
          currentOrder = (q._initialRandomOrder || [...correctSequence].sort(() => Math.random() - 0.5));
          q._initialRandomOrder = currentOrder;
        }

        const instructions = document.createElement('div');
        instructions.style = 'font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem;';
        instructions.textContent = 'Arrange all steps in the correct chronological / troubleshooting order using the up/down controls:';
        mountEl.appendChild(instructions);

        const list = document.createElement('div');
        list.style = 'display: flex; flex-direction: column; gap: 0.5rem;';

        currentOrder.forEach((stepText, idx) => {
          const item = document.createElement('div');
          item.style = 'display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); border: 1px solid var(--border-color); padding: 0.65rem 0.9rem; border-radius: 6px; font-size: 0.9rem; gap: 0.75rem;';

          item.innerHTML = `
            <div style="flex: 1;">
              <span style="background: rgba(6, 182, 212, 0.15); color: var(--accent-cyan); font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.8rem; margin-right: 0.5rem;">Step ${idx + 1}</span>
              <span>${escapeHTML(stepText)}</span>
            </div>
            <div style="display: flex; gap: 0.3rem;">
              <button type="button" class="btn btn-secondary move-up-btn" style="padding: 0.25rem 0.55rem; font-size: 0.8rem;" ${idx === 0 ? 'disabled' : ''}>▲</button>
              <button type="button" class="btn btn-secondary move-down-btn" style="padding: 0.25rem 0.55rem; font-size: 0.8rem;" ${idx === currentOrder.length - 1 ? 'disabled' : ''}>▼</button>
            </div>
          `;

          const upBtn = item.querySelector('.move-up-btn');
          const downBtn = item.querySelector('.move-down-btn');

          upBtn.onclick = () => {
            if (idx > 0) {
              const clone = [...currentOrder];
              const temp = clone[idx];
              clone[idx] = clone[idx - 1];
              clone[idx - 1] = temp;
              callbacks.onSelect(clone);
            }
          };

          downBtn.onclick = () => {
            if (idx < currentOrder.length - 1) {
              const clone = [...currentOrder];
              const temp = clone[idx];
              clone[idx] = clone[idx + 1];
              clone[idx + 1] = temp;
              callbacks.onSelect(clone);
            }
          };

          list.appendChild(item);
        });

        mountEl.appendChild(list);
      },

      score(q, userState) {
        if (!userState) return false;
        const sequence = Array.isArray(userState) ? userState : (userState.sequence || []);
        const target = q.sequence || [];
        if (sequence.length !== target.length) return false;

        return sequence.every((step, idx) => step === target[idx]);
      },

      isComplete(q, userState) {
        if (!userState) return false;
        const sequence = Array.isArray(userState) ? userState : (userState.sequence || []);
        return sequence.length === (q.sequence || []).length;
      },

      renderReview(q, userState, mountEl) {
        const userSeq = Array.isArray(userState) ? userState : (userState && userState.sequence ? userState.sequence : []);
        const target = q.sequence || [];
        const isAllCorrect = this.score(q, userState);

        let html = `<div style="margin-bottom: 0.75rem; font-weight: 700; color: ${isAllCorrect ? 'var(--accent-green)' : 'var(--accent-red)'};">`;
        html += isAllCorrect ? 'Sequence correct' : 'Sequence order does not match';
        html += '</div>';

        html += '<div style="display: flex; flex-direction: column; gap: 0.45rem; margin-bottom: 1rem;">';
        target.forEach((step, idx) => {
          const userChoice = userSeq[idx];
          const isSlotCorrect = userChoice === step;
          const borderStyle = isSlotCorrect ? '1px solid var(--accent-green)' : '1px solid var(--accent-red)';
          const bgStyle = isSlotCorrect ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)';

          html += `
            <div style="padding: 0.55rem 0.8rem; border-radius: 6px; border: ${borderStyle}; background: ${bgStyle}; font-size: 0.88rem;">
              <strong>Step ${idx + 1}:</strong> ${escapeHTML(step)}
              ${!isSlotCorrect ? `<div style="font-size: 0.8rem; color: var(--accent-red); margin-top: 0.2rem;">You placed: ${escapeHTML(userChoice || 'None')}</div>` : ''}
            </div>
          `;
        });
        html += '</div>';
        mountEl.innerHTML = html;
      }
    },

    /**
     * Performance-Based Question (PBQ Interactive Simulations)
     */
    pbq: {
      render(q, userState, mountEl, callbacks) {
        if (APlus.pbqEngine && typeof APlus.pbqEngine.render === 'function') {
          APlus.pbqEngine.render(q, userState, mountEl, callbacks);
        } else {
          mountEl.innerHTML = '<div style="padding: 1rem; color: var(--accent-red);">Simulation engine loading...</div>';
        }
      },

      score(q, userState) {
        if (APlus.pbqEngine && typeof APlus.pbqEngine.score === 'function') {
          return APlus.pbqEngine.score(q, userState);
        }
        return false;
      },

      isComplete(q, userState) {
        if (APlus.pbqEngine && typeof APlus.pbqEngine.isComplete === 'function') {
          return APlus.pbqEngine.isComplete(q, userState);
        }
        return false;
      },

      renderReview(q, userState, mountEl) {
        if (APlus.pbqEngine && typeof APlus.pbqEngine.renderReview === 'function') {
          APlus.pbqEngine.renderReview(q, userState, mountEl);
        } else {
          mountEl.innerHTML = '<div style="padding: 0.5rem;">Performance-Based Question completed.</div>';
        }
      }
    }
  };

  APlus.qtypes = {
    handlers: Handlers,

    getHandler(type = 'single') {
      return Handlers[type] || Handlers.single;
    },

    render(q, userState, mountEl, callbacks) {
      const handler = this.getHandler(q.type);
      handler.render(q, userState, mountEl, callbacks);
    },

    score(q, userState) {
      const handler = this.getHandler(q.type);
      return handler.score(q, userState);
    },

    isComplete(q, userState) {
      const handler = this.getHandler(q.type);
      return handler.isComplete(q, userState);
    },

    renderReview(q, userState, mountEl) {
      const handler = this.getHandler(q.type);
      handler.renderReview(q, userState, mountEl);
    }
  };

})(typeof window !== 'undefined' ? window : this);
