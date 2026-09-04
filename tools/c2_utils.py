import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

with open(os.path.join(ROOT, "tools", "objectives_220_1202.json"), encoding="utf-8") as f:
    OBJECTIVES_DATA = json.load(f)
    OBJECTIVES = OBJECTIVES_DATA["objectives"]

with open(os.path.join(ROOT, "tools", "objective_notes_map.json"), encoding="utf-8") as f:
    NOTES_MAP = json.load(f)["core2"]

with open(os.path.join(ROOT, "professor_messer_220_1202_videos.json"), encoding="utf-8") as f:
    VIDEOS_LIST = json.load(f)

VIDEOS_BY_OBJ = {}
for v in VIDEOS_LIST:
    VIDEOS_BY_OBJ.setdefault(v["objective"], []).append(v)

def get_domain(objective):
    if objective in OBJECTIVES:
        return OBJECTIVES[objective]["domain"]
    raise ValueError(f"Unknown Core 2 objective: {objective}")

def get_notes_ref(objective):
    if objective in NOTES_MAP:
        return NOTES_MAP[objective]
    raise ValueError(f"No notes_reference mapped for Core 2 objective: {objective}")

def get_video_ref(objective, title_hint=None):
    vids = VIDEOS_BY_OBJ.get(objective)
    if not vids:
        raise ValueError(f"No video found for objective {objective}")
    if title_hint:
        for v in vids:
            if title_hint.lower() in v["title"].lower():
                return {
                    "title": v["title"],
                    "url": v["url"],
                    "duration": v["duration"],
                    "objective": v["objective"]
                }
    v = vids[0]
    return {
        "title": v["title"],
        "url": v["url"],
        "duration": v["duration"],
        "objective": v["objective"]
    }
