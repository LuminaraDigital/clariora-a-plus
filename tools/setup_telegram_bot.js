#!/usr/bin/env node
/**
 * tools/setup_telegram_bot.js
 * Configures Telegram Bot Webhook, Mini App Menu Button,
 * Bot Commands (including /terms and /paysupport for Stars), and Descriptions.
 * Requires TELEGRAM_BOT_TOKEN in the environment (never hardcode tokens).
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://clariora.com.au/api/v1/telegram/webhook';
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://clariora.com.au/app';
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';

const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function callTelegram(method, body) {
  const res = await fetch(`${BASE_URL}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  return res.json();
}

async function setup() {
  if (!BOT_TOKEN) {
    console.error('ERROR: Set TELEGRAM_BOT_TOKEN in the environment before running setup.');
    process.exit(1);
  }

  console.log('====================================================');
  console.log('CLARIORA TELEGRAM BOT & TMA WEBHOOK SETUP');
  console.log('====================================================\n');

  console.log('1. Verifying bot credentials...');
  const me = await callTelegram('getMe');
  if (!me.ok) {
    console.error('Failed to getMe:', me.description);
    process.exit(1);
  }
  console.log(`   Bot Verified: @${me.result.username} (${me.result.first_name}, ID: ${me.result.id})\n`);

  console.log(`2. Registering Webhook to ${WEBHOOK_URL}...`);
  const webhookBody = {
    url: WEBHOOK_URL,
    allowed_updates: ['message', 'pre_checkout_query', 'callback_query'],
    drop_pending_updates: true
  };
  if (WEBHOOK_SECRET) webhookBody.secret_token = WEBHOOK_SECRET;
  const webhookResult = await callTelegram('setWebhook', webhookBody);
  if (!webhookResult.ok) {
    console.error('Failed to setWebhook:', webhookResult.description);
    process.exit(1);
  }
  console.log('   Webhook successfully registered.\n');

  console.log('3. Checking webhook status...');
  const info = await callTelegram('getWebhookInfo');
  if (info.ok) {
    console.log(`   Active URL: ${info.result.url}`);
    console.log(`   Pending updates: ${info.result.pending_update_count}\n`);
  }

  console.log(`4. Configuring Chat Menu Button to launch ${WEBAPP_URL}...`);
  const menuResult = await callTelegram('setChatMenuButton', {
    menu_button: {
      type: 'web_app',
      text: 'Start A+',
      web_app: { url: WEBAPP_URL }
    }
  });
  if (menuResult.ok) {
    console.log('   Chat Menu Button configured.\n');
  } else {
    console.warn('   Failed to setChatMenuButton:', menuResult.description);
  }

  console.log('5. Configuring Bot Commands (Stars compliance)...');
  const commandsResult = await callTelegram('setMyCommands', {
    commands: [
      { command: 'start', description: 'Launch Clariora CompTIA A+ Mini App' },
      { command: 'app', description: 'Open exam simulator and PBQ labs' },
      { command: 'pro', description: 'Pro passes priced in Telegram Stars' },
      { command: 'terms', description: 'Terms of sale for Stars digital goods' },
      { command: 'paysupport', description: 'Payment / refund support for Stars' },
      { command: 'support', description: 'Product help and how to contact us' },
      { command: 'help', description: 'CompTIA A+ exam guide and support' }
    ]
  });
  if (commandsResult.ok) {
    console.log('   Bot Commands registered (includes /terms and /paysupport).\n');
  } else {
    console.warn('   Failed to setMyCommands:', commandsResult.description);
  }

  console.log('6. Setting Bot Descriptions...');
  await callTelegram('setMyDescription', {
    description: 'Official Clariora CompTIA A+ 220-1201 and 220-1202 exam simulator with PBQs, Pearson-style scoring, and AI Ghost Coach. Digital unlocks use Telegram Stars (XTR).'
  });
  await callTelegram('setMyShortDescription', {
    short_description: 'CompTIA A+ exam simulator with Stars (XTR) unlocks.'
  });
  console.log('   Descriptions updated.\n');

  console.log('====================================================');
  console.log('TELEGRAM BOT & WEBHOOK SETUP COMPLETE');
  console.log('   Bot link: https://t.me/' + me.result.username);
  console.log('   Mini App link: https://t.me/' + me.result.username + '/app');
  console.log('   Webhook endpoint: ' + WEBHOOK_URL);
  console.log('====================================================');
}

setup().catch(err => {
  console.error('Fatal setup error:', err);
  process.exit(1);
});
