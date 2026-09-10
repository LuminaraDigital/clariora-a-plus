#!/usr/bin/env python3
"""Generate multi-page landing HTML with shared chrome."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LANDING = ROOT / "landing"

SVG = """
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <symbol id="i-ok" viewBox="0 0 20 20"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4 10.5l4 4 8-9"/></symbol>
  <symbol id="i-no" viewBox="0 0 20 20"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M5 5l10 10M15 5L5 15"/></symbol>
  <symbol id="i-dot" viewBox="0 0 20 20"><circle cx="10" cy="10" r="3" fill="currentColor"/></symbol>
</svg>
"""

PAGES = [
    ("index.html", "Home", "#top"),
    ("why.html", "Why Clariora", "why.html"),
    ("compare.html", "Compare", "compare.html"),
    ("how.html", "How it works", "how.html"),
    ("pricing.html", "Pricing", "pricing.html"),
    ("trust.html", "Trust", "trust.html"),
    ("faq.html", "FAQ", "faq.html"),
]


def nav(active: str) -> str:
    home_href = "#top" if active == "index.html" else "index.html"
    links = []
    mobile = []
    for file, label, href in PAGES:
        if file == "index.html":
            continue
        cls = ' class="is-active"' if file == active else ""
        links.append(f'      <a href="{href}"{cls}>{label}</a>')
        mobile.append(f'        <a href="{href}"{cls}>{label}</a>')
    return f"""<header class="nav">
  <div class="container">
    <a class="wordmark" href="{home_href}" aria-label="Clariora A+, home">
      <img class="wordmark-mark" src="../icons/icon-192.png" width="192" height="192" alt="" decoding="async">
      Clariora A+
    </a>
    <nav class="nav-links" aria-label="Site">
{chr(10).join(links)}
    </nav>
    <div class="nav-actions">
      <a class="btn btn-secondary" href="/app?signup=1" data-busy>Create account</a>
      <a class="btn btn-primary" href="/app" data-busy>Sign in</a>
    </div>
    <details class="nav-menu">
      <summary aria-label="Open menu">
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </summary>
      <div class="nav-menu-panel">
{chr(10).join(mobile)}
        <a href="https://t.me/ClarioraBot/app" target="_blank" rel="noopener">Launch on Telegram</a>
        <a href="https://github.com/LuminaraDigital/clariora-a-plus" rel="noopener">Source on GitHub</a>
      </div>
    </details>
  </div>
</header>"""


def footer() -> str:
    return """<footer class="footer">
  <div class="container">
    <p><strong>Clariora A+</strong> by Datacentre Academy / Luminara Digital. CompTIA A+ is a trademark of CompTIA. Clariora is not affiliated with or endorsed by CompTIA.</p>
    <p>
      <a href="why.html">Why</a> ·
      <a href="compare.html">Compare</a> ·
      <a href="how.html">How</a> ·
      <a href="pricing.html">Pricing</a> ·
      <a href="trust.html">Trust</a> ·
      <a href="faq.html">FAQ</a> ·
      <a href="../privacy.html">Privacy</a> ·
      <a href="../terms.html">Terms</a> ·
      <a href="https://github.com/LuminaraDigital/clariora-a-plus" rel="noopener">GitHub</a>
    </p>
  </div>
</footer>
<script src="hero-mesh.js" defer></script>
<script>
(function () {
  document.querySelectorAll('[data-busy]').forEach(function (el) {
    el.addEventListener('click', function () { el.classList.add('is-busy'); });
  });
  document.querySelectorAll('.tabs').forEach(function (tabs) {
    var buttons = Array.prototype.slice.call(tabs.querySelectorAll('[role="tab"]'));
    function select(btn) {
      buttons.forEach(function (b) {
        var on = b === btn;
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
        var p = document.getElementById(b.getAttribute('aria-controls'));
        if (p) p.hidden = !on;
      });
    }
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () { select(btn); });
    });
  });
})();
</script>"""


def shell(title: str, description: str, active: str, body: str, canonical: str) -> str:
    body_class = "ambient-rich" if active == "index.html" else "ambient-calm"
    ambient = """<div class="ambient" aria-hidden="true">
  <div class="ambient__mesh"></div>
  <div class="ambient__orb ambient__orb--gold"></div>
  <div class="ambient__orb ambient__orb--teal"></div>
  <div class="ambient__orb ambient__orb--violet"></div>
</div>
"""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <meta name="description" content="{description}">
  <link rel="canonical" href="{canonical}">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{description}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="https://clariora.com.au/landing/img/home-1280.webp">
  <meta name="theme-color" content="#D4AF37">
  <link rel="icon" href="../favicon.ico" sizes="any">
  <link rel="icon" type="image/png" href="../favicon.png" sizes="64x64">
  <link rel="apple-touch-icon" href="../icons/apple-touch-icon.png">
  <link rel="preload" href="../fonts/sora-700.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="../fonts/sora-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="landing.css">
  <script>document.documentElement.classList.add('js');</script>
</head>
<body class="{body_class}">
{ambient}
{SVG}
{nav(active)}
<main id="top">
{body}
</main>
{footer()}
</body>
</html>
"""


BASE = "https://clariora.com.au/landing/"


def write(name: str, title: str, desc: str, body: str) -> None:
    html = shell(title, desc, name, body, BASE + ("" if name == "index.html" else name))
    (LANDING / name).write_text(html, encoding="utf-8")
    print("wrote", name)


# ---- Page bodies ----

COMPARE_BODY = r"""
  <section class="page-hero">
    <div class="container">
      <span class="eyebrow">Why Clariora wins</span>
      <h1>Built to beat the packs people actually buy.</h1>
      <p class="lead">Most A+ prep either dumps questions or sells a closed portal. Clariora measures you the way the exam reports scores, keeps your data on your machine, and costs a fraction of official tooling.</p>
      <div class="page-cta">
        <a class="btn btn-primary btn-lg" href="/app" data-busy>Take the free diagnostic</a>
        <a class="btn btn-secondary btn-lg" href="pricing.html">See pricing</a>
      </div>
    </div>
  </section>

  <section class="section" id="chart">
    <div class="container">
      <div class="section-head">
        <span class="eyebrow">Competitor chart</span>
        <h2>Side by side, not marketing fog.</h2>
      </div>
      <p class="compare-note">Prices checked 10 Sep 2026 from public product pages. CompTIA does not list a single public CertMaster Practice shelf price on its marketing page; third-party reporting puts official CertMaster bundles in the hundreds of USD per exam. Professor Messer digital Core 1 Success Bundle is $119; both cores purchased separately land near $238. Clariora is free during 3.x with a planned $39 one-time personal licence.</p>
      <div class="table-wrap table-compare">
        <table>
          <thead>
            <tr>
              <th scope="col">Capability</th>
              <th scope="col">CertMaster Practice</th>
              <th scope="col">Professor Messer bundles</th>
              <th scope="col">Udemy-style packs</th>
              <th scope="col" class="col-us">Clariora A+</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Typical spend (both cores)</th>
              <td>Hundreds USD per core in official bundles</td>
              <td>About $119 per core digital success bundle</td>
              <td>$15 to $80 on sale</td>
              <td class="col-us"><strong>Free now · $39 planned once</strong></td>
            </tr>
            <tr>
              <th scope="row">Score model</th>
              <td><span class="cell"><svg class="ic ic-ok" aria-hidden="true"><use href="#i-ok"/></svg>Mastery / objective reporting</span></td>
              <td><span class="cell"><svg class="ic ic-info" aria-hidden="true"><use href="#i-dot"/></svg>Practice Q&amp;A / PDF exams</span></td>
              <td><span class="cell"><svg class="ic ic-danger" aria-hidden="true"><use href="#i-no"/></svg>Usually percent correct</span></td>
              <td class="col-us"><span class="cell"><svg class="ic ic-ok" aria-hidden="true"><use href="#i-ok"/></svg>Scaled 100 to 900 vs 675 / 700</span></td>
            </tr>
            <tr>
              <th scope="row">Offline desktop app</th>
              <td><span class="cell"><svg class="ic ic-danger" aria-hidden="true"><use href="#i-no"/></svg>Cloud portal</span></td>
              <td><span class="cell"><svg class="ic ic-info" aria-hidden="true"><use href="#i-dot"/></svg>Downloads / PDFs</span></td>
              <td><span class="cell"><svg class="ic ic-danger" aria-hidden="true"><use href="#i-no"/></svg>Browser / video course</span></td>
              <td class="col-us"><span class="cell"><svg class="ic ic-ok" aria-hidden="true"><use href="#i-ok"/></svg>Windows, Linux, PWA, Telegram</span></td>
            </tr>
            <tr>
              <th scope="row">Distractor analysis</th>
              <td><span class="cell"><svg class="ic ic-info" aria-hidden="true"><use href="#i-dot"/></svg>Varies by product</span></td>
              <td><span class="cell"><svg class="ic ic-ok" aria-hidden="true"><use href="#i-ok"/></svg>Strong explanations</span></td>
              <td><span class="cell"><svg class="ic ic-info" aria-hidden="true"><use href="#i-dot"/></svg>Often answer letter only</span></td>
              <td class="col-us"><span class="cell"><svg class="ic ic-ok" aria-hidden="true"><use href="#i-ok"/></svg>Every miss explains each wrong option</span></td>
            </tr>
            <tr>
              <th scope="row">PBQs / labs in-app</th>
              <td><span class="cell"><svg class="ic ic-ok" aria-hidden="true"><use href="#i-ok"/></svg>With CertMaster Perform bundles</span></td>
              <td><span class="cell"><svg class="ic ic-info" aria-hidden="true"><use href="#i-dot"/></svg>Some PBQ items in exams</span></td>
              <td><span class="cell"><svg class="ic ic-danger" aria-hidden="true"><use href="#i-no"/></svg>Rare</span></td>
              <td class="col-us"><span class="cell"><svg class="ic ic-ok" aria-hidden="true"><use href="#i-ok"/></svg>PBQs plus 36 guided labs + 22 decks</span></td>
            </tr>
            <tr>
              <th scope="row">Account required</th>
              <td><span class="cell"><svg class="ic ic-danger" aria-hidden="true"><use href="#i-no"/></svg>Yes</span></td>
              <td><span class="cell"><svg class="ic ic-info" aria-hidden="true"><use href="#i-dot"/></svg>Store checkout</span></td>
              <td><span class="cell"><svg class="ic ic-info" aria-hidden="true"><use href="#i-dot"/></svg>Platform account</span></td>
              <td class="col-us"><span class="cell"><svg class="ic ic-ok" aria-hidden="true"><use href="#i-ok"/></svg>No account for core study</span></td>
            </tr>
            <tr>
              <th scope="row">Open source scoring</th>
              <td><span class="cell"><svg class="ic ic-danger" aria-hidden="true"><use href="#i-no"/></svg>Closed</span></td>
              <td><span class="cell"><svg class="ic ic-danger" aria-hidden="true"><use href="#i-no"/></svg>Closed</span></td>
              <td><span class="cell"><svg class="ic ic-danger" aria-hidden="true"><use href="#i-no"/></svg>Closed</span></td>
              <td class="col-us"><span class="cell"><svg class="ic ic-ok" aria-hidden="true"><use href="#i-ok"/></svg>AGPL-3.0 on GitHub</span></td>
            </tr>
            <tr>
              <th scope="row">Proof for instructors</th>
              <td><span class="cell"><svg class="ic ic-info" aria-hidden="true"><use href="#i-dot"/></svg>LMS / institutional options</span></td>
              <td><span class="cell"><svg class="ic ic-danger" aria-hidden="true"><use href="#i-no"/></svg>None</span></td>
              <td><span class="cell"><svg class="ic ic-danger" aria-hidden="true"><use href="#i-no"/></svg>None</span></td>
              <td class="col-us"><span class="cell"><svg class="ic ic-ok" aria-hidden="true"><use href="#i-ok"/></svg>Hash-chained local ledger export</span></td>
            </tr>
            <tr>
              <th scope="row">Share your readiness</th>
              <td><span class="cell"><svg class="ic ic-danger" aria-hidden="true"><use href="#i-no"/></svg>Not designed for peer share</span></td>
              <td><span class="cell"><svg class="ic ic-danger" aria-hidden="true"><use href="#i-no"/></svg>Not designed for peer share</span></td>
              <td><span class="cell"><svg class="ic ic-danger" aria-hidden="true"><use href="#i-no"/></svg>Not designed for peer share</span></td>
              <td class="col-us"><span class="cell"><svg class="ic ic-ok" aria-hidden="true"><use href="#i-ok"/></svg>One-tap share of scaled score + streak</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="share-card">
        <h3>The one-line pitch you can send a friend</h3>
        <p>"Open Clariora, sign in, take the free 20-question diagnostic, and you get a 100 to 900 scaled score against the real pass marks with progress saved to your account."</p>
        <div class="page-cta">
          <a class="btn btn-primary" href="/app" data-busy>Open Clariora</a>
          <a class="btn btn-secondary" href="https://t.me/ClarioraBot/app" target="_blank" rel="noopener">Share via Telegram</a>
        </div>
      </div>
    </div>
  </section>
"""

WHY_BODY = r"""
  <section class="page-hero">
    <div class="container">
      <span class="eyebrow">Why Clariora</span>
      <h1>The difference is what it measures.</h1>
      <p class="lead">Question count is easy to brag about. Knowing whether you would pass Core 1 tomorrow, on the same scale CompTIA uses, is harder. That is the product.</p>
    </div>
  </section>
  <section class="section">
    <div class="container">
      <div class="grid grid-2">
        <div class="card card-accent">
          <h3>Scaled scoring, not a vanity percent</h3>
          <p>Mocks weight domains the way the blueprint does, then map accuracy to 100 to 900 with the real pass lines: 675 for Core 1 and 700 for Core 2.</p>
        </div>
        <div class="card card-accent">
          <h3>Misses that teach</h3>
          <p>1,130 questions carry explanations and distractor analysis. Review is never paywalled. A wrong answer becomes a concept, not a letter to memorise.</p>
        </div>
        <div class="card">
          <h3>Offline by default</h3>
          <p>Browser PWA, Windows installer, Linux builds, and Telegram. Progress stays on device. Sync and telemetry stay off until you turn them on.</p>
        </div>
        <div class="card">
          <h3>Built for people who must pass</h3>
          <p>Career starters, academy instructors, and team leads get the same core: readiness by objective, daily plan, ledger evidence, and assessment packs that feel like a premium course.</p>
        </div>
      </div>
      <div class="page-cta">
        <a class="btn btn-primary" href="compare.html">See the competitor chart</a>
        <a class="btn btn-secondary" href="/app" data-busy>Try the diagnostic</a>
      </div>
    </div>
  </section>
"""

HOW_BODY = r"""
  <section class="page-hero">
    <div class="container">
      <span class="eyebrow">How it works</span>
      <h1>Three steps. The first takes twenty minutes.</h1>
      <p class="lead">Sign in once. No content unlock maze. Open the app, sit a short diagnostic, then let readiness drive the daily plan.</p>
    </div>
  </section>
  <section class="section">
    <div class="container">
      <ol class="steps">
        <li class="step"><h3>Sign in</h3><p>Google, email, or Telegram. Progress stays on your account.</p></li>
        <li class="step"><h3>Take the 20 question diagnostic</h3><p>Mixed Core 1 and Core 2 under exam conditions. First readiness score and weak objectives.</p></li>
        <li class="step"><h3>Follow the plan until readiness says go</h3><p>Drill weak objectives, use spaced repetition, sit full 90 in 90 mocks, run module quizzes, then book when scaled scores clear the pass mark consistently.</p></li>
      </ol>
      <div class="walk walk-spaced">
        <figure>
          <div class="shot"><img src="img/exam-1280.webp" srcset="img/exam-640.webp 640w, img/exam-1280.webp 1280w" sizes="(min-width: 1000px) 350px, 100vw" width="1280" height="800" alt="Exam runner with timer and question matrix" loading="lazy"></div>
          <figcaption><strong>1. Sit the exam</strong>90 questions, 90 minutes, flag and jump.</figcaption>
        </figure>
        <figure>
          <div class="shot"><img src="img/submit-1280.webp" srcset="img/submit-640.webp 640w, img/submit-1280.webp 1280w" sizes="(min-width: 1000px) 350px, 100vw" width="1280" height="800" alt="Submit confirmation dialog" loading="lazy"></div>
          <figcaption><strong>2. Confirm before it counts</strong>Unanswered and flagged questions listed first.</figcaption>
        </figure>
        <figure>
          <div class="shot"><img src="img/results-1280.webp" srcset="img/results-640.webp 640w, img/results-1280.webp 1280w" sizes="(min-width: 1000px) 350px, 100vw" width="1280" height="800" alt="Results with scaled score" loading="lazy"></div>
          <figcaption><strong>3. Read the score CompTIA-style</strong>Scaled score, pass line, domain bars, then share if you want.</figcaption>
        </figure>
      </div>
      <div class="page-cta">
        <a class="btn btn-primary" href="/app" data-busy>Start step one</a>
      </div>
    </div>
  </section>
"""

PRICING_BODY = r"""
  <section class="page-hero">
    <div class="container">
      <span class="eyebrow">Pricing</span>
      <h1>Free today. One payment later, never a subscription.</h1>
      <p class="lead">Every feature is open while Clariora is in its 3.x releases. When the personal licence goes on sale, the free tier keeps daily limits instead of disappearing.</p>
    </div>
  </section>
  <section class="section">
    <div class="container">
      <div class="plans">
        <div class="plan">
          <div class="plan-head"><h3>Free</h3><span class="badge badge-ok">Available now</span></div>
          <div class="price">0 <small>USD</small></div>
          <p>Everything unlocked during 3.x. Later, a daily allowance stays free forever.</p>
          <ul>
            <li><svg class="ic ic-ok" aria-hidden="true"><use href="#i-ok"/></svg><span>Full 20 question diagnostic every day</span></li>
            <li><svg class="ic ic-ok" aria-hidden="true"><use href="#i-ok"/></svg><span>20 practice questions, 20 flashcards and one lab per day once limits arrive</span></li>
            <li><svg class="ic ic-ok" aria-hidden="true"><use href="#i-ok"/></svg><span>Unlimited review of every explanation</span></li>
          </ul>
          <a class="btn btn-primary" href="/app" data-busy>Sign in to start free</a>
        </div>
        <div class="plan plan-featured">
          <div class="plan-head"><h3>Personal licence</h3><span class="badge badge-warn">Planned</span></div>
          <div class="price">39 <small>USD, once</small></div>
          <p>One key on that PC. No renewal. No phone-home.</p>
          <ul>
            <li><svg class="ic ic-ok" aria-hidden="true"><use href="#i-ok"/></svg><span>Unlimited practice, flashcards and labs</span></li>
            <li><svg class="ic ic-ok" aria-hidden="true"><use href="#i-ok"/></svg><span>Full 90 question timed mocks</span></li>
            <li><svg class="ic ic-ok" aria-hidden="true"><use href="#i-ok"/></svg><span>Ghost Coach with explain-on-miss</span></li>
          </ul>
          <button class="btn btn-secondary" type="button" disabled>Not on sale yet</button>
        </div>
        <div class="plan">
          <div class="plan-head"><h3>Academy and team</h3><span class="badge badge-info">By arrangement</span></div>
          <div class="price">Ask <small>per cohort</small></div>
          <p>Seat keys, ledger exports, and lab deployment help for instructors and employers.</p>
          <ul>
            <li><svg class="ic ic-ok" aria-hidden="true"><use href="#i-ok"/></svg><span>Seat keys per learner</span></li>
            <li><svg class="ic ic-ok" aria-hidden="true"><use href="#i-ok"/></svg><span>Signed progress exports</span></li>
          </ul>
          <a class="btn btn-secondary" href="mailto:support@datacentre.academy?subject=Clariora%20for%20a%20cohort">Email about a cohort</a>
        </div>
        <div class="plan">
          <div class="plan-head"><h3>Telegram AI Pro</h3><span class="badge badge-ok">Live on Telegram</span></div>
          <div class="price">350 <small>Stars or 1.5 TON</small></div>
          <p>Instant activation inside Telegram with Pro AI sessions.</p>
          <ul>
            <li><svg class="ic ic-ok" aria-hidden="true"><use href="#i-ok"/></svg><span>Pro AI models inside the Mini App</span></li>
            <li><svg class="ic ic-ok" aria-hidden="true"><use href="#i-ok"/></svg><span>Stars or TON Connect checkout</span></li>
          </ul>
          <a class="btn btn-secondary" href="https://t.me/ClarioraBot/app" target="_blank" rel="noopener">Launch on Telegram</a>
        </div>
      </div>
      <p class="muted small">Compared with Professor Messer Core 1 Success Bundle at $119 and official CertMaster bundles often in the hundreds per exam, Clariora stays under the cost of a single retake.</p>
    </div>
  </section>
"""

TRUST_BODY = r"""
  <section class="page-hero">
    <div class="container">
      <span class="eyebrow">Trust</span>
      <h1>New product. Inspectable claims.</h1>
      <p class="lead">Clariora does not invent testimonials. Until learners write their own quotes, trust the parts you can verify: source, tests, pass marks, and your own diagnostic score.</p>
    </div>
  </section>
  <section class="section">
    <div class="container">
      <div class="grid grid-2 trust-grid">
        <div class="card"><h3>Open source under AGPL-3.0</h3><p>Scoring, validators and daily-plan logic are public on GitHub.</p></div>
        <div class="card"><h3>Tests on every commit</h3><p>Version __APLUS_VERSION__ ships with automated checks on the bank, entitlements and landing pages.</p></div>
        <div class="card"><h3>No account and no phone-home</h3><p>Progress stays local. Telemetry and sync are off by default.</p></div>
        <div class="card"><h3>Official pass marks</h3><p>Mocks use 675 for Core 1 and 700 for Core 2 on the 100 to 900 scale. Walkthrough screenshots are from the current Windows build.</p></div>
      </div>
      <div class="trust-actions">
        <a class="btn btn-secondary" href="https://github.com/LuminaraDigital/clariora-a-plus" rel="noopener">Inspect the source</a>
        <a class="btn btn-secondary" href="mailto:support@datacentre.academy?subject=Clariora%20feedback%20after%20diagnostic">Send feedback after you try it</a>
      </div>
    </div>
  </section>
"""

FAQ_BODY = r"""
  <section class="page-hero">
    <div class="container">
      <span class="eyebrow">Questions</span>
      <h1>Things people ask before they open it.</h1>
      <p class="lead">Straight answers. No invented user counts.</p>
    </div>
  </section>
  <section class="section">
    <div class="container">
      <div class="faq">
        <details open>
          <summary>Is Clariora new? Does anyone use it yet?</summary>
          <div>Yes, it is early. There is no customer quote wall yet because we do not invent testimonials. Take the free diagnostic, read the source if you want proof of how scoring works, and email support@datacentre.academy if you pass and want to be quoted with your name and role.</div>
        </details>
        <details>
          <summary>Is it really free?</summary>
          <div>Yes during 3.x. When the personal licence goes on sale, the free tier keeps a daily allowance plus unlimited review of explanations.</div>
        </details>
        <details>
          <summary>Do I need an account?</summary>
          <div>No. Progress is stored on your device. Cloud sync is optional and off by default.</div>
        </details>
        <details>
          <summary>How close is the scoring to the real exam?</summary>
          <div>Mocks draw 90 questions to official domain weights and report 100 to 900 with pass marks 675 / 700. CompTIA does not publish its exact scaling function, so treat the scaled score as a calibrated estimate.</div>
        </details>
        <details>
          <summary>How many questions are there?</summary>
          <div>1,130 total: 636 Core 1 and 494 Core 2. Enough for five full mocks per core before repeats.</div>
        </details>
        <details>
          <summary>Does it work offline?</summary>
          <div>Yes. PWA, Windows and Linux builds are offline. Optional YouTube and Ghost Coach need a connection.</div>
        </details>
        <details>
          <summary>Why would an instructor care about the ledger?</summary>
          <div>Each session is hash-chained and signed on device. An export is evidence the work happened when it says it did.</div>
        </details>
        <details>
          <summary>How do I show Clariora to a friend?</summary>
          <div>After a mock, use Share readiness in the results screen. It copies a short pitch with your scaled score and streak, or opens the system share sheet.</div>
        </details>
      </div>
    </div>
  </section>
"""

INDEX_BODY = r"""
  <section class="hero hero-stage">
    <div class="hero-stage__media">
      <img
        class="hero-stage__img"
        src="img/home-1280.webp"
        srcset="img/home-640.webp 640w, img/home-1280.webp 1280w"
        sizes="100vw"
        width="1280"
        height="800"
        alt="Clariora home screen with readiness ring and Core 1 / Core 2 shortcuts"
        fetchpriority="high"
        decoding="async">
      <div class="hero-stage__veil" aria-hidden="true"></div>
    </div>
    <div class="container hero-stage__copy">
      <p class="hero-brand">Clariora A+</p>
      <h1>Know your CompTIA A+ score before you book the exam.</h1>
      <p class="lead">90 questions. 90 minutes. Real 100 to 900 scoring for Core 1 and Core 2, then a clear map of what to fix.</p>
      <div class="hero-actions">
        <a class="btn btn-primary btn-lg" href="/app" data-busy>Sign in and start</a>
        <a class="btn btn-secondary btn-lg" href="/app?signup=1" data-busy>Create account</a>
      </div>
      <p class="hero-note">Browser-based CompTIA A+ simulator. AGPL-3.0. Version __APLUS_VERSION__.</p>
    </div>
  </section>

  <section class="proof" aria-label="Facts about the product">
    <div class="container">
      <ul>
        <li><strong>1,130</strong><span>questions with explanations and distractor analysis</span></li>
        <li><strong>675 / 700</strong><span>real pass marks on the 100 to 900 scale</span></li>
        <li><strong>$39</strong><span>planned one-time licence vs hundreds for official bundles</span></li>
        <li><strong>1</strong><span>sign-in gates the product so progress is yours</span></li>
      </ul>
    </div>
  </section>

  <section class="section" id="who">
    <div class="container">
      <div class="section-head">
        <span class="eyebrow">Who it is for</span>
        <h2>Career starters, academy founders, and team leads who cannot afford a retake.</h2>
      </div>
      <div class="tabs" role="tablist" aria-label="Choose your situation">
        <button class="tab" role="tab" id="tab-tech" aria-controls="panel-tech" aria-selected="true">Career starter</button>
        <button class="tab" role="tab" id="tab-instructor" aria-controls="panel-instructor" aria-selected="false" tabindex="-1">Academy founder</button>
        <button class="tab" role="tab" id="tab-employer" aria-controls="panel-employer" aria-selected="false" tabindex="-1">Team lead</button>
      </div>
      <div class="tabpanel" role="tabpanel" id="panel-tech" aria-labelledby="tab-tech">
        <div>
          <h3>You are founding an IT career and vouchers cost about $506 for both cores.</h3>
          <p>Failing costs money and a month. You need a scaled pass/fail signal, not another PDF dump.</p>
          <ul>
            <li><svg class="ic ic-ok" aria-hidden="true"><use href="#i-ok"/></svg><span>Scaled score after every mock</span></li>
            <li><svg class="ic ic-ok" aria-hidden="true"><use href="#i-ok"/></svg><span>Share readiness with a friend in one tap</span></li>
            <li><svg class="ic ic-ok" aria-hidden="true"><use href="#i-ok"/></svg><span>Works offline on the train</span></li>
          </ul>
        </div>
        <div class="shot"><img src="img/results-1280.webp" srcset="img/results-640.webp 640w, img/results-1280.webp 1280w" sizes="(min-width: 800px) 480px, 100vw" width="1280" height="800" alt="Results screen with scaled score" loading="lazy"></div>
      </div>
      <div class="tabpanel" role="tabpanel" id="panel-instructor" aria-labelledby="tab-instructor" hidden>
        <div>
          <h3>You run cohorts and need proof learners did the work.</h3>
          <p>Hash-chained ledger exports give sponsors evidence, not self-reported hours.</p>
          <ul>
            <li><svg class="ic ic-ok" aria-hidden="true"><use href="#i-ok"/></svg><span>Tamper-evident session history</span></li>
            <li><svg class="ic ic-ok" aria-hidden="true"><use href="#i-ok"/></svg><span>Deploy web, installer, or portable EXE</span></li>
          </ul>
        </div>
        <div class="shot"><img src="img/study-1280.webp" srcset="img/study-640.webp 640w, img/study-1280.webp 1280w" sizes="(min-width: 800px) 480px, 100vw" width="1280" height="800" alt="Study drawer" loading="lazy"></div>
      </div>
      <div class="tabpanel" role="tabpanel" id="panel-employer" aria-labelledby="tab-employer" hidden>
        <div>
          <h3>You are putting a junior through A+ on company time.</h3>
          <p>One readiness number per core, backed by objective breakdowns. Ask for the export.</p>
          <ul>
            <li><svg class="ic ic-ok" aria-hidden="true"><use href="#i-ok"/></svg><span>No subscription to manage</span></li>
            <li><svg class="ic ic-ok" aria-hidden="true"><use href="#i-ok"/></svg><span>Runs offline on workshop PCs</span></li>
          </ul>
        </div>
        <div class="shot"><img src="img/home-1280.webp" srcset="img/home-640.webp 640w, img/home-1280.webp 1280w" sizes="(min-width: 800px) 480px, 100vw" width="1280" height="800" alt="Home readiness ring" loading="lazy"></div>
      </div>
    </div>
  </section>

  <section class="section" id="trust">
    <div class="container">
      <div class="section-head">
        <span class="eyebrow">Trust</span>
        <h2>Inspectable claims while the product is early.</h2>
        <p>Full write-up on the <a href="trust.html">Trust page</a>. FAQ lives on its <a href="faq.html">own page</a>.</p>
      </div>
      <div class="grid grid-2 trust-grid">
        <div class="card"><h3>Open source</h3><p>AGPL-3.0 scoring you can read.</p></div>
        <div class="card"><h3>Real pass marks</h3><p>675 and 700 on 100 to 900.</p></div>
      </div>
    </div>
  </section>

  <section class="section final">
    <div class="container">
      <div class="card">
        <h2>Book the exam when the score says you are ready.</h2>
        <p>Start with the free diagnostic. Share your readiness when it climbs. Bring a friend into the same loop.</p>
        <div class="hero-actions">
          <a class="btn btn-primary btn-lg" href="/app" data-busy>Open Clariora</a>
          <a class="btn btn-secondary btn-lg" href="compare.html">Competitor chart</a>
          <a class="btn btn-secondary btn-lg" href="https://github.com/LuminaraDigital/clariora-a-plus/releases/download/v__APLUS_VERSION__/CompTIA_A_Plus_Setup___APLUS_VERSION__.exe">Download for Windows</a>
        </div>
      </div>
    </div>
  </section>
"""

# Remove hidden FAQ hack from index - trust page + faq page are enough.
# Keep a visible short FAQ link block instead if tests need the string.


def main() -> None:
    write(
        "compare.html",
        "Why Clariora beats CertMaster, Messer packs, and Udemy dumps",
        "Competitor chart for CompTIA A+ prep: Clariora vs CertMaster Practice, Professor Messer bundles, and typical Udemy packs.",
        COMPARE_BODY,
    )
    write(
        "why.html",
        "Why Clariora A+",
        "Why Clariora measures scaled A+ readiness instead of vanity percentages.",
        WHY_BODY,
    )
    write(
        "how.html",
        "How Clariora works",
        "Three steps from free diagnostic to exam-day readiness.",
        HOW_BODY,
    )
    write(
        "pricing.html",
        "Clariora A+ pricing",
        "Free during 3.x. Planned $39 one-time personal licence. Academy and Telegram options.",
        PRICING_BODY,
    )
    write(
        "trust.html",
        "Trust Clariora A+",
        "Open source, tested builds, no invented testimonials.",
        TRUST_BODY,
    )
    write(
        "faq.html",
        "Clariora A+ FAQ",
        "Honest answers about pricing, scoring, offline use, and sharing readiness.",
        FAQ_BODY,
    )
    write(
        "index.html",
        "Clariora A+: know your CompTIA A+ score before you book the exam",
        "Free offline CompTIA A+ Core 1 and Core 2 exam simulator with scaled scoring and 1,130 explained questions.",
        INDEX_BODY,
    )


if __name__ == "__main__":
    main()
