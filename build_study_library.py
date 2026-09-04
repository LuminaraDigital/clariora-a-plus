"""
build_study_library.py
Ingests study content from every CompTIA A+ course folder into study_library.json/js
for the desktop/web exam simulator Study Library.
"""

from __future__ import annotations

import json
import os
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(".")

SOURCE_FOLDERS = [
    "CompTIA_A_Plus_Mastery",
    "CompTIA A+",
    "CompTIA-A-Core-1-220-1201-Certification-Training-Exam-Prep",
    "CompTIA-A-Certification-220-1001-The-Total-Course",
    "TOTAL-CompTIA-A-Core-1-220-1201-v15-Course",
    "CompTIA-A-Certification-Core-1---220-1101",
    "CompTIA-A-Plus-Practice-Questions",
]

PDF_MAX_CHARS = 100000


def extract_pdf_text(path: Path, max_chars: int = PDF_MAX_CHARS) -> tuple[str, str]:
    """
    Extract searchable text from a PDF.
    Returns (text, extractor_name). Tries pypdf, then PyPDF2, then pdfminer.six.
    """
    errors: list[str] = []

    # 1) pypdf
    try:
        from pypdf import PdfReader  # type: ignore

        reader = PdfReader(str(path))
        parts: list[str] = []
        for page in reader.pages:
            try:
                parts.append(page.extract_text() or "")
            except Exception:
                continue
        text = "\n".join(parts).strip()
        if text:
            note = ""
            if len(text) > max_chars:
                text = text[:max_chars] + (
                    f"\n\n[Truncated for Study Library size at {max_chars} characters; "
                    "open the original PDF for the full document.]"
                )
                note = "truncated"
            return text, f"pypdf{('-' + note) if note else ''}"
        errors.append("pypdf: empty text (possibly scanned/image PDF)")
    except Exception as exc:
        errors.append(f"pypdf: {exc}")

    # 2) PyPDF2
    try:
        from PyPDF2 import PdfReader as PyPDF2Reader  # type: ignore

        reader = PyPDF2Reader(str(path))
        parts = []
        for page in reader.pages:
            try:
                parts.append(page.extract_text() or "")
            except Exception:
                continue
        text = "\n".join(parts).strip()
        if text:
            if len(text) > max_chars:
                text = text[:max_chars] + (
                    f"\n\n[Truncated for Study Library size at {max_chars} characters; "
                    "open the original PDF for the full document.]"
                )
            return text, "PyPDF2"
        errors.append("PyPDF2: empty text")
    except Exception as exc:
        errors.append(f"PyPDF2: {exc}")

    # 3) pdfminer.six
    try:
        from pdfminer.high_level import extract_text as pdfminer_extract  # type: ignore

        text = (pdfminer_extract(str(path)) or "").strip()
        if text:
            if len(text) > max_chars:
                text = text[:max_chars] + (
                    f"\n\n[Truncated for Study Library size at {max_chars} characters; "
                    "open the original PDF for the full document.]"
                )
            return text, "pdfminer.six"
        errors.append("pdfminer.six: empty text")
    except Exception as exc:
        errors.append(f"pdfminer.six: {exc}")

    msg = (
        "[No extractable text found. This PDF may be scanned/image-only or protected. "
        f"Tried: {'; '.join(errors)}]"
    )
    return msg, "none"


def classify_exam(path: str, title: str = "") -> str:
    text = (path + " " + title).lower()
    if any(k in text for k in ["1102", "1202", "core 2", "core2", "security", "windows", "linux", "macos", "operational"]):
        if any(k in text for k in ["1101", "1201", "1001", "core 1", "hardware", "networking", "mobile"]):
            return "both"
        return "core2"
    if any(k in text for k in ["1101", "1201", "1001", "core 1", "hardware", "networking", "mobile", "virtualization"]):
        return "core1"
    return "both"


def classify_domain(path: str, title: str = "") -> str:
    text = (path + " " + title).lower()
    rules = [
        ("1.0 Mobile Devices", ["mobile", "laptop"]),
        ("2.0 Networking", ["network", "tcp", "wifi", "wireless", "port", "dhcp", "dns", "vlan"]),
        ("3.0 Hardware", ["hardware", "motherboard", "cpu", "ram", "storage", "raid", "power", "cable", "printer", "bios"]),
        ("4.0 Virtualization and Cloud Computing", ["virtual", "cloud", "hypervisor"]),
        ("5.0 Hardware and Network Troubleshooting", ["troubleshoot"]),
        ("1.0 Operating Systems", ["windows", "linux", "macos", "operating system", "cli"]),
        ("2.0 Security", ["security", "malware", "threat", "permission", "bitlocker"]),
        ("3.0 Software Troubleshooting", ["software troubleshooting", "bsod", "boot"]),
        ("4.0 Operational Procedures", ["operational", "safety", "change management", "backup", "script"]),
        ("Exam Strategy", ["exam", "blueprint", "strategy", "objectives", "roadmap", "cheat"]),
    ]
    for domain, keys in rules:
        if any(k in text for k in keys):
            return domain
    return "General Study"


def title_from_name(name: str) -> str:
    base = Path(name).stem
    base = re.sub(r"[_]+", " ", base)
    base = re.sub(r"\s+", " ", base).strip()
    return base


def extract_docx_text(path: Path, max_chars: int = 120000) -> str:
    try:
        with zipfile.ZipFile(path, "r") as z:
            xml_bytes = z.read("word/document.xml")
        tree = ET.fromstring(xml_bytes)
        ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
        paras = []
        for p in tree.findall(".//w:p", ns):
            texts = [t.text for t in p.findall(".//w:t", ns) if t.text]
            if texts:
                paras.append("".join(texts))
        content = "\n".join(paras).strip()
        if len(content) > max_chars:
            return content[:max_chars] + "\n\n[Truncated for Study Library size]"
        return content
    except Exception as exc:
        return f"[Could not extract DOCX text: {exc}]"


def first_heading(md_text: str, fallback: str) -> str:
    for line in md_text.splitlines():
        if line.startswith("#"):
            return re.sub(r"^#+\s*", "", line).strip()
    return fallback


def ingest_mastery_markdown() -> list[dict]:
    items = []
    mastery = ROOT / "CompTIA_A_Plus_Mastery"
    if not mastery.exists():
        return items
    for path in sorted(mastery.rglob("*.md")):
        rel = path.as_posix()
        text = path.read_text(encoding="utf-8", errors="replace")
        title = first_heading(text, title_from_name(path.name))
        items.append({
            "id": f"md-{len(items)+1:03d}",
            "title": title,
            "category": "Mastery Notes",
            "folder": "CompTIA_A_Plus_Mastery",
            "exam": classify_exam(rel, title),
            "domain": classify_domain(rel, title),
            "format": "markdown",
            "path": rel,
            "package_path": rel,
            "content": text,
            "excerpt": text[:400].replace("\n", " ").strip(),
        })
    return items


def ingest_docx_guides() -> list[dict]:
    items = []
    roots = [
        ROOT / "CompTIA-A-Core-1-220-1201-Certification-Training-Exam-Prep",
    ]
    for base in roots:
        if not base.exists():
            continue
        for path in sorted(base.rglob("*.docx")):
            if ".git" in path.parts:
                continue
            rel = path.as_posix()
            title = title_from_name(path.name)
            content = extract_docx_text(path)
            items.append({
                "id": f"docx-{len(items)+1:03d}",
                "title": title,
                "category": "Lecture Deep Dives (DOCX)",
                "folder": base.name,
                "exam": classify_exam(rel, title),
                "domain": classify_domain(rel, title),
                "format": "docx-text",
                "path": rel,
                "package_path": f"study_assets/{rel}",
                "content": content,
                "excerpt": content[:400].replace("\n", " ").strip(),
            })
    return items


def ingest_pdf_catalog() -> list[dict]:
    items = []
    pdf_roots = [
        ("CompTIA A+", "Classroom Day Notes & Objectives"),
        ("CompTIA-A-Core-1-220-1201-Certification-Training-Exam-Prep", "220-1201 Section Guides (PDF)"),
        ("CompTIA-A-Certification-220-1001-The-Total-Course", "220-1001 Resources (PDF)"),
        ("TOTAL-CompTIA-A-Core-1-220-1201-v15-Course", "TOTAL 220-1201 Course (PDF)"),
        ("CompTIA-A-Certification-Core-1---220-1101", "220-1101 Course (PDF)"),
    ]
    for folder, category in pdf_roots:
        base = ROOT / folder
        if not base.exists():
            continue
        for path in sorted(base.rglob("*.pdf")):
            if ".git" in path.parts:
                continue
            rel = path.as_posix()
            title = title_from_name(path.name)
            size_kb = max(1, path.stat().st_size // 1024)
            content, extractor = extract_pdf_text(path)
            searchable = extractor != "none" and not content.startswith("[No extractable text")
            excerpt = content[:400].replace("\n", " ").strip() if searchable else (
                f"PDF study asset ({size_kb} KB). Open externally from the Study Library."
            )
            items.append({
                "id": f"pdf-{len(items)+1:03d}",
                "title": title,
                "category": category,
                "folder": folder,
                "exam": classify_exam(rel, title),
                "domain": classify_domain(rel, title),
                "format": "pdf",
                "path": rel,
                "package_path": f"study_assets/{rel}",
                "content": content,
                "excerpt": excerpt,
                "size_kb": size_kb,
                "text_extracted": searchable,
                "text_extractor": extractor,
            })
    return items


def ingest_practice_index() -> list[dict]:
    items = []
    practice = ROOT / "CompTIA-A-Plus-Practice-Questions"
    if not practice.exists():
        return items
    for path in sorted(practice.glob("*.md")):
        rel = path.as_posix()
        text = path.read_text(encoding="utf-8", errors="replace")
        title = first_heading(text, title_from_name(path.name))
        # Practice Exam N files are already in the question bank; still index for reading
        exam = "core2" if any(n in path.name for n in ["5", "6", "7", "8"]) else "core1"
        if "README" in path.name or "CompTIA A Plus Practice Exam" in path.name:
            exam = "both"
        items.append({
            "id": f"practice-{len(items)+1:03d}",
            "title": title,
            "category": "Practice Exam Markdown",
            "folder": "CompTIA-A-Plus-Practice-Questions",
            "exam": exam,
            "domain": "Practice Questions",
            "format": "markdown",
            "path": rel,
            "package_path": rel,
            "content": text,
            "excerpt": text[:400].replace("\n", " ").strip(),
        })
    return items


def ingest_root_pdfs() -> list[dict]:
    items = []
    for path in sorted(ROOT.glob("*.pdf")):
        rel = path.as_posix()
        title = title_from_name(path.name)
        size_kb = max(1, path.stat().st_size // 1024)
        content, extractor = extract_pdf_text(path)
        searchable = extractor != "none" and not content.startswith("[No extractable text")
        excerpt = content[:400].replace("\n", " ").strip() if searchable else (
            f"PDF study asset ({size_kb} KB). Open externally from the Study Library."
        )
        items.append({
            "id": f"rootpdf-{len(items)+1:03d}",
            "title": title,
            "category": "Root Reference PDFs",
            "folder": "(workspace root)",
            "exam": classify_exam(rel, title),
            "domain": classify_domain(rel, title),
            "format": "pdf",
            "path": rel,
            "package_path": f"study_assets/{rel}",
            "content": content,
            "excerpt": excerpt,
            "size_kb": size_kb,
            "text_extracted": searchable,
            "text_extractor": extractor,
        })
    return items


def build_library() -> dict:
    docs = []
    docs.extend(ingest_mastery_markdown())
    docs.extend(ingest_docx_guides())
    docs.extend(ingest_practice_index())
    docs.extend(ingest_pdf_catalog())
    # Root-level PDFs are deliberately not ingested: they are personal reference
    # material that must never be redistributed with the public repository.

    categories = sorted({d["category"] for d in docs})
    folders = sorted({d["folder"] for d in docs})
    pdf_docs = [d for d in docs if d["format"] == "pdf"]
    pdf_with_text = sum(1 for d in pdf_docs if d.get("text_extracted"))

    library = {
        "version": "1.1",
        "title": "CompTIA A+ Unified Study Library",
        "description": "Searchable study content aggregated from every CompTIA A+ course folder in this workspace. PDF text is extracted when the file contains a text layer.",
        "stats": {
            "total_documents": len(docs),
            "markdown": sum(1 for d in docs if d["format"] == "markdown"),
            "docx_text": sum(1 for d in docs if d["format"] == "docx-text"),
            "pdf": len(pdf_docs),
            "pdf_with_text": pdf_with_text,
            "categories": len(categories),
            "folders": len(folders),
        },
        "folders": folders,
        "categories": categories,
        "documents": docs,
    }
    return library



import re as _re
_EMOJI_RE = _re.compile("[🌀-🫿☀-➿⭐⭕✅❌☑☐️‍]")

def strip_emoji(value):
    """House rule: no emoji in shipped text. Applied to every string in the library."""
    if isinstance(value, str):
        return _re.sub(r"  +", " ", _EMOJI_RE.sub("", value))
    if isinstance(value, list):
        return [strip_emoji(v) for v in value]
    if isinstance(value, dict):
        return {k: strip_emoji(v) for k, v in value.items()}
    return value

def main():
    library = strip_emoji(build_library())
    with open("study_library.json", "w", encoding="utf-8") as f:
        json.dump(library, f, indent=2, ensure_ascii=False)
    with open("study_library.js", "w", encoding="utf-8") as f:
        f.write("window.COMPTIA_STUDY_LIBRARY = ")
        json.dump(library, f, indent=2, ensure_ascii=False)
        f.write(";\n")
    print(
        f"Study library built: {library['stats']['total_documents']} documents "
        f"(md={library['stats']['markdown']}, docx={library['stats']['docx_text']}, "
        f"pdf={library['stats']['pdf']}, pdf_with_text={library['stats']['pdf_with_text']})"
    )


if __name__ == "__main__":
    main()
