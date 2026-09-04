"""
autodeploy.py: keep Cloudflare in step with the working tree.

Watches the project root for changes to shipped files, waits for a quiet
period, then runs the web build, the web dist test, and a Cloudflare deploy.
Failures are logged and never crash the watcher. One deploy runs at a time.

Usage:
  python tools/autodeploy.py            # watch and deploy on change
  python tools/autodeploy.py --once     # build, test, deploy once and exit
  python tools/autodeploy.py --dry-run  # build and test only, no deploy

Deploy target is chosen from wrangler.toml: an [assets] block means Workers
static assets (`wrangler deploy`); otherwise Cloudflare Pages
(`wrangler pages deploy dist_web`). Override with --target workers|pages.
"""

from __future__ import annotations

import argparse
import hashlib
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOG = ROOT / "release" / "deploy.log"
QUIET_SECONDS = 20
POLL_SECONDS = 3

WATCH_FILES = [
    "index.html", "sw.js", "manifest.webmanifest", "_headers", "_redirects",
    "release.config.json", "wrangler.toml", "exam_data.js", "objectives_data.js",
    "study_library.js", "curriculum_data.js", "learner_state.js", "ledger_engine.js",
    "ledger_ui.js", "memory_srs.js", "memory_mode_ui.js", "objectives_tracker.js",
    "product_trust_ui.js", "profiles.js", "readiness.js", "study_plan.js",
    "tutor_mode.js", "exam_a11y.js",
]
WATCH_DIRS = ["js", "css", "fonts", "icons", "notes", "media/brand", "media/labs", "media/slides"]
IGNORE_PARTS = {"node_modules", "release", "dist_web", "_bank", "_backup", "tools", "__pycache__"}


def log(msg: str) -> None:
    line = f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}"
    print(line, flush=True)
    try:
        LOG.parent.mkdir(parents=True, exist_ok=True)
        with LOG.open("a", encoding="utf-8") as fh:
            fh.write(line + "\n")
    except OSError:
        pass


def snapshot() -> str:
    """Hash of names, sizes and mtimes for every watched file. Cheap and stable."""
    h = hashlib.sha1()
    paths: list[Path] = []
    for name in WATCH_FILES:
        p = ROOT / name
        if p.is_file():
            paths.append(p)
    for d in WATCH_DIRS:
        base = ROOT / d
        if not base.is_dir():
            continue
        for p in base.rglob("*"):
            if p.is_file() and not (IGNORE_PARTS & set(p.parts)):
                paths.append(p)
    for p in sorted(paths):
        try:
            st = p.stat()
        except OSError:
            continue
        h.update(str(p.relative_to(ROOT)).encode("utf-8"))
        h.update(f"{st.st_size}:{int(st.st_mtime)}".encode("ascii"))
    return h.hexdigest()


def run(cmd: list[str], timeout: int = 900) -> tuple[int, str]:
    try:
        proc = subprocess.run(
            cmd, cwd=str(ROOT), capture_output=True, text=True, timeout=timeout,
            shell=(os.name == "nt"), encoding="utf-8", errors="replace",
        )
        out = (proc.stdout or "") + (proc.stderr or "")
        return proc.returncode, out
    except subprocess.TimeoutExpired:
        return 124, "timeout"
    except OSError as exc:
        return 1, str(exc)


def detect_target() -> str:
    try:
        text = (ROOT / "wrangler.toml").read_text(encoding="utf-8")
    except OSError:
        return "pages"
    return "workers" if "[assets]" in text else "pages"


def deploy(target: str, dry_run: bool) -> bool:
    code, out = run([sys.executable, "tools/build_web_dist.py"])
    if code != 0:
        log("build_web_dist FAILED\n" + out[-1500:])
        return False
    code, out = run(["node", "tools/test_web_dist.js"])
    if code != 0:
        log("test_web_dist FAILED\n" + out[-1500:])
        return False
    if dry_run:
        log("dry run: build and test passed, deploy skipped")
        return True
    if target == "workers":
        cmd = ["npx", "wrangler", "deploy"]
    else:
        cmd = ["npx", "wrangler", "pages", "deploy", "dist_web",
               "--project-name", "comptia-a-plus-master", "--branch", "main", "--commit-dirty=true"]
    code, out = run(cmd, timeout=1200)
    tail = out.strip().splitlines()[-6:]
    if code != 0:
        log(f"deploy ({target}) FAILED\n" + "\n".join(tail))
        return False
    log(f"deploy ({target}) OK\n" + "\n".join(tail))
    return True


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--once", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--target", choices=["workers", "pages"])
    ap.add_argument("--quiet-seconds", type=int, default=QUIET_SECONDS)
    args = ap.parse_args()
    target = args.target or detect_target()

    if args.once:
        return 0 if deploy(target, args.dry_run) else 1

    log(f"autodeploy watching {ROOT} (target {target}, quiet {args.quiet_seconds}s)")
    last = snapshot()
    pending_since: float | None = None
    while True:
        time.sleep(POLL_SECONDS)
        cur = snapshot()
        if cur != last:
            last = cur
            pending_since = time.time()
            log("change detected, waiting for a quiet period")
            continue
        if pending_since is not None and time.time() - pending_since >= args.quiet_seconds:
            pending_since = None
            deploy(target, args.dry_run)
            last = snapshot()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(0)
