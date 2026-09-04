"""
create_desktop_dist.py

Deprecated portable Electron-zip packaging. The supported Windows ship path is:

  python tools/build_windows_installer.py [--portable]

That produces a signed NSIS installer at ROOT/release/CompTIA_A_Plus_Setup_<version>.exe
and optionally ROOT/release/portable/ from electron-builder win-unpacked.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    print("create_desktop_dist.py is deprecated.")
    print("Forwarding to tools/build_windows_installer.py --portable")
    script = ROOT / "tools" / "build_windows_installer.py"
    return subprocess.call([sys.executable, str(script), "--portable", *sys.argv[1:]])


if __name__ == "__main__":
    raise SystemExit(main())
