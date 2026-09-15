#!/usr/bin/env python3
"""Extract electron/logging.js and electron/ai_gateway.js from main.js."""
from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
main = ROOT / "main.js"
text = main.read_text(encoding="utf-8")
electron = ROOT / "electron"
electron.mkdir(exist_ok=True)

if "require('./electron/logging')" not in text:
    log_start = text.find("const LOG_MAX_BYTES")
    gp = text.find("\nfunction getProgressPath()")
    if log_start < 0 or gp < 0:
        raise SystemExit(f"logging markers missing: {log_start} {gp}")
    body = text[log_start:gp].rstrip() + "\n"
    (electron / "logging.js").write_text(
        "/** electron/logging.js - Rotating local logs for the desktop main process. */\n"
        "'use strict';\n\n"
        "const path = require('path');\n"
        "const fs = require('fs');\n"
        "const { app } = require('electron');\n\n"
        + body
        + "\nmodule.exports = { getLogDir, getLogFile, rotateLogIfNeeded, scrubSecrets, writeLog };\n",
        encoding="utf-8",
        newline="\n",
    )
    text = (
        text[:log_start]
        + "const { getLogDir, getLogFile, rotateLogIfNeeded, scrubSecrets, writeLog } = "
        "require('./electron/logging');\n\n"
        + text[gp + 1 :]
    )
    print("extracted logging.js")
else:
    print("logging already extracted")

if "require('./electron/ai_gateway')" not in text:
    host_start = text.find("function isLocalOrPrivateHost")
    ai_prov = text.find("const AI_PROVIDERS = {")
    handle_start = text.find("async function handleAiChat")
    handle_end = text.find("ipcMain.handle('ai:chat'", handle_start)
    exam_active = text.find("let isExamSessionActive = false;")
    if min(ai_prov, handle_start, handle_end, exam_active) < 0:
        raise SystemExit("AI markers missing")
    remove_start = host_start if host_start >= 0 and host_start < ai_prov else ai_prov
    providers_block = text[ai_prov:exam_active]
    host_block = text[host_start:ai_prov] if host_start >= 0 and host_start < ai_prov else ""
    handle_block = text[handle_start:handle_end]
    (electron / "ai_gateway.js").write_text(
        "/** electron/ai_gateway.js - Desktop AI chat proxy. */\n"
        "'use strict';\n\n"
        + host_block
        + providers_block
        + "function createAiGateway(deps) {\n"
        "  const writeLog = deps.writeLog;\n"
        "  const loadEnterprisePolicy = deps.loadEnterprisePolicy;\n"
        "  const GROQ_CHAT_URL = deps.GROQ_CHAT_URL;\n"
        "  const GROQ_ALLOWED_HOST = deps.GROQ_ALLOWED_HOST;\n\n"
        + handle_block
        + "\n  return { AI_PROVIDERS, isLocalOrPrivateHost, handleAiChat };\n"
        "}\n\n"
        "module.exports = { createAiGateway, AI_PROVIDERS, isLocalOrPrivateHost };\n",
        encoding="utf-8",
        newline="\n",
    )
    text2 = text[:remove_start] + text[exam_active:]
    hs = text2.find("async function handleAiChat")
    if hs >= 0:
        he = text2.find("ipcMain.handle('ai:chat'", hs)
        text2 = text2[:hs] + text2[he:]
    bootstrap = (
        "const { createAiGateway } = require('./electron/ai_gateway');\n"
        "const _aiGateway = createAiGateway({\n"
        "  writeLog,\n"
        "  loadEnterprisePolicy,\n"
        "  GROQ_CHAT_URL,\n"
        "  GROQ_ALLOWED_HOST\n"
        "});\n"
        "const AI_PROVIDERS = _aiGateway.AI_PROVIDERS;\n"
        "const isLocalOrPrivateHost = _aiGateway.isLocalOrPrivateHost;\n"
        "const handleAiChat = _aiGateway.handleAiChat;\n\n"
    )
    text = text2.replace(
        "let isExamSessionActive = false;",
        bootstrap + "let isExamSessionActive = false;",
        1,
    )
    print("extracted ai_gateway.js")
else:
    print("AI already extracted")

main.write_text(text, encoding="utf-8", newline="\n")
print("main.js lines", len(text.splitlines()))

desk_main = ROOT / "CompTIA_A_Plus_Desktop_App" / "resources" / "app" / "main.js"
if desk_main.exists():
    desk_main.write_text(text, encoding="utf-8", newline="\n")
    dest_e = desk_main.parent / "electron"
    if dest_e.exists():
        shutil.rmtree(dest_e)
    shutil.copytree(electron, dest_e)
    print("desktop resources/app synced")
