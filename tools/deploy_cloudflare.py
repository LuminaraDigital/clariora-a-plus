#!/usr/bin/env python3
"""
Non-interactive Cloudflare deploy for Clariora.

Loads gitignored env files for CLOUDFLARE_* credentials, builds dist_web,
runs dist tests, then deploys via Wrangler Workers assets (preferred)
with Pages as a fallback when the project already exists.

Usage:
    python tools/deploy_cloudflare.py
    python tools/deploy_cloudflare.py --skip-build
    python tools/deploy_cloudflare.py --env staging
    python tools/deploy_cloudflare.py --env production
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist_web"
WORKER_NAME_PROD = "clariora-a-plus"
WORKER_NAME_STAGING = "clariora-a-plus-staging"
PAGES_PROJECT = "comptia-a-plus-master"


def load_env(path: Path, override: bool = True) -> None:
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
            if override or key not in os.environ:
                os.environ[key] = val


def resolve_env_file(env_name: str) -> Path:
    preferred = {
        "staging": ROOT / ".env.staging",
        "production": ROOT / ".env.production",
        "local": ROOT / ".env.local",
    }.get(env_name, ROOT / ".env")
    if preferred.is_file():
        return preferred
    return ROOT / ".env"


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
    parser.add_argument(
        "--env",
        choices=("staging", "production", "local"),
        default="staging",
        help="Target environment (default: staging)",
    )
    args = parser.parse_args()

    # Load generic .env first for base defaults
    load_env(ROOT / ".env")
    # Load target-specific env file second so environment values override generic defaults
    env_file = resolve_env_file(args.env)
    if env_file.name != ".env":
        load_env(env_file, override=True)

    app_env = (os.environ.get("APP_ENV") or args.env).strip().lower()
    if args.env == "staging" and app_env not in ("staging", ""):
        print(
            f"[deploy] ERROR: APP_ENV={app_env!r} does not match --env staging",
            file=sys.stderr,
        )
        return 2
    if args.env == "production" and app_env in ("staging", "local"):
        print(
            f"[deploy] ERROR: refusing production deploy with APP_ENV={app_env!r}",
            file=sys.stderr,
        )
        return 2

    if not os.environ.get("CLOUDFLARE_API_TOKEN"):
        print(
            "[deploy] ERROR: CLOUDFLARE_API_TOKEN missing (set in .env / .env.staging / .env.production)",
            file=sys.stderr,
        )
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

    workers_ok = False
    pages_ok = False
    url = ""
    worker_name = WORKER_NAME_STAGING if args.env == "staging" else WORKER_NAME_PROD

    if not args.pages_only:
        print(f"[deploy] Trying Workers assets deploy ({args.env})...", flush=True)
        wrangler_cmd = ["npx", "--yes", "wrangler", "deploy"]
        if args.env == "staging":
            wrangler_cmd.extend(["-c", "wrangler.staging.toml"])
        code = run(wrangler_cmd, check=False)
        workers_ok = code == 0
        if workers_ok:
            url = f"https://{worker_name}.<account>.workers.dev"
            print("[deploy] Workers deploy succeeded.", flush=True)

    if not workers_ok and not args.workers_only:
        if args.env == "staging":
            print(
                "[deploy] Staging Pages fallback is disabled. Fix the staging Worker deploy.",
                file=sys.stderr,
            )
        else:
            print("[deploy] Trying Cloudflare Pages deploy...", flush=True)
            code = run(
                [
                    "npx",
                    "--yes",
                    "wrangler",
                    "pages",
                    "deploy",
                    "dist_web",
                    f"--project-name={PAGES_PROJECT}",
                    "--commit-dirty=true",
                ],
                check=False,
            )
            pages_ok = code == 0
            if pages_ok:
                url = f"https://{PAGES_PROJECT}.pages.dev"
                print("[deploy] Pages deploy succeeded.", flush=True)

    if not workers_ok and not pages_ok:
        print(
            "[deploy] FAILED. Cloudflare permanent host is not ready yet.\n"
            "  Most common cause: the API token has only Read scopes. A Workers deploy needs\n"
            "  account-level Workers Scripts: Edit (plus R2 Storage: Edit and KV Storage: Edit\n"
            "  if used). Read-only tokens fail every write with Authentication error 10000.\n"
            "  Staging: create D1 clariora_edge_db_staging and update wrangler.staging.toml.\n"
            "  Re-run: python tools/deploy_cloudflare.py --env staging|production",
            file=sys.stderr,
        )
        return 1

    print(f"[deploy] OK ({args.env})")
    if url:
        print(f"[deploy] Expected URL pattern: {url}")
    print("[deploy] Confirm the live URL in the wrangler output above.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
