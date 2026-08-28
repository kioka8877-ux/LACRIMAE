#!/usr/bin/env python3
"""F00-F Ranking/Narration.

Prépare le manifeste éditorial du classement à partir des clips produits par F00-E.
Cette sous-fregate ne modifie pas F00-E et ne rend pas la vidéo finale : elle valide
les rangs, les durées, les positions, les textes et les SFX optionnels pour F03.
"""
from __future__ import annotations

import argparse
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

MAX_RANKS = 10
DEFAULT_TEXT_STYLE = {
    "font_family": "Arial Black",
    "font_size": 54,
    "color": "#FFFFFF",
    "accent_color": "#FFD400",
    "x_pct": 8,
    "y_pct": 34,
    "align": "left",
}
DEFAULT_POSITION = {"x_pct": 50, "y_pct": 50, "scale": 1.0, "rotation": 0}


def number(value, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def normalize_entry(raw: dict, index: int, source_by_id: dict, out_dir: Path) -> dict:
    source_id = str(raw.get("source_id") or raw.get("id") or "")
    if not source_id or source_id not in source_by_id:
        raise ValueError(f"source_id invalide pour le rang {index}: {source_id!r}")
    rank = int(raw.get("rank", index))
    if rank < 1:
        raise ValueError(f"rank invalide: {rank}")
    duration = number(raw.get("duration_seconds"), 3.0)
    if duration <= 0:
        raise ValueError(f"duration_seconds doit être positive pour le rang {rank}")
    position = {**DEFAULT_POSITION, **(raw.get("position") or {})}
    position["x_pct"] = max(0, min(100, number(position.get("x_pct"), 50)))
    position["y_pct"] = max(0, min(100, number(position.get("y_pct"), 50)))
    position["scale"] = max(0.05, min(10, number(position.get("scale"), 1)))
    position["rotation"] = max(-180, min(180, number(position.get("rotation"), 0)))
    text = {**DEFAULT_TEXT_STYLE, **(raw.get("text_style") or {})}
    text["font_size"] = max(8, min(400, number(text.get("font_size"), 54)))
    text["x_pct"] = max(0, min(100, number(text.get("x_pct"), 8)))
    text["y_pct"] = max(0, min(100, number(text.get("y_pct"), 34)))
    text["label"] = str(raw.get("label") or "")
    sfx = raw.get("sfx") or {}
    sfx_enabled = bool(sfx.get("enabled", False))
    sfx_result = {
        "enabled": sfx_enabled,
        "file": "",
        "offset_seconds": max(0, number(sfx.get("offset_seconds"), 0)),
        "volume": max(0, min(2, number(sfx.get("volume"), 1))),
    }
    if sfx_enabled:
        raw_sfx = str(sfx.get("file") or "")
        if not raw_sfx:
            raise ValueError(f"SFX activé sans fichier pour le rang {rank}")
        sfx_path = Path(raw_sfx).expanduser()
        if not sfx_path.is_absolute():
            sfx_path = (Path.cwd() / sfx_path).resolve()
        if not sfx_path.exists():
            raise FileNotFoundError(f"SFX introuvable pour le rang {rank}: {sfx_path}")
        sfx_dir = out_dir / "sfx"
        sfx_dir.mkdir(parents=True, exist_ok=True)
        destination = sfx_dir / f"rank_{rank:02d}{sfx_path.suffix.lower()}"
        shutil.copy2(sfx_path, destination)
        sfx_result["file"] = f"sfx/{destination.name}"
    return {
        "rank": rank,
        "source_id": source_id,
        "clip_file": source_by_id[source_id].get("file", ""),
        "duration_seconds": round(duration, 6),
        "position": position,
        "label": text.pop("label"),
        "text_style": text,
        "sfx": sfx_result,
        "role": "final_rank" if rank == 1 or raw.get("final_rank") else "rank_entry",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="F00-F Ranking/Narration")
    parser.add_argument("--clips-manifest", type=Path, required=True)
    parser.add_argument("--request", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    clips = json.loads(args.clips_manifest.read_text(encoding="utf-8"))
    request = json.loads(args.request.read_text(encoding="utf-8"))
    sources = clips.get("sources")
    if not isinstance(sources, list) or not sources:
        raise ValueError("clips manifest: sources doit être une liste non vide")
    entries = request.get("entries")
    if not isinstance(entries, list) or not entries:
        raise ValueError("request.entries doit être une liste non vide")
    if len(entries) > MAX_RANKS:
        raise ValueError(f"F00-F accepte au maximum {MAX_RANKS} rangs")
    source_by_id = {str(row.get("id")): row for row in sources}
    args.out.mkdir(parents=True, exist_ok=True)
    normalized_entries = [normalize_entry(row, index, source_by_id, args.out) for index, row in enumerate(entries, 1)]
    ranks = [row["rank"] for row in normalized_entries]
    if len(set(ranks)) != len(ranks):
        raise ValueError("les rangs doivent être uniques")
    normalized_entries.sort(key=lambda row: row["rank"], reverse=True)
    narrative = {
        "title": str(request.get("title") or "RANKING"),
        "category": str(request.get("category") or ""),
        "header_label": str(request.get("header_label") or ""),
        "final_label": str(request.get("final_label") or ""),
        "font_family": str(request.get("font_family") or "Arial Black"),
        "title_style": {**DEFAULT_TEXT_STYLE, **(request.get("title_style") or {})},
    }
    manifest = {
        "schema_version": "dev9.ranking.v1",
        "format": "ranking_compilation",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "fps": number(request.get("fps"), clips.get("fps", 30)),
        "direction": "descending",
        "narrative": narrative,
        "entries": normalized_entries,
        "rank_count": len(normalized_entries),
        "final_rank": next((row for row in normalized_entries if row["rank"] == 1), normalized_entries[-1]),
        "validation": {"all_entries_valid": True, "entry_count": len(normalized_entries)},
    }
    destination = args.out / "ranking_manifest.json"
    destination.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (args.out / "ranking_report.json").write_text(json.dumps({"status": "ok", "stage": "F00-F_RANKING", "entries": len(normalized_entries), "manifest": str(destination)}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "ok", "stage": "F00-F_RANKING", "entries": len(normalized_entries), "manifest": str(destination)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
