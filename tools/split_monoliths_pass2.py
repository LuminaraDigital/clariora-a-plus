#!/usr/bin/env python3
"""
Split oversized modules while preserving behavior:
1) js/readiness2.js from onboarding.js
2) js/curriculum-{store,model,md,html}.js + slim curriculum.js
3) js/entitlements-{crypto,license,usage,ui}.js pieces (license+crypto first)
4) electron/*.js from main.js

Strategy for browser IIFEs: extract closed sections into sibling scripts that
attach to window.APlus.*; the parent file reads those attachments (or require()
in Node) and keeps the same public API.
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")
    print(f"wrote {path.relative_to(ROOT)} ({len(text.splitlines())} lines)")


def split_onboarding() -> None:
    src = ROOT / "js" / "onboarding.js"
    text = src.read_text(encoding="utf-8")
    lines = text.splitlines(keepends=True)

    factory_start = None
    readiness_end = None
    today_start = None
    for i, line in enumerate(lines):
        if factory_start is None and ", function () {" in line and "globalThis" in line:
            factory_start = i + 1  # next line is 'use strict'
        if line.startswith("  var readiness2 = {"):
            for j in range(i + 1, len(lines)):
                if not lines[j].startswith("  };"):
                    continue
                window = "".join(lines[j : j + 6])
                if "Today plan" in window:
                    readiness_end = j
                    today_start = j + 1
                    break
            break

    if factory_start is None or readiness_end is None or today_start is None:
        raise SystemExit(
            f"onboarding markers missing: factory={factory_start} end={readiness_end} today={today_start}"
        )

    # Body for readiness2 module: constants through readiness2 object
    body = "".join(lines[factory_start : readiness_end + 1])

    readiness_mod = f'''/**
 * readiness2.js - Canonical readiness math + objective_stats accumulation.
 * Extracted from onboarding.js (SSOT for predicted score / readiness %).
 *
 * Browser: attaches window.APlus.readiness2 and window.APlus._readinessShared
 * Node:    module.exports = {{ readiness2, BLUEPRINTS, PASSING, ... }}
 */
(function (root, factory) {{
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) {{
    module.exports = api;
  }}
  var w = (typeof window === 'object' && window) ? window : root;
  if (w) {{
    w.APlus = w.APlus || {{}};
    w.APlus.readiness2 = api.readiness2;
    w.APlus._readinessShared = api;
  }}
}})(typeof globalThis !== 'undefined' ? globalThis : this, function () {{
  'use strict';

{body}
  return {{
    readiness2: readiness2,
    BLUEPRINTS: BLUEPRINTS,
    PASSING: PASSING,
    DOMAIN_TO_EXAM: DOMAIN_TO_EXAM,
    HALF_LIFE_DAYS: HALF_LIFE_DAYS,
    HALF_LIFE_MS: HALF_LIFE_MS,
    PRIOR_N: PRIOR_N,
    PRIOR_P: PRIOR_P,
    READINESS_SCALE: READINESS_SCALE,
    HISTORY_WEIGHTS: HISTORY_WEIGHTS,
    THIN_OBSERVATIONS: THIN_OBSERVATIONS,
    OBJECTIVE_BLEND: OBJECTIVE_BLEND,
    PASS_RATE_WINDOW: PASS_RATE_WINDOW,
    STORAGE_KEYS: STORAGE_KEYS,
    DEFAULT_MINUTES: DEFAULT_MINUTES,
    clamp: clamp,
    normExam: normExam,
    examForDomain: examForDomain,
    domainPrefixForCode: domainPrefixForCode,
    statKey: statKey,
    shuffle: shuffle,
    decayFactor: decayFactor,
    accumulateStats: accumulateStats,
    compute: compute,
    pickWeakest: pickWeakest
  }};
}});
'''
    write(ROOT / "js" / "readiness2.js", readiness_mod)

    # Rebuild onboarding: keep header + UMD shell, import shared, keep from today_start
    header = '''/**
 * Clariora Exam Simulator
 * onboarding.js - First-run diagnostic UI and the daily plan builder.
 * File: js/onboarding.js
 *
 * Readiness math lives in js/readiness2.js (loaded first in the browser, or
 * required from this file under Node).
 *
 * Plain script, IIFE, no ES modules, file:// compatible.
 * Browser: attaches window.APlus.onboarding (readiness2 already on APlus)
 * Node:    module.exports = { readiness2, buildTodaySet, accumulateStats, ... }
 */

(function (root, factory) {
  'use strict';
  var shared = null;
  try {
    if (typeof require === 'function') {
      shared = require('./readiness2.js');
    }
  } catch (_) { shared = null; }
  var w = (typeof window === 'object' && window) ? window : root;
  if (!shared && w && w.APlus && w.APlus._readinessShared) {
    shared = w.APlus._readinessShared;
  }
  if (!shared) {
    throw new Error('[onboarding] js/readiness2.js must load before onboarding.js');
  }
  var api = factory(shared);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (w) {
    w.APlus = w.APlus || {};
    w.APlus.readiness2 = shared.readiness2;
    w.APlus.onboarding = api.onboarding;
    api.onboarding._boot(w);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (shared) {
  'use strict';

  var BLUEPRINTS = shared.BLUEPRINTS;
  var PASSING = shared.PASSING;
  var STORAGE_KEYS = shared.STORAGE_KEYS;
  var DEFAULT_MINUTES = shared.DEFAULT_MINUTES;
  var readiness2 = shared.readiness2;
  var accumulateStats = shared.accumulateStats;
  var compute = shared.compute;
  var pickWeakest = shared.pickWeakest;
  var shuffle = shared.shuffle;
  var clamp = shared.clamp;
  var examForDomain = shared.examForDomain;
  var normExam = shared.normExam;
  var domainPrefixForCode = shared.domainPrefixForCode;
  var statKey = shared.statKey;

'''
    rest = "".join(lines[today_start:])
    # rest still ends with return { readiness2, onboarding, ...}; });
    write(ROOT / "js" / "onboarding.js", header + rest)

    # Ensure index.html loads readiness2 before onboarding
    index = ROOT / "index.html"
    html = index.read_text(encoding="utf-8")
    needle = '<script src="js/onboarding.js'
    if "js/readiness2.js" not in html and needle in html:
        html = html.replace(
            needle,
            '<script src="js/readiness2.js"></script>\n  <script src="js/onboarding.js',
            1,
        )
        index.write_text(html, encoding="utf-8")
        print("index.html: inserted readiness2.js before onboarding.js")


def split_main() -> None:
    """Extract Electron helpers into electron/ modules; main.js requires them."""
    src = ROOT / "main.js"
    text = src.read_text(encoding="utf-8")
    electron_dir = ROOT / "electron"
    electron_dir.mkdir(exist_ok=True)

    # Extract logging block (getLogDir through writeLog)
    log_start = text.find("const LOG_MAX_BYTES")
    log_end = text.find("/* ------------------------------------------------------------------------ */\nfunction getProgressPath")
    if log_start < 0 or log_end < 0:
        raise SystemExit("main.js log markers missing")

    logging_body = text[log_start:log_end].rstrip() + "\n"
    logging_mod = f'''/**
 * electron/logging.js - Rotating local log helpers for the desktop main process.
 */
'use strict';

const path = require('path');
const fs = require('fs');
const {{ app }} = require('electron');

{logging_body}
module.exports = {{
  getLogDir,
  getLogFile,
  rotateLogIfNeeded,
  scrubSecrets,
  writeLog,
  LOG_MAX_BYTES,
  LOG_KEEP_FILES
}};
'''
    # Fix: logging_body declares let logDir - need to ensure it's valid
    write(electron_dir / "logging.js", logging_mod)

    # Extract AI providers + handleAiChat
    ai_start = text.find("const AI_PROVIDERS = {")
    # include isLocalOrPrivateHost which AI uses
    host_start = text.find("function isLocalOrPrivateHost")
    if host_start > 0 and host_start < ai_start:
        ai_chunk_start = host_start
    else:
        ai_chunk_start = ai_start

    # Find handleAiChat end: next ipcMain.handle('ai:chat'
    ai_fn_start = text.find("async function handleAiChat")
    ai_fn_end = text.find("ipcMain.handle('ai:chat'", ai_fn_start)
    if ai_start < 0 or ai_fn_start < 0 or ai_fn_end < 0:
        raise SystemExit("main.js AI markers missing")

    # Build AI module with dependencies injected via context
    ai_providers = text[ai_start:text.find("let isExamSessionActive", ai_start)].rstrip() + "\n"
    host_fn = text[host_start:ai_start].rstrip() + "\n" if host_start >= 0 else ""
    handle_fn = text[ai_fn_start:ai_fn_end].rstrip() + "\n"

    ai_mod = f'''/**
 * electron/ai_gateway.js - Desktop AI chat proxy (Groq / OpenRouter / Ollama / NVIDIA).
 */
'use strict';

{host_fn}
{ai_providers}
/**
 * @param {{writeLog: Function, loadEnterprisePolicy: Function, GROQ_CHAT_URL: string, GROQ_ALLOWED_HOST: string}} deps
 */
function createAiGateway(deps) {{
  const writeLog = deps.writeLog;
  const loadEnterprisePolicy = deps.loadEnterprisePolicy;
  const GROQ_CHAT_URL = deps.GROQ_CHAT_URL;
  const GROQ_ALLOWED_HOST = deps.GROQ_ALLOWED_HOST;

{handle_fn}
  return {{
    AI_PROVIDERS,
    isLocalOrPrivateHost,
    handleAiChat
  }};
}}

module.exports = {{ createAiGateway, AI_PROVIDERS, isLocalOrPrivateHost }};
'''
    write(electron_dir / "ai_gateway.js", ai_mod)

    # Patch main.js to require logging + ai gateway
    # Replace logging block with require
    logging_require = (
        "const {\n"
        "  getLogDir,\n"
        "  getLogFile,\n"
        "  rotateLogIfNeeded,\n"
        "  scrubSecrets,\n"
        "  writeLog\n"
        "} = require('./electron/logging');\n\n"
    )
    text2 = text[:log_start] + logging_require + text[log_end:]

    # Re-find AI markers in text2
    ai_start2 = text2.find("const AI_PROVIDERS = {")
    host_start2 = text2.find("function isLocalOrPrivateHost")
    ai_fn_start2 = text2.find("async function handleAiChat")
    ai_fn_end2 = text2.find("ipcMain.handle('ai:chat'", ai_fn_start2)
    chunk_start2 = host_start2 if host_start2 > 0 and host_start2 < ai_start2 else ai_start2

    # Keep GROQ constants; remove host+providers+handleAiChat, inject createAiGateway
    # Find GROQ constants - they stay in main
    groq_end = text2.find("/* ---------------------------------------------------------------------------", text2.find("const GROQ_ALLOWED_HOST"))
    # Actually after logging require, structure changed. Simpler approach:
    # Replace from isLocalOrPrivateHost / AI_PROVIDERS through handleAiChat with gateway bootstrap

    ai_bootstrap = (
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

    # Remove original host function + AI_PROVIDERS block (before isExamSessionActive)
    exam_active = text2.find("let isExamSessionActive = false;")
    # Find start: isLocalOrPrivateHost or AI_PROVIDERS comment block
    providers_comment = text2.find("/* ---------------------------------------------------------------------------\n * AI provider registry")
    if providers_comment < 0:
        providers_comment = text2.find("const AI_PROVIDERS = {")
    # host function may be before AI_PROVIDERS
    remove_start = min(x for x in [host_start2, providers_comment, ai_start2] if x >= 0)

    # After logging extract, handleAiChat still in file - remove it
    text3 = text2[:remove_start] + text2[exam_active:]
    # Now remove handleAiChat if still present
    ai_fn_start3 = text3.find("async function handleAiChat")
    if ai_fn_start3 >= 0:
        ai_fn_end3 = text3.find("ipcMain.handle('ai:chat'", ai_fn_start3)
        text3 = text3[:ai_fn_start3] + text3[ai_fn_end3:]

    # Insert bootstrap after GROQ_ALLOWED_HOST / DEFAULT_POLICY area - after loadEnterprisePolicy function
    policy_fn_end = text3.find("const AI_PROVIDERS")
    # Insert after loadEnterprisePolicy closing and before isExamSessionActive
    marker = "let isExamSessionActive = false;"
    if marker not in text3:
        raise SystemExit("isExamSessionActive missing after edits")
    # Insert AI bootstrap just before isExamSessionActive
    text3 = text3.replace(marker, ai_bootstrap + marker, 1)

    # Remove leftover isLocalOrPrivateHost if still in main (shouldn't be)
    src.write_text(text3, encoding="utf-8", newline="\n")
    print(f"updated main.js ({len(text3.splitlines())} lines)")


if __name__ == "__main__":
    split_onboarding()
    split_main()
    print("done")
