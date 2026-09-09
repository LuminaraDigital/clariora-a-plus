#!/usr/bin/env node
/**
 * tools/setup_telegram_bot.js
 * Automatically configures Telegram Bot Webhook, Native Mini App Menu Button,
 * Bot Commands, and Descriptions for Clariora CompTIA A+ TMA.
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8280144046:AAF2AOwiGBtsyPBljeC70duwlYtnxwa8rZ0';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://clariora.com.au/api/v1/telegram/webhook';
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://clariora.com.au/app';

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
  console.log('====================================================');
  console.log('CLARIORA TELEGRAM BOT & TMA WEBHOOK SETUP');
  console.log('====================================================\n');

  // 1. Verify Bot Identity
  console.log('1. Verifying bot credentials...');
  const me = await callTelegram('getMe');
  if (!me.ok) {
    console.error('❌ Failed to getMe:', me.description);
    process.exit(1);
  }
  console.log(`   ✔ Bot Verified: @${me.result.username} (${me.result.first_name}, ID: ${me.result.id})\n`);

  // 2. Set Webhook
  console.log(`2. Registering Webhook to ${WEBHOOK_URL}...`);
  const webhookResult = await callTelegram('setWebhook', {
    url: WEBHOOK_URL,
    allowed_updates: ['message', 'pre_checkout_query', 'callback_query'],
    drop_pending_updates: true
  });
  if (!webhookResult.ok) {
    console.error('❌ Failed to setWebhook:', webhookResult.description);
    process.exit(1);
  }
  console.log('   ✔ Webhook successfully registered.\n');

  // 3. Confirm Webhook Info
  console.log('3. Checking webhook status...');
  const info = await callTelegram('getWebhookInfo');
  if (info.ok) {
    console.log(`   ✔ Active URL: ${info.result.url}`);
    console.log(`   ✔ Custom cert: ${info.result.has_custom_certificate}`);
    console.log(`   ✔ Pending updates: ${info.result.pending_update_count}\n`);
  }

  // 4. Set Chat Menu Button (Native TMA launch button in chat UI)
  console.log(`4. Configuring Chat Menu Button to launch ${WEBAPP_URL}...`);
  const menuResult = await callTelegram('setChatMenuButton', {
    menu_button: {
      type: 'web_app',
      text: 'Start A+',
      web_app: {
        url: WEBAPP_URL
      }
    }
  });
  if (menuResult.ok) {
    console.log('   ✔ Chat Menu Button configured: "Start A+" -> ' + WEBAPP_URL + '\n');
  } else {
    console.warn('   ⚠️ Failed to setChatMenuButton:', menuResult.description);
  }

  // 5. Configure Bot Commands
  console.log('5. Configuring Bot Commands...');
  const commandsResult = await callTelegram('setMyCommands', {
    commands: [
      { command: 'start', description: 'Launch Clariora CompTIA A+ Mini App' },
      { command: 'app', description: 'Open exam simulator and PBQ labs' },
      { command: 'pro', description: 'Clariora AI Pro passes (NVIDIA NIM 70B)' },
      { command: 'help', description: 'CompTIA A+ exam guide and support' }
    ]
  });
  if (commandsResult.ok) {
    console.log('   ✔ Bot Commands registered (/start, /app, /pro, /help).\n');
  } else {
    console.warn('   ⚠️ Failed to setMyCommands:', commandsResult.description);
  }

  // 6. Set Bot Descriptions
  console.log('6. Setting Bot Descriptions...');
  await callTelegram('setMyDescription', {
    description: 'Official Clariora CompTIA A+ 220-1201 and 220-1202 exam simulator with 7 PBQs, scaled Pearson VUE scoring, and AI Ghost Coach (NVIDIA NIM 70B & DeepSeek R1).'
  });
  await callTelegram('setMyShortDescription', {
    short_description: 'CompTIA A+ exam simulator, PBQs and AI Ghost Coach on Telegram.'
  });
  console.log('   ✔ Descriptions updated.\n');

  console.log('====================================================');
  console.log('🎉 TELEGRAM BOT & WEBHOOK SETUP COMPLETE!');
  console.log('   Bot link: https://t.me/' + me.result.username);
  console.log('   Mini App link: https://t.me/' + me.result.username + '/app');
  console.log('   Webhook endpoint: ' + WEBHOOK_URL);
  console.log('====================================================');
}

setup().catch(err => {
  console.error('Fatal setup error:', err);
  process.exit(1);
});
