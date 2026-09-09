/**
 * bot_server.js
 * Companion Telegram Bot & Stars Payment Processor for Clariora.
 * Handles /start deep linking, WebApp menu button, invoice generation,
 * pre_checkout verification, and study streak reminders.
 */

const http = require('http');
const https = require('https');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://comptia-a-plus.datacentre.academy';
const PORT = process.env.PORT || 3000;

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

/**
 * Helper to call Telegram Bot API methods
 */
async function callTelegram(method, body = {}) {
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
          const parsed = JSON.parse(responseBody);
          resolve(parsed);
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

/**
 * Handle incoming Telegram updates (Webhook or polling)
 */
async function handleUpdate(update) {
  // 1. Pre-checkout query for Telegram Stars (Must respond within 10 seconds)
  if (update.pre_checkout_query) {
    const pcq = update.pre_checkout_query;
    console.log(`[Bot] Answering pre-checkout for invoice: ${pcq.invoice_payload} from user ${pcq.from.id}`);
    await callTelegram('answerPreCheckoutQuery', {
      pre_checkout_query_id: pcq.id,
      ok: true
    });
    return;
  }

  // 2. Incoming messages
  if (update.message) {
    const msg = update.message;
    const chatId = msg.chat.id;
    const text = msg.text || '';

    // Payment confirmation
    if (msg.successful_payment) {
      const sp = msg.successful_payment;
      console.log(`[Bot] Payment successful: ${sp.total_amount} Stars for ${sp.invoice_payload}`);
      await callTelegram('sendMessage', {
        chat_id: chatId,
        text: `🎉 *Payment Confirmed!*\n\nYou have unlocked **${sp.invoice_payload}** with ${sp.total_amount} Telegram Stars.\n\nTap the button below to continue your training:`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 Launch Clariora', web_app: { url: WEB_APP_URL } }]
          ]
        }
      });
      return;
    }

    // /start command
    if (text.startsWith('/start')) {
      const payload = text.split(' ')[1] || '';
      let launchUrl = WEB_APP_URL;
      if (payload) {
        launchUrl += `?startapp=${payload}`;
      }

      await callTelegram('sendMessage', {
        chat_id: chatId,
        text: `👋 *Welcome to Clariora!*\n\nPrepare for the **Core 1 (220-1201)** and **Core 2 (220-1202)** certifications with:\n\n• 🎯 **Daily 20 Practice Questions** (Free daily reset)\n• ⚡ **Memory SRS Flashcards** for ports & command syntax\n• 👻 **Ghost Coach AI** for instant Socratic remediation\n• 💎 **TON Proof-of-Mastery** verifiable credentials\n\nTap below to launch the Mini App:`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 Launch Mini App', web_app: { url: launchUrl } }],
            [{ text: '📚 CompTIA Blueprints', url: 'https://www.comptia.org/certifications/a' }]
          ]
        }
      });
      return;
    }

    // /daily command
    if (text.startsWith('/daily')) {
      await callTelegram('sendMessage', {
        chat_id: chatId,
        text: `📅 *Your Daily Study Mission*\n\n20 fresh questions are ready. Maintain your streak and keep your readiness above 85% to pass on test day!`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔥 Start Daily 20 Drill', web_app: { url: `${WEB_APP_URL}?startapp=daily_drill` } }]
          ]
        }
      });
      return;
    }
  }
}

/**
 * HTTP Server for Webhooks and API endpoints
 */
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
    return;
  }

  // API: Create Telegram Stars Invoice Link
  if (req.method === 'POST' && req.url === '/api/create-stars-invoice') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { productId, stars, title } = JSON.parse(body);

        const result = await callTelegram('createInvoiceLink', {
          title: title || 'Clariora Access',
          description: `Unlock ${title} in Clariora`,
          payload: productId,
          currency: 'XTR', // Telegram Stars currency code
          prices: [{ label: title, amount: stars }]
        });

        if (result.ok) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ invoiceLink: result.result }));
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

  // Telegram Webhook Handler
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const update = JSON.parse(body);
        await handleUpdate(update);
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
});
