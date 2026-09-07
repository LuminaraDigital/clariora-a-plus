#!/usr/bin/env python3
"""
build_curriculum.py

Ingest Labs for A+, PowerPoint for A+, and Videos For A+ into:
  - curriculum_data.js / curriculum_data.json  (catalog + extracted text)
  - media/labs/   (docx + guide markdown, for download/open)
  - media/slides/ (pptx originals)
  - media/videos/ (flattened mp4 hardlinks when possible)

Web builds ship the JS catalog + extracts. Video binaries stay under media/
(for desktop / local serve) and are gitignored if oversized.
"""

from __future__ import annotations

import json
import re
import shutil
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LABS_SRC = ROOT / "Labs for A+"
PPT_SRC = ROOT / "PowerPoint for A+"
VID_SRC = ROOT / "Videos For A+"
MEDIA = ROOT / "media"
OUT_JS = ROOT / "curriculum_data.js"
OUT_JSON = ROOT / "curriculum_data.json"

NS_A = {"a": "http://schemas.openxmlformats.org/drawingml/2006/main"}
NS_W = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}

VIDEO_TITLES = {
    "pd_assets_chgmgmt_licensing": "Asset Management, Change Management & Licensing",
    "pd_bios_uefi": "BIOS and UEFI Firmware",
    "pd_cable_connectors": "Cables and Connectors",
    "pd_data_backup_ai": "Data Backup and Artificial Intelligence",
    "pd_documentation_op_systems": "Documentation and Operating Systems",
    "pd_internet_connect_protocol_add": "Internet Connectivity and Protocol Addressing",
    "pd_linux_bootable": "Linux and Bootable Media",
    "pd_local_network_hardware": "Local Network Hardware",
    "pd_mobile_devices_apps_laptop": "Mobile Devices, Apps and Laptops",
    "pd_mobileos_security_app_software": "Mobile OS Security and App Software",
    "pd_network_services_embedded": "Network Services and Embedded Systems",
    "pd_printers_multi_devices": "Printers and Multifunction Devices",
    "pd_settings_cloud_local_apps": "Settings, Cloud and Local Apps",
    "pd_soho_character": "SOHO Networks and Character Sets",
    "pd_storage_cpu_ram": "Storage, CPU and RAM",
    "pd_troubleshoot_netwk_rem_access_tools": "Network Troubleshooting and Remote Access Tools",
    "pd_troubleshooting_methodology": "Troubleshooting Methodology",
    "pd_virtual_cloud_concepts": "Virtualization and Cloud Concepts",
    "pd_win_security_implementation": "Windows Security Implementation",
    "pd_win_utilities_tools": "Windows Utilities and Tools",
    "pd_windows_editions": "Windows Editions",
}

PPT_TITLES = {
    "A220-1201_M01_PPT": "Core 1 Module 1: Hardware Foundations",
    "A220-1201_M02_PPT": "Core 1 Module 2: Motherboards and CPUs",
    "A220-1201_M03_PPT": "Core 1 Module 3: RAM and Storage",
    "A220-1201_M04_PPT": "Core 1 Module 4: Power and Cooling",
    "A220-1201_M05_PPT": "Core 1 Module 5: Networking Fundamentals",
    "A220-1201_M06_PPT": "Core 1 Module 6: Network Hardware",
    "A220-1201_M07_PPT": "Core 1 Module 7: Wireless and SOHO",
    "A220-1201_M08_PPT": "Core 1 Module 8: Mobile Devices",
    "A220-1201_M08_PPT (1)": "Core 1 Module 8: Mobile Devices (alt)",
    "A220-1201_M09_PPT": "Core 1 Module 9: Printers and Multifunction",
    "A220-1201_M10_PPT": "Core 1 Module 10: Virtualization and Cloud",
    "A220-1202_M11_PPT": "Core 2 Module 11: Operational Procedures",
    "A220-1202_M12_PPT": "Core 2 Module 12: Windows Editions and Install",
    "A220-1202_M13_PPT": "Core 2 Module 13: Windows Configuration",
    "A220-1202_M14_PPT": "Core 2 Module 14: Windows Tools and CLI",
    "A220-1202_M15_PPT": "Core 2 Module 15: Security Fundamentals",
    "A220-1202_M16_PPT": "Core 2 Module 16: Windows Security Features",
    "A220-1202_M17_PPT": "Core 2 Module 17: Other Operating Systems",
    "A220-1202_M18_PPT": "Core 2 Module 18: Software Troubleshooting",
    "A220-1202_M19_PPT": "Core 2 Module 19: Security Threats",
    "A220-1202_M20_PPT": "Core 2 Module 20: Malware and Social Engineering",
    "A220-1202_M21_PPT": "Core 2 Module 21: Change and Documentation",
    "A220-1202_M22_PPT": "Core 2 Module 22: Safety and Professionalism",
}


def slug(s: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s or "item"


def title_from_name(name: str) -> str:
    base = Path(name).stem
    base = re.sub(r"[_]+", " ", base)
    base = re.sub(r"\s+", " ", base).strip()
    return base


def classify_exam(text: str) -> str:
    t = text.lower()
    core1 = any(k in t for k in ("1201", "1101", "1001", "core 1", "m0", "hardware", "network", "mobile", "bios", "cable", "printer", "virtual", "cloud", "storage", "cpu", "ram", "soho"))
    core2 = any(k in t for k in ("1202", "1102", "core 2", "m1", "m2", "windows", "security", "linux", "backup", "licensing", "chgmgmt", "utilities", "editions", "bitlocker", "firewall", "cli"))
    if core1 and core2:
        return "both"
    if "1201" in t or "m0" in t:
        return "core1"
    if "1202" in t or re.search(r"m1[1-9]|m2[0-2]", t):
        return "core2"
    if core2 and not core1:
        return "core2"
    if core1 and not core2:
        return "core1"
    return "both"


# Word paragraph style -> block type. Anything unmapped becomes a paragraph.
# The NetAcad IT Essentials labs use a small, consistent set of styles, so
# this table is what lets the app draw a lab as steps, questions and
# terminal panes instead of a wall of text.
DOCX_STYLE_MAP = {
    "Title": "title",
    "LabSection": "h1",
    "Heading1": "h1",
    "Heading2": "h2",
    "Heading3": "h3",
    "Heading4": "h4",
    "SubStepAlpha": "step",
    "SubStepNum": "step",
    "Bulletlevel1": "bullet",
    "Bulletlevel2": "bullet2",
    "ListBullet": "bullet",
    "BodyTextL25": "p",
    "BodyTextL25Bold": "p",
    "BodyTextL50": "p",
    "BodyTextL75": "p",
    "InstNoteRedL25": "note",
    "ReflectionQ": "question",
    "AnswerLineL25": "answer",
    "AnswerLineL50": "answer",
    "AnswerLineL75": "answer",
    "CMD": "cmd",
    "CMDOutput": "output",
    "Caption": "caption",
    "TableHeading": "caption",
}
DOCX_SKIP_STYLES = {"ConfigWindow", "Visual", "TableText"}
ANSWER_PLACEHOLDER = re.compile(r"^(type your answers? here\.?|answers? will vary\.?)$", re.I)
QUESTION_HEAD = re.compile(r"^(reflection\s+)?questions?:?$", re.I)
W_NS = NS_W["w"]


def _para_text(p) -> str:
    return "".join(t.text for t in p.iter("{%s}t" % W_NS) if t.text).strip()


def _para_style(p) -> str:
    ps = p.find("w:pPr/w:pStyle", NS_W)
    return ps.get("{%s}val" % W_NS) if ps is not None else ""


def _table_blocks(tbl) -> list[dict]:
    rows = []
    for tr in tbl.findall("w:tr", NS_W):
        cells = []
        for tc in tr.findall("w:tc", NS_W):
            cells.append(" ".join(t for t in (_para_text(p) for p in tc.findall(".//w:p", NS_W)) if t))
        if any(cells):
            rows.append(cells)
    return [{"t": "table", "rows": rows}] if rows else []


def extract_docx_blocks(path: Path) -> list[dict]:
    """Walk the document body in order and emit typed blocks.

    Block shape: {"t": type, "text": str} plus "rows" for tables.
    Types: title h1 h2 h3 h4 qhead p note step bullet bullet2 question answer
    cmd output caption table.
    """
    with zipfile.ZipFile(path, "r") as z:
        tree = ET.fromstring(z.read("word/document.xml"))
    body = tree.find("w:body", NS_W)
    if body is None:
        return []
    blocks: list[dict] = []
    in_questions = False
    for el in body:
        tag = el.tag.split("}")[-1]
        if tag == "tbl":
            blocks.extend(_table_blocks(el))
            continue
        if tag != "p":
            continue
        text = _para_text(el)
        if not text:
            continue
        style = _para_style(el)
        if style in DOCX_SKIP_STYLES:
            continue
        kind = DOCX_STYLE_MAP.get(style, "p")
        if ANSWER_PLACEHOLDER.match(text):
            kind = "answer"
        if kind in ("h1", "h2", "h3", "h4") and QUESTION_HEAD.match(text):
            in_questions = True
            blocks.append({"t": "qhead", "text": text.rstrip(":")})
            continue
        if kind in ("h1", "h2", "h3", "h4", "step", "cmd", "title"):
            in_questions = False
        if kind == "p" and in_questions and style.startswith("BodyText"):
            kind = "question"
        if kind == "p" and re.match(r"^note:", text, re.I):
            kind = "note"
        if kind == "answer":
            if ANSWER_PLACEHOLDER.match(text):
                text = ""
            blocks.append({"t": "answer", "text": text})
            continue
        blocks.append({"t": kind, "text": text})
    # Documents with no styles at all (hand written labs): first line is the
    # title and the rest are steps.
    if blocks and not any(b["t"] == "title" for b in blocks):
        if all(b["t"] in ("p", "note") for b in blocks):
            blocks[0]["t"] = "title"
            for b in blocks[1:]:
                if b["t"] == "p":
                    b["t"] = "step"
    return blocks


def blocks_to_text(blocks: list[dict]) -> str:
    out = []
    for b in blocks:
        if b["t"] == "table":
            out.extend(" | ".join(r) for r in b.get("rows", []))
        elif b.get("text"):
            out.append(b["text"])
    return "\n".join(out).strip()


def extract_docx(path: Path, max_chars: int = 160000) -> tuple[str, list[dict]]:
    """Return (plain text for search, typed blocks for the renderer)."""
    try:
        blocks = extract_docx_blocks(path)
        content = blocks_to_text(blocks)
        if len(content) > max_chars:
            content = content[:max_chars] + "\n\n[Truncated for in-app size. Open the original DOCX for the full lab.]"
        return (content or "[Empty DOCX]"), blocks
    except Exception as exc:
        return f"[Could not extract DOCX: {exc}]", []


IMAGE_EXT_OK = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"}
NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS_PR = "http://schemas.openxmlformats.org/package/2006/relationships"
NS_P = "http://schemas.openxmlformats.org/presentationml/2006/main"
A_NS = NS_A["a"]


def _slide_rels(z: zipfile.ZipFile, slide_name: str) -> dict[str, str]:
    rel_name = slide_name.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels"
    if rel_name not in z.namelist():
        return {}
    root = ET.fromstring(z.read(rel_name))
    out = {}
    for rel in root.findall("{%s}Relationship" % NS_PR):
        target = rel.get("Target") or ""
        if target.startswith("../"):
            target = "ppt/" + target[3:]
        out[rel.get("Id")] = target
    return out


def _notes_text(z: zipfile.ZipFile, rels: dict[str, str]) -> str:
    for target in rels.values():
        if "notesSlides/" in target and target in z.namelist():
            root = ET.fromstring(z.read(target))
            paras = []
            for p in root.iter("{%s}p" % A_NS):
                t = "".join(n.text for n in p.iter("{%s}t" % A_NS) if n.text).strip()
                if t and not t.isdigit():
                    paras.append(t)
            return "\n".join(paras).strip()
    return ""


def extract_pptx(path: Path, img_dir: Path | None = None, max_chars: int = 120000) -> tuple[str, int, list[dict]]:
    """Return (flat slide text, slide count, deck).

    deck is a list of slides:
      {"n": 1, "title": str, "subtitle": str, "bullets": [{"text", "level"}],
       "images": ["media/slides/img/<stem>/s1-1.png"], "notes": str}
    Images are copied out of the pptx so the app can show them beside the
    text. WMF/EMF are skipped because browsers cannot draw them.
    """
    try:
        with zipfile.ZipFile(path, "r") as z:
            names = sorted(
                (n for n in z.namelist() if re.match(r"ppt/slides/slide\d+\.xml$", n)),
                key=lambda n: int(re.search(r"(\d+)", n.rsplit("/", 1)[1]).group(1)),
            )
            parts: list[str] = []
            deck: list[dict] = []
            stem_slug = slug(path.stem)
            for i, name in enumerate(names, 1):
                root = ET.fromstring(z.read(name))
                rels = _slide_rels(z, name)
                slide = {"n": i, "title": "", "subtitle": "", "bullets": [], "images": [], "notes": ""}
                flat: list[str] = []
                for sp in root.iter("{%s}sp" % NS_P):
                    ph = sp.find(".//{%s}nvPr/{%s}ph" % (NS_P, NS_P))
                    ph_type = (ph.get("type") or "body") if ph is not None else "free"
                    if ph_type in ("sldNum", "dt", "ftr"):
                        continue
                    for para in sp.iter("{%s}p" % A_NS):
                        text = "".join(n.text for n in para.iter("{%s}t" % A_NS) if n.text).strip()
                        if not text:
                            continue
                        flat.append(text)
                        ppr = para.find("{%s}pPr" % A_NS)
                        level = int(ppr.get("lvl", "0")) if ppr is not None else 0
                        if ph_type in ("title", "ctrTitle") and not slide["title"]:
                            slide["title"] = text
                        elif ph_type == "subTitle" and not slide["subtitle"]:
                            slide["subtitle"] = text
                        elif re.match(r"^image\s*(\u00a9|\(c\))", text, re.I):
                            continue
                        else:
                            slide["bullets"].append({"text": text, "level": level})
                if img_dir is not None:
                    k = 0
                    for pic in root.iter("{%s}pic" % NS_P):
                        blip = pic.find(".//{%s}blip" % A_NS)
                        rid = blip.get("{%s}embed" % NS_R) if blip is not None else None
                        target = rels.get(rid or "", "")
                        ext = Path(target).suffix.lower()
                        if not target or ext not in IMAGE_EXT_OK or target not in z.namelist():
                            continue
                        k += 1
                        out_name = f"s{i}-{k}{ext}"
                        out_path = img_dir / stem_slug / out_name
                        out_path.parent.mkdir(parents=True, exist_ok=True)
                        data = z.read(target)
                        if not out_path.exists() or out_path.stat().st_size != len(data):
                            out_path.write_bytes(data)
                        slide["images"].append(f"media/slides/img/{stem_slug}/{out_name}")
                slide["notes"] = _notes_text(z, rels)
                deck.append(slide)
                if flat:
                    parts.append(f"--- Slide {i} ---\n" + "\n".join(flat))
            content = "\n\n".join(parts).strip()
            if len(content) > max_chars:
                content = content[:max_chars] + "\n\n[Truncated. Open the PowerPoint for full slides and images.]"
            return content or "[No extractable slide text]", len(names), deck
    except Exception as exc:
        return f"[Could not extract PPTX: {exc}]", 0, []


def ensure_link_or_copy(src: Path, dst: Path) -> str:
    if not src.is_file():
        raise FileNotFoundError(f"not a file: {src}")
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists():
        try:
            if dst.is_file() and dst.stat().st_size == src.stat().st_size:
                return "exists"
        except OSError:
            pass
        if dst.is_dir():
            shutil.rmtree(dst)
        else:
            dst.unlink(missing_ok=True)
    try:
        os_link = getattr(__import__("os"), "link")
        os_link(src, dst)
        return "hardlink"
    except OSError:
        shutil.copy2(src, dst)
        return "copy"


def ingest_labs() -> list[dict]:
    items: list[dict] = []
    if not LABS_SRC.exists():
        print("[curriculum] Labs for A+ missing")
        return items
    lab_out = MEDIA / "labs"
    lab_out.mkdir(parents=True, exist_ok=True)

    for path in sorted(LABS_SRC.iterdir()):
        if not path.is_file():
            continue
        ext = path.suffix.lower()
        if ext not in {".docx", ".md"}:
            continue
        dest_name = path.name
        method = ensure_link_or_copy(path, lab_out / dest_name)
        rel_media = f"media/labs/{dest_name}"
        blocks: list[dict] = []
        if ext == ".md":
            content = path.read_text(encoding="utf-8", errors="replace")
            fmt = "markdown"
        else:
            content, blocks = extract_docx(path)
            fmt = "docx-text"
        title = title_from_name(path.name)
        m = re.match(r"^Lab\s*0*(\d+)\b", title, re.I)
        lab_no = int(m.group(1)) if m else None
        if lab_no is not None:
            # "Lab 05 - Configure a NIC" -> "Configure a NIC"; the number is its own field.
            title = re.sub(r"^Lab\s*0*\d+\s*[-:.]?\s*", "", title).strip() or title
        elif path.name.startswith("Checklist"):
            title = "Datacentre capstone checklist"
        elif path.name.startswith("00a"):
            title = "How to run the labs at home"
        elif path.name.startswith("00"):
            title = "Lab study and execution guide"
        items.append({
            "id": f"lab-{slug(path.stem)}",
            "kind": "lab",
            "title": title,
            "exam": "both" if (fmt == "markdown" or lab_no is None) else classify_exam(path.name + " " + content[:200]),
            "format": fmt,
            "source": f"Labs for A+/{path.name}",
            "media_path": rel_media,
            "size_mb": round(path.stat().st_size / (1024 * 1024), 2),
            "link_method": method,
            "lab_no": lab_no,
            "blocks": blocks,
            "content": content,
            "excerpt": content[:320].replace("\n", " ").strip(),
        })
    print(f"[curriculum] labs: {len(items)}")
    return items


def ingest_slides() -> list[dict]:
    items: list[dict] = []
    if not PPT_SRC.exists():
        print("[curriculum] PowerPoint for A+ missing")
        return items
    out = MEDIA / "slides"
    out.mkdir(parents=True, exist_ok=True)
    seen_stems: set[str] = set()

    for path in sorted(PPT_SRC.glob("*.pptx")):
        stem = path.stem
        # Prefer the non-(1) duplicate when both exist
        if stem.endswith(" (1)") and (PPT_SRC / f"{stem[:-4]}.pptx").exists():
            continue
        if stem in seen_stems:
            continue
        seen_stems.add(stem)
        dest = out / path.name
        method = ensure_link_or_copy(path, dest)
        text, slides, deck = extract_pptx(path, out / "img")
        title = PPT_TITLES.get(stem, title_from_name(path.name))
        mod = re.search(r"_M(\d+)_", stem)
        module_no = int(mod.group(1)) if mod else None
        short = re.sub(r"^Core \d Module \d+:\s*", "", title)
        exam = "core1" if "1201" in stem else ("core2" if "1202" in stem else classify_exam(stem))
        items.append({
            "id": f"slide-{slug(stem)}",
            "kind": "slide",
            "title": title,
            "exam": exam,
            "format": "pptx-text",
            "source": f"PowerPoint for A+/{path.name}",
            "media_path": f"media/slides/{path.name}",
            "slides": slides,
            "size_mb": round(path.stat().st_size / (1024 * 1024), 2),
            "link_method": method,
            "module_no": module_no,
            "short_title": short,
            "deck": deck,
            "content": text,
            "excerpt": text[:320].replace("\n", " ").strip(),
        })
    print(f"[curriculum] slides: {len(items)}")
    return items


def ingest_videos() -> list[dict]:
    items: list[dict] = []
    if not VID_SRC.exists():
        print("[curriculum] Videos For A+ missing")
        return items
    out = MEDIA / "videos"
    out.mkdir(parents=True, exist_ok=True)

    # Source layout is often a folder named foo.mp4 containing foo.mp4.
    files = [p for p in VID_SRC.rglob("*.mp4") if p.is_file()]
    for path in sorted(files):
        stem = path.stem.strip()
        safe_name = re.sub(r"[^\w.\-]+", "_", (stem or path.name)).strip("._") + ".mp4"
        if safe_name == ".mp4":
            safe_name = "video.mp4"
        dest = out / safe_name
        source_rel = path.relative_to(ROOT).as_posix()
        method = "source"
        media_rel = source_rel
        try:
            method = ensure_link_or_copy(path, dest)
            media_rel = f"media/videos/{safe_name}"
        except OSError as exc:
            print(f"[curriculum] video link skipped ({exc}); using source path for {safe_name}")
            method = "source-ref"
            media_rel = source_rel

        title = VIDEO_TITLES.get(stem, title_from_name(stem if stem else path.name))
        if stem.startswith("ZZ") or "ZZ" in path.name:
            title = "Bonus / Capstone video"
        items.append({
            "id": f"vid-{slug(stem or safe_name)}",
            "kind": "video",
            "title": title,
            "exam": classify_exam(stem + " " + title),
            "format": "mp4",
            "source": source_rel,
            "media_path": media_rel,
            "size_mb": round(path.stat().st_size / (1024 * 1024), 2),
            "link_method": method,
            "content": "",
            "excerpt": title,
        })
    print(f"[curriculum] videos: {len(items)}")
    return items


def main() -> int:
    MEDIA.mkdir(parents=True, exist_ok=True)
    labs = ingest_labs()
    slides = ingest_slides()
    videos = ingest_videos()
    catalog = {
        "version": "1.1",
        "title": "Datacentre Academy A+ Curriculum",
        "description": (
            "Hands-on labs, module PowerPoints, and lecture videos from "
            "Labs for A+, PowerPoint for A+, and Videos For A+."
        ),
        "stats": {
            "labs": len(labs),
            "slides": len(slides),
            "videos": len(videos),
            "total": len(labs) + len(slides) + len(videos),
            "video_size_mb": round(sum(v["size_mb"] for v in videos), 1),
            "slide_size_mb": round(sum(s["size_mb"] for s in slides), 1),
        },
        "labs": labs,
        "slides": slides,
        "videos": videos,
    }
    OUT_JSON.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    payload = json.dumps(catalog, ensure_ascii=False)
    OUT_JS.write_text(
        "window.COMPTIA_CURRICULUM = " + payload + ";\n",
        encoding="utf-8",
    )
    print(f"[curriculum] wrote {OUT_JS.name} ({OUT_JS.stat().st_size // 1024} KB)")
    print(f"[curriculum] media at {MEDIA}")
    print(json.dumps(catalog["stats"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
