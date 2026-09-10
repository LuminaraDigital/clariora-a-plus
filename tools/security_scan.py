#!/usr/bin/env python3
"""
tools/security_scan.py - Enterprise Secret Detection Scanner

Scans repository files for leaked credentials, access keys, private keys,
and high-entropy tokens while excluding gitignored build artifacts and honoring
educational allowlists for CompTIA A+ materials.

Detected Secret Categories:
  - Cloudflare API tokens (cfat_...)
  - AWS Access Keys (AKIA...) & R2 Access Keys / Secrets ([a-f0-9]{32,64})
  - Private Keys (BEGIN .* PRIVATE KEY)
  - Telegram Bot Tokens (\\d{9,10}:[a-zA-Z0-9_-]{35})
  - High-entropy base64 / hex secret strings in credential assignments

Exit Codes:
  0: Clean repository (no un-allowlisted secret leaks)
  1: Leaks detected
"""
from __future__ import annotations

import argparse
import json
import math
import os
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

ROOT = Path(__file__).resolve().parents[1]

# ---------------------------------------------------------------------------
# Ignore configurations
# ---------------------------------------------------------------------------

EXCLUDE_DIRS: Set[str] = {
    ".git",
    ".wrangler",
    "dist",
    "dist_web",
    "node_modules",
    "media/videos",
    "media/slides",
    "media/labs",
    "_backup",
    "__pycache__",
    ".pytest_cache",
    ".cursor",
    ".claude",
    ".agents",
    "build",
    "credentials",
}

EXCLUDE_EXTS: Set[str] = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".ico",
    ".webp",
    ".pdf",
    ".mp4",
    ".webm",
    ".zip",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".exe",
    ".tar",
    ".gz",
    ".tmp",
    ".log",
}

# Files that should emit warnings rather than failing the scan
WARN_ONLY_FILES: Set[str] = {
    "curriculum_data.js",
    "curriculum_data.json",
}

# ---------------------------------------------------------------------------
# Allowlist: Known synthetic CompTIA A+ sample credentials & safe identifiers
# ---------------------------------------------------------------------------

ALLOWLIST_LITERALS: Set[str] = {
    # Synthetic CompTIA A+ educational credentials
    "Cisco123!",
    "Cisco456!",
    "Password123!",
    "P@ssw0rd123",
    "Admin123!",
    "Welcome123!",
    "P@ssword1",
    "Password123",
    "Admin2024!",
    # Demo TON addresses & payloads
    "EQBvW8Z5huBkMJYdn3GuLD5Co_V7bB0N12_RegistryMockTON",
    "QVBYOkMxOjc4NTpQQVNTOjU5NGIyOGE0NTlhMDI5Yjc=",
    "QVBYOkMxOjgyMDpQQVNTOmM5ZjBhMjhiMTIzNDU2Nzg=",
    # Public Cloudflare Identifiers (Account ID / Zone ID are public configs)
    "2373013c66331e9660e47ffa3ae40f5c",
    "88cc5dc8eab5efea2474f17092ea67d7",
    # Public Firebase Client Config (non-secret web app client ID)
    "AIzaSyAt5MnWAXJcL84vG6gxRoIksJL2bcfr4y8",
    # Test suite mock tokens
    "123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ",
    "987654321:ABC_DefGhIklmnOpqrstuvwxyz123",
    "00000000000000000000000000000000",
    "0000000000:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "123456789:ABCdefGHIjklMNOpqrsTUVwxyz123456789",
    "AKIAIOSFODNN7EXAMPLE",
    "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "cfat_example_token_placeholder_0000000000",
    "YOUR_API_KEY",
    "your-api-key",
    "your_token_here",
    "YOUR_BOT_TOKEN",
    "test_token",
}

# ---------------------------------------------------------------------------
# Secret Regex Patterns
# ---------------------------------------------------------------------------

PATTERNS: Dict[str, re.Pattern] = {
    "cloudflare_token": re.compile(r"\bcfat_[a-zA-Z0-9_-]{20,}\b"),
    "aws_access_key": re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    "private_key": re.compile(r"-----BEGIN (?:[A-Z0-9_-]+ )?PRIVATE KEY-----|BEGIN .* PRIVATE KEY"),
    "telegram_bot_token": re.compile(r"\b\d{9,10}:[a-zA-Z0-9_-]{35}\b"),
    # R2 / AWS Access Key or Secret Key assignments (hex 32 or 64)
    "r2_access_or_secret_key": re.compile(
        r"(?:r2[_-]?|aws[_-]?|access[_-]?|secret[_-]?)(?:key|token|id)\s*[:=]\s*['\"]([a-f0-9]{32,64})['\"]",
        re.IGNORECASE,
    ),
    # High-entropy credential assignments: e.g. apiKey = "..."
    "credential_assignment": re.compile(
        r"(?:api[_-]?key|secret|token|auth[_-]?token|password)\s*[:=]\s*['\"]([^'\"\s]{20,})['\"]",
        re.IGNORECASE,
    ),
}


def calculate_shannon_entropy(data: str) -> float:
    """Calculates Shannon entropy for string randomness detection."""
    if not data:
        return 0.0
    cnt = Counter(data)
    total = len(data)
    return -sum((c / total) * math.log2(c / total) for c in cnt.values())


def is_allowlisted(token: str) -> bool:
    """Checks whether token matches any allowlisted credential or pattern."""
    token_strip = token.strip().strip("'\"")
    if token_strip in ALLOWLIST_LITERALS:
        return True
    for safe in ALLOWLIST_LITERALS:
        if safe in token_strip:
            return True
    # Placeholders with <...> or uppercase templates or test/mock prefixes
    if (
        re.match(r"^<[A-Z0-9_]+>$", token_strip)
        or token_strip.startswith(("YOUR_", "mock_", "test_", "example_"))
        or token_strip.endswith(("_test", "_example", "_mock"))
    ):
        return True
    return False


def is_false_positive(match_str: str, line: str, file_path: str) -> bool:
    """Filters out false positives such as URLs, imports, comments, SRI hashes."""
    # SRI hashes like sha384- or sha256-
    if "sha256-" in line or "sha384-" in line or "sha512-" in line:
        return True
    # Git commit references or file hashes in release manifests
    if "latest.yml" in file_path or "release.config.json" in file_path:
        if re.search(r'"(?:sha512|sha256|hash)"', line):
            return True
    # CSS color / class definitions or SVG paths
    if line.strip().startswith("M") and len(match_str) > 50 and " " in match_str:
        return True
    return False


def get_repository_files(root: Path) -> List[Path]:
    """
    Discovers all non-gitignored repository files.
    Prefers `git ls-files` with standard exclusions, falling back to directory walking.
    """
    candidates: List[Path] = []
    try:
        raw = subprocess.check_output(
            ["git", "ls-files", "-c", "-o", "--exclude-standard"],
            cwd=str(root),
            stderr=subprocess.DEVNULL,
        ).decode("utf-8", errors="replace")
        for line in raw.splitlines():
            rel = line.strip()
            if not rel:
                continue
            path = root / rel
            if path.is_file():
                candidates.append(path)
    except Exception:
        # Fallback directory walk
        for dirpath, dirnames, filenames in os.walk(root):
            # Prune excluded directories
            rel_dir = os.path.relpath(dirpath, root).replace("\\", "/")
            if any(rel_dir == ex or rel_dir.startswith(ex + "/") for ex in EXCLUDE_DIRS):
                dirnames.clear()
                continue
            for f in filenames:
                path = Path(dirpath) / f
                candidates.append(path)

    # Filter out excluded extensions and explicit ignore directories
    filtered: List[Path] = []
    for p in candidates:
        rel = p.relative_to(root).as_posix()
        # Never scan git directory or ignored artifacts
        if any(rel == ex or rel.startswith(ex + "/") for ex in EXCLUDE_DIRS):
            continue
        # Skip .env and .env.* (never scan local secret files), allow .env.example
        if p.name.startswith(".env") and p.name != ".env.example":
            continue
        if p.suffix.lower() in EXCLUDE_EXTS:
            continue
        filtered.append(p)

    return filtered


def scan_file(file_path: Path, root: Path) -> Tuple[List[dict], List[dict]]:
    """
    Scans a single file for secret patterns and high entropy strings.
    Returns (findings, warnings).
    """
    rel = file_path.relative_to(root).as_posix()
    if rel in ("tools/security_scan.py", "security_scan.py") or file_path.name == "security_scan.py":
        return [], []
    is_warn_only = any(rel == w or rel.endswith("/" + w) for w in WARN_ONLY_FILES)

    try:
        content = file_path.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        return [], [{"file": rel, "line": 0, "type": "read_error", "match": str(e)}]

    findings: List[dict] = []
    warnings: List[dict] = []

    lines = content.splitlines()
    for line_no, line in enumerate(lines, start=1):
        line_strip = line.strip()
        if not line_strip or line_strip.startswith(("#", "//", "/*", "*")):
            # Fast check: skip pure comments unless private key or token pattern
            if "PRIVATE KEY" not in line and "cfat_" not in line:
                continue

        # 1. Check regex rules
        for rule_name, pattern in PATTERNS.items():
            for match in pattern.finditer(line):
                matched_token = match.group(1) if match.groups() else match.group(0)
                matched_token_clean = matched_token.strip().strip("'\"")

                if is_allowlisted(matched_token_clean):
                    continue
                if is_false_positive(matched_token_clean, line, rel):
                    continue

                # For credential_assignment, evaluate entropy
                if rule_name == "credential_assignment":
                    ent = calculate_shannon_entropy(matched_token_clean)
                    # Check if token is hex (entropy >= 3.6) or base64 (entropy >= 4.3)
                    is_hex = bool(re.match(r"^[a-fA-F0-9]+$", matched_token_clean))
                    threshold = 3.6 if is_hex else 4.3
                    if ent < threshold:
                        continue

                item = {
                    "file": rel,
                    "line": line_no,
                    "rule": rule_name,
                    "snippet": matched_token_clean[:12] + "..." if len(matched_token_clean) > 16 else matched_token_clean,
                }
                if is_warn_only:
                    warnings.append(item)
                else:
                    findings.append(item)

    return findings, warnings


def run_scan(root: Optional[Path] = None) -> Tuple[int, List[dict], List[dict]]:
    """Runs repository-wide security scan."""
    if root is None:
        root = ROOT

    files = get_repository_files(root)
    all_findings: List[dict] = []
    all_warnings: List[dict] = []

    for f in files:
        f_findings, f_warnings = scan_file(f, root)
        all_findings.extend(f_findings)
        all_warnings.extend(f_warnings)

    exit_code = 1 if all_findings else 0
    return exit_code, all_findings, all_warnings


def self_test() -> bool:
    """Internal regression suite verifying scanner detection capability and allowlisting."""
    print("[security_scan] Running internal scanner verification test suite...")

    # Test 1: Cloudflare API Token detection
    cf_token = "cfat_" + "A" * 40
    m = PATTERNS["cloudflare_token"].search(f"export CF_TOKEN='{cf_token}'")
    assert m and m.group(0) == cf_token, "Failed to match Cloudflare API token"

    # Test 2: AWS Key detection
    aws_key = "AKIA" + "1234567890ABCDEF"
    m = PATTERNS["aws_access_key"].search(f"AWS_KEY = '{aws_key}'")
    assert m and m.group(0) == aws_key, "Failed to match AWS Access Key ID"

    # Test 3: Private key detection
    priv_key = "-----BEGIN OPENSSH PRIVATE KEY-----\ntest\n-----END OPENSSH PRIVATE KEY-----"
    m = PATTERNS["private_key"].search(priv_key)
    assert m, "Failed to match Private Key header"

    # Test 4: Telegram bot token detection
    tg_token = "123456789:ABCdefGHIjklMNOpqrsTUVwxyz123456789"
    m = PATTERNS["telegram_bot_token"].search(f"bot = Telegram('{tg_token}')")
    assert m and m.group(0) == tg_token, "Failed to match Telegram bot token"

    # Test 5: Allowlist filtration
    assert is_allowlisted("Cisco123!"), "Allowlist failed for Cisco123!"
    assert is_allowlisted("Cisco456!"), "Allowlist failed for Cisco456!"
    assert is_allowlisted("EQBvW8Z5huBkMJYdn3GuLD5Co_V7bB0N12_RegistryMockTON"), "Allowlist failed for Mock TON address"
    assert is_allowlisted("2373013c66331e9660e47ffa3ae40f5c"), "Allowlist failed for public CF Account ID"

    # Test 6: High entropy assignment detection
    high_entropy_hex = "f65247158bc7d74b2c4b02ace515a0d8"
    assert calculate_shannon_entropy(high_entropy_hex) > 3.6, "Hex entropy calculation issue"

    print("[security_scan] [OK] All internal scanner verification tests passed.")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Enterprise Secret Detection Scanner")
    parser.add_argument("--path", default=str(ROOT), help="Root directory to scan")
    parser.add_argument("--json", action="store_true", help="Output findings as JSON")
    parser.add_argument("--self-test", action="store_true", help="Run scanner unit self-test")
    args = parser.parse_args()

    if args.self_test:
        return 0 if self_test() else 1

    root = Path(args.path).resolve()
    print(f"[security_scan] Scanning repository at: {root}")
    exit_code, findings, warnings = run_scan(root)

    if args.json:
        output = {
            "status": "clean" if exit_code == 0 else "leaks_detected",
            "findings_count": len(findings),
            "warnings_count": len(warnings),
            "findings": findings,
            "warnings": warnings,
        }
        print(json.dumps(output, indent=2))
        return exit_code

    if warnings:
        print(f"\n[security_scan] WARNINGS ({len(warnings)} non-blocking finding(s)):")
        for w in warnings:
            print(f"  [WARN] {w['file']}:{w['line']} ({w['rule']}): {w['snippet']}")

    if findings:
        print(f"\n[security_scan] FAIL: {len(findings)} potential secret leak(s) detected:")
        for f in findings:
            print(f"  [LEAK] {f['file']}:{f['line']} ({f['rule']}): {f['snippet']}")
        print("\nReview and redact all sensitive credentials before committing or deploying.", file=sys.stderr)
    else:
        print("\n[security_scan] PASS: Repository clean. Zero secret leaks detected.")

    return exit_code


if __name__ == "__main__":
    sys.exit(main())
