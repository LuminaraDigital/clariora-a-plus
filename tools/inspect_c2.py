import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP_JSON = os.path.join(ROOT, "CompTIA_A_Plus_Desktop_App", "resources", "app", "exam_data.json")

with open(APP_JSON, encoding="utf-8") as f:
    data = json.load(f)

c2 = data["core2"]
print(f"Total Core 2 questions: {len(c2)}")

with open(os.path.join(ROOT, "tools", "c2_raw_dump.json"), "w", encoding="utf-8") as f:
    json.dump(c2, f, indent=2)
print("Dumped to tools/c2_raw_dump.json")
