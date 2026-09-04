import json
import re

path = r"C:\Users\lumin\.gemini\antigravity\brain\c5a5b51b-62c1-413e-a630-be9174f6ce53\.system_generated\steps\119\content.md"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

m = re.search(r'var ytInitialData = ({.*?});</script>', text)
data = json.loads(m.group(1))

lockups = []
def find_lockups(obj):
    if isinstance(obj, dict):
        if 'lockupViewModel' in obj:
            lockups.append(obj['lockupViewModel'])
        for k, v in obj.items():
            find_lockups(v)
    elif isinstance(obj, list):
        for item in obj:
            find_lockups(item)

find_lockups(data)

videos = []
for idx, lk in enumerate(lockups):
    # Title
    title = lk.get('metadata', {}).get('lockupMetadataViewModel', {}).get('title', {}).get('content', '')
    
    # Video ID
    video_id = ""
    endpoint = lk.get('rendererContext', {}).get('commandContext', {}).get('onTap', {})
    # check onTap or contentImage
    img_sources = lk.get('contentImage', {}).get('thumbnailViewModel', {}).get('image', {}).get('sources', [])
    for src in img_sources:
        url = src.get('url', '')
        vid_m = re.search(r'/vi/([a-zA-Z0-9_-]{11})/', url)
        if vid_m:
            video_id = vid_m.group(1)
            break
            
    # Duration badge
    duration = ""
    overlays = lk.get('contentImage', {}).get('thumbnailViewModel', {}).get('overlays', [])
    for ov in overlays:
        badges = ov.get('thumbnailBottomOverlayViewModel', {}).get('badges', [])
        for b in badges:
            b_text = b.get('thumbnailBadgeViewModel', {}).get('text', '')
            if b_text and any(c.isdigit() for c in b_text):
                duration = b_text
                break

    # Objective mapping
    obj_match = re.search(r'(\d+\.\d+)', title)
    comp_obj = obj_match.group(1) if obj_match else "Overview"
    
    videos.append({
        "index": idx + 1,
        "title": title,
        "videoId": video_id,
        "url": f"https://www.youtube.com/watch?v={video_id}" if video_id else "",
        "duration": duration,
        "objective": comp_obj
    })

print(f"Extracted {len(videos)} videos.")
with open("professor_messer_220_1201_videos.json", "w", encoding="utf-8") as f:
    json.dump(videos, f, indent=2)

for v in videos[:15]:
    print(f"#{v['index']} [{v['duration']}] {v['title']} -> {v['url']}")
