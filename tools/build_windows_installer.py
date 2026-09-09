"""
Build a Windows NSIS installer students can download.

Canonical output (share this only):
  ROOT/release/Clariora_Setup_<version>.exe

Also produces (then pruned from APP_DIR):
  APP_DIR/release/... during the electron-builder run

Usage:
  python tools/build_windows_installer.py
  python tools/build_windows_installer.py --skip-install
  python tools/build_windows_installer.py --unsigned
  python tools/build_windows_installer.py --portable
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
APP_DIR = ROOT / "CompTIA_A_Plus_Desktop_App" / "resources" / "app"
OUT_DIR = ROOT / "release"
CERT_DIR = ROOT / "build" / "certs"
PFX_PATH = CERT_DIR / "datacentre-academy-codesign.pfx"
# Set CSC_KEY_PASSWORD in the environment (see docs/WINDOWS_RELEASE.md). Never commit it.
PFX_PASSWORD = os.environ.get("CSC_KEY_PASSWORD", "")

# release.config.json at the repository root is the single source of release truth.
RELEASE_CONFIG = ROOT / "release.config.json"

# Size discipline. Course video packs are downloaded at runtime, never installed.
MAX_ASAR_INPUT_BYTES = 400 * 1024 * 1024
MAX_FOLDER_BYTES = 100 * 1024 * 1024

# Folders and file kinds that electron-builder never packages, mirrored here so the
# pre-build size estimate matches what actually lands in the asar.
SIZE_SKIP_DIRS = {
    "node_modules",
    "release",
    "dist",
    "__pycache__",
    ".git",
    "tools",
    "_bank",
    "_backup",
    "Videos For A+",
}
SIZE_SKIP_RELATIVE_DIRS = {
    Path("media/videos"),
    Path("media/slides"),
}
SIZE_SKIP_SUFFIXES = {".pdf", ".mp4", ".mkv", ".mov"}


# Root is the single source of truth. These are copied into APP_DIR before every build.
CANONICAL_FILES = [
    "index.html",
    "main.js",
    "preload.js",
    "release.config.json",
    "manifest.webmanifest",
    "manifest.json",
    "sw.js",
    "favicon.ico",
    "favicon.png",
    "icon.png",
    "exam_a11y.js",
    "exam_data.js",
    "exam_data.json",
    "learner_state.js",
    "ledger_engine.js",
    "ledger_ui.js",
    "memory_mode_ui.js",
    "memory_srs.js",
    "objectives_data.js",
    "objectives_data.json",
    "objectives_tracker.js",
    "product_trust_ui.js",
    "profiles.js",
    "readiness.js",
    "study_library.js",
    "study_library.json",
    "study_plan.js",
    "tutor_mode.js",
    "professor_messer_220_1201_videos.json",
    "professor_messer_220_1202_videos.json",
    "curated_core2_expansion.json",
    "PROFESSOR_MESSER_220_1201_INDEX.md",
    "PROFESSOR_MESSER_220_1202_INDEX.md",
    "README_EXAM_SUITE.md",
]

CANONICAL_DIRS = [
    "js",
    "css",
    "fonts",
    "notes",
    "CompTIA_A_Plus_Mastery",
    "CompTIA-A-Plus-Practice-Questions",
]

# Never copied into the packaged app.
SKIP_NAMES = {"groq-secrets.local.js", "groq_secrets.local.json"}


def _ignore_unpackagable(_dir: str, names: list[str]) -> set[str]:
    skip = {n for n in names if n in SKIP_NAMES}
    skip |= {n for n in names if n.lower().endswith(".pdf")}
    skip |= {n for n in names if n in {"node_modules", "__pycache__", ".git"}}
    return skip


def sync_canonical_sources() -> None:
    """Copy the canonical root assets into APP_DIR so root stays the single source of truth."""
    print("Syncing canonical root sources into APP_DIR ...")
    copied = 0

    index_src = ROOT / "index.html"
    if index_src.is_file():
        # The Electron window loads A_Plus_Exam_Simulator.html; keep index.html too for the
        # browser fallback and the Cloudflare Pages build.
        shutil.copy2(index_src, APP_DIR / "index.html")
        shutil.copy2(index_src, APP_DIR / "A_Plus_Exam_Simulator.html")
        copied += 2

    for name in CANONICAL_FILES:
        if name == "index.html":
            continue
        src = ROOT / name
        if not src.is_file():
            continue
        shutil.copy2(src, APP_DIR / name)
        copied += 1

    for name in CANONICAL_DIRS:
        src = ROOT / name
        if not src.is_dir():
            continue
        shutil.copytree(src, APP_DIR / name, dirs_exist_ok=True, ignore=_ignore_unpackagable)
        copied += 1

    print(f"Synced {copied} canonical item(s) from {ROOT} into {APP_DIR}")


def load_release_config() -> dict:
    """release.config.json is the only place the version and the URLs are set."""
    if not RELEASE_CONFIG.is_file():
        raise RuntimeError(f"missing {RELEASE_CONFIG}")
    cfg = json.loads(RELEASE_CONFIG.read_text(encoding="utf-8"))
    for key in ("version", "productName", "publisher", "updateBaseUrl", "mediaBaseUrl", "mediaPackName"):
        if not cfg.get(key):
            raise RuntimeError(f"release.config.json is missing '{key}'")
    url = str(cfg["updateBaseUrl"])
    if not url.startswith("https://") or not url.endswith("/"):
        raise RuntimeError("updateBaseUrl must be an https URL ending in '/'")
    media = str(cfg["mediaBaseUrl"])
    if not media.startswith("https://") or not media.endswith("/"):
        raise RuntimeError("mediaBaseUrl must be an https URL ending in '/'")
    return cfg


def _write_json_preserving_style(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def apply_release_config(cfg: dict) -> None:
    """Stamp the version into both package.json files and the publish URL into the app one."""
    version = str(cfg["version"])
    root_pkg_path = ROOT / "package.json"
    app_pkg_path = APP_DIR / "package.json"

    root_pkg = json.loads(root_pkg_path.read_text(encoding="utf-8"))
    if root_pkg.get("version") != version:
        root_pkg["version"] = version
        _write_json_preserving_style(root_pkg_path, root_pkg)
        print(f"Root package.json version -> {version}")

    app_pkg = json.loads(app_pkg_path.read_text(encoding="utf-8"))
    changed = False
    if app_pkg.get("version") != version:
        app_pkg["version"] = version
        changed = True
    build = app_pkg.setdefault("build", {})
    publish = build.setdefault("publish", [{"provider": "generic", "url": ""}])
    if not isinstance(publish, list) or not publish:
        publish = [{"provider": "generic", "url": ""}]
        build["publish"] = publish
    if publish[0].get("url") != cfg["updateBaseUrl"]:
        publish[0]["provider"] = "generic"
        publish[0]["url"] = cfg["updateBaseUrl"]
        changed = True
    if changed:
        _write_json_preserving_style(app_pkg_path, app_pkg)
        print(f"App package.json version -> {version}, publish url -> {cfg['updateBaseUrl']}")


def _measure_tree(base: Path) -> tuple[int, dict[str, int]]:
    """Bytes that would feed the asar, plus a per-top-level-folder breakdown."""
    total = 0
    by_folder: dict[str, int] = {}
    for dirpath, dirnames, filenames in os.walk(base):
        here = Path(dirpath)
        rel_dir = here.relative_to(base)
        dirnames[:] = [
            d for d in dirnames
            if d not in SIZE_SKIP_DIRS and (rel_dir / d) not in SIZE_SKIP_RELATIVE_DIRS
        ]
        top = rel_dir.parts[0] if rel_dir.parts else "(root files)"
        for name in filenames:
            if Path(name).suffix.lower() in SIZE_SKIP_SUFFIXES:
                continue
            try:
                size = (here / name).stat().st_size
            except OSError:
                continue
            total += size
            by_folder[top] = by_folder.get(top, 0) + size
    return total, by_folder


def check_package_size() -> int:
    """Refuse to build when the asar input is too big, and name the offending folders."""
    total, by_folder = _measure_tree(APP_DIR)

    # Production dependencies are packaged; electron and electron-builder are not.
    app_pkg = json.loads((APP_DIR / "package.json").read_text(encoding="utf-8"))
    for dep in sorted(app_pkg.get("dependencies", {})):
        dep_dir = APP_DIR / "node_modules" / dep
        if not dep_dir.is_dir():
            continue
        dep_bytes, _ = _measure_tree(dep_dir)
        total += dep_bytes
        by_folder[f"node_modules/{dep}"] = dep_bytes

    mb = 1024 * 1024
    print("Packaged input size estimate:")
    for folder, size in sorted(by_folder.items(), key=lambda kv: kv[1], reverse=True)[:12]:
        print(f"  {size / mb:8.1f} MB  {folder}")
    print(f"  {total / mb:8.1f} MB  TOTAL (limit {MAX_ASAR_INPUT_BYTES / mb:.0f} MB)")

    offenders = [(f, s) for f, s in by_folder.items() if s > MAX_FOLDER_BYTES]
    if offenders:
        print("ERROR: these folders exceed the 100 MB per-folder limit:")
        for folder, size in sorted(offenders, key=lambda kv: kv[1], reverse=True):
            print(f"  {size / mb:8.1f} MB  {folder}")
        print("Move that content into the downloadable media pack (tools/build_media_pack.py).")
        return 1

    if total > MAX_ASAR_INPUT_BYTES:
        print(f"ERROR: asar input is {total / mb:.1f} MB, over the {MAX_ASAR_INPUT_BYTES / mb:.0f} MB limit.")
        print("Largest folders are listed above. Exclude them in package.json build.files.")
        return 1
    return 0


def ensure_local_codesign_pfx() -> Path:
    """Create a local Code Signing PFX if none exists (for Authenticode Status=Valid).

    Note: self-signed certs do not clear public SmartScreen reputation. For public
    distribution, replace with a commercial OV/EV cert via WIN_CSC_LINK.
    """
    CERT_DIR.mkdir(parents=True, exist_ok=True)
    if PFX_PATH.is_file():
        return PFX_PATH
    if not PFX_PASSWORD:
        raise SystemExit(
            "CSC_KEY_PASSWORD is not set. Export it before packaging so the local "
            "code-signing PFX can be created and used. See docs/WINDOWS_RELEASE.md."
        )

    ps = f"""
$ErrorActionPreference = 'Stop'
$cert = New-SelfSignedCertificate `
  -Type CodeSigningCert `
  -Subject 'CN=Datacentre Academy, O=Datacentre Academy, C=AU' `
  -KeyExportPolicy Exportable `
  -KeySpec Signature `
  -KeyLength 2048 `
  -HashAlgorithm SHA256 `
  -NotAfter (Get-Date).AddYears(3) `
  -CertStoreLocation 'Cert:\\CurrentUser\\My'
$pwd = ConvertTo-SecureString -String '{PFX_PASSWORD}' -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath '{PFX_PATH}' -Password $pwd | Out-Null
Write-Output $cert.Thumbprint
"""
    r = subprocess.run(
        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps],
        check=False,
        capture_output=True,
        text=True,
    )
    if r.returncode != 0 or not PFX_PATH.is_file():
        raise RuntimeError(f"Failed to create code signing PFX: {r.stderr or r.stdout}")
    print(f"Created local code signing PFX: {PFX_PATH}")
    print(f"Thumbprint: {(r.stdout or '').strip()}")
    return PFX_PATH


def main() -> int:
    parser = argparse.ArgumentParser(description="Build Windows NSIS installer via electron-builder")
    parser.add_argument(
        "--skip-install",
        action="store_true",
        help="Skip npm install (use existing node_modules)",
    )
    parser.add_argument(
        "--unsigned",
        action="store_true",
        help="Skip Authenticode signing (not recommended)",
    )
    parser.add_argument(
        "--portable",
        action="store_true",
        help="Also copy win-unpacked to ROOT/release/portable",
    )
    args = parser.parse_args()

    if not APP_DIR.is_dir():
        print(f"ERROR: app dir missing: {APP_DIR}")
        return 1

    pkg = APP_DIR / "package.json"
    if not pkg.is_file():
        print(f"ERROR: package.json missing: {pkg}")
        return 1

    try:
        cfg = load_release_config()
    except Exception as exc:
        print(f"ERROR: {exc}")
        print("Fix release.config.json at the repository root. It is the only place")
        print("the version and the update/media URLs are set.")
        return 1
    print(f"Release config: v{cfg['version']} -> {cfg['updateBaseUrl']}")
    apply_release_config(cfg)

    sync_canonical_sources()

    rc = check_package_size()
    if rc != 0:
        return rc

    # Preflight: never ship live Groq secrets
    secret = APP_DIR / "js" / "groq-secrets.local.js"
    if secret.is_file():
        print(f"ERROR: refuse to package secrets file: {secret}")
        print("Delete it (keep .example) and rotate the Groq key if it was shared.")
        return 1

    icon = APP_DIR / "build" / "icon.ico"
    if not icon.is_file():
        print("Generating Windows icon...")
        r = subprocess.run([sys.executable, str(ROOT / "tools" / "make_windows_icon.py")], check=False)
        if r.returncode != 0:
            print("ERROR: icon generation failed")
            return r.returncode

    npm = "npm.cmd" if sys.platform.startswith("win") else "npm"
    env = os.environ.copy()

    if args.unsigned:
        env["CSC_IDENTITY_AUTO_DISCOVERY"] = "false"
        print("Signing: DISABLED (--unsigned)")
    elif env.get("WIN_CSC_LINK") or env.get("CSC_LINK"):
        env.pop("CSC_IDENTITY_AUTO_DISCOVERY", None)
        print("Signing: using WIN_CSC_LINK / CSC_LINK from environment")
    else:
        try:
            pfx = ensure_local_codesign_pfx()
        except Exception as exc:
            print(f"ERROR: could not prepare signing cert: {exc}")
            return 1
        env["CSC_LINK"] = str(pfx)
        env["CSC_KEY_PASSWORD"] = PFX_PASSWORD
        env.pop("CSC_IDENTITY_AUTO_DISCOVERY", None)
        print(f"Signing: local PFX {pfx}")

    if not args.skip_install:
        print("Installing npm dependencies (electron + electron-builder)...")
        r = subprocess.run([npm, "install"], cwd=str(APP_DIR), env=env, check=False)
        if r.returncode != 0:
            print("ERROR: npm install failed")
            return r.returncode

    release_dir = APP_DIR / "release"
    if release_dir.exists():
        print("Cleaning previous APP_DIR/release/ ...")
        shutil.rmtree(release_dir, ignore_errors=True)

    print("Building Windows NSIS installer...")
    r = subprocess.run([npm, "run", "dist:win"], cwd=str(APP_DIR), env=env, check=False)
    if r.returncode != 0:
        print("ERROR: electron-builder failed")
        return r.returncode

    setups = sorted(release_dir.glob("Clariora_Setup_*.exe")) if release_dir.is_dir() else []
    if not setups:
        print(f"ERROR: no installer found under {release_dir}")
        return 1

    latest = setups[-1]
    size_mb = latest.stat().st_size / (1024 * 1024)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Canonical share location
    for old in OUT_DIR.glob("Clariora_Setup_*.exe"):
        if old.name != latest.name:
            try:
                old.unlink()
            except OSError:
                pass
    shared = OUT_DIR / latest.name
    shutil.copy2(latest, shared)

    # Auto-update metadata for the generic provider (upload alongside the installer).
    for meta in ("latest.yml", "latest.yaml"):
        src_meta = release_dir / meta
        if src_meta.is_file():
            shutil.copy2(src_meta, OUT_DIR / meta)
            print(f"Update metadata: {OUT_DIR / meta}")

    # Single-file portable exe produced by the "portable" target.
    for portable_exe in release_dir.glob("Clariora_Portable_*.exe"):
        shutil.copy2(portable_exe, OUT_DIR / portable_exe.name)
        print(f"Portable exe: {OUT_DIR / portable_exe.name}")

    if args.portable:
        unpacked = release_dir / "win-unpacked"
        portable = OUT_DIR / "portable"
        if portable.exists():
            shutil.rmtree(portable, ignore_errors=True)
        if unpacked.is_dir():
            shutil.copytree(unpacked, portable)
            print(f"Portable copy: {portable}")

    # Prune builder nest from APP_DIR so resources/app stays editable source, not a dist dump
    # Keep win-unpacked only under ROOT/release if requested; always remove APP_DIR/release after copy
    try:
        shutil.rmtree(release_dir, ignore_errors=True)
        print("Pruned APP_DIR/release/ (canonical artifacts live under ROOT/release/)")
    except OSError as exc:
        print(f"WARN: could not prune APP_DIR/release: {exc}")

    # Remove obsolete morning zip if present (replaced by NSIS)
    old_zip = ROOT / "CompTIA_A_Plus_Desktop_App_Windows_x64.zip"
    if old_zip.is_file():
        try:
            old_zip.unlink()
            print(f"Removed obsolete zip: {old_zip.name}")
        except OSError as exc:
            print(f"WARN: could not remove obsolete zip: {exc}")

    print("OK")
    print(f"Installer: {shared}")
    print(f"Size: {size_mb:.1f} MB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
