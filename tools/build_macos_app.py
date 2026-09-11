"""
Build a macOS desktop app (.app inside .dmg / .zip) via electron-builder.

Must run on macOS. Windows and Linux hosts cannot produce a signed Mac app.

Canonical output:
  ROOT/release/CompTIA_A_Plus_Mac_<version>_<arch>.dmg
  ROOT/release/CompTIA_A_Plus_Mac_<version>_<arch>.zip

Usage:
  python3 tools/build_macos_app.py
  python3 tools/build_macos_app.py --skip-install
  python3 tools/build_macos_app.py --unsigned
  python3 tools/build_macos_app.py --arm64-only
  python3 tools/build_macos_app.py --x64-only
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

from build_windows_installer import APP_DIR, OUT_DIR, ROOT, sync_canonical_sources  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Build macOS .dmg/.zip via electron-builder")
    parser.add_argument("--skip-install", action="store_true", help="Skip npm install")
    parser.add_argument(
        "--unsigned",
        action="store_true",
        help="Skip Apple code signing / notarization (local testing only)",
    )
    parser.add_argument("--arm64-only", action="store_true", help="Build Apple Silicon only")
    parser.add_argument("--x64-only", action="store_true", help="Build Intel only")
    args = parser.parse_args()

    if sys.platform != "darwin":
        print("ERROR: macOS builds must run on a Mac (darwin).")
        print("This host is:", sys.platform)
        print("Copy the repo to a Mac, then run: python3 tools/build_macos_app.py")
        return 1

    if not APP_DIR.is_dir():
        print(f"ERROR: app dir missing: {APP_DIR}")
        return 1

    pkg = APP_DIR / "package.json"
    if not pkg.is_file():
        print(f"ERROR: package.json missing: {pkg}")
        return 1

    sync_canonical_sources()

    secret = APP_DIR / "js" / "groq-secrets.local.js"
    if secret.is_file():
        print(f"ERROR: refuse to package secrets file: {secret}")
        return 1

    # Ensure entitlements are present in APP_DIR/build/
    app_build_dir = APP_DIR / "build"
    app_build_dir.mkdir(parents=True, exist_ok=True)
    root_build_dir = ROOT / "build"
    for ent_name in ("entitlements.mac.plist", "entitlements.mac.inherit.plist"):
        root_ent = root_build_dir / ent_name
        app_ent = app_build_dir / ent_name
        if root_ent.is_file() and not app_ent.is_file():
            shutil.copy2(root_ent, app_ent)

    print("Generating macOS icons...")
    r = subprocess.run([sys.executable, str(ROOT / "tools" / "make_macos_icon.py")], check=False)
    if r.returncode != 0:
        print("ERROR: macOS icon generation failed")
        return r.returncode

    icns = APP_DIR / "build" / "icon.icns"
    if not icns.is_file():
        print(f"ERROR: expected icon missing: {icns}")
        return 1

    entitlements = APP_DIR / "build" / "entitlements.mac.plist"
    if not entitlements.is_file():
        print(f"ERROR: entitlements missing: {entitlements}")
        return 1

    env = os.environ.copy()
    mac_p12 = ROOT / "build" / "certs" / "clariora_apple_developer_id.p12"
    if args.unsigned:
        env["CSC_IDENTITY_AUTO_DISCOVERY"] = "false"
        print("Signing: DISABLED (--unsigned). Gatekeeper will warn until you sign/notarize.")
    elif env.get("MAC_CSC_LINK") or env.get("CSC_LINK"):
        cert_link = env.get("MAC_CSC_LINK") or env.get("CSC_LINK")
        env["CSC_LINK"] = cert_link
        cert_pw = env.get("MAC_CSC_KEY_PASSWORD") or env.get("CSC_KEY_PASSWORD", "")
        if cert_pw:
            env["CSC_KEY_PASSWORD"] = cert_pw
        env.pop("CSC_IDENTITY_AUTO_DISCOVERY", None)
        print(f"Signing: using Developer ID certificate from {cert_link}")
    elif mac_p12.is_file():
        env["CSC_LINK"] = str(mac_p12)
        env["CSC_KEY_PASSWORD"] = env.get("MAC_CSC_KEY_PASSWORD") or env.get("CSC_KEY_PASSWORD") or "ClarioraCodeSign2026!Enterprise"
        env.pop("CSC_IDENTITY_AUTO_DISCOVERY", None)
        print(f"Signing: using local Developer ID certificate {mac_p12}")
    elif env.get("CSC_NAME"):
        env.pop("CSC_IDENTITY_AUTO_DISCOVERY", None)
        print("Signing: using CSC_NAME from environment keychain")
    else:
        env.pop("CSC_IDENTITY_AUTO_DISCOVERY", None)
        print("Signing: auto-discover Developer ID from keychain (if installed)")

    if not args.skip_install:
        print("Installing npm dependencies (electron + electron-builder)...")
        r = subprocess.run(["npm", "install"], cwd=str(APP_DIR), env=env, check=False)
        if r.returncode != 0:
            print("ERROR: npm install failed")
            return r.returncode

    release_dir = APP_DIR / "release"
    if release_dir.exists():
        print("Cleaning previous APP_DIR/release/ ...")
        shutil.rmtree(release_dir, ignore_errors=True)

    if args.arm64_only and args.x64_only:
        print("ERROR: choose only one of --arm64-only / --x64-only")
        return 1
    if args.arm64_only:
        arch_flags = ["--arm64"]
    elif args.x64_only:
        arch_flags = ["--x64"]
    else:
        arch_flags = ["--x64", "--arm64"]

    cmd = ["npm", "exec", "--", "electron-builder", "--mac", "dmg", "zip", *arch_flags]
    print("Building macOS app:", " ".join(cmd))
    r = subprocess.run(cmd, cwd=str(APP_DIR), env=env, check=False)
    if r.returncode != 0:
        print("ERROR: electron-builder failed")
        return r.returncode

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    copied = 0
    dmg_files: list[Path] = []
    for pattern in ("CompTIA_A_Plus_Mac_*.dmg", "CompTIA_A_Plus_Mac_*.zip"):
        for src in sorted(release_dir.glob(pattern)):
            dest = OUT_DIR / src.name
            shutil.copy2(src, dest)
            copied += 1
            if dest.suffix.lower() == ".dmg":
                dmg_files.append(dest)
            print(f"Copied {src.name} -> {dest}")

    if copied == 0:
        for src in sorted(release_dir.glob("*.dmg")) + sorted(release_dir.glob("*.zip")):
            dest = OUT_DIR / src.name
            shutil.copy2(src, dest)
            copied += 1
            if dest.suffix.lower() == ".dmg":
                dmg_files.append(dest)
            print(f"Copied {src.name} -> {dest}")

    if copied == 0:
        print(f"ERROR: no macOS artifacts found under {release_dir}")
        return 1

    # Apple Gatekeeper Notarization & Stapling
    apple_id = env.get("APPLE_ID")
    apple_pw = env.get("APPLE_APP_SPECIFIC_PASSWORD") or env.get("APPLE_PASSWORD")
    apple_team = env.get("APPLE_TEAM_ID")

    if not args.unsigned and apple_id and apple_pw and apple_team:
        print("\nSubmitting DMG to Apple Notary Service (Gatekeeper Notarization)...")
        for dmg in dmg_files:
            notarize_cmd = [
                "xcrun",
                "notarytool",
                "submit",
                str(dmg),
                "--apple-id",
                apple_id,
                "--password",
                apple_pw,
                "--team-id",
                apple_team,
                "--wait",
            ]
            print(f"Notarizing {dmg.name}...")
            notary_res = subprocess.run(notarize_cmd, check=False)
            if notary_res.returncode == 0:
                print(f"Stapling notarization ticket to {dmg.name}...")
                staple_res = subprocess.run(["xcrun", "stapler", "staple", str(dmg)], check=False)
                if staple_res.returncode == 0:
                    print(f"   [OK] Gatekeeper notarization & staple complete: {dmg.name}")
                else:
                    print(f"WARNING: Stapler returned code {staple_res.returncode}")
            else:
                print(f"WARNING: Apple Notarization returned code {notary_res.returncode}")
    elif not args.unsigned:
        print("\nNote: Apple Notarization credentials (APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD,")
        print("APPLE_TEAM_ID) not fully configured in environment. To notarize for Gatekeeper,")
        print("define them in .env or run: xcrun notarytool submit <file>.dmg ...")

    print(f"\nDone. macOS ship folder: {OUT_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
