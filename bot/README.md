# Telegram Bot Companion & WebApp Configuration

This directory contains the companion Telegram bot and Stars payment processing server for Clariora Telegram Mini App (TMA).

---

## 1. Registering the Bot with @BotFather

1. Open Telegram and message [@BotFather](https://t.me/botfather).
2. Send `/newbot` and follow prompts to name your bot:
   - Name: `Clariora`
   - Username: `ComptiaMasterBot` (or your preferred available handle).
3. Copy the HTTP API **Bot Token**.

---

## 2. Setting Up the Telegram Mini App (Web App)

1. In `@BotFather`, send `/newapp`.
2. Select your bot.
3. Provide Title: `Clariora Exam Prep`.
4. Provide Short Description: `Pass CompTIA A+ Core 1 & Core 2 with daily diagnostic drills, flashcards, and AI coach.`
5. Upload an App Icon (640x360 px image).
6. Provide the Web App URL:
   `https://<your-cloudflare-or-vercel-domain>/index.html`
7. Choose a short name (e.g. `app`). Your deep link will be:
   `t.me/ComptiaMasterBot/app`

---

## 3. Configuring the Bot Menu Button

To make the app accessible from any chat with your bot:
1. In `@BotFather`, send `/setmenubutton`.
2. Select your bot.
3. Send the Web App URL (`https://<your-domain>/index.html`).
4. Set Button Text: `🚀 Open Exam Prep`.

---

## 4. Setting Up Telegram Stars Payments

1. In `@BotFather`, send `/mybots` -> select your bot -> **Bot Settings** -> **Payments**.
2. Select **Telegram Stars**.
3. Enable Stars for your bot.

---

## 5. Running the Bot Server

```bash
cd bot
npm install
TELEGRAM_BOT_TOKEN="your-token" WEB_APP_URL="https://your-domain.com" npm start
```
