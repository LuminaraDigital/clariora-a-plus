#!/usr/bin/env python3
"""build_linux_app.py - Build the Linux desktop packages (AppImage and .deb).

Runs from the repository root on a Linux machine or a Linux CI runner. It does
not need the Windows packaging folder: the tracked electron-builder.linux.json
lists the files, and the root package.json carries the version.

  python3 tools/build_linux_app.py            # AppImage + deb, x64
  python3 tools/build_linux_app.py --dir      # unpacked folder only (fast smoke build)

Steps:
  1. Confirm release.config.json and package.json agree on the version.
  2. Emit the curriculum placeholder when curriculum_data.js is absent, so a
     clean clone builds (the real catalogue comes from local course media).
  3. Generate build/icon.png from icons/icon-512.png.
  4. Run electron-builder with the Linux config.

Output lands in release/linux/. Linux packages are not signed; AppImage and
.deb are distributed unsigned by convention and the auto-updater is used only
by the AppImage build.
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "electron-builder.linux.json"
RELEASE_CONFIG = ROOT / "release.config.json"
PACKAGE_JSON = ROOT / "package.json"
CURRICULUM = ROOT / "curriculum_data.js"
ICON_SRC = ROOT / "icons" / "icon-512.png"
ICON_DST = ROOT / "build" / "icon.png"
OUT_DIR = ROOT / "release" / "linux"

CURRICULUM_STUB = (
    'window.COMPTIA_CURRICULUM = {"version": "0", '
    '"title": "Datacentre Academy A+ Curriculum", '
    '"description": "Curriculum catalogue not built. Run python tools/build_curriculum.py.", '
    '"stats": {"labs": 0, "slides": 0, "videos": 0, "total": 0, "video_size_mb": 0}, '
    '"labs": [], "slides": [], "videos": []};\n'
)


def check_versions() -> str:
    release = json.loads(RELEASE_CONFIG.read_text(encoding="utf-8"))["version"]
    package = json.loads(PACKAGE_JSON.read_text(encoding="utf-8"))["version"]
    if release != package:
        print(f"ERROR: release.config.json says {release} but package.json says {package}.")
        print("Set the version in release.config.json and package.json before building.")
        sys.exit(1)
    return release


def ensure_curriculum_placeholder() -> None:
    if CURRICULUM.is_file():
        return
    CURRICULUM.write_text(CURRICULUM_STUB, encoding="utf-8")
    print("NOTE: curriculum_data.js not present; emitted an empty catalogue placeholder.")


def ensure_icon() -> None:
    if not ICON_SRC.is_file():
        print(f"ERROR: icon source missing: {ICON_SRC}")
        sys.exit(1)
    ICON_DST.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ICON_SRC, ICON_DST)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dir", action="store_true", help="build the unpacked folder only")
    args = ap.parse_args()

    if sys.platform.startswith("win"):
        print("Linux packages are built on Linux (or in CI). Run this on a Linux machine.")
        return 1

    version = check_versions()
    ensure_curriculum_placeholder()
    ensure_icon()

    if not (ROOT / "node_modules" / "electron-builder").is_dir():
        print("Installing npm dependencies (electron + electron-builder)...")
        r = subprocess.run(["npm", "install", "--no-audit", "--no-fund"], cwd=str(ROOT), check=False)
        if r.returncode != 0:
            print("ERROR: npm install failed")
            return r.returncode

    cmd = ["npx", "electron-builder", "--linux", "--x64", "--publish", "never", "--config", str(CONFIG)]
    if args.dir:
        cmd.append("--dir")
    env = os.environ.copy()
    env.setdefault("CSC_IDENTITY_AUTO_DISCOVERY", "false")
    print(f"Building Clariora {version} for Linux ...")
    r = subprocess.run(cmd, cwd=str(ROOT), env=env, check=False)
    if r.returncode != 0:
        print("ERROR: electron-builder failed")
        return r.returncode

    produced = sorted(p for p in OUT_DIR.glob("CompTIA_A_Plus_Linux_*") if p.is_file())
    if not produced and not args.dir:
        print(f"ERROR: no Linux packages found under {OUT_DIR}")
        return 1
    for p in produced:
        print(f"  {p.name}  {p.stat().st_size / (1024 * 1024):.1f} MB")
    unpacked = OUT_DIR / "linux-unpacked" / "comptia-a-plus-master"
    if unpacked.is_file():
        print(f"  unpacked binary: {unpacked}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
