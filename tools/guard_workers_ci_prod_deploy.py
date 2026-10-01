#!/usr/bin/env python3
"""Stop Workers Builds from publishing production over GitHub Actions.

GitHub Actions job "Deploy production web to Cloudflare" is the publisher
for clariora.com.au. Workers Builds on main also runs `wrangler deploy`.
A queued build of an older commit can finish later and roll the live asset
manifest back to pre-change landing and legal HTML.

Preview branches use `wrangler versions upload` and are not blocked.
This script is chained from wrangler.toml [build]. Exit 1 aborts deploy
before the asset manifest is published.
"""
import os
import sys


def workers_ci_branch():
    branch = os.environ.get("WORKERS_CI_BRANCH", "").strip()
    if branch.startswith("refs/heads/"):
        branch = branch[len("refs/heads/"):]
    return branch


def should_block_production_deploy():
    if os.environ.get("WORKERS_CI") != "1":
        return False
    return workers_ci_branch() == "main"


def main():
    if should_block_production_deploy():
        print(
            "[guard] Refusing Workers Builds wrangler deploy on main. "
            "GitHub Actions deploy-web publishes production. "
            "A duplicate deploy of an older queued commit would roll "
            "landing and legal HTML back.",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
