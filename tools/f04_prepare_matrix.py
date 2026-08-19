#!/usr/bin/env python3
"""Prépare une matrix F04 strictement alignée sur le codex et les assets clips."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--codex", required=True)
    ap.add_argument("--clips-dir", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--clip-ids", default="")
    args = ap.parse_args()

    codex_path = Path(args.codex)
    clips_dir = Path(args.clips_dir)
    out_path = Path(args.out)
    codex = json.loads(codex_path.read_text(encoding="utf-8"))
    clips = codex.get("clips") or [codex]
    if not clips:
        raise SystemExit("F04 PREP ERROR: codex sans clips")

    requested = {x.strip() for x in args.clip_ids.split(",") if x.strip()}
    matrix = []
    missing = []
    duplicates = set()
    for clip in clips:
        raw = clip.get("id") or Path(clip["video"]["source"]).stem
        filename = Path(clip.get("video", {}).get("source", f"{raw}.mp4")).name
        # Le renderer et les artifacts utilisent clip_00X.mp4.
        if not filename.endswith(".mp4"):
            filename += ".mp4"
        clip_id = raw.replace("_", "-")
        if requested and clip_id not in requested and raw not in requested:
            continue
        if filename in duplicates:
            raise SystemExit(f"F04 PREP ERROR: doublon asset {filename}")
        duplicates.add(filename)
        asset = clips_dir / filename
        if not asset.is_file():
            missing.append(filename)
            continue
        matrix.append({
            "raw": Path(filename).stem,
            "clip_id": clip_id,
            "filename": filename,
            "source_sha256": sha256(asset),
        })

    if requested:
        expected_requested = len(requested)
        if len(matrix) != expected_requested:
            raise SystemExit(f"F04 PREP ERROR: requested={sorted(requested)} found={len(matrix)}")
    elif missing:
        raise SystemExit("F04 PREP ERROR: assets manquants: " + ", ".join(missing))

    if not matrix:
        raise SystemExit("F04 PREP ERROR: matrix vide")

    matrix.sort(key=lambda x: x["raw"])
    manifest = {
        "schema": "f04-matrix-v1",
        "pack_id": codex.get("session", {}).get("pack_id") or codex.get("pack_id"),
        "codex_sha256": sha256(codex_path),
        "expected_count": len(clips) if not requested else len(matrix),
        "clips": matrix,
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"include": matrix}, ensure_ascii=False))
    print(f"F04 PREP OK: {len(matrix)} asset(s), manifest={out_path}")


if __name__ == "__main__":
    main()

tools_marker = None
