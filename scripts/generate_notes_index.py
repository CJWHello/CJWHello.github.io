from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
NOTES_ROOT = REPO_ROOT / "notes"
OUTPUT_PATH = REPO_ROOT / "data" / "notes.json"

COVER_BY_CATEGORY = {
    "vlm": "./assets/images/project-vision.svg",
    "interview": "./assets/images/project-diffusion.svg",
    "projects": "./assets/images/project-dashboard.svg",
    "agent": "./assets/images/project-nexus.svg",
    "rl": "./assets/images/project-dashboard.svg",
    "infra": "./assets/images/project-nexus.svg",
}

LABEL_BY_CATEGORY = {
    "llm": "LLM",
    "vlm": "VLM",
    "interview": "Interview",
    "projects": "Projects",
    "agent": "Agent",
    "rl": "RL",
    "infra": "Infra",
}


def format_category_label(category: str) -> str:
    value = category.strip()
    if not value:
        return "Note"
    if value in LABEL_BY_CATEGORY:
        return LABEL_BY_CATEGORY[value]
    if len(value) <= 4:
        return value.upper()
    return " ".join(part.capitalize() for part in re.split(r"[-_\s]+", value) if part)


def load_existing_keys() -> dict[str, str]:
    if not OUTPUT_PATH.exists():
        return {}
    try:
        payload = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}
    notes = payload.get("notes", [])
    return {
        str(note.get("path")): str(note.get("key"))
        for note in notes
        if note.get("path") and note.get("key")
    }


def parse_front_matter(text: str) -> tuple[dict[str, object], str]:
    if not text.startswith("---\n"):
        return {}, text
    parts = text.split("\n---\n", 1)
    if len(parts) != 2:
        return {}, text
    raw_meta, body = parts
    meta: dict[str, object] = {}
    for line in raw_meta.splitlines()[1:]:
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key == "tags":
            if value.startswith("[") and value.endswith("]"):
                items = [item.strip().strip('"').strip("'") for item in value[1:-1].split(",")]
                meta[key] = [item for item in items if item]
            else:
                meta[key] = [item.strip() for item in value.split(",") if item.strip()]
        else:
            meta[key] = value
    return meta, body


def slug_from_name(category: str, stem: str, relative_path: str) -> str:
    ascii_slug = re.sub(r"[^a-z0-9]+", "-", stem.lower()).strip("-")
    if not ascii_slug:
        ascii_slug = hashlib.sha1(relative_path.encode("utf-8")).hexdigest()[:8]
    return f"{category}-{ascii_slug}"


def extract_title(meta: dict[str, object], body: str, fallback: str) -> str:
    title = meta.get("title")
    if isinstance(title, str) and title.strip():
        return title.strip()
    for line in body.splitlines():
        match = re.match(r"^\s*#{1,6}\s+(.+?)\s*$", line)
        if match:
            return match.group(1).strip()
    return fallback


def extract_excerpt(meta: dict[str, object], body: str) -> str:
    excerpt = meta.get("excerpt") or meta.get("summary") or meta.get("description")
    if isinstance(excerpt, str) and excerpt.strip():
        return excerpt.strip()
    for line in body.splitlines():
        stripped = line.strip()
        if not stripped or stripped == "---":
            continue
        if stripped.startswith("#") or stripped.startswith("|"):
            continue
        plain = re.sub(r"\*\*|__|~~|`", "", stripped)
        if len(plain) > 96:
            return plain[:96] + "..."
        return plain
    return "No excerpt."


def build_note(path: Path, existing_keys: dict[str, str]) -> dict[str, object]:
    relative_path = path.relative_to(REPO_ROOT).as_posix()
    category = path.parent.name or "uncategorized"
    meta, body = parse_front_matter(path.read_text(encoding="utf-8"))
    note_path = f"./{relative_path}"
    key = (
        meta.get("key")
        if isinstance(meta.get("key"), str) and meta.get("key")
        else existing_keys.get(note_path) or slug_from_name(category, path.stem, relative_path)
    )
    tags = meta.get("tags")
    if not isinstance(tags, list) or not tags:
        tags = [LABEL_BY_CATEGORY.get(category, category), path.stem]
    return {
        "key": key,
        "title": extract_title(meta, body, path.stem),
        "category": category,
        "categoryLabel": format_category_label(category),
        "type": meta.get("type", "Note"),
        "path": note_path,
        "cover": meta.get("cover")
        or meta.get("image")
        or COVER_BY_CATEGORY.get(category, "./assets/images/project-nexus.svg"),
        "excerpt": extract_excerpt(meta, body),
        "tags": tags,
    }


def main() -> None:
    existing_keys = load_existing_keys()
    notes = [
        build_note(path, existing_keys)
        for path in sorted(NOTES_ROOT.rglob("*.md"))
    ]
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps({"notes": notes}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Generated {OUTPUT_PATH.relative_to(REPO_ROOT)} with {len(notes)} notes.")


if __name__ == "__main__":
    main()
