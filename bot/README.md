# Clariora Telegram Bot and Mini App

Production companion for [@ClarioraBot](https://t.me/ClarioraBot). Stars (XTR) checkout and webhook grants are handled by the Cloudflare Worker at `https://clariora.com.au`. This Node process is optional for local debugging; production traffic uses the Worker webhook.

## Production URLs

| Item | URL |
| --- | --- |
| Mini App | https://t.me/ClarioraBot/app |
| App shell | https://clariora.com.au/app |
| Webhook | https://clariora.com.au/api/v1/telegram/webhook |
| Health | https://clariora.com.au/api/v1/health |
| Terms | https://clariora.com.au/terms.html |
| Support | /paysupport in the bot, or support@datacentre.academy |

## One-time BotFather setup

1. Confirm the bot username is `ClarioraBot`.
2. `/newapp` (or edit the existing Mini App) with Web App URL: `https://clariora.com.au/app`
3. Enable Telegram Stars under Bot Settings > Payments.
4. From the repo root (token never committed):

```bash
set TELEGRAM_BOT_TOKEN=...   # PowerShell: $env:TELEGRAM_BOT_TOKEN="..."
set TELEGRAM_WEBHOOK_SECRET=...
node tools/setup_telegram_bot.js
```

That registers the webhook, menu button, and commands (`/start`, `/app`, `/pro`, `/terms`, `/paysupport`, `/help`).

Worker secrets already expected in production (via `wrangler secret put`):

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET` (or `EDGE_WEBHOOK_SECRET`)
- `TON_MERCHANT_WALLET_ADDRESS`
- `TONCENTER_API_KEY`

## Local companion server (optional)

```bash
cd bot
npm install
set TELEGRAM_BOT_TOKEN=...
set WEB_APP_URL=https://clariora.com.au/app
set EDGE_WEBHOOK_URL=https://clariora.com.au/api/v1/telegram/webhook
set TELEGRAM_WEBHOOK_SECRET=...
npm start
```

Health: `GET http://localhost:3000/health`

Prefer pointing BotFather at the Cloudflare webhook in production. Do not run a second live webhook unless you intentionally move traffic.

## Stars compliance

- Digital goods inside the Mini App use **XTR only**.
- `/terms` and `/paysupport` are required and registered.
- Authoritative entitlement grants happen on successful payment webhook delivery to the Worker + D1.

## Verify

```bash
node tools/test_tma_production_suite.js
node tools/verify_tma_live_production.js
```
