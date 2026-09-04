import json
import os
import re

ROOT = r"c:\Users\lumin\Desktop\Datacentre_Academy\CompTia_A+"
with open(os.path.join(ROOT, "exam_data.json"), "r", encoding="utf-8") as f:
    data = json.load(f)

core1 = data["core1"]
print(f"Loaded {len(core1)} questions from exam_data.json")

# Let's inspect questions C1-001 to C1-040
for q in core1[:10]:
    print(q["id"], q.get("domain"), q.get("question")[:50])
