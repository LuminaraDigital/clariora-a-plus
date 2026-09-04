#!/usr/bin/env python3
"""Build the FIX-C1 shard: 271 upgraded and modernized Core 1 questions (C1-001..271).
Upgraded to v3 format:
- Exact 220-1201 objective and domain mapping
- Canonical notes_reference and video_reference
- Explanations >= 120 chars with why correct and why each distractor fails
- Comprehensive distractor_analysis for all wrong options
- Zero markdown / zero answer leaks / zero positional references

Run from ROOT:  python tools/build_core1_fixed.py
Output:         _bank/shards/core1_fixed.json
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# Add tools directory to sys.path
sys.path.insert(0, HERE)

from fixed_c1_part1 import PART1_QUESTIONS
from fixed_c1_part2 import PART2_QUESTIONS
from fixed_c1_part3 import PART3_QUESTIONS
from fixed_c1_part4 import PART4_QUESTIONS
from fixed_c1_part5 import PART5_QUESTIONS
from fixed_c1_part6 import PART6_QUESTIONS

# Load canonical objectives
with open(os.path.join(ROOT, "tools", "objectives_220_1201.json"), "r", encoding="utf-8") as f:
    CANON_OBJS = json.load(f)["objectives"]

# Load notes mapping
with open(os.path.join(ROOT, "tools", "objective_notes_map.json"), "r", encoding="utf-8") as f:
    NOTES_MAP = json.load(f)["core1"]

# Load video references
with open(os.path.join(ROOT, "professor_messer_220_1201_videos.json"), "r", encoding="utf-8") as f:
    MESSER_VIDS = json.load(f)

# Preferred video per objective
PREF_VIDEOS = {}
for v in MESSER_VIDS:
    o = v.get("objective")
    if o and o not in PREF_VIDEOS:
        PREF_VIDEOS[o] = {
            "title": v["title"],
            "url": v["url"],
            "duration": v["duration"],
            "objective": o,
        }

VIDEOS_BY_TOPIC = {
    "2.1_ports": {"title": "Common Ports - CompTIA A+ 220-1201 - 2.1", "url": "https://www.youtube.com/watch?v=_qGlbfZ44hg", "duration": "12:52", "objective": "2.1"},
    "2.1_ip": {"title": "Introduction to IP - CompTIA A+ 220-1201 - 2.1", "url": "https://www.youtube.com/watch?v=RRFjKXxYJdM", "duration": "19:04", "objective": "2.1"},
    "2.4_dns": {"title": "DNS Configuration - CompTIA A+ 220-1201 - 2.4", "url": "https://www.youtube.com/watch?v=lAHqO9sDVy4", "duration": "18:18", "objective": "2.4"},
    "2.4_dhcp": {"title": "DHCP - CompTIA A+ 220-1201 - 2.4", "url": "https://www.youtube.com/watch?v=HwUqCZFx6wk", "duration": "10:45", "objective": "2.4"},
    "2.4_vlan": {"title": "VLANs and VPNs - CompTIA A+ 220-1201 - 2.4", "url": "https://www.youtube.com/watch?v=Z1wPgxsx4GI", "duration": "7:32", "objective": "2.4"},
    "3.1_types": {"title": "Display Types - CompTIA A+ 220-1201 - 3.1", "url": "https://www.youtube.com/watch?v=xOyialyd4JU", "duration": "9:13", "objective": "3.1"},
    "3.2_cable": {"title": "Network Cables - CompTIA A+ 220-1201 - 3.2", "url": "https://www.youtube.com/watch?v=29X5Ho3m2KU", "duration": "12:14", "objective": "3.2"},
    "3.2_copper": {"title": "Copper Connectors - CompTIA A+ 220-1201 - 3.2", "url": "https://www.youtube.com/watch?v=VO8C3lrWlVU", "duration": "8:33", "objective": "3.2"},
    "3.2_fiber": {"title": "Optical Fiber - CompTIA A+ 220-1201 - 3.2", "url": "https://www.youtube.com/watch?v=poQdq2APqic", "duration": "4:14", "objective": "3.2"},
    "3.4_raid": {"title": "RAID - CompTIA A+ 220-1201 - 3.4", "url": "https://www.youtube.com/watch?v=5E16qftlfRY", "duration": "8:08", "objective": "3.4"},
    "3.5_bios": {"title": "BIOS Settings - CompTIA A+ 220-1201 - 3.5", "url": "https://www.youtube.com/watch?v=QfJkU0vD3gg", "duration": "19:29", "objective": "3.5"},
    "3.5_cpu": {"title": "CPU Features - CompTIA A+ 220-1201 - 3.5", "url": "https://www.youtube.com/watch?v=4RPVQQd2sOM", "duration": "5:13", "objective": "3.5"},
    "3.5_tpm": {"title": "HSM and TPM - CompTIA A+ 220-1201 - 3.5", "url": "https://www.youtube.com/watch?v=qLSV_lpM_Mk", "duration": "7:47", "objective": "3.5"},
    "3.8_laser": {"title": "Laser Printer Maintenance - CompTIA A+ 220-1201 - 3.8", "url": "https://www.youtube.com/watch?v=hp2DfL6KxwA", "duration": "7:30", "objective": "3.8"},
    "3.8_thermal": {"title": "Thermal Printers - CompTIA A+ 220-1201 - 3.8", "url": "https://www.youtube.com/watch?v=izk4zbSkUTg", "duration": "3:39", "objective": "3.8"},
    "3.8_impact": {"title": "Impact Printers - CompTIA A+ 220-1201 - 3.8", "url": "https://www.youtube.com/watch?v=wkSlTGmPlWU", "duration": "6:19", "objective": "3.8"},
}


def get_video_ref(obj):
    if obj in PREF_VIDEOS:
        return dict(PREF_VIDEOS[obj])
    return {
        "title": "Introduction to IP - CompTIA A+ 220-1201 - 2.1",
        "url": "https://www.youtube.com/watch?v=RRFjKXxYJdM",
        "duration": "19:04",
        "objective": "2.1"
    }


def main():
    raw_list = (
        PART1_QUESTIONS
        + PART2_QUESTIONS
        + PART3_QUESTIONS
        + PART4_QUESTIONS
        + PART5_QUESTIONS
        + PART6_QUESTIONS
    )

    print(f"Aggregated {len(raw_list)} raw questions.")
    if len(raw_list) != 271:
        print(f"ERROR: expected 271 questions, got {len(raw_list)}")
        return 1

    final_questions = []
    seen_ids = set()

    for item in raw_list:
        qid = item["id"]
        if qid in seen_ids:
            print(f"ERROR: duplicate ID {qid}")
            return 1
        seen_ids.add(qid)

        obj = item["objective"]
        if obj not in CANON_OBJS:
            print(f"ERROR: unknown objective {obj} for {qid}")
            return 1

        domain = CANON_OBJS[obj]["domain"]
        notes_ref = NOTES_MAP[obj]
        vid_ref = get_video_ref(obj)

        q_obj = {
            "id": qid,
            "exam": "core1",
            "domain": domain,
            "objective": obj,
            "type": item.get("type", "single"),
            "difficulty": item.get("difficulty", "medium"),
            "question": item["question"].strip(),
            "options": item["options"],
            "answer": item["answer"],
            "explanation": item["explanation"].strip(),
            "distractor_analysis": item["distractor_analysis"],
            "video_reference": vid_ref,
            "notes_reference": notes_ref,
            "tags": item.get("tags", ["hardware"]),
        }
        final_questions.append(q_obj)

    out_path = os.path.join(ROOT, "_bank", "shards", "core1_fixed.json")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"questions": final_questions}, f, indent=2)

    print(f"Successfully generated {len(final_questions)} questions into {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
