"""Generate PWA / Apple touch icons for Mac and mobile install."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ICONS = ROOT / "icons"
CANDIDATES = [
    ROOT / "CompTIA_A_Plus_Desktop_App" / "resources" / "app" / "build" / "icon.png",
    ROOT / "icon.png",
    ROOT / "icons" / "icon-512.png",
]


def find_source() -> Path:
    for path in CANDIDATES:
        if path.is_file() and path.stat().st_size > 2000:
            return path
    raise FileNotFoundError("No icon source found")


def main() -> int:
    ICONS.mkdir(parents=True, exist_ok=True)
    src = find_source()
    img = Image.open(src).convert("RGBA")
    for size, name in (
        (180, "apple-touch-icon.png"),
        (192, "icon-192.png"),
        (512, "icon-512.png"),
    ):
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        frame = img.copy()
        frame.thumbnail((size, size), Image.Resampling.LANCZOS)
        ox = (size - frame.width) // 2
        oy = (size - frame.height) // 2
        canvas.paste(frame, (ox, oy), frame)
        out = ICONS / name
        canvas.save(out, format="PNG", optimize=True)
        print(f"{out.name} bytes={out.stat().st_size}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
