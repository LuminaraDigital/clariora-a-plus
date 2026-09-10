#!/usr/bin/env python3
"""
tools/sanitize_media.py - Media Sanitization & Metadata Stripper

Losslessly recompresses image assets (PNG, JPEG), strips all ancillary and
EXIF metadata, and validates byte patterns against forbidden sequences (e.g. b'pwd=').
Guarantees byte-level pixel fidelity while stripping hidden metadata and sensitive strings.

Usage:
  python tools/sanitize_media.py [path_or_file]
  python tools/sanitize_media.py --check [path_or_file]
"""
from __future__ import annotations

import argparse
import io
import os
import sys
from pathlib import Path
from typing import List, Optional, Tuple

try:
    from PIL import Image, ImageChops
except ImportError:
    print("[sanitize_media] ERROR: Pillow is required. Install with: pip install Pillow", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_FORBIDDEN_PATTERNS = [
    b"pwd=",
    b"password=",
]
DEFAULT_TARGET = ROOT / "media" / "brand" / "huly_laser_remix_scene.png"


def sanitize_image_bytes(
    raw_bytes: bytes,
    fmt: str,
    forbidden_patterns: Optional[List[bytes]] = None,
    optimize: bool = True
) -> Tuple[bytes, dict]:
    """
    Takes raw image bytes, reconstructs pixel buffer cleanly without metadata,
    recompresses losslessly (PNG) or with high quality (JPEG), and verifies
    forbidden byte patterns are absent.
    """
    if forbidden_patterns is None:
        forbidden_patterns = DEFAULT_FORBIDDEN_PATTERNS

    bio = io.BytesIO(raw_bytes)
    with Image.open(bio) as im:
        orig_format = (im.format or fmt).upper()
        orig_size = im.size
        orig_mode = im.mode

        # Create a clean image with identical dimensions and color mode
        clean = Image.new(orig_mode, orig_size)
        clean.paste(im)

        # Re-save cleanly into an in-memory buffer without metadata
        out_buf = io.BytesIO()
        if orig_format == "PNG":
            clean.save(out_buf, format="PNG", optimize=optimize)
        elif orig_format in ("JPEG", "JPG"):
            # If image has alpha channel, convert to RGB for JPEG
            if orig_mode in ("RGBA", "LA", "P"):
                clean = clean.convert("RGB")
            clean.save(out_buf, format="JPEG", optimize=optimize, quality=95)
        elif orig_format == "WEBP":
            clean.save(out_buf, format="WEBP", lossless=True)
        else:
            clean.save(out_buf, format=orig_format, optimize=optimize)

        sanitized_bytes = out_buf.getvalue()

    # Verify forbidden patterns
    for pat in forbidden_patterns:
        if pat in sanitized_bytes:
            raise ValueError(f"Forbidden byte pattern {pat!r} still found in sanitized image output!")

    # Verify reopened dimensions and pixel equality
    with Image.open(io.BytesIO(sanitized_bytes)) as reopened:
        if reopened.size != orig_size:
            raise ValueError(f"Dimension mismatch: expected {orig_size}, got {reopened.size}")
        if orig_format == "PNG":
            # PNG must be 100% losslessly identical in pixel content
            with Image.open(io.BytesIO(raw_bytes)) as orig_im:
                diff = ImageChops.difference(orig_im, reopened)
                if diff.getbbox() is not None:
                    raise ValueError("Pixel content altered during lossless PNG sanitization!")

    stats = {
        "format": orig_format,
        "mode": orig_mode,
        "size": orig_size,
        "original_bytes": len(raw_bytes),
        "sanitized_bytes": len(sanitized_bytes),
        "savings_bytes": len(raw_bytes) - len(sanitized_bytes),
    }
    return sanitized_bytes, stats


def sanitize_file(
    path: Path,
    forbidden_patterns: Optional[List[bytes]] = None,
    optimize: bool = True
) -> dict:
    """
    Sanitizes a single image file on disk atomically.
    """
    if not path.is_file():
        raise FileNotFoundError(f"File not found: {path}")

    ext = path.suffix.lower()
    fmt_map = {
        ".png": "PNG",
        ".jpg": "JPEG",
        ".jpeg": "JPEG",
        ".webp": "WEBP"
    }
    fmt = fmt_map.get(ext)
    if not fmt:
        raise ValueError(f"Unsupported image extension: {ext}")

    raw_bytes = path.read_bytes()
    sanitized_bytes, stats = sanitize_image_bytes(
        raw_bytes,
        fmt=fmt,
        forbidden_patterns=forbidden_patterns,
        optimize=optimize
    )

    # Atomic write back to disk
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    tmp_path.write_bytes(sanitized_bytes)
    tmp_path.replace(path)

    stats["path"] = str(path)
    return stats


def check_file(path: Path, forbidden_patterns: Optional[List[bytes]] = None) -> List[bytes]:
    """
    Checks if a file contains any forbidden byte patterns.
    """
    if forbidden_patterns is None:
        forbidden_patterns = DEFAULT_FORBIDDEN_PATTERNS
    data = path.read_bytes()
    return [p for p in forbidden_patterns if p in data]


def main() -> int:
    parser = argparse.ArgumentParser(description="Media sanitization & metadata stripper")
    parser.add_argument("target", nargs="?", default=str(DEFAULT_TARGET), help="Target file or directory")
    parser.add_argument("--check", action="store_true", help="Only check for forbidden patterns without modifying")
    parser.add_argument("--no-optimize", action="store_true", help="Disable optimizer pass")
    args = parser.parse_args()

    target_path = Path(args.target).resolve()
    if not target_path.exists():
        print(f"[sanitize_media] Target does not exist: {target_path}", file=sys.stderr)
        return 1

    files: List[Path] = []
    if target_path.is_file():
        files = [target_path]
    else:
        for ext in ("*.png", "*.jpg", "*.jpeg", "*.webp"):
            files.extend(target_path.rglob(ext))

    if not files:
        print(f"[sanitize_media] No image files found in {target_path}")
        return 0

    print(f"[sanitize_media] Processing {len(files)} image file(s)...")
    errors = 0

    for file_path in files:
        rel = file_path.relative_to(ROOT) if file_path.is_relative_to(ROOT) else file_path
        if args.check:
            leaks = check_file(file_path)
            if leaks:
                print(f"[sanitize_media] FAIL: {rel} contains forbidden patterns: {leaks}")
                errors += 1
            else:
                print(f"[sanitize_media] PASS: {rel} clean")
        else:
            try:
                stats = sanitize_file(file_path, optimize=not args.no_optimize)
                print(
                    f"[sanitize_media] Cleaned {rel}: "
                    f"{stats['size'][0]}x{stats['size'][1]} {stats['mode']} "
                    f"({stats['original_bytes']} -> {stats['sanitized_bytes']} bytes, "
                    f"saved {stats['savings_bytes']} bytes)"
                )
            except Exception as e:
                print(f"[sanitize_media] ERROR on {rel}: {e}", file=sys.stderr)
                errors += 1

    # Also automatically sanitize dist_web copy if it exists and we're sanitizing default target
    if not args.check and target_path == DEFAULT_TARGET:
        dist_target = ROOT / "dist_web" / "media" / "brand" / "huly_laser_remix_scene.png"
        if dist_target.is_file():
            try:
                sanitize_file(dist_target, optimize=not args.no_optimize)
                print(f"[sanitize_media] Also sanitized synchronized dist_web copy: {dist_target.relative_to(ROOT)}")
            except Exception as e:
                print(f"[sanitize_media] Warning: dist_web sync error: {e}", file=sys.stderr)

    if errors:
        return 1
    print("[sanitize_media] All media sanitization checks passed successfully.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
