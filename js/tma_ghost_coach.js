/**
 * tma_ghost_coach.js
 * Multi-Model Business AI Socratic Tutor for Clariora Telegram Mini App.
 *
 * Tiers & Provider Routing:
 * - Free Tier: Groq Cloud (Llama 3.1 8B Instant) with 5 daily sessions limit.
 * - Pro Tier: NVIDIA NIM (Llama 3.1/3.3 70B), Private Ollama (DeepSeek-R1), OpenRouter (Claude 3.5 Sonnet).
 * - Automatic Paywall Conversion Funnel powered by Telegram Stars (XTR).
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['./tma_bridge', './stars_billing'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./tma_bridge'), require('./stars_billing'));
  } else {
    root.TMAGhostCoach = factory(root.TMABridge, root.StarsBilling);
  }
})(typeof self !== 'undefined' ? self : this, function (TMABridge, StarsBilling) {
  'use strict';

  const COACH_CONFIG = {
    proxyEndpoint: '/api/v1/coach',
    defaultProvider: 'groq',
    providers: [
      { id: 'groq', name: 'Groq 8B', tier: 'free', icon: '⚡', desc: 'Fast diagnostic remediation' },
      { id: 'nvidia', name: 'NVIDIA 70B', tier: 'pro', icon: '🟢', desc: 'Enterprise datacenter precision' },
      { id: 'ollama', name: 'Ollama R1', tier: 'pro', icon: '🦙', desc: 'DeepSeek reasoning model' },
      { id: 'openrouter', name: 'OpenRouter', tier: 'pro', icon: '🌐', desc: 'Claude 3.5 / GPT-4o multi-model' }
    ]
  };

  let currentProvider = 'groq';
  let activeQuestion = null;
  let activeChoice = null;
  let freeQuotaRemaining = 5;

  /**
   * System Prompt for Mobile CompTIA IT Support & Datacentre Coach
   */
  const SYSTEM_PROMPT = `You are Ghost Coach, an elite Senior IT Support & Datacentre Systems Engineer coaching a candidate for their CompTIA A+ certification.
Rules:
1. Be concise, punchy, and encouraging (under 160 words max for mobile screens).
2. Socratic style: Explain WHY the correct answer is right and specifically why the user's chosen answer was a distractor trap.
3. Provide one memorable mnemonic or real-world datacentre technician rule-of-thumb.
4. Format with clean markdown (bolding and bullet points).`;

  /**
   * Explains a missed question via Edge AI Gateway
   */
  async function explainQuestion(questionData, userChoice, providerOverride) {
    const provider = providerOverride || currentProvider;
    if (TMABridge) TMABridge.haptic('medium');

    const prompt = `CompTIA Objective: ${questionData.objective || 'General'}
Question: ${questionData.question}
Options:
${questionData.options ? questionData.options.map((o, idx) => `${String.fromCharCode(65 + idx)}. ${o}`).join('\n') : ''}

Student selected: ${userChoice || 'None'}
Correct answer: ${questionData.answer}
Official Explanation: ${questionData.explanation || 'N/A'}
Distractor Notes: ${JSON.stringify(questionData.distractor_analysis || {})}`;

    // 1. Live Edge Request via Cloudflare Worker
    try {
      const initData = (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) || '';
      const endpoint = (typeof window !== 'undefined' && window.location && (window.location.hostname.endsWith('clariora.com.au') || window.location.hostname.endsWith('pages.dev')))
        ? COACH_CONFIG.proxyEndpoint
        : 'https://clariora.com.au' + COACH_CONFIG.proxyEndpoint;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': initData
        },
        body: JSON.stringify({
          system: SYSTEM_PROMPT,
          prompt: prompt,
          question: questionData.question,
          chosenAnswer: userChoice,
          correctAnswer: questionData.answer,
          distractorAnalysis: questionData.distractor_analysis || {},
          provider: provider,
          initData: initData
        })
      });

      const data = await res.json();

      // Handle Paywall / Quota Exceeded (HTTP 402)
      if (res.status === 402 || data.error === 'PAYWALL_REQUIRED' || data.error === 'FREE_QUOTA_EXHAUSTED') {
        if (TMABridge) TMABridge.haptic('warning');
        return {
          paywallRequired: true,
          errorType: data.error,
          message: data.message,
          freeQuotaRemaining: data.freeQuotaRemaining || 0,
          provider: provider
        };
      }

      if (res.ok && data.text) {
        if (typeof data.freeQuotaRemaining !== 'undefined') {
          freeQuotaRemaining = data.freeQuotaRemaining;
          updateQuotaBadge();
        }
        return {
          paywallRequired: false,
          text: data.text,
          provider: data.provider || provider,
          model: data.model,
          freeQuotaRemaining: data.freeQuotaRemaining,
          upsellMessage: data.upsellMessage
        };
      }
    } catch (e) {
      console.debug('[GhostCoach] Remote AI Gateway call failed, falling back to local Socratic synthesis.');
    }

    // 2. High-quality structured local fallback
    return {
      paywallRequired: false,
      text: generateLocalRemediation(questionData, userChoice),
      provider: 'local_offline',
      model: 'offline'
    };
  }

  /**
   * Instant local Socratic remediation when offline
   */
  function generateLocalRemediation(q, userChoice) {
    const distractors = q.distractor_analysis || {};
    const userDistractorNote = distractors[userChoice] || 'This option is either inapplicable to the scenario or solves a different layer of the stack.';

    return `🤖 **Ghost Coach Remediation (Offline)**\n\n**Why You Hit the Trap:**\nYou picked *"${userChoice}"*. ${userDistractorNote}\n\n✅ **The Correct Answer: ${q.answer}**\n${q.explanation || 'Matches CompTIA standard troubleshooting methodology and hardware/network specifications.'}\n\n💡 **Technician Rule-of-Thumb:**\n> Always verify the physical layer and simplest failure points first before moving up the OSI model or replacing hardware components.`;
  }

  /**
   * Select a provider (Free Groq or Pro NVIDIA / Ollama / OpenRouter)
   */
  async function selectProvider(providerId) {
    currentProvider = providerId;
    if (TMABridge) TMABridge.haptic('selection');

    // Check user entitlement
    let isPro = false;
    if (StarsBilling && StarsBilling.getEntitlements) {
      const ent = await StarsBilling.getEntitlements();
      isPro = ent && ent.tier && ent.tier !== 'free';
    }

    const providerObj = COACH_CONFIG.providers.find(p => p.id === providerId);
    if (providerObj && providerObj.tier === 'pro' && !isPro) {
      // User tapped a Pro provider without active subscription -> Open Stars upgrade sheet
      renderPaywallNotice(providerObj);
      return;
    }

    // Re-render UI selector state
    updateProviderButtons();

    // Trigger immediate re-query if an active question is loaded
    if (activeQuestion) {
      renderLoading();
      const res = await explainQuestion(activeQuestion, activeChoice, currentProvider);
      renderResponse(res);
    }
  }

  /**
   * Opens the Coach Bottom-Sheet
   */
  async function openCoachSheet(questionData, userChoice) {
    activeQuestion = questionData;
    activeChoice = userChoice;

    let sheet = document.getElementById('tma-coach-sheet');
    let backdrop = document.getElementById('tma-coach-backdrop');

    if (!sheet) {
      backdrop = document.createElement('div');
      backdrop.id = 'tma-coach-backdrop';
      backdrop.className = 'tma-sheet-backdrop';
      backdrop.onclick = closeCoachSheet;
      document.body.appendChild(backdrop);

      sheet = document.createElement('div');
      sheet.id = 'tma-coach-sheet';
      sheet.className = 'tma-sheet';
      sheet.innerHTML = `
        <div class="tma-sheet-handle"></div>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.3rem;">👻</span>
            <h3 style="color: #D4AF37; margin: 0; font-size: 1.1rem;">Ghost Coach AI</h3>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span id="tmaCoachQuotaBadge" style="font-size: 0.72rem; color: #38BDF8; background: rgba(56, 189, 248, 0.12); padding: 2px 8px; border-radius: 99px; border: 1px solid rgba(56, 189, 248, 0.3);">
              Free: ${freeQuotaRemaining}/5 left
            </span>
          </div>
        </div>

        <!-- Multi-Model AI Engine Selector -->
        <div id="tmaCoachModelBar" style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 12px; scrollbar-width: none;">
          ${COACH_CONFIG.providers.map(p => `
            <button type="button" class="tma-provider-pill ${p.id === currentProvider ? 'is-active' : ''}" onclick="TMAGhostCoach.selectProvider('${p.id}')" style="
              display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; border-radius: 99px; font-size: 0.75rem; font-weight: 600; white-space: nowrap; cursor: pointer;
              background: ${p.id === currentProvider ? 'rgba(212, 175, 55, 0.25)' : 'rgba(255, 255, 255, 0.05)'};
              border: 1px solid ${p.id === currentProvider ? '#D4AF37' : 'rgba(255, 255, 255, 0.1)'};
              color: ${p.id === currentProvider ? '#F5D061' : '#94A3B8'};
            ">
              <span>${p.icon}</span>
              <span>${p.name}</span>
              ${p.tier === 'pro' ? '<span style="color: #F5D061; font-size: 0.65rem;">⭐</span>' : ''}
            </button>
          `).join('')}
        </div>

        <div id="tma-coach-body" style="font-size: 0.9rem; line-height: 1.5; color: #F3F4F6;">
          <div class="tma-skeleton-pulse" style="width: 32px; height: 32px; margin: 20px auto;"></div>
          <p style="text-align: center; color: #94A3B8;">Analyzing diagnostic failure points...</p>
        </div>

        <div id="tmaCoachFooterActions" style="text-align: center; margin-top: 16px; display: flex; gap: 8px; justify-content: center;">
          <button class="btn" onclick="TMAGhostCoach.closeCoachSheet()" style="background: transparent; border: 1px solid rgba(255,255,255,0.15); color: #94A3B8; padding: 10px 24px; border-radius: 8px;">Close</button>
        </div>
      `;
      document.body.appendChild(sheet);
    } else {
      renderLoading();
    }

    if (TMABridge) {
      TMABridge.pushNav('coach_sheet', closeCoachSheet);
      TMABridge.haptic('light');
    }

    backdrop.classList.add('is-open');
    sheet.classList.add('is-open');

    // Fetch initial remediation
    const res = await explainQuestion(questionData, userChoice, currentProvider);
    renderResponse(res);
  }

  function renderLoading() {
    const bodyEl = document.getElementById('tma-coach-body');
    if (bodyEl) {
      bodyEl.innerHTML = `
        <div class="tma-skeleton-pulse" style="width: 32px; height: 32px; margin: 20px auto;"></div>
        <p style="text-align: center; color: #94A3B8;">Consulting ${getProviderName(currentProvider)}...</p>
      `;
    }
  }

  function renderResponse(res) {
    const bodyEl = document.getElementById('tma-coach-body');
    if (!bodyEl) return;

    if (res.paywallRequired) {
      renderPaywallNotice({ id: res.provider, name: getProviderName(res.provider) }, res.message);
      return;
    }

    let html = formatMarkdown(res.text || '');

    if (res.upsellMessage) {
      html += `
        <div style="margin-top: 16px; padding: 10px 14px; background: rgba(212, 175, 55, 0.1); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 10px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <span style="font-size: 0.8rem; color: #F5D061;">⭐ ${res.upsellMessage}</span>
          <button onclick="if (window.StarsBilling) window.StarsBilling.openStarsUpgradeSheet()" style="background: #F5D061; color: #07090E; font-size: 0.75rem; font-weight: 700; border: none; padding: 4px 10px; border-radius: 6px; cursor: pointer; white-space: nowrap;">
            Upgrade
          </button>
        </div>
      `;
    }

    bodyEl.innerHTML = html;
    if (TMABridge) TMABridge.haptic('success');
  }

  function renderPaywallNotice(providerObj, customMessage) {
    const bodyEl = document.getElementById('tma-coach-body');
    if (!bodyEl) return;

    bodyEl.innerHTML = `
      <div style="text-align: center; padding: 16px 8px;">
        <div style="font-size: 2rem; margin-bottom: 8px;">⭐</div>
        <h4 style="color: #F5D061; margin: 0 0 8px 0; font-size: 1.1rem;">Unlock Clariora Pro AI</h4>
        <p style="color: #94A3B8; font-size: 0.85rem; line-height: 1.5; margin: 0 0 16px 0;">
          ${customMessage || `Access to <strong>${providerObj.name}</strong>, unlimited tutoring sessions, and deep reasoning models requires an active Pro Pass.`}
        </p>
        <button class="btn btn-primary" onclick="if (window.StarsBilling) window.StarsBilling.openStarsUpgradeSheet()" style="
          width: 100%; padding: 12px 20px; font-weight: 700; font-size: 0.95rem; border-radius: 10px;
          background: linear-gradient(135deg, #D4AF37 0%, #F5D061 50%, #B8860B 100%);
          color: #07090E; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
        ">
          <span>⭐ Unlock with Telegram Stars</span>
        </button>
        <p style="font-size: 0.72rem; color: #64748B; margin-top: 10px;">
          Available via Telegram Stars (XTR) or TON Blockchain. 24-hour, monthly, and lifetime passes available.
        </p>
      </div>
    `;
  }

  function updateProviderButtons() {
    const pills = document.querySelectorAll('.tma-provider-pill');
    pills.forEach((pill, idx) => {
      const p = COACH_CONFIG.providers[idx];
      if (p) {
        const active = p.id === currentProvider;
        pill.style.background = active ? 'rgba(212, 175, 55, 0.25)' : 'rgba(255, 255, 255, 0.05)';
        pill.style.borderColor = active ? '#D4AF37' : 'rgba(255, 255, 255, 0.1)';
        pill.style.color = active ? '#F5D061' : '#94A3B8';
      }
    });
  }

  function updateQuotaBadge() {
    const badge = document.getElementById('tmaCoachQuotaBadge');
    if (badge) {
      badge.textContent = freeQuotaRemaining === 'unlimited'
        ? 'Pro: Unlimited'
        : `Free: ${freeQuotaRemaining}/5 left`;
      badge.style.color = freeQuotaRemaining === 'unlimited' ? '#10B981' : '#38BDF8';
    }
  }

  function getProviderName(id) {
    const p = COACH_CONFIG.providers.find(item => item.id === id);
    return p ? p.name : 'AI Engine';
  }

  function closeCoachSheet() {
    const sheet = document.getElementById('tma-coach-sheet');
    const backdrop = document.getElementById('tma-coach-backdrop');
    if (sheet) sheet.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-open');
    if (TMABridge) TMABridge.haptic('light');
  }

  function formatMarkdown(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^> (.*$)/gim, '<blockquote style="border-left: 3px solid #D4AF37; padding-left: 10px; margin: 8px 0; color: #F5D061;">$1</blockquote>')
      .replace(/\n/g, '<br/>');
  }

  return {
    COACH_CONFIG,
    explainQuestion,
    openCoachSheet,
    closeCoachSheet,
    selectProvider
  };
});
