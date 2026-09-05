"""
Release gate: the single command that must pass before any release.

    python tools/release_gate.py

Checks, in order:
  1. node --check on every script index.html loads, plus main.js, preload.js, sw.js
  2. every tools/test_*.js and tools/verify_*.js
  3. python tools/validate_bank.py
  4. typography scan: no em dashes and no emoji in shipped source
  5. the first-run intro gate key still exists
  6. package.json excludes the video folders
  7. release.config.json version matches both package.json files
  8. no file in dist_web over the 25 MB Cloudflare Pages limit

Exits non-zero if any check fails. Warnings never fail the build.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP_PKG = ROOT / "CompTIA_A_Plus_Desktop_App" / "resources" / "app" / "package.json"
RELEASE_CONFIG = ROOT / "release.config.json"
DIST_WEB = ROOT / "dist_web"

# Owned by a separate workstream. Reported, never fatal.
WARN_ONLY_FILES = {"curriculum_data.js"}

CLOUDFLARE_MAX_FILE_BYTES = 25 * 1024 * 1024

EM_DASH = "—"

# Pictographs, dingbats, symbols, regional indicators and the emoji presentation
# selector. Plain typographic marks and box drawing are deliberately not included.
EMOJI_PATTERN = re.compile(
    "["
    "\U0001F000-\U0001FAFF"
    "\U0001F1E6-\U0001F1FF"
    "☀-➿"
    "⬀-⯿"
    "️"
    "⁉‼"
    "]"
)

NODE = "node"


class Results:
    def __init__(self) -> None:
        self.rows: list[tuple[str, str, str]] = []
        self.failed = 0
        self.warned = 0

    def ok(self, name: str, detail: str = "") -> None:
        self.rows.append((name, "PASS", detail))

    def warn(self, name: str, detail: str = "") -> None:
        self.warned += 1
        self.rows.append((name, "WARN", detail))

    def fail(self, name: str, detail: str = "") -> None:
        self.failed += 1
        self.rows.append((name, "FAIL", detail))


def index_scripts() -> list[Path]:
    """Every local .js file index.html loads, in document order, deduplicated."""
    html = (ROOT / "index.html").read_text(encoding="utf-8", errors="replace")
    found: list[Path] = []
    seen: set[str] = set()
    for src in re.findall(r'<script[^>]+src="([^"]+)"', html):
        if src.startswith(("http://", "https://", "//", "data:")):
            continue
        clean = src.split("?", 1)[0].split("#", 1)[0]
        if not clean.endswith(".js") or clean in seen:
            continue
        seen.add(clean)
        path = ROOT / clean
        if path.is_file():
            found.append(path)
    return found


def check_node_syntax(res: Results) -> None:
    targets = index_scripts()
    for extra in ("main.js", "preload.js", "sw.js"):
        path = ROOT / extra
        if path.is_file() and path not in targets:
            targets.append(path)

    if not targets:
        res.fail("node --check", "no scripts found to check")
        return

    broken: list[str] = []
    for path in targets:
        r = subprocess.run(
            [NODE, "--check", str(path)],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            check=False,
        )
        if r.returncode != 0:
            first = (r.stderr or r.stdout or "").strip().splitlines()
            broken.append(f"{path.relative_to(ROOT).as_posix()}: {first[0] if first else 'syntax error'}")

    if broken:
        for line in broken:
            print(f"  syntax error: {line}")
        res.fail("node --check", f"{len(broken)} of {len(targets)} file(s) failed")
    else:
        res.ok("node --check", f"{len(targets)} file(s)")


def check_node_suites(res: Results) -> None:
    scripts = sorted(
        list((ROOT / "tools").glob("test_*.js")) + list((ROOT / "tools").glob("verify_*.js"))
    )
    if not scripts:
        res.warn("node test suites", "no tools/test_*.js or tools/verify_*.js found")
        return
    failures: list[str] = []
    for script in scripts:
        r = subprocess.run(
            [NODE, str(script)],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            check=False,
        )
        if r.returncode != 0:
            tail = (r.stdout or "") + (r.stderr or "")
            lines = [ln for ln in tail.strip().splitlines() if ln.strip()]
            failures.append(f"{script.name}: {lines[-1] if lines else 'exit ' + str(r.returncode)}")
    if failures:
        for line in failures:
            print(f"  suite failed: {line}")
        res.fail("node test suites", f"{len(failures)} of {len(scripts)} failed")
    else:
        res.ok("node test suites", f"{len(scripts)} suite(s)")


def check_validate_bank(res: Results) -> None:
    script = ROOT / "tools" / "validate_bank.py"
    if not script.is_file():
        res.warn("validate_bank.py", "not present")
        return
    r = subprocess.run(
        [sys.executable, str(script)],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        check=False,
    )
    if r.returncode != 0:
        tail = ((r.stdout or "") + (r.stderr or "")).strip().splitlines()
        for line in tail[-12:]:
            print(f"  {line}")
        res.fail("validate_bank.py", f"exit {r.returncode}")
    else:
        res.ok("validate_bank.py")


def typography_targets() -> list[Path]:
    targets: list[Path] = []
    index = ROOT / "index.html"
    if index.is_file():
        targets.append(index)
    targets += sorted((ROOT / "css").glob("*.css"))
    targets += sorted((ROOT / "js").glob("*.js"))
    targets += sorted(p for p in ROOT.glob("*.js") if p.is_file())
    sw = ROOT / "sw.js"
    if sw.is_file() and sw not in targets:
        targets.append(sw)
    targets += sorted((ROOT / "docs").glob("*.md"))
    unique: list[Path] = []
    seen: set[Path] = set()
    for path in targets:
        if path in seen:
            continue
        seen.add(path)
        unique.append(path)
    return unique


def scan_typography(res: Results) -> None:
    hard_hits: list[str] = []
    warn_hits: list[str] = []

    for path in typography_targets():
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        rel = path.relative_to(ROOT).as_posix()
        warn_only = path.name in WARN_ONLY_FILES
        for lineno, line in enumerate(text.splitlines(), start=1):
            marks: list[str] = []
            if EM_DASH in line:
                marks.append("em dash")
            emoji = EMOJI_PATTERN.findall(line)
            if emoji:
                marks.append("emoji " + " ".join(sorted({hex(ord(c)) for c in emoji})))
            if not marks:
                continue
            entry = f"{rel}:{lineno}: {', '.join(marks)}"
            (warn_hits if warn_only else hard_hits).append(entry)

    for line in warn_hits[:20]:
        print(f"  warn: {line}")
    if warn_hits:
        res.warn("typography (warn-only files)", f"{len(warn_hits)} hit(s)")

    if hard_hits:
        for line in hard_hits[:40]:
            print(f"  {line}")
        if len(hard_hits) > 40:
            print(f"  ... and {len(hard_hits) - 40} more")
        res.fail("typography", f"{len(hard_hits)} em dash / emoji hit(s)")
    else:
        res.ok("typography", "no em dashes, no emoji")


def check_intro_gate(res: Results) -> None:
    # The key is versioned (aplus3_boot_intro_seen_v1, _v2, ...). Any version
    # proves the once-only gate is still wired. shell-ux.js is the documented
    # home for the gate; boot-intro.js and index.html are regenerated by a
    # separate workstream, so either of them also satisfies it.
    pattern = re.compile(r"aplus3_boot_intro_seen_v\d+")
    candidates = [
        ROOT / "js" / "shell-ux.js",
        ROOT / "js" / "boot-intro.js",
        ROOT / "index.html",
    ]
    hits = []
    for path in candidates:
        if not path.is_file():
            continue
        m = pattern.search(path.read_text(encoding="utf-8", errors="replace"))
        if m:
            hits.append(f"{path.relative_to(ROOT).as_posix()} ({m.group(0)})")
    if hits:
        res.ok("intro gate key", ", ".join(hits))
    else:
        res.fail("intro gate key", "aplus3_boot_intro_seen_v<n> not found in shell-ux.js, boot-intro.js or index.html")


def check_package_excludes(res: Results) -> None:
    if not APP_PKG.is_file():
        res.fail("package.json excludes", "app package.json missing")
        return
    pkg = json.loads(APP_PKG.read_text(encoding="utf-8"))
    files = pkg.get("build", {}).get("files", [])
    required = ["!Videos For A+/**", "!media/videos/**"]
    missing = [entry for entry in required if entry not in files]
    if missing:
        res.fail("package.json excludes", "missing " + ", ".join(missing))
    else:
        res.ok("package.json excludes", "video folders excluded")


def check_versions(res: Results) -> None:
    if not RELEASE_CONFIG.is_file():
        res.fail("version consistency", "release.config.json missing")
        return
    cfg = json.loads(RELEASE_CONFIG.read_text(encoding="utf-8"))
    version = cfg.get("version")
    root_version = json.loads((ROOT / "package.json").read_text(encoding="utf-8")).get("version")
    app_version = json.loads(APP_PKG.read_text(encoding="utf-8")).get("version") if APP_PKG.is_file() else None
    core_js = (ROOT / "js" / "core.js").read_text(encoding="utf-8", errors="replace")
    m = re.search(r"APlus\.APP_VERSION\s*=\s*'([^']+)'", core_js)
    shell_version = m.group(1) if m else None
    if version and version == root_version == app_version == shell_version:
        res.ok("version consistency", f"v{version}")
    else:
        res.fail(
            "version consistency",
            f"release.config={version} root={root_version} app={app_version} js/core.js={shell_version}",
        )


def check_dist_web(res: Results) -> None:
    if not DIST_WEB.is_dir():
        res.ok("dist_web file sizes", "dist_web not built, skipped")
        return
    oversized = []
    for path in DIST_WEB.rglob("*"):
        if not path.is_file():
            continue
        size = path.stat().st_size
        if size > CLOUDFLARE_MAX_FILE_BYTES:
            oversized.append((path.relative_to(ROOT).as_posix(), size))
    if oversized:
        for name, size in sorted(oversized, key=lambda kv: kv[1], reverse=True):
            print(f"  {size / (1024 * 1024):8.1f} MB  {name}")
        res.fail("dist_web file sizes", f"{len(oversized)} file(s) over 25 MB")
    else:
        res.ok("dist_web file sizes", "all files under 25 MB")


def main() -> int:
    res = Results()
    print("=" * 72)
    print("  Release gate")
    print("=" * 72)

    for label, fn in (
        ("node --check", check_node_syntax),
        ("node test suites", check_node_suites),
        ("validate_bank.py", check_validate_bank),
        ("typography", scan_typography),
        ("intro gate key", check_intro_gate),
        ("package.json excludes", check_package_excludes),
        ("version consistency", check_versions),
        ("dist_web file sizes", check_dist_web),
    ):
        print(f"\n[{label}]")
        try:
            fn(res)
        except Exception as exc:  # a broken check is a failed check
            res.fail(label, f"check crashed: {exc}")

    width = max(len(row[0]) for row in res.rows)
    print("\n" + "=" * 72)
    print("  Summary")
    print("=" * 72)
    for name, status, detail in res.rows:
        print(f"  {status:<4}  {name:<{width}}  {detail}")
    print("=" * 72)
    if res.failed:
        print(f"  RESULT: FAIL ({res.failed} failed, {res.warned} warned)")
        return 1
    print(f"  RESULT: PASS ({res.warned} warned)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
