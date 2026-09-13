#!/usr/bin/env python3
"""Split curriculum.js and entitlements.js into focused sibling modules."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def write(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8", newline="\n")
    print(f"wrote {path.relative_to(ROOT)} ({len(text.splitlines())} lines)")


def split_curriculum() -> None:
    src = ROOT / "js" / "curriculum.js"
    lines = src.read_text(encoding="utf-8").splitlines(keepends=True)

    def find_start(pred):
        for i, line in enumerate(lines):
            if pred(line):
                return i
        raise SystemExit(f"marker not found: {pred}")

    store_i = find_start(lambda l: l.startswith("  var store = {"))
    model_i = find_start(lambda l: l.startswith("  var model = {};"))
    html_i = find_start(lambda l: l.startswith("  var html = {};"))
    ctrl_i = find_start(lambda l: l.startswith("  var Curriculum = {"))

    helpers = "".join(lines[18:store_i])  # from inside IIFE after window.APlus through before store
    # Actually line 18 is `(function (window) {` - helpers start after that
    # Keep escapeHTML through pad2 and store separately

    # helpers: from escapeHTML through before store (includes examLabel, pad2)
    helper_block = "".join(lines[21:store_i])
    store_block = "".join(lines[store_i:model_i])
    model_block = "".join(lines[model_i:html_i])
    html_block = "".join(lines[html_i:ctrl_i])
    ctrl_block = "".join(lines[ctrl_i:])

    model_file = f'''/**
 * curriculum-model.js - Course library parsers and markdown (pure).
 * Loaded before js/curriculum.js. Attaches APlus._curriculumModel.
 */
(function (window) {{
  'use strict';
  window.APlus = window.APlus || {{}};

{helper_block}
{model_block}
  window.APlus._curriculumHelpers = {{
    escapeHTML: escapeHTML,
    encodePath: encodePath,
    examLabel: examLabel,
    pad2: pad2,
    inlineMd: inlineMd
  }};
  window.APlus._curriculumModel = model;
}})(typeof window !== 'undefined' ? window : this);
'''
    write(ROOT / "js" / "curriculum-model.js", model_file)

    html_file = f'''/**
 * curriculum-html.js - Course library HTML builders (pure).
 * Loaded after curriculum-model.js, before curriculum.js.
 */
(function (window) {{
  'use strict';
  window.APlus = window.APlus || {{}};
  var H = window.APlus._curriculumHelpers || {{}};
  var model = window.APlus._curriculumModel;
  var escapeHTML = H.escapeHTML || function (s) {{ return String(s == null ? '' : s); }};
  var encodePath = H.encodePath || function (rel) {{ return String(rel || ''); }};
  var examLabel = H.examLabel || function (exam) {{ return String(exam || ''); }};
  var pad2 = H.pad2 || function (n) {{ return String(n); }};
  var inlineMd = H.inlineMd || escapeHTML;
  if (!model) {{
    console.warn('[curriculum-html] model missing; load curriculum-model.js first');
    model = {{}};
  }}

{html_block}
  window.APlus._curriculumHtml = html;
}})(typeof window !== 'undefined' ? window : this);
'''
    write(ROOT / "js" / "curriculum-html.js", html_file)

    ctrl_file = f'''/**
 * curriculum.js - Course library store + UI controller.
 * Depends on js/curriculum-model.js and js/curriculum-html.js.
 */
(function (window) {{
  'use strict';

  window.APlus = window.APlus || {{}};

  var H = window.APlus._curriculumHelpers || {{}};
  var escapeHTML = H.escapeHTML || function (s) {{ return String(s == null ? '' : s); }};
  var encodePath = H.encodePath || function (rel) {{ return String(rel || ''); }};
  var examLabel = H.examLabel || function (exam) {{ return String(exam || ''); }};
  var pad2 = H.pad2 || function (n) {{ return String(n); }};
  var model = window.APlus._curriculumModel || {{}};
  var html = window.APlus._curriculumHtml || {{}};

{store_block}
{ctrl_block}
'''
    # ctrl_block already ends with closing of IIFE
    write(ROOT / "js" / "curriculum.js", ctrl_file)

    # index.html: insert model+html before curriculum.js
    index = ROOT / "index.html"
    html_txt = index.read_text(encoding="utf-8")
    needle = '<script src="js/curriculum.js"></script>'
    if "curriculum-model.js" not in html_txt and needle in html_txt:
        html_txt = html_txt.replace(
            needle,
            '<script src="js/curriculum-model.js"></script>\n'
            '  <script src="js/curriculum-html.js"></script>\n'
            '  <script src="js/curriculum.js"></script>',
            1,
        )
        index.write_text(html_txt, encoding="utf-8")
        print("index.html: wired curriculum-model/html")

    # Update test to load three scripts into one vm context
    test = ROOT / "tools" / "test_curriculum.js"
    t = test.read_text(encoding="utf-8")
    old = """var win = { APlus: {}, localStorage: null };
var win.window = win;
var src = fs.readFileSync(path.join(__dirname, '..', 'js', 'curriculum.js'), 'utf8');
vm.runInNewContext(src, { window: win, document: undefined, navigator: {}, setTimeout: setTimeout, clearTimeout: clearTimeout, console: console });"""
    # file may have slightly different formatting
    if "curriculum-model.js" not in t:
        t = t.replace(
            "var src = fs.readFileSync(path.join(__dirname, '..', 'js', 'curriculum.js'), 'utf8');\n"
            "vm.runInNewContext(src, { window: win, document: undefined, navigator: {}, setTimeout: setTimeout, clearTimeout: clearTimeout, console: console });",
            "var ctx = { window: win, document: undefined, navigator: {}, setTimeout: setTimeout, clearTimeout: clearTimeout, console: console };\n"
            "['curriculum-model.js', 'curriculum-html.js', 'curriculum.js'].forEach(function (name) {\n"
            "  var src = fs.readFileSync(path.join(__dirname, '..', 'js', name), 'utf8');\n"
            "  vm.runInNewContext(src, ctx);\n"
            "});",
            1,
        )
        test.write_text(t, encoding="utf-8", newline="\n")
        print("test_curriculum.js: loads model+html+controller")


def split_entitlements() -> None:
    src = ROOT / "js" / "entitlements.js"
    text = src.read_text(encoding="utf-8")
    lines = text.splitlines(keepends=True)

    def idx(prefix: str) -> int:
        for i, line in enumerate(lines):
            if line.startswith(prefix):
                return i
        raise SystemExit(f"missing {prefix}")

    # base32 section through end of verifyKey / bufferOf
    b32 = idx("  var B32_ALPHABET")
    key_prefix = idx("  var KEY_PREFIX")
    state_i = idx("  var state = {")

    crypto_body = "".join(lines[b32:state_i])
    crypto_file = f'''/**
 * entitlements-crypto.js - Base32 / UTF-8 helpers and offline license verifyKey.
 * Loaded before js/entitlements.js.
 */
(function (window) {{
  'use strict';
  if (!window) return;
  window.APlus = window.APlus || {{}};

  function config() {{
    var cfg = window.APLUS_ENTITLEMENTS_CONFIG || {{}};
    return cfg;
  }}

{crypto_body}
  window.APlus._entitlementsCrypto = {{
    base32Encode: base32Encode,
    base32Decode: base32Decode,
    utf8Encode: utf8Encode,
    utf8Decode: utf8Decode,
    normaliseKey: normaliseKey,
    splitKey: splitKey,
    isRevoked: isRevoked,
    isExpired: isExpired,
    daysRemaining: daysRemaining,
    verifyKey: verifyKey,
    bufferOf: bufferOf,
    KEY_PREFIX: KEY_PREFIX
  }};
}})(typeof window !== 'undefined' ? window : this);
'''
    write(ROOT / "js" / "entitlements-crypto.js", crypto_file)

    # Rebuild entitlements.js without crypto body; import from APlus._entitlementsCrypto
    head = "".join(lines[:b32])
    tail = "".join(lines[state_i:])
    bridge = '''  var _crypto = (APlus._entitlementsCrypto) || {};
  var base32Encode = _crypto.base32Encode;
  var base32Decode = _crypto.base32Decode;
  var utf8Encode = _crypto.utf8Encode;
  var utf8Decode = _crypto.utf8Decode;
  var normaliseKey = _crypto.normaliseKey;
  var splitKey = _crypto.splitKey;
  var isRevoked = _crypto.isRevoked;
  var isExpired = _crypto.isExpired;
  var daysRemaining = _crypto.daysRemaining;
  var verifyKey = _crypto.verifyKey;
  var bufferOf = _crypto.bufferOf;
  var KEY_PREFIX = _crypto.KEY_PREFIX || 'APLUS-';
  if (typeof verifyKey !== 'function') {
    console.warn('[APlus.entitlements] entitlements-crypto.js missing; license verify disabled');
    verifyKey = function () { return Promise.resolve({ ok: false, error: 'crypto module missing' }); };
    isExpired = function () { return false; };
    daysRemaining = function () { return null; };
    base32Encode = base32Encode || function () { return ''; };
    base32Decode = base32Decode || function () { return new Uint8Array(0); };
    utf8Encode = utf8Encode || function () { return new Uint8Array(0); };
    utf8Decode = utf8Decode || function () { return ''; };
  }

'''
    write(ROOT / "js" / "entitlements.js", head + bridge + tail)

    index = ROOT / "index.html"
    html_txt = index.read_text(encoding="utf-8")
    needle = '<script src="js/entitlements.js"></script>'
    if "entitlements-crypto.js" not in html_txt and needle in html_txt:
        html_txt = html_txt.replace(
            needle,
            '<script src="js/entitlements-crypto.js"></script>\n  <script src="js/entitlements.js"></script>',
            1,
        )
        index.write_text(html_txt, encoding="utf-8")
        print("index.html: wired entitlements-crypto.js")

    # test_entitlements loads via vm or require? check
    test = ROOT / "tools" / "test_entitlements.js"
    t = test.read_text(encoding="utf-8")
    if "entitlements.js" in t and "entitlements-crypto" not in t:
        # find how it loads
        if "runInNewContext" in t or "readFileSync" in t:
            print("NOTE: update test_entitlements.js load order manually if needed")


def split_main_logging_ai() -> None:
    """Safer main.js split: logging + AI gateway only."""
    main = ROOT / "main.js"
    text = main.read_text(encoding="utf-8")
    electron = ROOT / "electron"
    electron.mkdir(exist_ok=True)

    # --- logging ---
    log_start = text.find("const LOG_MAX_BYTES")
    log_end = text.find("/* ------------------------------------------------------------------------ */\nfunction getProgressPath")
    if log_start < 0 or log_end < 0:
        # already split?
        if "require('./electron/logging')" in text:
            print("main.js logging already extracted")
        else:
            raise SystemExit("logging markers missing")
    else:
        body = text[log_start:log_end]
        write(
            electron / "logging.js",
            "/** electron/logging.js - Rotating local logs for the desktop main process. */\n"
            "'use strict';\n\n"
            "const path = require('path');\n"
            "const fs = require('fs');\n"
            "const { app } = require('electron');\n\n"
            + body
            + "\nmodule.exports = { getLogDir, getLogFile, rotateLogIfNeeded, scrubSecrets, writeLog };\n",
        )
        text = (
            text[:log_start]
            + "const { getLogDir, getLogFile, rotateLogIfNeeded, scrubSecrets, writeLog } = require('./electron/logging');\n\n"
            + text[log_end:]
        )

    # --- AI gateway ---
    if "require('./electron/ai_gateway')" in text:
        print("main.js AI already extracted")
        main.write_text(text, encoding="utf-8", newline="\n")
        print(f"updated main.js ({len(text.splitlines())} lines)")
        return

    host_start = text.find("function isLocalOrPrivateHost")
    ai_prov = text.find("const AI_PROVIDERS = {")
    handle_start = text.find("async function handleAiChat")
    handle_end = text.find("ipcMain.handle('ai:chat'", handle_start)
    exam_active = text.find("let isExamSessionActive = false;")

    if min(ai_prov, handle_start, handle_end, exam_active) < 0:
        raise SystemExit("AI markers missing")

    remove_start = host_start if host_start >= 0 and host_start < ai_prov else ai_prov
    # Keep AI_PROVIDERS through before isExamSessionActive in the module;
    # handleAiChat separately.
    providers_block = text[ai_prov:exam_active]
    host_block = text[host_start:ai_prov] if host_start >= 0 and host_start < ai_prov else ""
    handle_block = text[handle_start:handle_end]

    write(
        electron / "ai_gateway.js",
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
    )

    # Remove host+providers from main (before exam active), remove handleAiChat, inject bootstrap
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
    text2 = text2.replace("let isExamSessionActive = false;", bootstrap + "let isExamSessionActive = false;", 1)
    main.write_text(text2, encoding="utf-8", newline="\n")
    print(f"updated main.js ({len(text2.splitlines())} lines)")

    # Sync desktop packaged main.js
    desk = ROOT / "CompTIA_A_Plus_Desktop_App" / "resources" / "app" / "main.js"
    if desk.exists():
        desk.write_text(text2, encoding="utf-8", newline="\n")
        # also copy electron/ folder next to it
        import shutil
        dest_e = ROOT / "CompTIA_A_Plus_Desktop_App" / "resources" / "app" / "electron"
        if dest_e.exists():
            shutil.rmtree(dest_e)
        shutil.copytree(electron, dest_e)
        print("synced desktop resources/app main.js + electron/")


if __name__ == "__main__":
    split_curriculum()
    split_entitlements()
    split_main_logging_ai()
    print("pass2 splits done")
