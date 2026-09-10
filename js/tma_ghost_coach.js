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
    streamEndpoint: '/api/v1/coach/stream',
    defaultProvider: 'groq',
    defaultIntent: 'explain',
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

  let proPreviewTokensRemaining = 3;

  /**
   * Explains a missed question via Edge AI Gateway
   */
  async function explainQuestion(questionData, userChoice, providerOverride, useProPreview = false, options) {
    const provider = providerOverride || currentProvider;
    const opts = options && typeof options === 'object' ? options : {};
    const intent = opts.intent || COACH_CONFIG.defaultIntent;
    const stream = opts.stream === true;
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
      let idToken = null;
      try {
        const svc = window.ClarioraFirebaseService;
        const user = svc && svc.getCurrentUser && svc.getCurrentUser();
        if (user && user.getIdToken) idToken = await user.getIdToken();
      } catch (_) {}
      const baseOk = (typeof window !== 'undefined' && window.location && (window.location.hostname.endsWith('clariora.com.au') || window.location.hostname.endsWith('pages.dev')));
      const endpoint = baseOk
        ? (stream ? COACH_CONFIG.streamEndpoint : COACH_CONFIG.proxyEndpoint)
        : ('https://clariora.com.au' + (stream ? COACH_CONFIG.streamEndpoint : COACH_CONFIG.proxyEndpoint));

      const payload = {
        intent: intent,
        specialist: opts.specialist || undefined,
        tools: opts.tools || ['lookup_objective'],
        objective: questionData.objective || '',
        missHistory: opts.missHistory || [],
        weakDomains: opts.weakDomains || [],
        system: SYSTEM_PROMPT,
        prompt: prompt,
        question: questionData.question,
        chosenAnswer: userChoice,
        correctAnswer: questionData.answer,
        distractorAnalysis: questionData.distractor_analysis || {},
        provider: provider,
        useProPreview: useProPreview,
        stream: stream,
        initData: initData,
        idToken: idToken
      };

      if (stream) {
        const streamed = await fetchCoachStream(endpoint, payload, initData);
        if (streamed) return streamed;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': initData
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(function () { return {}; });

      if (res.status === 401 || data.error === 'AUTH_REQUIRED') {
        return {
          paywallRequired: true,
          errorType: 'AUTH_REQUIRED',
          message: data.message || 'Sign in required for Ghost Coach.',
          freeQuotaRemaining: 0,
          provider: provider
        };
      }

      if (res.status === 429 || data.error === 'RATE_LIMITED' || data.error === 'IP_RATE_LIMITED') {
        return {
          paywallRequired: false,
          rateLimited: true,
          errorType: data.error || 'RATE_LIMITED',
          message: data.message || 'Too many requests. Retry shortly.',
          retryAfter: data.retryAfter || 60,
          provider: provider
        };
      }

      // Handle Paywall / Quota Exceeded (HTTP 402)
      if (res.status === 402 || data.error === 'PAYWALL_REQUIRED' || data.error === 'FREE_QUOTA_EXHAUSTED' ||
          data.error === 'DAILY_CALL_BUDGET_EXHAUSTED' || data.error === 'DAILY_TOKEN_BUDGET_EXHAUSTED' ||
          data.error === 'MONTHLY_TOKEN_BUDGET_EXHAUSTED' || data.error === 'STREAMING_PAYWALL') {
        if (TMABridge) TMABridge.haptic('warning');
        if (typeof data.proPreviewTokensRemaining !== 'undefined') {
          proPreviewTokensRemaining = data.proPreviewTokensRemaining;
        }
        return {
          paywallRequired: true,
          errorType: data.error,
          message: data.message,
          freeQuotaRemaining: data.freeQuotaRemaining || 0,
          proPreviewTokensRemaining: data.proPreviewTokensRemaining || 0,
          budget: data.budget || null,
          features: data.features || null,
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
          upsellMessage: data.upsellMessage,
          triage: data.triage || null,
          tokensUsed: data.tokensUsed,
          budget: data.budget || null,
          features: data.features || null
        };
      }
    } catch (e) {
      console.debug('[GhostCoach] Remote AI Gateway call failed, falling back to local Socratic synthesis.');
    }

    // 2. High-quality structured local fallback (free surface)
    return {
      paywallRequired: false,
      text: generateLocalRemediation(questionData, userChoice),
      provider: 'local_offline',
      model: 'offline'
    };
  }

  async function fetchCoachStream(endpoint, payload, initData) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': initData,
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(payload)
      });
      if (res.status === 402 || res.status === 401 || res.status === 429) {
        const data = await res.json().catch(function () { return { error: 'PAYWALL_REQUIRED' }; });
        return {
          paywallRequired: res.status === 402 || res.status === 401,
          rateLimited: res.status === 429,
          errorType: data.error,
          message: data.message,
          freeQuotaRemaining: data.freeQuotaRemaining || 0,
          provider: payload.provider
        };
      }
      if (!res.ok || !res.body || !res.body.getReader) return null;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalPayload = null;
      let assembled = '';

      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (let i = 0; i < parts.length; i += 1) {
          const block = parts[i];
          const lines = block.split('\n');
          let event = 'message';
          let dataLine = '';
          lines.forEach(function (line) {
            if (line.indexOf('event:') === 0) event = line.slice(6).trim();
            if (line.indexOf('data:') === 0) dataLine += line.slice(5).trim();
          });
          if (!dataLine) continue;
          let parsed = null;
          try { parsed = JSON.parse(dataLine); } catch (_) { parsed = null; }
          if (!parsed) continue;
          if (event === 'token' && parsed.text) assembled = parsed.text;
          if (event === 'done') finalPayload = parsed;
          if (event === 'error') {
            return { paywallRequired: false, text: parsed.message || 'Stream error', provider: 'stream_error' };
          }
        }
      }

      if (finalPayload && finalPayload.text) {
        if (typeof finalPayload.freeQuotaRemaining !== 'undefined') {
          freeQuotaRemaining = finalPayload.freeQuotaRemaining;
          updateQuotaBadge();
        }
        return {
          paywallRequired: false,
          text: finalPayload.text,
          provider: finalPayload.provider,
          model: finalPayload.model,
          freeQuotaRemaining: finalPayload.freeQuotaRemaining,
          upsellMessage: finalPayload.upsellMessage,
          triage: finalPayload.triage || null,
          tokensUsed: finalPayload.tokensUsed,
          budget: finalPayload.budget || null,
          features: finalPayload.features || null,
          streamed: true
        };
      }
      if (assembled) {
        return { paywallRequired: false, text: assembled, provider: payload.provider, streamed: true };
      }
      return null;
    } catch (_) {
      return null;
    }
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
        <h4 style="color: #F5D061; margin: 0 0 8px 0; font-size: 1.15rem;">Unlock Clariora Pro AI</h4>
        <p style="color: #94A3B8; font-size: 0.85rem; line-height: 1.5; margin: 0 0 14px 0;">
          ${customMessage || `Access to <strong>${providerObj.name}</strong>, multi-specialist handoffs, streaming, and higher hard AI budgets requires an active pass.`}
        </p>

        ${proPreviewTokensRemaining > 0 ? `
          <div style="background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 10px; padding: 10px 14px; margin-bottom: 12px; text-align: left;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="color: #38BDF8; font-weight: 700; font-size: 0.85rem;">🎁 14-Day Trial Bonus</span>
              <span style="color: #38BDF8; font-size: 0.75rem; font-weight: 600;">${proPreviewTokensRemaining} Tokens Left</span>
            </div>
            <p style="color: #94A3B8; font-size: 0.78rem; margin: 0 0 8px 0;">Sample enterprise ${providerObj.name} inference before upgrading.</p>
            <button class="btn" onclick="TMAGhostCoach.usePreviewQuery()" style="
              width: 100%; padding: 8px 14px; font-weight: 700; font-size: 0.85rem; border-radius: 8px;
              background: #38BDF8; color: #07090E; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;
            ">
              <span>⚡ Use 1 Pro Preview Token</span>
            </button>
          </div>
        ` : ''}

        <button class="btn btn-primary" onclick="if (window.StarsBilling) window.StarsBilling.openStarsUpgradeSheet()" style="
          width: 100%; padding: 12px 20px; font-weight: 700; font-size: 0.95rem; border-radius: 10px;
          background: linear-gradient(135deg, #D4AF37 0%, #F5D061 50%, #B8860B 100%);
          color: #07090E; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
        ">
          <span>⭐ Unlock Pro (Stars or TON)</span>
        </button>
        <p style="font-size: 0.72rem; color: #64748B; margin-top: 10px;">
          Available via Telegram Stars (XTR) or TON Blockchain. 24-hour, monthly, and lifetime passes available.
        </p>
      </div>
    `;
  }

  async function usePreviewQuery() {
    if (!activeQuestion) return;
    renderLoading();
    const res = await explainQuestion(activeQuestion, activeChoice, currentProvider, true);
    renderResponse(res);
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
      if (typeof freeQuotaRemaining === 'number' && freeQuotaRemaining > 40) {
        badge.textContent = 'Paid: hard AI budgets apply';
        badge.style.color = '#10B981';
      } else {
        badge.textContent = `Free: ${freeQuotaRemaining}/5 left`;
        badge.style.color = '#38BDF8';
      }
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
    selectProvider,
    usePreviewQuery
  };
});
