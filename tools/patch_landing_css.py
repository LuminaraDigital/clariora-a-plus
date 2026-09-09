#!/usr/bin/env python3
"""Patch landing.css: remove grid backdrop, add multi-page styles."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
css_path = ROOT / "landing" / "landing.css"
css = css_path.read_text(encoding="utf-8")

old_body = """body {
  margin: 0;
  font-family: var(--font);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  color: var(--text-1);
  background-color: var(--surface-0);
  background-image:
    var(--glow),
    linear-gradient(to right, var(--grid-line) 1px, transparent 1px),
    linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px);
  background-size: 100% 100%, 32px 32px, 32px 32px;
  background-repeat: no-repeat, repeat, repeat;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}"""

new_body = """body {
  margin: 0;
  font-family: var(--font);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  color: var(--text-1);
  background-color: var(--surface-0);
  background-image:
    var(--glow),
    radial-gradient(ellipse 90% 55% at 85% 15%, var(--wash-gold), transparent 55%),
    radial-gradient(ellipse 70% 45% at 10% 80%, var(--wash-cool), transparent 50%);
  background-repeat: no-repeat;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}"""

if old_body not in css:
    raise SystemExit("body block not found (already patched?)")

css = css.replace(old_body, new_body)

css = css.replace(
    """  /* Backdrop */
  --grid-line: rgba(255, 255, 255, 0.028);
  --glow: radial-gradient(ellipse 75% 50% at 50% -10%, rgba(212, 175, 55, 0.08), transparent 70%);""",
    """  /* Backdrop */
  --wash-gold: rgba(212, 175, 55, 0.06);
  --wash-cool: rgba(56, 189, 248, 0.04);
  --glow: radial-gradient(ellipse 75% 50% at 50% -10%, rgba(212, 175, 55, 0.10), transparent 70%);""",
)

css = css.replace(
    """    --grid-line: rgba(15, 23, 42, 0.035);
    --glow: radial-gradient(ellipse 75% 50% at 50% -10%, rgba(184, 144, 30, 0.07), transparent 70%);""",
    """    --wash-gold: rgba(184, 144, 30, 0.07);
    --wash-cool: rgba(2, 132, 199, 0.04);
    --glow: radial-gradient(ellipse 75% 50% at 50% -10%, rgba(184, 144, 30, 0.09), transparent 70%);""",
)

if "Multi-page chrome and competitor compare" not in css:
    css += """

/* ============================================================
   Multi-page chrome and competitor compare
   ============================================================ */

.nav-links a.is-active,
.nav-menu-panel a.is-active {
  color: var(--gold-text);
}

.page-hero {
  padding: calc(var(--nav-h) + var(--sp-6)) 0 var(--sp-5);
}

.page-hero .lead {
  max-width: var(--measure);
  color: var(--text-2);
  font-size: var(--fs-lead);
}

.page-hero .eyebrow {
  display: inline-block;
  margin-bottom: var(--sp-2);
}

.compare-note {
  margin: var(--sp-2) 0 var(--sp-4);
  color: var(--text-3);
  font-size: var(--fs-small);
  max-width: var(--measure);
}

.table-wrap.table-compare {
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: var(--r-card);
  background: var(--surface-1);
  box-shadow: var(--shadow-card);
}

.table-compare table {
  min-width: 720px;
}

.table-compare th.col-us,
.table-compare td.col-us {
  background: var(--gold-tint);
}

.share-card {
  margin-top: var(--sp-4);
  padding: var(--sp-4);
  border: 1px solid var(--line-strong);
  border-radius: var(--r-card);
  background: var(--final-card-glow);
}

.share-card h3 {
  margin-bottom: var(--sp-1);
}

.page-cta {
  margin-top: var(--sp-5);
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}

@media (min-width: 900px) {
  .hero-fullbleed {
    position: relative;
  }
  .hero-fullbleed::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      linear-gradient(90deg, var(--surface-0) 0%, color-mix(in srgb, var(--surface-0) 88%, transparent) 42%, transparent 70%),
      radial-gradient(ellipse 60% 70% at 78% 40%, var(--wash-gold), transparent 60%);
    pointer-events: none;
    z-index: 0;
  }
  .hero-fullbleed .container {
    position: relative;
    z-index: 1;
  }
}
"""

css_path.write_text(css, encoding="utf-8")
print("patched", css_path)
