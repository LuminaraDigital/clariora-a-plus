/**
 * bot_server.js
 * Companion Telegram Bot & Stars Payment Processor for Clariora.
 * Handles /start deep linking, WebApp menu button, invoice generation,
 * pre_checkout verification, and study streak reminders.
 * Digital goods: currency XTR only. @see https://core.telegram.org/bots/payments-stars
 */

const http = require('http');
const https = require('https');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://clariora.com.au/app';
const PORT = process.env.PORT || 3000;
const EDGE_WEBHOOK_URL = process.env.EDGE_WEBHOOK_URL || 'https://clariora.com.au/api/v1/telegram/webhook';
const EDGE_ADMIN_KEY = process.env.ADMIN_API_KEY || process.env.EDGE_ADMIN_KEY || '';
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const STARS_PRODUCTS = {
  daily_unlimited: {
    id: 'daily_unlimited',
    stars: 50,
    title: '24-Hour Study Pass',
    description: 'Higher hard AI budgets, streaming coach, and Core specialists for 24 hours.'
  },
  pro_monthly: {
    id: 'pro_monthly',
    stars: 250,
    title: 'Monthly Pro Pass',
    description: 'Multi-specialist handoffs, tools, NVIDIA/OpenRouter, hard daily/monthly AI caps for 30 days.'
  },
  lifetime_master: {
    id: 'lifetime_master',
    stars: 1500,
    title: 'Lifetime Master Pass',
    description: 'Highest hard AI budgets, war-room plans, priority models, and full Core 1+2 forever.'
  }
};

async function callTelegram(method, body = {}) {
  if (!BOT_TOKEN || BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
    return { ok: false, description: 'TELEGRAM_BOT_TOKEN not configured' };
  }
  const url = `${TELEGRAM_API}/${method}`;
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseBody));
        } catch (e) {
          resolve({ ok: false, description: responseBody });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function parsePayload(raw) {
  try {
    const data = JSON.parse(raw || '{}');
    return {
      productId: data.p || data.productId || null,
      stars: data.s != null ? data.s : data.stars
    };
  } catch (e) {
    return { productId: null, stars: null };
  }
}

async function forwardPaymentGrantToEdge(update) {
  if (!EDGE_WEBHOOK_URL) return { ok: false, reason: 'EDGE_WEBHOOK_URL unset' };
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (TELEGRAM_WEBHOOK_SECRET) {
      headers['X-Telegram-Bot-Api-Secret-Token'] = TELEGRAM_WEBHOOK_SECRET;
    }
    if (EDGE_ADMIN_KEY) {
      headers['X-Admin-Key'] = EDGE_ADMIN_KEY;
    }
    const res = await fetch(EDGE_WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(update)
    });
    const text = await res.text().catch(() => '');
    console.log(`[Bot] Edge grant forward status=${res.status} body=${text.slice(0, 200)}`);
    return { ok: res.ok, status: res.status };
  } catch (err) {
    console.error('[Bot] Edge grant forward failed:', err.message || err);
    return { ok: false, error: String(err.message || err) };
  }
}

async function handleUpdate(update) {
  if (update.pre_checkout_query) {
    const pcq = update.pre_checkout_query;
    let ok = pcq.currency === 'XTR';
    let error_message = 'Digital goods must be paid in Telegram Stars (XTR) only.';
    if (ok) {
      const parsed = parsePayload(pcq.invoice_payload);
      const product = STARS_PRODUCTS[parsed.productId];
      if (!product) {
        ok = false;
        error_message = 'This product is no longer available.';
      } else if (Number(pcq.total_amount) !== Number(product.stars)) {
        ok = false;
        error_message = 'Price mismatch. Please reopen checkout from the Mini App.';
      }
    }
    const answer = { pre_checkout_query_id: pcq.id, ok };
    if (!ok) answer.error_message = error_message;
    console.log(`[Bot] Pre-checkout ${ok ? 'approved' : 'rejected'} for ${pcq.invoice_payload}`);
    await callTelegram('answerPreCheckoutQuery', answer);
    return;
  }

  if (update.message) {
    const msg = update.message;
    const chatId = msg.chat.id;
    const text = msg.text || '';
    const cmd = text.split(/\s+/)[0].split('@')[0].toLowerCase();

    if (msg.successful_payment) {
      const sp = msg.successful_payment;
      console.log(`[Bot] Payment successful: ${sp.total_amount} XTR charge=${sp.telegram_payment_charge_id}`);
      // Authoritative entitlement grant lives on the Cloudflare Worker + D1.
      await forwardPaymentGrantToEdge(update);
      await callTelegram('sendMessage', {
        chat_id: chatId,
        text: `*Payment Confirmed!*\n\nYou unlocked access with ${sp.total_amount} Telegram Stars (XTR).\nCharge ID: \`${sp.telegram_payment_charge_id}\`\n\nBilling help: /paysupport`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Launch Clariora', web_app: { url: WEB_APP_URL } }]
          ]
        }
      });
      return;
    }

    if (cmd === '/start' || cmd === '/app') {
      const payload = text.split(' ')[1] || '';
      let launchUrl = WEB_APP_URL;
      if (payload && cmd === '/start') {
        launchUrl += (WEB_APP_URL.includes('?') ? '&' : '?') + `startapp=${encodeURIComponent(payload)}`;
      }
      await callTelegram('sendMessage', {
        chat_id: chatId,
        text: `*Welcome to Clariora!*\n\nPrepare for Core 1 (220-1201) and Core 2 (220-1202) with daily drills, PBQs, and Ghost Coach AI.\n\nDigital unlocks use Telegram Stars (XTR) only. Terms: /terms  Support: /paysupport`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Launch Mini App', web_app: { url: launchUrl } }]
          ]
        }
      });
      return;
    }

    if (cmd === '/terms') {
      await callTelegram('sendMessage', {
        chat_id: chatId,
        text: `*Clariora Terms of Sale*\n\n1. Digital unlocks inside Telegram are paid only in Stars (XTR).\n2. Paying confirms you accept these terms.\n3. Telegram Support cannot help with bot purchases.\n4. Use /paysupport for refunds and disputes.`
      });
      return;
    }

    if (cmd === '/paysupport' || cmd === '/support') {
      await callTelegram('sendMessage', {
        chat_id: chatId,
        text: `*Payment Support*\n\nTelegram Support cannot help with purchases made through this bot.\n\nReply with username, purchase time, product, and Stars charge ID from your receipt.`
      });
      return;
    }

    if (cmd === '/daily') {
      await callTelegram('sendMessage', {
        chat_id: chatId,
        text: `*Your Daily Study Mission*\n\n20 fresh questions are ready. Keep readiness above 85% for exam day.`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Start Daily 20 Drill', web_app: { url: `${WEB_APP_URL}${WEB_APP_URL.includes('?') ? '&' : '?'}startapp=daily_drill` } }]
          ]
        }
      });
      return;
    }
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString(), stars: true }));
    return;
  }

  if (req.method === 'POST' && (req.url === '/api/create-stars-invoice' || req.url === '/api/v1/billing/stars/invoice')) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body);
        const product = STARS_PRODUCTS[parsed.productId];
        if (!product) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unknown Stars product' }));
          return;
        }
        const telegramId = parsed.telegramId || 0;
        const payload = JSON.stringify({ p: product.id, u: telegramId, s: product.stars });
        const result = await callTelegram('createInvoiceLink', {
          title: product.title,
          description: product.description,
          payload,
          provider_token: '',
          currency: 'XTR',
          prices: [{ label: product.title, amount: product.stars }]
        });

        if (result.ok) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ invoiceLink: result.result, success: true }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: result.description }));
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        await handleUpdate(JSON.parse(body));
        res.writeHead(200);
        res.end('OK');
      } catch (err) {
        console.error('[Bot] Webhook error:', err);
        res.writeHead(500);
        res.end();
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`[BotServer] CompTIA A+ TMA Bot running on port ${PORT}`);
  console.log(`[BotServer] WebApp Target: ${WEB_APP_URL}`);
  if (!BOT_TOKEN) console.warn('[BotServer] TELEGRAM_BOT_TOKEN is not set');
});
