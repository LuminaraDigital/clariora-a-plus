#!/usr/bin/env python3
"""content_audit.py - senior-technician content audit for the CompTIA A+ v3 bank.

Reads the shard files in _bank/shards/*.json (default) or a merged bank file and
reports the content smells that make a question bank look amateur to a working
technician. Every rule prints a count plus the first 15 offending ids.

Rules
  R01 explanation under 200 characters
  R02 stem under 80 characters
  R03 options with inconsistent capitalization inside one question
  R04 longest option more than 1.8x the median option length (correct-answer tell)
  R05 answer key position balance per exam
  R06 "Select TWO" stems that do not carry exactly 2 answers
  R07 option containing "all of the above" or "both"
  R08 explanation that never names a distractor
  R09 video_reference.objective not equal to the question objective
  R10 hype words in stems (enterprise, mission-critical, cutting-edge, seamlessly, robust)

Usage
  python tools/content_audit.py
  python tools/content_audit.py --bank CompTIA_A_Plus_Desktop_App/resources/app/exam_data.json
  python tools/content_audit.py --json audit.json
"""
import argparse
import glob
import json
import os
import re
import statistics
import sys
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHARD_GLOB = os.path.join(ROOT, "_bank", "shards", "*.json")

MIN_EXPL = 200
MIN_STEM = 80
LONG_OPTION_RATIO = 1.8
BALANCE_MIN, BALANCE_MAX = 0.15, 0.35

HYPE_WORDS = [
    "enterprise",
    "mission-critical",
    "mission critical",
    "cutting-edge",
    "cutting edge",
    "seamlessly",
    "seamless",
    "robust",
]

# Real product and standard names that legitimately contain a hype word.
PRODUCT_NAMES = re.compile(
    r"WPA[23]-Enterprise|Windows (?:10|11|Server[a-z0-9 ]*) Enterprise|"
    r"Enterprise Linux|Red Hat Enterprise",
    re.IGNORECASE,
)

BOTH_RE = re.compile(r"\ball of the above\b|\bboth\b", re.IGNORECASE)
# Positional usage is the real defect: the engine shuffles options at render time,
# so an option that refers to other options breaks. Descriptive "both X and Y" is fine.
POSITIONAL_BOTH_RE = re.compile(
    r"\b(all|both|none|either|neither)\s+of\s+(the\s+)?(above|these|following|answers|options)\b"
    r"|\bboth\s+[abcd]\s+and\s+[abcd]\b"
    r"|\bboth\s+(answers|options|choices)\b",
    re.IGNORECASE,
)
SELECT_TWO_RE = re.compile(r"select\s+two", re.IGNORECASE)
WORD_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9/._+-]{2,}")

STOPWORDS = {
    "the", "and", "for", "with", "that", "this", "from", "into", "when", "then",
    "than", "will", "would", "should", "could", "does", "not", "are", "was", "were",
    "use", "used", "using", "user", "users", "all", "any", "each", "only", "same",
    "other", "another", "correct", "answer", "option", "options", "select", "two",
    "one", "new", "old", "set", "get", "run", "runs", "make", "made", "also",
    "但", "その",
}


def load_questions(bank_path=None):
    """Return a flat list of (source_label, question) tuples."""
    rows = []
    if bank_path:
        with open(bank_path, encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict):
            for core in ("core1", "core2"):
                for q in data.get(core, []) or []:
                    rows.append((os.path.basename(bank_path), q))
        else:
            for q in data:
                rows.append((os.path.basename(bank_path), q))
        return rows

    for path in sorted(glob.glob(SHARD_GLOB)):
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        qs = data.get("questions") if isinstance(data, dict) else data
        for q in qs or []:
            rows.append((os.path.basename(path), q))
    return rows


def leading_case(text):
    """Case of the option's first ordinary word.

    Acronyms, product names and part numbers (ARM, NVMe, ATX12V, M.2, 3.5-inch)
    carry their own capitalization, so they are skipped rather than flagged.
    Returns "upper", "lower" or None.
    """
    words = str(text or "").split()
    if len(words) < 2:
        # A bare identifier or command name carries its own capitalization.
        return None
    for raw in words:
        token = raw.strip("`'\"([{*.,;:-")
        if not token or not any(c.isalpha() for c in token):
            continue
        if any(c.isdigit() for c in token):
            return None
        if any(c.isupper() for c in token[1:]):
            return None
        if token.isupper():
            return None
        return "upper" if token[0].isupper() else "lower"
    return None


def capitalization_mixed(options):
    """True when the leading words of the options are not consistently cased."""
    leads = [leading_case(o) for o in options]
    leads = [c for c in leads if c]
    if len(leads) < 2:
        return False
    return "upper" in leads and "lower" in leads


def long_option_tell(options):
    """Return (longest_len, median_len) when the longest option is a length tell."""
    lens = [len(o.strip()) for o in options if o and o.strip()]
    if len(lens) < 3:
        return None
    median = statistics.median(lens)
    longest = max(lens)
    if median > 0 and longest > LONG_OPTION_RATIO * median:
        return longest, median
    return None


def significant_tokens(text):
    out = set()
    for m in WORD_RE.finditer(text or ""):
        w = m.group(0).lower().strip("._-/+")
        if len(w) < 3 or w in STOPWORDS:
            continue
        out.add(w)
    return out


def explanation_names_distractor(q):
    """True when the explanation references at least one wrong option."""
    expl = (q.get("explanation") or "")
    if q.get("distractor_analysis"):
        return True
    opts = q.get("options") or []
    if not opts:
        return True  # match/order questions have no distractor options
    qtype = q.get("type", "single")
    if qtype == "single":
        keyed = {q.get("answer")}
    elif qtype == "multi":
        keyed = set(q.get("answers") or [])
    else:
        keyed = set()
    expl_tokens = significant_tokens(expl)
    if not expl_tokens:
        return False
    correct_tokens = set()
    for i in keyed:
        if isinstance(i, int) and 0 <= i < len(opts):
            correct_tokens |= significant_tokens(opts[i])
    for i, opt in enumerate(opts):
        if i in keyed:
            continue
        distinct = significant_tokens(opt) - correct_tokens
        if distinct & expl_tokens:
            return True
    return False


def hype_in_stem(stem):
    low = PRODUCT_NAMES.sub(" ", stem or "").lower()
    return [w for w in HYPE_WORDS if w in low]


def audit(rows):
    findings = defaultdict(list)
    per_exam_keys = defaultdict(Counter)
    per_exam_singles = Counter()

    for src, q in rows:
        qid = q.get("id", "?")
        where = f"{qid} ({src})"
        stem = q.get("question") or ""
        expl = (q.get("explanation") or "").strip()
        opts = q.get("options") or []
        qtype = q.get("type", "single")

        if len(expl) < MIN_EXPL:
            findings["R01"].append(f"{where} explanation {len(expl)} chars")

        if len(stem.strip()) < MIN_STEM:
            findings["R02"].append(f"{where} stem {len(stem.strip())} chars")

        if opts and capitalization_mixed(opts):
            findings["R03"].append(f"{where} mixed option capitalization")

        if opts:
            tell = long_option_tell(opts)
            if tell:
                longest, median = tell
                findings["R04"].append(
                    f"{where} longest {longest} vs median {median:.0f} "
                    f"({longest / median:.2f}x)"
                )

        if qtype == "single" and isinstance(q.get("answer"), int):
            per_exam_keys[q.get("exam", "?")][q["answer"]] += 1
            per_exam_singles[q.get("exam", "?")] += 1

        if SELECT_TWO_RE.search(stem):
            answers = q.get("answers")
            if not isinstance(answers, list) or len(answers) != 2:
                findings["R06"].append(
                    f"{where} Select TWO stem with {0 if not answers else len(answers)} answers"
                )

        for opt in opts:
            if BOTH_RE.search(opt or ""):
                kind = "POSITIONAL" if POSITIONAL_BOTH_RE.search(opt or "") else "descriptive"
                findings["R07"].append(f"{where} [{kind}] {opt.strip()[:60]}")
                break

        if not explanation_names_distractor(q):
            findings["R08"].append(f"{where} explanation names no distractor")

        vr = q.get("video_reference")
        if vr and vr.get("objective") != q.get("objective"):
            findings["R09"].append(
                f"{where} video objective {vr.get('objective')} != {q.get('objective')}"
            )

        hype = hype_in_stem(stem)
        if hype:
            findings["R10"].append(f"{where} hype: {', '.join(hype)}")

    balance = {}
    for exam, counter in sorted(per_exam_keys.items()):
        n = per_exam_singles[exam] or 1
        rows_out = []
        for pos in range(4):
            frac = counter.get(pos, 0) / n
            flag = "" if BALANCE_MIN <= frac <= BALANCE_MAX else "  OUT OF RANGE"
            rows_out.append(f"pos {pos}: {counter.get(pos, 0):4d}  {frac:6.1%}{flag}")
            if not (BALANCE_MIN <= frac <= BALANCE_MAX):
                findings["R05"].append(f"[{exam}] keyed position {pos} = {frac:.1%}")
        balance[exam] = (n, rows_out)

    return findings, balance


RULE_TITLES = {
    "R01": f"Explanations under {MIN_EXPL} characters",
    "R02": f"Stems under {MIN_STEM} characters",
    "R03": "Inconsistent option capitalization within a question",
    "R04": f"Longest option more than {LONG_OPTION_RATIO}x the median (answer tell)",
    "R05": "Answer key position balance per exam",
    "R06": "Select TWO stems without exactly 2 answers",
    "R07": "Options containing 'all of the above' or 'both'",
    "R08": "Explanations that never name a distractor",
    "R09": "video_reference objective mismatches",
    "R10": "Hype words in stems",
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bank", help="audit a merged bank file instead of the shards")
    ap.add_argument("--json", dest="json_out", help="write the full finding lists to this path")
    ap.add_argument("--limit", type=int, default=15, help="offenders printed per rule")
    args = ap.parse_args()

    rows = load_questions(args.bank)
    if not rows:
        print("No questions found.")
        return 1

    findings, balance = audit(rows)

    sources = Counter(src for src, _ in rows)
    print(f"Content audit: {len(rows)} questions from {len(sources)} file(s)")
    for src, n in sorted(sources.items()):
        print(f"  {src}: {n}")
    print()

    print("Answer key balance")
    for exam, (n, lines) in balance.items():
        print(f"  {exam} ({n} single-choice)")
        for line in lines:
            print(f"    {line}")
    print()

    total = 0
    for rule in sorted(RULE_TITLES):
        items = findings.get(rule, [])
        if rule == "R05":
            print(f"{rule} {RULE_TITLES[rule]}: {len(items)} out-of-range position(s)")
            print("    note: tools/build_bank.py rotates options to balance the merged bank,")
            print("    so run this against the built exam_data.json to see the shipped balance.")
        elif rule == "R07":
            positional = sum(1 for i in items if "[POSITIONAL]" in i)
            print(f"{rule} {RULE_TITLES[rule]}: {len(items)} "
                  f"({positional} positional, {len(items) - positional} descriptive)")
        else:
            print(f"{rule} {RULE_TITLES[rule]}: {len(items)}")
        total += len(items)
        for line in items[: args.limit]:
            print(f"    - {line}")
        if len(items) > args.limit:
            print(f"    ... {len(items) - args.limit} more")
        print()

    print(f"TOTAL FINDINGS: {total}")

    if args.json_out:
        with open(args.json_out, "w", encoding="utf-8") as f:
            json.dump({k: v for k, v in findings.items()}, f, indent=2)
        print(f"Wrote {args.json_out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
