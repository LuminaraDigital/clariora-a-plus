#!/usr/bin/env python3
"""Split workers/api_worker.js helper section into focused modules."""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
worker = root / "workers" / "api_worker.js"
text = worker.read_text(encoding="utf-8")

marker = "\n/**\n * Ensure HTML served under /app resolves relative assets against site root.\n */\n"
idx = text.find(marker)
if idx < 0:
    raise SystemExit("helper marker not found")

head = text[:idx]
helpers = text[idx:]

# Split helpers into logical modules by known anchors
sections = {
    "api_http.js": None,
    "api_stars.js": None,
    "api_crypto.js": None,
    "api_telegram.js": None,
    "api_auth.js": None,
    "api_entitlement_store.js": None,
    "api_ai_providers.js": None,
}

# Find boundaries inside helpers
stars_at = helpers.find("\n/**\n * Canonical Stars (XTR) catalog.")
crypto_at = helpers.find("\n/**\n * Constant-time string comparison")
tg_at = helpers.find("\n/**\n * Validates Telegram WebApp initData")
# auth helpers start at withAppBase through listAuthAccounts - but withAppBase is at start
# Actually order in file:
# withAppBase, isAdminAuthorized, verifyFirebaseIdToken, recordAuthSession, listAuthAccounts
# STARS...
# timingSafeEqualStr
# verifyTelegram...
# resolveUserEntitlement...
# executeNvidia...

entitlement_at = helpers.find("\nasync function resolveUserEntitlement")
ai_at = helpers.find("\nasync function executeNvidiaNim")

if min(stars_at, crypto_at, tg_at, entitlement_at, ai_at) < 0:
    raise SystemExit("section boundary missing")

http_and_auth = helpers[:stars_at]
stars = helpers[stars_at:crypto_at]
crypto = helpers[crypto_at:tg_at]
# telegram verify functions are between tg_at and entitlement - but recordAuth needs telegram
# Better grouping:
# api_crypto.js: timingSafeEqualStr
# api_telegram.js: verifyTelegram*
# api_stars.js: stars catalog
# api_auth.js: withAppBase, isAdmin, firebase, record, list (imports crypto+telegram)
# api_entitlement_store.js: resolve/increment
# api_ai_providers.js: execute*

# Re-parse: after crypto comes telegram, then after verifyTelegramLoginWidget ends comes resolveUserEntitlement
telegram = helpers[tg_at:entitlement_at]
entitlement = helpers[entitlement_at:ai_at]
ai = helpers[ai_at:]

# http_and_auth currently includes everything before stars - good for api_http_auth.js
# But isAdminAuthorized uses timingSafeEqualStr which is later - need to import crypto into auth

(root / "workers" / "api_crypto.js").write_text(
    "/** Shared crypto helpers for the edge API worker. */\n" + crypto.lstrip() + "\n",
    encoding="utf-8",
)
(root / "workers" / "api_stars.js").write_text(
    "/** Telegram Stars (XTR) product catalog and checkout validation. */\n" + stars.lstrip() + "\n",
    encoding="utf-8",
)
(root / "workers" / "api_telegram.js").write_text(
    "/** Telegram WebApp / Login Widget verification. */\n"
    "import { timingSafeEqualStr } from './api_crypto.js';\n\n"
    + telegram.lstrip()
    + "\n\nexport { verifyTelegramInitData, verifyTelegramLoginWidget };\n",
    encoding="utf-8",
)
(root / "workers" / "api_entitlement_store.js").write_text(
    "/** D1 entitlement and free-AI usage helpers. */\n" + entitlement.lstrip() + "\n",
    encoding="utf-8",
)
(root / "workers" / "api_ai_providers.js").write_text(
    "/** Upstream AI provider adapters for the coach gateway. */\n" + ai.lstrip() + "\n",
    encoding="utf-8",
)

# Export named symbols from each module by appending exports where needed
# Fix crypto exports
crypto_path = root / "workers" / "api_crypto.js"
crypto_text = crypto_path.read_text(encoding="utf-8")
if "export function timingSafeEqualStr" not in crypto_text:
    crypto_text = crypto_text.replace(
        "function timingSafeEqualStr",
        "export function timingSafeEqualStr",
        1,
    )
    crypto_path.write_text(crypto_text, encoding="utf-8")

# Stars: export all public functions + STARS_PRODUCTS
stars_path = root / "workers" / "api_stars.js"
stars_text = stars_path.read_text(encoding="utf-8")
stars_text = stars_text.replace("const STARS_PRODUCTS", "export const STARS_PRODUCTS", 1)
for name in [
    "getStarsProduct",
    "parseStarsInvoicePayload",
    "resolveStarsGrant",
    "validateStarsPreCheckout",
]:
    stars_text = stars_text.replace(f"function {name}", f"export function {name}", 1)
stars_path.write_text(stars_text, encoding="utf-8")

# Auth module from http_and_auth
auth_body = http_and_auth.lstrip()
# Replace hardcoded firebase key fallbacks with env-only
auth_body = auth_body.replace(
    "env.FIREBASE_WEB_API_KEY || 'AIzaSyAt5MnWAXJcL84vG6gxRoIksJL2bcfr4y8'",
    "env.FIREBASE_WEB_API_KEY || ''",
)
for name in [
    "withAppBase",
    "isAdminAuthorized",
    "verifyFirebaseIdToken",
    "recordAuthSession",
    "listAuthAccounts",
]:
    auth_body = auth_body.replace(f"function {name}", f"export function {name}", 1)
    auth_body = auth_body.replace(f"async function {name}", f"export async function {name}", 1)

auth_text = (
    "/** Auth session recording, Firebase token lookup, and admin gate. */\n"
    "import { timingSafeEqualStr } from './api_crypto.js';\n"
    "import { verifyTelegramInitData, verifyTelegramLoginWidget } from './api_telegram.js';\n\n"
    + auth_body
    + "\n"
)
(root / "workers" / "api_auth.js").write_text(auth_text, encoding="utf-8")

# Entitlement exports
ent_path = root / "workers" / "api_entitlement_store.js"
ent_text = ent_path.read_text(encoding="utf-8")
for name in [
    "resolveUserEntitlement",
    "incrementFreeAiUsage",
    "ensureAuthAccountAiColumns",
    "resolveFirebaseEntitlement",
    "incrementFirebaseFreeAiUsage",
    "decrementProPreviewTokens",
]:
    ent_text = ent_text.replace(f"async function {name}", f"export async function {name}", 1)
ent_path.write_text(ent_text, encoding="utf-8")

# AI provider exports
ai_path = root / "workers" / "api_ai_providers.js"
ai_text = ai_path.read_text(encoding="utf-8")
for name in [
    "executeNvidiaNim",
    "executeOllama",
    "executeOpenRouter",
    "executeGroq",
    "executeWorkersAi",
]:
    ai_text = ai_text.replace(f"async function {name}", f"export async function {name}", 1)
ai_path.write_text(ai_text, encoding="utf-8")

# Rewrite api_worker head to import helpers and drop trailing helpers
imports = """import {
  withAppBase,
  isAdminAuthorized,
  verifyFirebaseIdToken,
  recordAuthSession,
  listAuthAccounts
} from './api_auth.js';
import {
  STARS_PRODUCTS,
  getStarsProduct,
  parseStarsInvoicePayload,
  resolveStarsGrant,
  validateStarsPreCheckout
} from './api_stars.js';
import { timingSafeEqualStr } from './api_crypto.js';
import { verifyTelegramInitData, verifyTelegramLoginWidget } from './api_telegram.js';
import {
  resolveUserEntitlement,
  incrementFreeAiUsage,
  ensureAuthAccountAiColumns,
  resolveFirebaseEntitlement,
  incrementFirebaseFreeAiUsage,
  decrementProPreviewTokens
} from './api_entitlement_store.js';
import {
  executeNvidiaNim,
  executeOllama,
  executeOpenRouter,
  executeGroq,
  executeWorkersAi
} from './api_ai_providers.js';
"""

# Insert imports after existing imports block (after coach_handler import)
insert_after = "import { handleCoachRequest } from './coach_handler.js';\n"
if insert_after not in head:
    raise SystemExit("coach_handler import not found")
# Also strip hardcoded firebase keys from the remaining head (route handlers)
head = head.replace(
    "env.FIREBASE_WEB_API_KEY || 'AIzaSyAt5MnWAXJcL84vG6gxRoIksJL2bcfr4y8'",
    "env.FIREBASE_WEB_API_KEY || ''",
)
new_head = head.replace(insert_after, insert_after + "\n" + imports, 1)
worker.write_text(new_head.rstrip() + "\n", encoding="utf-8")

print("api_worker_lines", len(new_head.splitlines()))
print("modules_written", [
    "api_crypto.js",
    "api_stars.js",
    "api_telegram.js",
    "api_auth.js",
    "api_entitlement_store.js",
    "api_ai_providers.js",
])
