"""Build black-and-gold CompTIA A+ Master Windows icons (PNG + multi-size ICO)."""
from __future__ import annotations

import shutil
import struct
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
]

SIZES = [16, 24, 32, 48, 64, 128, 256]


def find_source() -> Path:
    for path in CANDIDATES:
        if path.is_file() and path.stat().st_size > 2000:
            return path
    raise FileNotFoundError("No icon source found. Place comptia-aplus-icon-3d.png under assets/.")


def to_master(src: Path, size: int = 512) -> Image.Image:
    img = Image.open(src).convert("RGBA")
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    img.thumbnail((size, size), Image.Resampling.LANCZOS)
    ox = (size - img.width) // 2
    oy = (size - img.height) // 2
    canvas.paste(img, (ox, oy), img)
    return canvas


def write_ico(path: Path, master: Image.Image, sizes: list[int]) -> None:
    """Write a true multi-resolution ICO (PNG-compressed entries)."""
    entries = []
    blobs = []
    for size in sizes:
        frame = master.resize((size, size), Image.Resampling.LANCZOS)
        from io import BytesIO

        buf = BytesIO()
        frame.save(buf, format="PNG")
        data = buf.getvalue()
        blobs.append(data)
        # width/height: 0 means 256 in ICO header
        w = 0 if size >= 256 else size
        h = 0 if size >= 256 else size
        entries.append((w, h, len(data)))

    # ICONDIR + ICONDIRENTRY headers, then image blobs
    offset = 6 + (16 * len(entries))
    parts = [struct.pack("<HHH", 0, 1, len(entries))]
    for (w, h, nbytes) in entries:
        parts.append(struct.pack("<BBBBHHII", w, h, 0, 0, 1, 32, nbytes, offset))
        offset += nbytes
    for blob in blobs:
        parts.append(blob)
    path.write_bytes(b"".join(parts))


def main() -> int:
    BUILD.mkdir(parents=True, exist_ok=True)
    src = find_source()
    master = to_master(src, 512)

    png_512 = APP / "icon.png"
    master.save(png_512, format="PNG", optimize=True)

    build_png = BUILD / "icon.png"
    master.resize((256, 256), Image.Resampling.LANCZOS).save(build_png, format="PNG", optimize=True)

    ico_out = BUILD / "icon.ico"
    favicon_ico = APP / "favicon.ico"
    write_ico(ico_out, master, SIZES)
    shutil.copy2(ico_out, favicon_ico)

    # Also keep a PNG favicon for Chromium/Electron tab chrome
    favicon_png = APP / "favicon.png"
    master.resize((64, 64), Image.Resampling.LANCZOS).save(favicon_png, format="PNG", optimize=True)

    shutil.copy2(png_512, ROOT / "icon.png")
    shutil.copy2(src, APP / "icon-source-3d.png")

    print(f"source={src}")
    print(f"png={png_512} bytes={png_512.stat().st_size}")
    print(f"build_png={build_png} bytes={build_png.stat().st_size}")
    print(f"ico={ico_out} bytes={ico_out.stat().st_size}")
    print(f"favicon={favicon_ico} bytes={favicon_ico.stat().st_size}")
    with Image.open(ico_out) as probe:
        print(f"ico_probe={probe.size} format={probe.format} n_frames={getattr(probe, 'n_frames', 1)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
