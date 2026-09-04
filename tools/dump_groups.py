import json
import os

ROOT = r"c:\Users\lumin\Desktop\Datacentre_Academy\CompTia_A+"
with open(os.path.join(ROOT, "exam_data.json"), "r", encoding="utf-8") as f:
    core1 = json.load(f)["core1"]

def dump_range(start, end, fname):
    with open(fname, "w", encoding="utf-8") as out:
        for i in range(start, min(end, len(core1))):
            q = core1[i]
            out.write(f"--- {q['id']} (Index {i}) ---\n")
            out.write(f"Stem: {q.get('question')}\n")
            out.write(f"Options: {q.get('options')}\n")
            out.write(f"Answer: {q.get('answer')}\n")
            out.write(f"Domain: {q.get('domain')}\n")
            out.write(f"Expl: {q.get('explanation')}\n\n")

dump_range(0, 50, os.path.join(ROOT, "tools", "group1_raw.txt"))
dump_range(50, 100, os.path.join(ROOT, "tools", "group2_raw.txt"))
dump_range(100, 150, os.path.join(ROOT, "tools", "group3_raw.txt"))
dump_range(150, 200, os.path.join(ROOT, "tools", "group4_raw.txt"))
dump_range(200, 250, os.path.join(ROOT, "tools", "group5_raw.txt"))
dump_range(250, 271, os.path.join(ROOT, "tools", "group6_raw.txt"))
print("Dumped all 6 groups.")
