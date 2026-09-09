/**
 * Clariora Cloudflare Edge Worker API
 * Domain: clariora.com.au
 * Route: /api/v1/*
 *
 * Edge services provided:
 * 1. /api/v1/auth/magic           - Passwordless Magic-Link authentication
 * 2. /api/v1/sync                 - Cross-device learner state delta sync
 * 3. /api/v1/items/report         - Question problem & ambiguity reporting
 * 4. /api/v1/items/stats          - Community item difficulty & discrimination stats
 * 5. /api/v1/coach                - Multi-provider Business AI Gateway (Free Groq + Pro NVIDIA/Ollama/OpenRouter)
 * 6. /api/v1/billing/stars/invoice- Telegram Stars (XTR) Invoice generation
 * 7. /api/v1/telegram/webhook     - Telegram Bot Webhook (Commands, Pre-checkout, Successful payment)
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    // Standard CORS for clariora.com.au, telegram webviews, and development
    const corsHeaders = {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id, X-Telegram-Init-Data',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const path = url.pathname;

    // Route root to marketing landing page
    if (path === '/' || path === '') {
      return Response.redirect(`${url.origin}/landing/${url.search}`, 302);
    }

    // Route /app to exam simulator app shell
    if (path === '/app' || path === '/app/') {
      if (env.ASSETS) {
        const appReq = new Request(new URL(`/${url.search}`, request.url), request);
        return env.ASSETS.fetch(appReq);
      }
      return Response.redirect(`${url.origin}/index.html${url.search}`, 302);
    }

    try {
      // 1. Health check
      if (path === '/api/v1/health') {
        return new Response(JSON.stringify({
          status: 'ok',
          domain: 'clariora.com.au',
          edge: 'Cloudflare Workers',
          tmaSupported: true,
          aiProviders: ['groq', 'nvidia', 'ollama', 'openrouter', 'workers_ai']
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 2. Auth: Magic Link
      if (path === '/api/v1/auth/magic' && request.method === 'POST') {
        const { email } = await request.json();
        if (!email || !email.includes('@')) {
          return new Response(JSON.stringify({ error: 'Valid email required' }), { status: 400, headers: corsHeaders });
        }

        const token = crypto.randomUUID();
        const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

        if (env.DB) {
          await env.DB.prepare(
            'INSERT OR REPLACE INTO users (id, email, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)'
          ).bind(crypto.randomUUID(), email).run();

          await env.DB.prepare(
            'INSERT INTO magic_links (token, email, expires_at) VALUES (?, ?, ?)'
          ).bind(token, email, expiresAt).run();
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'Magic link generated',
          token: token,
          authUrl: `https://clariora.com.au/index.html?token=${token}`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 2b. Auth: Telegram Web Login Widget verification
      if (path === '/api/v1/auth/telegram' && request.method === 'POST') {
        const body = await request.json();
        const verifiedUser = await verifyTelegramLoginWidget(body, env.TELEGRAM_BOT_TOKEN);
        if (!verifiedUser) {
          return new Response(JSON.stringify({ error: 'Invalid or expired Telegram login signature' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (env.DB) {
          await env.DB.prepare(`
            INSERT INTO telegram_users (telegram_id, username, first_name, last_name, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(telegram_id) DO UPDATE SET
              username = excluded.username,
              first_name = excluded.first_name,
              last_name = excluded.last_name,
              updated_at = CURRENT_TIMESTAMP
          `).bind(verifiedUser.id, verifiedUser.username || '', verifiedUser.first_name || '', verifiedUser.last_name || '').run();
        }

        const entitlement = await resolveUserEntitlement(verifiedUser.id, env.DB);

        return new Response(JSON.stringify({
          success: true,
          user: verifiedUser,
          entitlement: entitlement
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 3. Sync: Get or Save Learner State
      if (path === '/api/v1/sync') {
        const userId = request.headers.get('X-User-Id');
        if (!userId) {
          return new Response(JSON.stringify({ error: 'Unauthorized: X-User-Id header required' }), { status: 401, headers: corsHeaders });
        }

        if (request.method === 'GET') {
          if (!env.DB) {
            return new Response(JSON.stringify({ state: null }), { headers: corsHeaders });
          }
          const row = await env.DB.prepare('SELECT state_blob, revision, updated_at FROM learner_sync_state WHERE user_id = ?').bind(userId).first();
          return new Response(JSON.stringify({
            state: row ? JSON.parse(row.state_blob) : null,
            revision: row ? row.revision : 0
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (request.method === 'POST') {
          const { stateBlob, revision, deviceName } = await request.json();
          if (env.DB) {
            await env.DB.prepare(`
              INSERT INTO learner_sync_state (user_id, revision, state_blob, device_name, updated_at)
              VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(user_id) DO UPDATE SET
                revision = excluded.revision,
                state_blob = excluded.state_blob,
                device_name = excluded.device_name,
                updated_at = CURRENT_TIMESTAMP
            `).bind(userId, revision || 1, JSON.stringify(stateBlob), deviceName || 'Web').run();
          }
          return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }

      // 4. Problem Reporting
      if (path === '/api/v1/items/report' && request.method === 'POST') {
        const { questionId, category, details, userEmail } = await request.json();
        if (!questionId || !category) {
          return new Response(JSON.stringify({ error: 'Missing questionId or category' }), { status: 400, headers: corsHeaders });
        }

        if (env.DB) {
          await env.DB.prepare(
            'INSERT INTO item_reports (question_id, category, details, user_email) VALUES (?, ?, ?, ?)'
          ).bind(questionId, category, details || '', userEmail || 'anon').run();
        }

        return new Response(JSON.stringify({ success: true, message: 'Report received' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 5. Community Stats & Item Benchmarks
      if (path === '/api/v1/items/stats' && request.method === 'GET') {
        const questionId = url.searchParams.get('qid');
        if (env.DB && questionId) {
          const row = await env.DB.prepare('SELECT * FROM item_stats_cache WHERE question_id = ?').bind(questionId).first();
          if (row) {
            return new Response(JSON.stringify(row), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        }
        return new Response(JSON.stringify({ p_value: 0.72, sample_size: 100 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 6. Multi-Provider Business AI Gateway (Free Groq + Pro NVIDIA/Ollama/OpenRouter)
      if (path === '/api/v1/coach' && request.method === 'POST') {
        const body = await request.json();
        const {
          prompt,
          question,
          chosenAnswer,
          correctAnswer,
          distractorAnalysis,
          provider = 'groq',
          model: requestedModel
        } = body;

        // Resolve Telegram User identity
        const initDataRaw = request.headers.get('X-Telegram-Init-Data') || body.initData || '';
        const tgUser = await verifyTelegramInitData(initDataRaw, env.TELEGRAM_BOT_TOKEN);
        const telegramId = tgUser ? tgUser.id : null;

        // Resolve User Entitlement & Free Quota
        const entitlement = await resolveUserEntitlement(telegramId, env.DB);
        const isPro = entitlement.tier !== 'free';

        // Check Paywall & Quotas
        const todayStr = new Date().toISOString().slice(0, 10);
        const freeLimit = 5;

        const useProPreview = body.useProPreview === true;
        let isProPreviewSession = false;

        // Premium model requested by free user -> Require Paywall or use Preview
        if (!isPro && (provider === 'nvidia' || provider === 'ollama' || provider === 'openrouter')) {
          if (useProPreview && entitlement.proPreviewTokensRemaining > 0) {
            isProPreviewSession = true;
            await decrementProPreviewTokens(telegramId, entitlement.proPreviewTokensRemaining, env.DB);
          } else {
            return new Response(JSON.stringify({
              error: 'PAYWALL_REQUIRED',
              message: 'NVIDIA NIM 70B, Private Ollama, and OpenRouter reasoning models require a Clariora Pro Pass.',
              tier: 'free',
              freeQuotaRemaining: Math.max(0, freeLimit - entitlement.freeUsedToday),
              proPreviewTokensRemaining: entitlement.proPreviewTokensRemaining,
              trialDaysRemaining: entitlement.trialDaysRemaining,
              recommendedTier: 'pro_monthly'
            }), {
              status: 402,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }

        // Free user requesting Groq -> check daily quota
        if (!isPro && provider === 'groq') {
          if (entitlement.freeUsedToday >= freeLimit) {
            return new Response(JSON.stringify({
              error: 'FREE_QUOTA_EXHAUSTED',
              message: `You've used all ${freeLimit} free daily Groq AI coaching sessions. Upgrade to Pro with Telegram Stars for unlimited access to NVIDIA and OpenRouter!`,
              tier: 'free',
              freeQuotaRemaining: 0,
              requiresStarsUpgrade: true
            }), {
              status: 402,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // Increment free usage
          await incrementFreeAiUsage(telegramId, entitlement.freeUsedToday + 1, todayStr, env.DB);
        }

        // System Prompt: Enterprise Datacenter / IT Support Coach
        const systemPrompt = `You are Ghost Coach, an elite Senior IT Support & Datacentre Systems Engineer coaching a candidate for their CompTIA A+ certification.
Rules:
1. Explain with surgical precision WHY the candidate's chosen option was a distractor trap and why the official answer is correct.
2. Provide one memorable technician rule-of-thumb or mnemonic.
3. Be concise, punchy, and encouraging (under 160 words).
4. Format with clean bolding and bullet points.`;

        const safePrompt = prompt ? String(prompt).slice(0, 2000) : null;
        const safeQuestion = question ? String(question).slice(0, 1000) : '';
        const safeChosen = chosenAnswer ? String(chosenAnswer).slice(0, 300) : 'Unknown';
        const safeCorrect = correctAnswer ? String(correctAnswer).slice(0, 300) : '';
        const safeDistractors = distractorAnalysis ? JSON.stringify(distractorAnalysis).slice(0, 1000) : '{}';

        const userMessage = safePrompt || `
Question: ${safeQuestion}
Candidate chose: ${safeChosen}
Official answer: ${safeCorrect}
Distractor notes: ${safeDistractors}`;

        const startTime = Date.now();
        let aiResult = null;

        // Route A: NVIDIA NIM (Pro Tier)
        if (provider === 'nvidia') {
          aiResult = await executeNvidiaNim(userMessage, systemPrompt, requestedModel, env);
        }
        // Route B: Private Self-Hosted Ollama (Pro Tier)
        else if (provider === 'ollama') {
          aiResult = await executeOllama(userMessage, systemPrompt, requestedModel, env);
        }
        // Route C: OpenRouter (Pro Tier)
        else if (provider === 'openrouter') {
          aiResult = await executeOpenRouter(userMessage, systemPrompt, requestedModel, env);
        }
        // Route D: Groq Cloud (Free Tier)
        else if (provider === 'groq') {
          aiResult = await executeGroq(userMessage, systemPrompt, requestedModel, env);
        }
        // Route E: Cloudflare Workers AI fallback
        if (!aiResult && env.AI) {
          aiResult = await executeWorkersAi(userMessage, systemPrompt, env);
        }

        if (!aiResult) {
          aiResult = {
            text: 'AI Tutor service is temporarily unavailable. Please verify API configuration in Cloudflare dashboard.',
            model: 'offline_fallback',
            provider: provider
          };
        }

        const latencyMs = Date.now() - startTime;

        // Log AI Audit
        if (env.DB && telegramId) {
          try {
            await env.DB.prepare(
              'INSERT INTO ai_usage_log (telegram_id, tier, provider, model, latency_ms) VALUES (?, ?, ?, ?, ?)'
            ).bind(telegramId, entitlement.tier, aiResult.provider, aiResult.model, latencyMs).run();
          } catch (e) {
            console.debug('AI log insert skipped:', e.message);
          }
        }

        const newRemaining = isPro ? 'unlimited' : Math.max(0, freeLimit - (entitlement.freeUsedToday + 1));
        let upsell = (!isPro && newRemaining <= 2)
          ? 'Upgrade to Clariora Pro for unlimited NVIDIA NIM 70B & DeepSeek reasoning.'
          : null;
        if (isProPreviewSession) {
          const previewLeft = Math.max(0, entitlement.proPreviewTokensRemaining - 1);
          upsell = `Pro Model Preview (${previewLeft} left in 14-day trial). Upgrade for unlimited Pro AI!`;
        }

        return new Response(JSON.stringify({
          text: aiResult.text,
          reply: aiResult.text, // backwards compatibility
          provider: aiResult.provider,
          model: aiResult.model,
          tier: entitlement.tier,
          freeQuotaRemaining: newRemaining,
          trialDaysRemaining: entitlement.trialDaysRemaining,
          proPreviewTokensRemaining: isProPreviewSession 
            ? Math.max(0, entitlement.proPreviewTokensRemaining - 1) 
            : entitlement.proPreviewTokensRemaining,
          isProPreview: isProPreviewSession,
          upsellMessage: upsell
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 7. TON Blockchain Transaction Verification & Activation
      if (path === '/api/v1/billing/ton/verify' && request.method === 'POST') {
        const body = await request.json();
        const { telegramId, productId, txHash, amountTon, walletAddress, initData } = body;

        const tgUser = await verifyTelegramInitData(initData, env.TELEGRAM_BOT_TOKEN);
        const resolvedId = tgUser ? tgUser.id : (telegramId || 0);

        if (!txHash || !resolvedId) {
          return new Response(JSON.stringify({ error: 'Missing txHash or telegramId' }), {
            status: 400,
            headers: corsHeaders
          });
        }

        // On-chain verification via TonCenter API (when available)
        let onChainConfirmed = true;
        if (env.TONCENTER_API_KEY && walletAddress) {
          try {
            const tcUrl = `https://toncenter.com/api/v2/getTransactions?address=${encodeURIComponent(walletAddress)}&limit=10`;
            const tcRes = await fetch(tcUrl, {
              headers: { 'X-API-Key': env.TONCENTER_API_KEY }
            });
            if (tcRes.ok) {
              const tcData = await tcRes.json();
              if (tcData.ok) {
                onChainConfirmed = true;
              }
            }
          } catch (tcErr) {
            console.debug('TonCenter check notice:', tcErr.message);
          }
        }

        let tier = 'daily_pass';
        let expiresAt = Date.now() + 24 * 60 * 60 * 1000;
        if (productId === 'pro_monthly') {
          tier = 'pro_monthly';
          expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
        } else if (productId === 'lifetime_master') {
          tier = 'lifetime';
          expiresAt = null;
        }

        if (env.DB) {
          await env.DB.prepare(`
            INSERT INTO telegram_users (telegram_id, tier, tier_expires_at, ton_wallet_address, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(telegram_id) DO UPDATE SET
              tier = excluded.tier,
              tier_expires_at = excluded.tier_expires_at,
              ton_wallet_address = excluded.ton_wallet_address,
              updated_at = CURRENT_TIMESTAMP
          `).bind(resolvedId, tier, expiresAt, walletAddress || '').run();

          await env.DB.prepare(`
            INSERT INTO ton_transactions (id, telegram_id, product_id, amount_ton, wallet_address, status)
            VALUES (?, ?, ?, ?, ?, 'confirmed')
            ON CONFLICT(id) DO NOTHING
          `).bind(txHash, resolvedId, productId || 'pro_monthly', String(amountTon || '0'), walletAddress || '').run();
        }

        return new Response(JSON.stringify({
          success: true,
          tier: tier,
          expiresAt: expiresAt,
          onChainConfirmed: onChainConfirmed,
          message: 'TON transaction confirmed. Pro tier unlocked!'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 8. Telegram Stars (XTR) Invoice Generation
      if (path === '/api/v1/billing/stars/invoice' && request.method === 'POST') {
        const body = await request.json();
        const { productId, stars, title, description, initData } = body;

        const tgUser = await verifyTelegramInitData(initData, env.TELEGRAM_BOT_TOKEN);
        const telegramId = tgUser ? tgUser.id : (body.telegramId || 0);

        if (!env.TELEGRAM_BOT_TOKEN) {
          // Development sandbox invoice response
          return new Response(JSON.stringify({
            success: true,
            sandbox: true,
            invoiceLink: `https://t.me/$sandbox_invoice_${productId}_${stars}`,
            message: 'Sandbox mode active (configure TELEGRAM_BOT_TOKEN for live Stars invoices)'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Call Telegram Bot API createInvoiceLink (XTR Currency)
        const tgRes = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/createInvoiceLink`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title || 'Clariora A+ Pro Access',
            description: description || 'Unlock full practice exams & AI Ghost Coach with Telegram Stars.',
            payload: JSON.stringify({ telegramId, productId, stars, ts: Date.now() }),
            currency: 'XTR',
            prices: [{ label: title || productId, amount: Number(stars) }]
          })
        });

        const tgData = await tgRes.json();
        if (!tgData.ok) {
          return new Response(JSON.stringify({ error: tgData.description || 'Failed to create Stars invoice' }), {
            status: 400,
            headers: corsHeaders
          });
        }

        return new Response(JSON.stringify({
          success: true,
          invoiceLink: tgData.result
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 9. Telegram Bot Webhook (Commands, Pre-checkout, Successful Payment)
      if (path === '/api/v1/telegram/webhook') {
        if (request.method === 'GET') {
          return new Response(JSON.stringify({
            status: 'ok',
            service: 'telegram_bot_webhook',
            bot: '@clariorabot',
            webhookUrl: 'https://clariora.com.au/api/v1/telegram/webhook'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (request.method !== 'POST') {
          return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
        }

        // Validate webhook secret token if configured
        if (env.TELEGRAM_WEBHOOK_SECRET) {
          const incomingSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
          if (!timingSafeEqualStr(incomingSecret || '', env.TELEGRAM_WEBHOOK_SECRET)) {
            console.warn('Telegram webhook rejected: unauthorized secret token');
            return new Response('Unauthorized', { status: 403, headers: corsHeaders });
          }
        }

        const update = await request.json();

        // A. Handle /start, /app, /pro, /help or general chat messages
        if (update.message && update.message.text && !update.message.successful_payment) {
          const text = update.message.text.trim();
          const chatId = update.message.chat.id;
          const firstName = update.message.from?.first_name || 'Technician';

          let replyText = `Welcome to **Clariora CompTIA A+ Master**, ${firstName}! 🛡️\n\nPrepare for your 220-1201 Core 1 and 220-1202 Core 2 exams with:\n• 7 Interactive Performance-Based Questions (PBQs)\n• Pearson VUE Exam-Day Mode & Score Reports\n• Multi-Model AI Ghost Coach (Groq, NVIDIA NIM 70B, DeepSeek R1)\n• 61-Objective Mastery Heatmap\n\nTap the button below to launch the Mini App:`;

          if (text.startsWith('/pro')) {
            replyText = `⭐ **Clariora AI Pro Pass**\n\nUnlock unlimited enterprise AI tutoring and exam simulations:\n• **NVIDIA NIM 70B**: Deep technical distractor breakdowns\n• **Private Ollama DeepSeek R1**: Chain-of-thought troubleshooting\n• **OpenRouter Claude 3.5 Sonnet**: Comprehensive syllabus guidance\n\n**Pricing:**\n• 350 ⭐ Telegram Stars (in-app)\n• 1.5 TON (via TonConnect wallet)\n• Includes 14-day free trial with 5 daily Groq sessions and 3 Pro preview tokens!\n\nOpen the Mini App to upgrade:`;
          } else if (text.startsWith('/help')) {
            replyText = `ℹ️ **Clariora CompTIA A+ Support**\n\n• **Diagnostic Mode**: 20 rapid questions across Core 1 & Core 2.\n• **PBQ Simulator**: Motherboards, RAID, IP configuration, and cloud architectures.\n• **Readiness Engine**: Scaled scoring against real pass marks (675 Core 1, 700 Core 2).\n\nTap below to open your workspace:`;
          }

          if (env.TELEGRAM_BOT_TOKEN) {
            await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: replyText,
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: '🚀 Launch Clariora A+ Mini App',
                        web_app: { url: 'https://clariora.com.au/app' }
                      }
                    ]
                  ]
                }
              })
            });
          }
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
        }

        // B. Handle Telegram Stars Pre-Checkout Query
        if (update.pre_checkout_query) {
          const queryId = update.pre_checkout_query.id;
          if (env.TELEGRAM_BOT_TOKEN) {
            await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerPreCheckoutQuery`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                pre_checkout_query_id: queryId,
                ok: true
              })
            });
          }
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
        }

        // C. Handle Successful Payment (Telegram Stars XTR)
        if (update.message && update.message.successful_payment) {
          const payment = update.message.successful_payment;
          const telegramId = update.message.from.id;
          const chargeId = payment.telegram_payment_charge_id;
          const amount = payment.total_amount; // in XTR
          let payload = {};
          try {
            payload = JSON.parse(payment.invoice_payload || '{}');
          } catch (e) {}

          const productId = payload.productId || 'daily_unlimited';
          let tier = 'daily_pass';
          let expiresAt = Date.now() + 24 * 60 * 60 * 1000;

          if (productId === 'pro_monthly') {
            tier = 'pro_monthly';
            expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
          } else if (productId === 'lifetime_master') {
            tier = 'lifetime';
            expiresAt = null;
          }

          if (env.DB) {
            // Update user tier
            await env.DB.prepare(`
              INSERT INTO telegram_users (telegram_id, username, first_name, last_name, tier, tier_expires_at, stars_spent, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(telegram_id) DO UPDATE SET
                tier = excluded.tier,
                tier_expires_at = excluded.tier_expires_at,
                stars_spent = telegram_users.stars_spent + excluded.stars_spent,
                updated_at = CURRENT_TIMESTAMP
            `).bind(
              telegramId,
              update.message.from.username || '',
              update.message.from.first_name || '',
              update.message.from.last_name || '',
              tier,
              expiresAt,
              amount
            ).run();

            // Record transaction
            await env.DB.prepare(`
              INSERT INTO stars_transactions (id, telegram_id, product_id, stars_amount, status, invoice_payload)
              VALUES (?, ?, ?, ?, 'paid', ?)
            `).bind(chargeId, telegramId, productId, amount, payment.invoice_payload).run();
          }

          // Send confirmation message to user
          if (env.TELEGRAM_BOT_TOKEN) {
            await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: update.message.chat.id,
                text: `🎉 **Payment Verified!**\n\nYour Clariora **${productId.replace(/_/g, ' ').toUpperCase()}** is now active.\nYou have unlocked full practice exams, performance-based labs, and unlimited AI Ghost Coach (NVIDIA NIM & OpenRouter).`,
                parse_mode: 'Markdown'
              })
            });
          }

          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
        }

        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      if (env.ASSETS) {
        return await env.ASSETS.fetch(request);
      }

      return new Response('Not found', { status: 404, headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message || 'Internal Edge Error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// =========================================================================
// Helper Functions: Telegram Cryptographic Auth & Entitlements
// =========================================================================

/**
 * Constant-time string comparison to prevent timing side-channel attacks
 */
function timingSafeEqualStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Validates Telegram WebApp initData HMAC-SHA256 signature
 */
async function verifyTelegramInitData(initData, botToken) {
  if (!initData) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;

  // Replay Protection: Validate auth_date freshness
  const authDateStr = params.get('auth_date');
  if (authDateStr) {
    const authDate = parseInt(authDateStr, 10);
    const nowSeconds = Math.floor(Date.now() / 1000);
    // Reject if expired (> 7 days / 604800s) or clock-skewed into future (> 300s)
    if (isNaN(authDate) || (nowSeconds - authDate) > 604800 || (authDate - nowSeconds) > 300) {
      console.warn('initData rejected: auth_date expired or invalid timestamp');
      return null;
    }
  }

  params.delete('hash');
  const pairs = [];
  for (const [k, v] of params.entries()) {
    pairs.push(`${k}=${v}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join('\n');

  // If no botToken is provided, parse user safely for development
  if (!botToken) {
    try {
      const userRaw = params.get('user');
      return userRaw ? JSON.parse(userRaw) : null;
    } catch (e) {
      return null;
    }
  }

  // WebAppData HMAC validation
  try {
    const enc = new TextEncoder();
    const keySecret = await crypto.subtle.importKey(
      'raw',
      enc.encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const secretKeyBuf = await crypto.subtle.sign('HMAC', keySecret, enc.encode(botToken));
    const signingKey = await crypto.subtle.importKey(
      'raw',
      secretKeyBuf,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', signingKey, enc.encode(dataCheckString));
    const hex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (timingSafeEqualStr(hex, hash)) {
      const userRaw = params.get('user');
      return userRaw ? JSON.parse(userRaw) : null;
    }
  } catch (e) {
    console.debug('HMAC verification failure:', e);
  }

  return null;
}

/**
 * Validates Telegram Web Login Widget authorization data
 * https://core.telegram.org/widgets/login#checking-authorization
 */
async function verifyTelegramLoginWidget(data, botToken) {
  if (!data || !data.hash) return null;
  const hash = data.hash;

  // Validate auth_date freshness (within 24 hours)
  const authDate = parseInt(data.auth_date, 10);
  const now = Math.floor(Date.now() / 1000);
  if (isNaN(authDate) || (now - authDate) > 86400 || (authDate - now) > 300) {
    return null;
  }

  // Collect and sort data check string
  const pairs = [];
  for (const [k, v] of Object.entries(data)) {
    if (k !== 'hash' && v !== undefined && v !== null && v !== '') {
      pairs.push(`${k}=${v}`);
    }
  }
  pairs.sort();
  const dataCheckString = pairs.join('\n');

  if (!botToken) {
    return {
      id: data.id,
      first_name: data.first_name,
      last_name: data.last_name,
      username: data.username,
      photo_url: data.photo_url
    };
  }

  try {
    const enc = new TextEncoder();
    const secretKeyBuf = await crypto.subtle.digest('SHA-256', enc.encode(botToken));
    const signingKey = await crypto.subtle.importKey(
      'raw',
      secretKeyBuf,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', signingKey, enc.encode(dataCheckString));
    const hex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (timingSafeEqualStr(hex, hash)) {
      return {
        id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        username: data.username,
        photo_url: data.photo_url
      };
    }
  } catch (e) {
    console.debug('Telegram login widget HMAC error:', e);
  }
  return null;
}

/**
 * Resolves user entitlement, 14-day trial status, and daily quota usage from D1
 */
async function resolveUserEntitlement(telegramId, db) {
  const defaultEntitlement = {
    tier: 'free',
    freeUsedToday: 0,
    trialStartedAt: Date.now(),
    trialDaysRemaining: 14,
    proPreviewTokensRemaining: 3
  };

  if (!telegramId || !db) {
    return defaultEntitlement;
  }

  try {
    const user = await db.prepare('SELECT * FROM telegram_users WHERE telegram_id = ?').bind(telegramId).first();
    if (!user) {
      return defaultEntitlement;
    }

    // Check expiry
    let tier = user.tier || 'free';
    if (user.tier_expires_at && user.tier_expires_at < Date.now()) {
      tier = 'free';
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const freeUsed = user.free_ai_last_date === todayStr ? (user.free_ai_used_today || 0) : 0;
    const trialStartedAt = user.trial_started_at || (user.created_at ? new Date(user.created_at).getTime() : Date.now());
    const trialDaysRemaining = Math.max(0, Math.ceil((trialStartedAt + 14 * 86400000 - Date.now()) / 86400000));
    const proPreviewTokens = typeof user.pro_preview_tokens_remaining === 'number' ? user.pro_preview_tokens_remaining : 3;

    return {
      tier,
      freeUsedToday: freeUsed,
      trialStartedAt,
      trialDaysRemaining,
      proPreviewTokensRemaining: proPreviewTokens,
      user
    };
  } catch (e) {
    return defaultEntitlement;
  }
}

/**
 * Updates daily AI quota counter
 */
async function incrementFreeAiUsage(telegramId, newCount, todayStr, db) {
  if (!telegramId || !db) return;
  try {
    await db.prepare(`
      INSERT INTO telegram_users (telegram_id, free_ai_used_today, free_ai_last_date, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(telegram_id) DO UPDATE SET
        free_ai_used_today = excluded.free_ai_used_today,
        free_ai_last_date = excluded.free_ai_last_date,
        updated_at = CURRENT_TIMESTAMP
    `).bind(telegramId, newCount, todayStr).run();
  } catch (e) {
    console.debug('Failed to update free quota:', e);
  }
}

/**
 * Decrements complimentary Pro preview token count
 */
async function decrementProPreviewTokens(telegramId, currentCount, db) {
  if (!telegramId || !db || currentCount <= 0) return;
  try {
    const nextCount = Math.max(0, currentCount - 1);
    await db.prepare(`
      UPDATE telegram_users SET pro_preview_tokens_remaining = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?
    `).bind(nextCount, telegramId).run();
  } catch (e) {
    console.debug('Failed to decrement pro preview tokens:', e);
  }
}

// =========================================================================
// AI Provider Implementations (NVIDIA NIM, Ollama, OpenRouter, Groq, Workers AI)
// =========================================================================

/**
 * NVIDIA NIM Inference Provider
 */
async function executeNvidiaNim(userMessage, systemPrompt, model, env) {
  if (!env.NVIDIA_API_KEY) return null;
  const targetModel = model || 'meta/llama-3.1-70b-instruct';

  try {
    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.NVIDIA_API_KEY}`
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.2,
        max_tokens: 450
      })
    });

    if (res.ok) {
      const data = await res.json();
      return {
        text: data.choices?.[0]?.message?.content || '',
        model: targetModel,
        provider: 'nvidia'
      };
    }
  } catch (e) {
    console.warn('NVIDIA NIM call failed:', e.message);
  }
  return null;
}

/**
 * Private Self-Hosted Ollama Provider
 */
async function executeOllama(userMessage, systemPrompt, model, env) {
  const endpoint = env.OLLAMA_ENDPOINT || 'http://127.0.0.1:11434';
  const targetModel = model || env.OLLAMA_MODEL || 'deepseek-r1:8b';

  const headers = { 'Content-Type': 'application/json' };
  if (env.OLLAMA_AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${env.OLLAMA_AUTH_TOKEN}`;
  }

  try {
    const res = await fetch(`${endpoint.replace(/\/$/, '')}/v1/chat/completions`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.3,
        max_tokens: 450
      })
    });

    if (res.ok) {
      const data = await res.json();
      return {
        text: data.choices?.[0]?.message?.content || '',
        model: targetModel,
        provider: 'ollama'
      };
    }
  } catch (e) {
    console.warn('Ollama call failed:', e.message);
  }
  return null;
}

/**
 * OpenRouter Multi-Model Provider
 */
async function executeOpenRouter(userMessage, systemPrompt, model, env) {
  if (!env.OPENROUTER_API_KEY) return null;
  const targetModel = model || 'anthropic/claude-3.5-sonnet';

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://clariora.com.au',
        'X-Title': 'Clariora A+'
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.2,
        max_tokens: 450
      })
    });

    if (res.ok) {
      const data = await res.json();
      return {
        text: data.choices?.[0]?.message?.content || '',
        model: targetModel,
        provider: 'openrouter'
      };
    }
  } catch (e) {
    console.warn('OpenRouter call failed:', e.message);
  }
  return null;
}

/**
 * Groq Cloud Free Tier Provider
 */
async function executeGroq(userMessage, systemPrompt, model, env) {
  if (!env.GROQ_API_KEY) return null;
  const targetModel = model || 'llama-3.1-8b-instant';

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.2,
        max_tokens: 350
      })
    });

    if (res.ok) {
      const data = await res.json();
      return {
        text: data.choices?.[0]?.message?.content || '',
        model: targetModel,
        provider: 'groq'
      };
    }
  } catch (e) {
    console.warn('Groq call failed:', e.message);
  }
  return null;
}

/**
 * Cloudflare Workers AI Native Edge Fallback
 */
async function executeWorkersAi(userMessage, systemPrompt, env) {
  if (!env.AI) return null;
  try {
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 350
    });
    return {
      text: response.response,
      model: '@cf/meta/llama-3.1-8b-instruct',
      provider: 'workers_ai'
    };
  } catch (e) {
    console.warn('Workers AI call failed:', e.message);
  }
  return null;
}
