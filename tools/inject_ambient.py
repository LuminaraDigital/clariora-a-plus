#!/usr/bin/env python3
"""Inject the ambient background layer into landing HTML pages."""
from pathlib import Path

LANDING = Path(__file__).resolve().parents[1] / "landing"
AMBIENT = """<div class="ambient" aria-hidden="true">
  <div class="ambient__mesh"></div>
  <div class="ambient__orb ambient__orb--gold"></div>
  <div class="ambient__orb ambient__orb--teal"></div>
  <div class="ambient__orb ambient__orb--violet"></div>
</div>
"""


def main() -> None:
    for path in sorted(LANDING.glob("*.html")):
        text = path.read_text(encoding="utf-8")
        if 'class="ambient"' in text:
            print("skip", path.name)
            continue
        cls = "ambient-rich" if path.name == "index.html" else "ambient-calm"
        if "<body>" in text:
            text = text.replace("<body>", f'<body class="{cls}">\n{AMBIENT}', 1)
        elif "<body " in text:
            # Already has attributes; append class if needed
            if "ambient-rich" not in text and "ambient-calm" not in text:
                text = text.replace("<body ", f'<body class="{cls}" ', 1)
            insert_at = text.find(">", text.find("<body")) + 1
            text = text[:insert_at] + "\n" + AMBIENT + text[insert_at:]
        else:
            raise SystemExit(f"No body tag in {path.name}")
        path.write_text(text, encoding="utf-8")
        print("patched", path.name)


if __name__ == "__main__":
    main()
