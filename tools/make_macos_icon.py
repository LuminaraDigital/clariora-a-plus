"""Build macOS icon.icns (and supporting PNGs) from the Clariora art.

On macOS this produces a real .icns via `iconutil`.
On Windows/Linux it writes the iconset PNG ladder plus a 1024 master PNG so a
Mac builder can finish the .icns in one step.
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "CompTIA_A_Plus_Desktop_App" / "resources" / "app"
BUILD = APP / "build"
ASSETS = Path.home() / ".cursor" / "projects" / "c-Users-lumin-Desktop-Datacentre-Academy-CompTia-A" / "assets"

CANDIDATES = [
    ASSETS / "comptia-aplus-icon-3d.png",
    ROOT / "assets" / "comptia-aplus-icon-3d.png",
    APP / "icon-source-3d.png",
    APP / "icon.png",
    ROOT / "icon.png",
]

# Apple iconset sizes: base and @2x
ICNS_SIZES = [
    (16, "icon_16x16.png"),
    (32, "diana.k@example.org"),
    (32, "icon_32x32.png"),
    (64, "ivan.p@example.net"),
    (128, "icon_128x128.png"),
    (256, "wendy.h@example.net"),
    (256, "icon_256x256.png"),
    (512, "wendy.h@example.net"),
    (512, "icon_512x512.png"),
    (1024, "walt.e@example.net"),
]


def find_source() -> Path:
    for path in CANDIDATES:
        if path.is_file() and path.stat().st_size > 2000:
            return path
    raise FileNotFoundError("No icon source found. Place comptia-aplus-icon-3d.png under assets/.")


def to_master(src: Path, size: int = 1024) -> Image.Image:
    img = Image.open(src).convert("RGBA")
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    img.thumbnail((size, size), Image.Resampling.LANCZOS)
    ox = (size - img.width) // 2
    oy = (size - img.height) // 2
    canvas.paste(img, (ox, oy), img)
    return canvas


def write_iconset(master: Image.Image, iconset: Path) -> None:
    if iconset.exists():
        shutil.rmtree(iconset)
    iconset.mkdir(parents=True, exist_ok=True)
    for size, name in ICNS_SIZES:
        frame = master.resize((size, size), Image.Resampling.LANCZOS)
        frame.save(iconset / name, format="PNG", optimize=True)


def main() -> int:
    BUILD.mkdir(parents=True, exist_ok=True)
    src = find_source()
    master = to_master(src, 1024)

    png_out = BUILD / "icon.png"
    master.save(png_out, format="PNG", optimize=True)
    master.save(APP / "icon.png", format="PNG", optimize=True)
    shutil.copy2(png_out, ROOT / "icon.png")

    iconset = BUILD / "icon.iconset"
    write_iconset(master, iconset)

    icns_out = BUILD / "icon.icns"
    if sys.platform == "darwin":
        r = subprocess.run(
            ["iconutil", "-c", "icns", str(iconset), "-o", str(icns_out)],
            check=False,
            capture_output=True,
            text=True,
        )
        if r.returncode != 0 or not icns_out.is_file():
            print("ERROR: iconutil failed:", r.stderr or r.stdout)
            return r.returncode or 1
        print(f"icns={icns_out} bytes={icns_out.stat().st_size}")
    else:
        # electron-builder on macOS can also consume a high-res PNG if .icns is missing.
        # Keep the iconset around so a Mac build can run iconutil without regenerating art.
        print("icns=deferred (run this script on macOS to produce build/icon.icns)")
        print(f"iconset={iconset}")

    print(f"source={src}")
    print(f"png={png_out} bytes={png_out.stat().st_size}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
