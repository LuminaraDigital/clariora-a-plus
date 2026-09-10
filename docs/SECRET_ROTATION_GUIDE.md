# Production Secret Rotation Runbook: Clariora A+

## 1. Overview & Scope

This runbook specifies the step-by-step operational procedure for revoking, rotating, and validating production credentials for Clariora A+.

### 1.1 Credential Inventory
| Credential Identifier | Scope / Systems | Impact of Compromise | Rotation Frequency |
| :--- | :--- | :--- | :--- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API, CI/CD, deployment tooling | Unauthorized edge worker deploys, DNS hijacking, asset manipulation | 90 days / on personnel change |
| `R2_ACCESS_KEY_ID` & `R2_SECRET_ACCESS_KEY` | Cloudflare R2 S3 Object Storage API | Unauthorized read/write/deletion of media assets & shards | 90 days / on compromise |
| `ADMIN_API_KEY` | Edge Worker `/api/v1/auth/*`, Admin portal | Unauthorized access to learner records, admin telemetry | 60 days / on compromise |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API, Telegram Stars invoices, initData HMAC | Hijacking bot communications, fake invoice dispatch | On compromise |
| `EDGE_WEBHOOK_SECRET` | Telegram Webhook header verification (`X-Telegram-Bot-Api-Secret-Token`) | Spoofed webhook events, fraudulent payment injections | 90 days / on compromise |

---

## 2. Pre-Rotation Checklist & Zero-Downtime Strategy

1. **Verify Access**: Ensure administrator access to:
   - Cloudflare Dashboard (`dash.cloudflare.com`)
   - Telegram account with @BotFather access
   - Deployment host / CI secrets management
2. **Maintenance Window**:
   - For `CLOUDFLARE_API_TOKEN` and R2 credentials: Non-breaking, can be performed at any time.
   - For `ADMIN_API_KEY`: Rotate during low-traffic windows, or stage the worker to accept dual keys during transition.
   - For `EDGE_WEBHOOK_SECRET`: Staged atomically via Telegram `setWebhook` and Cloudflare Worker secret update.
3. **Audit Log**: Record operator identity, timestamp, and ticket ID in the security audit log prior to initiating rotation.

---

## 3. Rotation Procedures

### 3.1 Cloudflare API Token (`CLOUDFLARE_API_TOKEN`)

1. **Generate New Token**:
   - Log into [Cloudflare Dashboard](https://dash.cloudflare.com/).
   - Navigate to **My Profile** > **API Tokens** > **Create Token**.
   - Select **Create Custom Token** with the following least-privilege scopes:
     - **Account Permissions**:
       - `Workers Scripts` -> `Edit`
       - `D1` -> `Edit`
       - `Pages` -> `Edit`
     - **Zone Permissions**:
       - `Zone` -> `Read`
       - `Cache Purge` -> `Purge`
       - `DNS` -> `Edit`
     - **Account Resources**: Include target account `2373013c66331e9660e47ffa3ae40f5c`.
     - **Zone Resources**: Include target zone `clariora.com.au`.
     - **TTL**: Set explicit expiry (e.g., 90 days).
   - Click **Continue to summary** and then **Create Token**.
   - Copy the token value immediately.

2. **Verify New Token**:
   ```bash
   curl -s -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
        -H "Authorization: Bearer <NEW_CLOUDFLARE_API_TOKEN>" \
        -H "Content-Type: application/json"
   ```
   *Expected Response:* `{"result":{"id":"...","status":"active"},"success":true,...}`

3. **Update Local & CI Environment**:
   - Update `CLOUDFLARE_API_TOKEN` in `.env`.
   - Update GitHub Actions / CI secret `CLOUDFLARE_API_TOKEN`.

4. **Verify Deployment Pipeline**:
   ```bash
   npx wrangler whoami
   ```

5. **Revoke Previous Token**:
   - Return to **API Tokens** in the Cloudflare Dashboard.
   - Locate the previous token.
   - Click the three dots menu > **Revoke** (or delete).

---

### 3.2 Cloudflare R2 Credentials (`R2_ACCESS_KEY_ID` & `R2_SECRET_ACCESS_KEY`)

Cloudflare R2 allows multiple active API tokens simultaneously, enabling zero-downtime rotation.

1. **Generate New R2 Token**:
   - In Cloudflare Dashboard, go to **R2** > **Manage R2 API Tokens**.
   - Click **Create API Token**.
   - Grant permissions:
     - **Permissions**: `Object Read & Write`
     - **Bucket**: Apply to specific bucket `clariora-media` (or all buckets if provisioning new ones).
     - **TTL**: 90-180 days.
   - Click **Create API Token**.
   - Securely capture both **Access Key ID** (32 hex characters) and **Secret Access Key** (64 hex characters).

2. **Update Environment**:
   - Update `.env`:
     ```ini
     R2_ACCESS_KEY_ID=<NEW_R2_ACCESS_KEY_ID>
     R2_SECRET_ACCESS_KEY=<NEW_R2_SECRET_ACCESS_KEY>
     ```
   - If using Workers bindings or external sync daemons, update secrets:
     ```bash
     npx wrangler secret put R2_ACCESS_KEY_ID
     npx wrangler secret put R2_SECRET_ACCESS_KEY
     ```

3. **Validate Storage Connectivity**:
   - Test asset retrieval or upload using AWS CLI / S3 client:
     ```bash
     aws s3 ls s3://clariora-media \
       --endpoint-url https://2373013c66331e9660e47ffa3ae40f5c.r2.cloudflarestorage.com
     ```

4. **Revoke Old Token**:
   - In **Manage R2 API Tokens**, find the expired/previous token and click **Revoke**.

---

### 3.3 Admin API Key (`ADMIN_API_KEY`)

The `ADMIN_API_KEY` protects administrative endpoints such as `/api/v1/auth/accounts` and `/admin/users.html`.

1. **Generate Cryptographically Secure Key**:
   Generate a high-entropy 256-bit (64 hex characters) key:
   ```bash
   # OpenSSL (Linux/macOS/Git Bash)
   openssl rand -hex 32

   # PowerShell (Windows)
   powershell -Command "[BitConverter]::ToString((New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes((New-Object byte[] 32))).Replace('-','').ToLower()"
   ```

2. **Deploy to Cloudflare Worker**:
   ```bash
   npx wrangler secret put ADMIN_API_KEY
   # Paste new key when prompted
   ```

3. **Update Local and Application Config**:
   - Update `ADMIN_API_KEY` in `.env`.
   - Update bot server environment (`bot/bot_server.js` or systemd / Docker env):
     ```bash
     ADMIN_API_KEY=<NEW_ADMIN_API_KEY>
     ```
   - Update internal admin dashboard credentials (`admin/users.html`).

4. **Validate Endpoint Security**:
   - Test with OLD key (must be rejected):
     ```bash
     curl -i -H "Authorization: Bearer <OLD_ADMIN_API_KEY>" https://clariora.com.au/api/v1/auth/accounts
     # Expected: HTTP 401 Unauthorized
     ```
   - Test with NEW key (must succeed):
     ```bash
     curl -i -H "Authorization: Bearer <NEW_ADMIN_API_KEY>" https://clariora.com.au/api/v1/auth/accounts
     # Expected: HTTP 200 OK
     ```

---

### 3.4 Telegram Bot Token & Webhook Secret

#### 3.4.1 Rotating Edge Webhook Secret (`EDGE_WEBHOOK_SECRET` / `TELEGRAM_WEBHOOK_SECRET`)

1. **Generate New Secret Token**:
   ```bash
   openssl rand -hex 32
   ```

2. **Update Worker Secret**:
   ```bash
   npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
   # Paste the new secret token
   ```

3. **Register Webhook with Telegram**:
   Execute the automated setup script or invoke Telegram Bot API:
   ```bash
   node tools/setup_telegram_bot.js
   ```
   Or manually via curl:
   ```bash
   curl -s -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://clariora.com.au/api/v1/telegram/webhook",
       "secret_token": "<NEW_WEBHOOK_SECRET>"
     }'
   ```

4. **Verify Webhook Status**:
   ```bash
   curl -s "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
   ```
   Confirm `has_custom_certificate` is false, `pending_update_count` is reasonable, and `last_error_date` is not recent.

#### 3.4.2 Emergency Bot Token Rotation (`TELEGRAM_BOT_TOKEN`)

If the Telegram Bot Token is exposed or compromised:
1. Open Telegram and message `@BotFather`.
2. Send `/revoke` and select your bot (`@ClarioraBot` or configured bot).
3. Copy the newly issued token immediately.
4. Update Worker secret:
   ```bash
   npx wrangler secret put TELEGRAM_BOT_TOKEN
   ```
5. Update local `.env` and `bot/bot_server.js` environment.
6. Re-register webhook and menu button:
   ```bash
   node tools/setup_telegram_bot.js
   ```

---

## 4. Emergency Revocation Protocol (Compromise Response)

In the event of an active credential leak:

```
[Detect Incident]
       │
       ▼
[1. Revoke Immediately in Provider Dashboard] (Cloudflare / @BotFather)
       │
       ▼
[2. Deploy Immediate Hotfix Secret via Wrangler]
       │
       ▼
[3. Invalidate Edge Caches & Terminate Active Sessions]
       │
       ▼
[4. Query D1 & Edge Logs for Unauthorized Requests]
       │
       ▼
[5. Post-Incident Review & File Vulnerability Report]
```

1. **Immediate Revocation**: Do not wait for replacement token preparation. Revoke the compromised token in Cloudflare dashboard or @BotFather immediately.
2. **Audit Access Logs**:
   - Query Cloudflare Audit Logs: **Manage Account** > **Audit Log**.
   - Query D1 access tables in `clariora_edge_db`:
     ```sql
     SELECT * FROM security_events WHERE timestamp >= datetime('now', '-24 hours') ORDER BY timestamp DESC;
     ```
3. **Notify Stakeholders**: Report compromise per incident response plan in `SECURITY.md`.

---

## 5. Post-Rotation Validation Checklist

- [ ] `node tools/config_validator.js` runs with exit status `0`.
- [ ] `npm test` passes 100% of test suites.
- [ ] Webhook delivery returns HTTP 200 on Telegram test pings.
- [ ] Admin endpoints reject unauthenticated or legacy token requests.
- [ ] No secrets or intermediate keys committed to git (`git status` clean).
