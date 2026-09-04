import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import c2_utils

from c2_fixed_data_part1 import part1
from c2_fixed_data_part2 import part2
from c2_fixed_data_part3 import part3
from c2_fixed_data_part4 import part4

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHARDS_DIR = os.path.join(ROOT, "_bank", "shards")
os.makedirs(SHARDS_DIR, exist_ok=True)

all_fixed_data = part1 + part2 + part3 + part4

def build_shard():
    print(f"Total raw items across 4 parts: {len(all_fixed_data)}")
    
    seen_ids = set()
    final_questions = []
    
    for q in all_fixed_data:
        qid = q["id"]
        if qid in seen_ids:
            raise ValueError(f"Duplicate ID found: {qid}")
        seen_ids.add(qid)
        
        obj = q["objective"]
        dom = c2_utils.get_domain(obj)
        notes_ref = c2_utils.get_notes_ref(obj)
        vid_ref = c2_utils.get_video_ref(obj)
        
        item = {
            "exam": "core2",
            "domain": dom,
            "objective": obj,
            "type": "single",
            "difficulty": q.get("difficulty", "medium"),
            "question": q["question"],
            "options": q["options"],
            "answer": q["answer"],
            "explanation": q["explanation"],
            "distractor_analysis": q["distractor_analysis"],
            "video_reference": vid_ref,
            "notes_reference": notes_ref,
            "tags": q.get("tags", []),
            "id": qid
        }
        final_questions.append(item)
    
    out_file = os.path.join(SHARDS_DIR, "core2_fixed.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump({"questions": final_questions}, f, indent=2, ensure_ascii=False)
    print(f"Successfully built {len(final_questions)} questions in {out_file}")

if __name__ == "__main__":
    build_shard()
