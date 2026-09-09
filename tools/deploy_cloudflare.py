#!/usr/bin/env python3
"""
Non-interactive Cloudflare deploy for Clariora.

Loads gitignored .env for CLOUDFLARE_* credentials, builds dist_web,
runs dist tests, then deploys via Wrangler Workers assets (preferred)
with Pages as a fallback when the project already exists.

Usage:
  python tools/deploy_cloudflare.py
  python tools/deploy_cloudflare.py --skip-build
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / ".env"
DIST = ROOT / "dist_web"
PROJECT = "comptia-a-plus-master"


def load_env(path: Path) -> None:
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key:
            os.environ[key] = val


def run(cmd: list[str], *, check: bool = True) -> int:
    print("+", " ".join(cmd), flush=True)
    # On Windows, npx/wrangler are often .cmd/.ps1 shims; shell=True finds them.
    use_shell = os.name == "nt"
    completed = subprocess.run(cmd, cwd=str(ROOT), shell=use_shell)
    if check and completed.returncode != 0:
        raise SystemExit(completed.returncode)
    return completed.returncode


def main() -> int:
    parser = argparse.ArgumentParser(description="Build and deploy to Cloudflare")
    parser.add_argument("--skip-build", action="store_true", help="Deploy existing dist_web only")
    parser.add_argument("--pages-only", action="store_true", help="Only try Pages deploy")
    parser.add_argument("--workers-only", action="store_true", help="Only try Workers assets deploy")
    args = parser.parse_args()

    load_env(ENV_PATH)
    if not os.environ.get("CLOUDFLARE_API_TOKEN"):
        print("[deploy] ERROR: CLOUDFLARE_API_TOKEN missing (set in .env)", file=sys.stderr)
        return 2
    if not os.environ.get("CLOUDFLARE_ACCOUNT_ID"):
        print("[deploy] ERROR: CLOUDFLARE_ACCOUNT_ID missing (set in .env)", file=sys.stderr)
        return 2

    if not args.skip_build:
        run([sys.executable, str(ROOT / "tools" / "build_web_dist.py")])
        run(["node", str(ROOT / "tools" / "test_web_dist.js")])
    elif not (DIST / "index.html").is_file():
        print("[deploy] ERROR: dist_web/index.html missing; run without --skip-build", file=sys.stderr)
        return 2

    # Prefer Workers static assets (token usually has Workers write).
    workers_ok = False
    pages_ok = False
    url = ""

    if not args.pages_only:
        print("[deploy] Trying Workers assets deploy...", flush=True)
        code = run(
            ["npx", "--yes", "wrangler", "deploy", "--assets=./dist_web", f"--name={PROJECT}"],
            check=False,
        )
        workers_ok = code == 0
        if workers_ok:
            url = f"https://{PROJECT}.<account>.workers.dev"
            print("[deploy] Workers deploy succeeded.", flush=True)

    if not workers_ok and not args.workers_only:
        print("[deploy] Trying Cloudflare Pages deploy...", flush=True)
        code = run(
            [
                "npx",
                "--yes",
                "wrangler",
                "pages",
                "deploy",
                "dist_web",
                f"--project-name={PROJECT}",
                "--commit-dirty=true",
            ],
            check=False,
        )
        pages_ok = code == 0
        if pages_ok:
            url = f"https://{PROJECT}.pages.dev"
            print("[deploy] Pages deploy succeeded.", flush=True)

    if not workers_ok and not pages_ok:
        print(
            "[deploy] FAILED. Cloudflare permanent host is not ready yet.\n"
            "  Most common cause: the API token has only Read scopes. A Workers deploy needs\n"
            "  account-level Workers Scripts: Edit (plus R2 Storage: Edit and KV Storage: Edit\n"
            "  if used). Read-only tokens fail every write with Authentication error 10000.\n"
            "  Fix it under Manage account -> Account API tokens, then re-run.\n"
            "  Do ONE of these once in the dashboard, then re-run this script:\n"
            "  A) Workers (recommended with current token):\n"
            "     Open https://dash.cloudflare.com/2373013c66331e9660e47ffa3ae40f5c/workers/onboarding\n"
            "     That registers a *.workers.dev subdomain.\n"
            "  B) Pages:\n"
            "     Edit API token -> Account -> Cloudflare Pages: Edit (+ Account Settings: Read)\n"
            "     Then: npx wrangler pages project create comptia-a-plus-master --production-branch main\n"
            "  Re-run: python tools/deploy_cloudflare.py",
            file=sys.stderr,
        )
        return 1

    print("[deploy] OK")
    if url:
        print(f"[deploy] Expected URL pattern: {url}")
    print("[deploy] Confirm the live URL in the wrangler output above.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
