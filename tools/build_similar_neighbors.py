#!/usr/bin/env python3
"""
build_similar_neighbors.py - TF-IDF cosine neighbors for the exam bank.

Writes similar_neighbors.json for offline client use and optionally a D1 SQL
seed for question_neighbors. No external ML deps required.

Usage:
  python tools/build_similar_neighbors.py
  python tools/build_similar_neighbors.py --k 5 --out similar_neighbors.json
"""
from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOKEN_RE = re.compile(r"[a-z0-9]+", re.I)
STOP = {
    "a", "an", "the", "and", "or", "of", "to", "in", "on", "for", "is", "are",
    "be", "as", "by", "with", "that", "this", "from", "at", "it", "which", "what",
    "when", "how", "who", "not", "no", "yes", "can", "will", "should", "must",
}


def tokenize(text: str) -> list[str]:
    return [t for t in TOKEN_RE.findall((text or "").lower()) if t not in STOP and len(t) > 1]


def load_questions(bank_path: Path) -> list[dict]:
    with bank_path.open(encoding="utf-8") as f:
        bank = json.load(f)
    out = []
    for core in ("core1", "core2"):
        block = bank.get(core) or []
        if isinstance(block, dict):
            block = block.get("questions") or []
        for q in block:
            if isinstance(q, dict) and q.get("id"):
                out.append(q)
    return out


def build_tfidf(docs: list[list[str]]):
    n = len(docs)
    df = Counter()
    for toks in docs:
        df.update(set(toks))
    idf = {t: math.log((1 + n) / (1 + c)) + 1.0 for t, c in df.items()}
    vectors = []
    for toks in docs:
        tf = Counter(toks)
        length = float(len(toks) or 1)
        vec = {t: (tf[t] / length) * idf[t] for t in tf if t in idf}
        # L2 normalize
        norm = math.sqrt(sum(v * v for v in vec.values())) or 1.0
        vectors.append({t: v / norm for t, v in vec.items()})
    return vectors


def cosine(a: dict, b: dict) -> float:
    if len(a) > len(b):
        a, b = b, a
    return sum(v * b.get(t, 0.0) for t, v in a.items())


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--bank", default=str(ROOT / "exam_data.json"))
    ap.add_argument("--k", type=int, default=5)
    ap.add_argument("--out", default=str(ROOT / "similar_neighbors.json"))
    ap.add_argument("--sql-out", default=str(ROOT / "_bank" / "analysis" / "question_neighbors.sql"))
    args = ap.parse_args()

    qs = load_questions(Path(args.bank))
    if not qs:
        print("No questions found", file=sys.stderr)
        return 1

    docs = []
    for q in qs:
        blob = " ".join(
            [
                str(q.get("question") or ""),
                str(q.get("explanation") or ""),
                str(q.get("objective") or ""),
                str(q.get("domain") or ""),
                " ".join(str(t) for t in (q.get("tags") or [])),
            ]
        )
        docs.append(tokenize(blob))

    vectors = build_tfidf(docs)
    neighbors: dict[str, list[str]] = {}
    k = max(1, min(20, args.k))

    for i, q in enumerate(qs):
        scores = []
        for j, other in enumerate(qs):
            if i == j:
                continue
            # Soft prefer same exam / domain
            bonus = 0.0
            if q.get("exam") and q.get("exam") == other.get("exam"):
                bonus += 0.02
            if q.get("domain") and q.get("domain") == other.get("domain"):
                bonus += 0.04
            if q.get("objective") and q.get("objective") == other.get("objective"):
                bonus += 0.06
            scores.append((cosine(vectors[i], vectors[j]) + bonus, other["id"]))
        scores.sort(reverse=True)
        neighbors[q["id"]] = [sid for _, sid in scores[:k]]

    payload = {
        "version": 1,
        "model": "tfidf-cosine-v1",
        "k": k,
        "count": len(neighbors),
        "neighbors": neighbors,
    }
    out_path = Path(args.out)
    out_path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {out_path} ({len(neighbors)} questions, k={k})")

    sql_path = Path(args.sql_out)
    sql_path.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "CREATE TABLE IF NOT EXISTS question_neighbors (",
        "  question_id TEXT PRIMARY KEY,",
        "  neighbor_ids TEXT NOT NULL,",
        "  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        ");",
    ]
    for qid, ids in neighbors.items():
        ids_json = json.dumps(ids, separators=(",", ":")).replace("'", "''")
        qid_esc = str(qid).replace("'", "''")
        lines.append(
            "INSERT INTO question_neighbors (question_id, neighbor_ids) VALUES "
            f"('{qid_esc}', '{ids_json}') "
            "ON CONFLICT(question_id) DO UPDATE SET neighbor_ids=excluded.neighbor_ids, "
            "updated_at=CURRENT_TIMESTAMP;"
        )
    sql_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {sql_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
