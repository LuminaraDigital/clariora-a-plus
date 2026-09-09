#!/usr/bin/env python3
"""Build curriculum_outline.json from Clariora's own course catalog.

Creates a CertMaster-style module tree (topics/labs/videos/assessments with
time estimates and high-score slots) using ONLY Clariora-owned media and the
official CompTIA objective codes already in objectives_data.json.

Does NOT ingest CompTIA CertMaster lesson bodies or proprietary quiz text.
Competitive targets (counts) are metadata for product gap tracking only.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CURRICULUM = ROOT / "curriculum_data.json"
OBJECTIVES = ROOT / "objectives_data.json"
OUT_JSON = ROOT / "curriculum_outline.json"
OUT_JS = ROOT / "curriculum_outline.js"

# Map our module decks to exam bank domain prefixes for assessment sampling.
MODULE_DOMAIN = {
    1: ("core1", "3.0 Hardware"),
    2: ("core1", "3.0 Hardware"),
    3: ("core1", "3.0 Hardware"),
    4: ("core1", "3.0 Hardware"),
    5: ("core1", "2.0 Networking"),
    6: ("core1", "2.0 Networking"),
    7: ("core1", "2.0 Networking"),
    8: ("core1", "1.0 Mobile Devices"),
    9: ("core1", "3.0 Hardware"),
    10: ("core1", "4.0 Virtualization and Cloud Computing"),
    11: ("core2", "4.0 Operational Procedures"),
    12: ("core2", "1.0 Operating Systems"),
    13: ("core2", "1.0 Operating Systems"),
    14: ("core2", "1.0 Operating Systems"),
    15: ("core2", "2.0 Security"),
    16: ("core2", "2.0 Security"),
    17: ("core2", "1.0 Operating Systems"),
    18: ("core2", "3.0 Software Troubleshooting"),
    19: ("core2", "2.0 Security"),
    20: ("core2", "2.0 Security"),
    21: ("core2", "4.0 Operational Procedures"),
    22: ("core2", "4.0 Operational Procedures"),
}

# Heuristic lab -> module attachment (our lab numbers to course modules).
LAB_MODULE = {
    1: 12,
    2: 1,
    3: 12,
    4: 5,
    5: 5,
    6: 7,
    7: 15,
    8: 5,
    9: 14,
    10: 12,
    11: 12,
    12: 13,
    13: 14,
    14: 13,
    15: 13,
    16: 13,
    17: 2,
    18: 14,
    19: 14,
    20: 14,
    21: 14,
    22: 14,
    23: 14,
    24: 14,
    25: 13,
    26: 13,
    27: 21,
    28: 21,
    29: 18,
    30: 16,
    32: 16,
    33: 16,
    34: 15,
}

VIDEO_KEYWORDS = [
    (r"bios|uefi|firmware|motherboard|cpu|ram|storage|power|cooling|cable|connector|printer|hardware", "core1", list(range(1, 5)) + [9]),
    (r"network|wireless|soho|tcp|ip|wifi|nic", "core1", [5, 6, 7]),
    (r"mobile|laptop|phone|tablet", "core1", [8]),
    (r"virtual|cloud|hypervisor", "core1", [10]),
    (r"windows|cli|command|file explorer|task manager|install", "core2", [12, 13, 14]),
    (r"secur|malware|threat|bitlocker|firewall|password", "core2", [15, 16, 19, 20]),
    (r"troubleshoot|software", "core2", [18]),
    (r"linux|mac|android|other.?os", "core2", [17]),
    (r"change|document|safety|professional|asset|licens|operational", "core2", [11, 21, 22]),
]

CHECKPOINT_AFTER = {4, 7, 10, 14, 17, 20, 22}

# Structure-only competitive targets (counts from CertMaster Learn TOC study).
# Titles and lesson bodies are NOT imported.
COMPETITIVE_TARGETS = {
    "source": "structure_counts_only",
    "note": "Targets are activity counts for product parity planning. Do not treat as license to copy CertMaster content.",
    "modules": 22,
    "topics": 746,
    "labs": 130,
    "videos": 36,
    "assessments": 111,
    "assessment_kinds": {
        "lesson_review": 69,
        "module_quiz": 22,
        "checkpoint_review": 7,
        "exam_practice": 11,
    },
}


def load_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def estimate_slide_minutes(slide: dict) -> int:
    n = len(slide.get("deck") or []) or int(slide.get("slides") or 0) or 20
    return max(8, min(45, int(round(n * 0.55))))


def estimate_lab_minutes(lab: dict) -> int:
    blocks = lab.get("blocks") or []
    if lab.get("format") == "markdown":
        return 15
    n = len(blocks)
    if n >= 60:
        return 45
    if n >= 20:
        return 30
    if n >= 5:
        return 20
    return 15


def estimate_video_minutes(video: dict) -> int:
    mb = float(video.get("size_mb") or 50)
    # Rough: ~8 MB/min for compressed lecture video in this pack.
    return max(5, min(40, int(round(mb / 8.0))))


def objectives_for_domain(objectives: list, exam: str, domain: str) -> list[str]:
    out = []
    for obj in objectives:
        if obj.get("exam") != exam:
            continue
        if str(obj.get("domain") or "").startswith(domain[:3]):
            out.append(obj.get("code"))
    return sorted({c for c in out if c})


def pick_video_modules(title: str, exam: str) -> list[int]:
    t = title.lower()
    for pattern, ex, mods in VIDEO_KEYWORDS:
        if exam not in (ex, "both") and exam != ex:
            continue
        if re.search(pattern, t):
            return mods[:2]
    if exam == "core1":
        return [1]
    if exam == "core2":
        return [12]
    return [1, 12]


def build() -> dict:
    curriculum = load_json(CURRICULUM)
    objectives_doc = load_json(OBJECTIVES)
    objectives = objectives_doc.get("objectives") or []

    modules: dict[int, dict] = {}
    for slide in curriculum.get("slides") or []:
        mno = int(slide.get("module_no") or 0)
        if not mno:
            continue
        exam, domain = MODULE_DOMAIN.get(mno, (slide.get("exam") or "both", ""))
        minutes = estimate_slide_minutes(slide)
        modules[mno] = {
            "module_no": mno,
            "id": f"module-{mno:02d}",
            "title": slide.get("short_title") or slide.get("title") or f"Module {mno}",
            "exam": exam,
            "domain": domain,
            "objective_codes": objectives_for_domain(objectives, exam, domain) if domain else [],
            "slide_id": slide.get("id"),
            "estimated_minutes": minutes,
            "activities": [
                {
                    "id": f"topic-m{mno:02d}-deck",
                    "kind": "topic",
                    "title": slide.get("short_title") or slide.get("title"),
                    "ref_id": slide.get("id"),
                    "estimated_minutes": minutes,
                    "source": "slides",
                }
            ],
        }

    for lab in curriculum.get("labs") or []:
        lab_no = lab.get("lab_no")
        mno = LAB_MODULE.get(lab_no) if lab_no is not None else None
        if mno is None:
            # Guides attach to module 1 as orientation.
            mno = 1 if lab.get("format") == "markdown" else None
        if mno is None or mno not in modules:
            continue
        minutes = estimate_lab_minutes(lab)
        modules[mno]["activities"].append(
            {
                "id": f"lab-{lab.get('id')}",
                "kind": "lab",
                "title": lab.get("title"),
                "ref_id": lab.get("id"),
                "lab_no": lab_no,
                "estimated_minutes": minutes,
                "source": "labs",
                "supports_high_score": True,
            }
        )
        modules[mno]["estimated_minutes"] += minutes

    for video in curriculum.get("videos") or []:
        exam = video.get("exam") or "both"
        candidates = pick_video_modules(video.get("title") or "", exam)
        mno = next((m for m in candidates if m in modules), None)
        if mno is None:
            continue
        minutes = estimate_video_minutes(video)
        modules[mno]["activities"].append(
            {
                "id": f"video-{video.get('id')}",
                "kind": "video",
                "title": video.get("title"),
                "ref_id": video.get("id"),
                "estimated_minutes": minutes,
                "source": "videos",
            }
        )
        modules[mno]["estimated_minutes"] += minutes

    assessments: list[dict] = []
    for mno, mod in sorted(modules.items()):
        exam, domain = MODULE_DOMAIN[mno]
        # Lesson review per module (objective drill).
        assessments.append(
            {
                "id": f"assess-m{mno:02d}-lesson-review",
                "kind": "lesson_review",
                "module_no": mno,
                "title": f"Module {mno} Lesson Review",
                "exam": exam,
                "domain": domain,
                "objective_codes": mod["objective_codes"][:6],
                "question_count": 10,
                "estimated_minutes": 15,
                "supports_high_score": True,
            }
        )
        # Module quiz.
        assessments.append(
            {
                "id": f"assess-m{mno:02d}-module-quiz",
                "kind": "module_quiz",
                "module_no": mno,
                "title": f"Module {mno} Module Quiz",
                "exam": exam,
                "domain": domain,
                "objective_codes": mod["objective_codes"],
                "question_count": 15 if mno <= 10 else 12,
                "estimated_minutes": 20,
                "supports_high_score": True,
            }
        )
        modules[mno]["activities"].append(
            {
                "id": f"assess-m{mno:02d}-module-quiz",
                "kind": "assessment",
                "assessment_kind": "module_quiz",
                "title": f"Module {mno} Module Quiz",
                "ref_id": f"assess-m{mno:02d}-module-quiz",
                "estimated_minutes": 20,
                "supports_high_score": True,
            }
        )
        if mno in CHECKPOINT_AFTER:
            assessments.append(
                {
                    "id": f"assess-m{mno:02d}-checkpoint",
                    "kind": "checkpoint_review",
                    "module_no": mno,
                    "title": f"Checkpoint Review through Module {mno}",
                    "exam": exam,
                    "domain": domain,
                    "modules_through": mno,
                    "question_count": 25,
                    "estimated_minutes": 30,
                    "supports_high_score": True,
                }
            )

    # Exam practice packs (domain + full cores).
    practice = [
        ("exam-practice-c1-mobile", "core1", "1.0 Mobile Devices", "Exam Practice: Mobile Devices", 20, 20),
        ("exam-practice-c1-networking", "core1", "2.0 Networking", "Exam Practice: Networking", 20, 20),
        ("exam-practice-c1-hardware", "core1", "3.0 Hardware", "Exam Practice: Hardware", 20, 20),
        ("exam-practice-c1-cloud", "core1", "4.0 Virtualization and Cloud Computing", "Exam Practice: Virtualization and Cloud", 15, 20),
        ("exam-practice-c1-troubleshoot", "core1", "5.0 Hardware and Network Troubleshooting", "Exam Practice: Hardware and Network Troubleshooting", 20, 20),
        ("exam-practice-c1-full", "core1", None, "A+ Core 1 Exam Practice", 90, 90),
        ("exam-practice-c2-os", "core2", "1.0 Operating Systems", "Exam Practice: Operating Systems", 20, 20),
        ("exam-practice-c2-security", "core2", "2.0 Security", "Exam Practice: Security", 20, 20),
        ("exam-practice-c2-swts", "core2", "3.0 Software Troubleshooting", "Exam Practice: Software Troubleshooting", 20, 20),
        ("exam-practice-c2-ops", "core2", "4.0 Operational Procedures", "Exam Practice: Operational Procedures", 20, 20),
        ("exam-practice-c2-full", "core2", None, "A+ Core 2 Exam Practice", 90, 90),
    ]
    for pid, exam, domain, title, qcount, minutes in practice:
        assessments.append(
            {
                "id": pid,
                "kind": "exam_practice",
                "module_no": None,
                "title": title,
                "exam": exam,
                "domain": domain,
                "question_count": qcount,
                "estimated_minutes": minutes,
                "supports_high_score": True,
            }
        )

    module_list = [modules[k] for k in sorted(modules)]
    ours = {
        "modules": len(module_list),
        "topics": sum(1 for m in module_list for a in m["activities"] if a["kind"] == "topic"),
        "labs": sum(1 for m in module_list for a in m["activities"] if a["kind"] == "lab"),
        "videos": sum(1 for m in module_list for a in m["activities"] if a["kind"] == "video"),
        "assessments": len(assessments),
        "assessment_kinds": {
            "lesson_review": sum(1 for a in assessments if a["kind"] == "lesson_review"),
            "module_quiz": sum(1 for a in assessments if a["kind"] == "module_quiz"),
            "checkpoint_review": sum(1 for a in assessments if a["kind"] == "checkpoint_review"),
            "exam_practice": sum(1 for a in assessments if a["kind"] == "exam_practice"),
        },
        "estimated_minutes_total": sum(m["estimated_minutes"] for m in module_list)
        + sum(a["estimated_minutes"] for a in assessments if a["kind"] != "module_quiz"),
    }

    gaps = {
        "topics": max(0, COMPETITIVE_TARGETS["topics"] - ours["topics"]),
        "labs": max(0, COMPETITIVE_TARGETS["labs"] - ours["labs"]),
        "videos": max(0, COMPETITIVE_TARGETS["videos"] - ours["videos"]),
        "assessments": max(0, COMPETITIVE_TARGETS["assessments"] - ours["assessments"]),
    }

    return {
        "version": "1.0",
        "title": "Clariora A+ Premium Curriculum Outline",
        "description": (
            "Module tree with topics, labs, videos, and assessment packs. "
            "Built from Clariora course media and official objective codes. "
            "Does not include CompTIA CertMaster proprietary lesson text."
        ),
        "competitive_targets": COMPETITIVE_TARGETS,
        "ours": ours,
        "gaps": gaps,
        "modules": module_list,
        "assessments": assessments,
    }


def write_js(data: dict) -> None:
    payload = json.dumps(data, ensure_ascii=False, indent=2)
    OUT_JS.write_text(
        "/* Auto-generated by tools/build_curriculum_outline.py - do not edit by hand. */\n"
        "window.COMPTIA_CURRICULUM_OUTLINE = " + payload + ";\n",
        encoding="utf-8",
    )


def main() -> None:
    data = build()
    OUT_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_js(data)
    ours = data["ours"]
    gaps = data["gaps"]
    print(
        f"Wrote {OUT_JSON.name}: modules={ours['modules']} "
        f"topics={ours['topics']} labs={ours['labs']} videos={ours['videos']} "
        f"assessments={ours['assessments']}"
    )
    print(
        f"Gaps vs structure targets: topics={gaps['topics']} labs={gaps['labs']} "
        f"videos={gaps['videos']} assessments={gaps['assessments']}"
    )


if __name__ == "__main__":
    main()
