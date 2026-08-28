#!/usr/bin/env python3
"""F00-E REVEAL CLIP PREP.

Prépare de trois à six clips pour le format Others vs This One.
F00-E ne construit ni narration ni montage : il extrait chaque plage IN/OUT,
applique le miroir éventuel, normalise le cadre vertical et produit un manifeste
consommable par F03 Preview.
"""
from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

OUTPUT_WIDTH = 1080
OUTPUT_HEIGHT = 1920
DEFAULT_FPS = 30
VALID_FIT_MODES = {"crop", "blur"}


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True)


def probe(path: Path) -> dict:
    cmd = [
        "ffprobe", "-v", "error", "-show_streams", "-show_format",
        "-of", "json", str(path),
    ]
    data = json.loads(subprocess.check_output(cmd, text=True))
    video = next((stream for stream in data.get("streams", []) if stream.get("codec_type") == "video"), None)
    if not video:
        raise ValueError(f"Aucun flux vidéo dans {path}")
    return {
        "codec": video.get("codec_name"),
        "width": int(video.get("width") or 0),
        "height": int(video.get("height") or 0),
        "fps": video.get("avg_frame_rate") or f"{DEFAULT_FPS}/1",
        "duration_seconds": float(video.get("duration") or data.get("format", {}).get("duration") or 0),
    }


def parse_fps(value: str | None) -> float:
    if not value:
        return float(DEFAULT_FPS)
    if "/" in value:
        num, den = value.split("/", 1)
        return float(num) / float(den or 1)
    return float(value)


def build_filter(fit_mode: str, mirror: bool) -> str:
    if fit_mode not in VALID_FIT_MODES:
        raise ValueError(f"fit_mode invalide: {fit_mode}; choix: {sorted(VALID_FIT_MODES)}")
    mirror_filter = ",hflip" if mirror else ""
    if fit_mode == "crop":
        return (
            f"scale={OUTPUT_WIDTH}:{OUTPUT_HEIGHT}:force_original_aspect_ratio=increase,"
            f"crop={OUTPUT_WIDTH}:{OUTPUT_HEIGHT},setsar=1{mirror_filter}"
        )
    return (
        f"split=2[bg][fg];"
        f"[bg]scale={OUTPUT_WIDTH}:{OUTPUT_HEIGHT}:force_original_aspect_ratio=increase,"
        f"crop={OUTPUT_WIDTH}:{OUTPUT_HEIGHT},boxblur=24:12,eq=brightness=-0.12:saturation=0.82[blur];"
        f"[fg]scale={OUTPUT_WIDTH}:{OUTPUT_HEIGHT}:force_original_aspect_ratio=decrease,setsar=1[main];"
        f"[blur][main]overlay=(W-w)/2:(H-h)/2,setsar=1"
        f"{mirror_filter}"
    )


def normalize_source_row(row: dict, index: int, base_dir: Path | None = None) -> dict:
    raw_source = Path(row.get("source", "")).expanduser()
    if base_dir is not None and not raw_source.is_absolute():
        raw_source = base_dir / raw_source
    source = raw_source.resolve()
    if not source.exists():
        raise FileNotFoundError(f"Source introuvable pour slot {index}: {source}")
    in_seconds = max(0.0, float(row.get("in_seconds", 0.0)))
    out_raw = row.get("out_seconds")
    out_seconds = None if out_raw in (None, "") else float(out_raw)
    if out_seconds is not None and out_seconds <= in_seconds:
        raise ValueError(f"OUT doit être supérieur à IN pour slot {index}")
    return {
        "slot": index,
        "id": str(row.get("id") or f"reveal_{index:02d}"),
        "source": str(source),
        "in_seconds": in_seconds,
        "out_seconds": out_seconds,
        "mirror": bool(row.get("mirror", False)),
        "fit_mode": str(row.get("fit_mode") or "crop"),
        "focal_x": float(row.get("focal_x", 50)),
        "focal_y": float(row.get("focal_y", 50)),
        "role": "final_reveal" if index == len(rows) or row.get("final_reveal") else "other",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="F00-E Reveal Clip Prep")
    parser.add_argument("--request", type=Path, required=True, help="JSON avec la liste sources")
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--fps", type=float, default=DEFAULT_FPS)
    args = parser.parse_args()

    request = json.loads(args.request.read_text(encoding="utf-8"))
    rows = request.get("sources")
    if not isinstance(rows, list) or not rows:
        raise ValueError("request.sources doit être une liste non vide")
    if len(rows) < 3:
        raise ValueError("F00-E nécessite au minimum trois sources")
    if len(rows) > 6:
        raise ValueError("F00-E accepte au maximum six sources")

    args.out.mkdir(parents=True, exist_ok=True)
    clip_dir = args.out / "clips"
    clip_dir.mkdir(parents=True, exist_ok=True)
    outputs: list[dict] = []

    for index, raw in enumerate(rows, 1):
        row = normalize_source_row(raw, index, args.request.parent)
        source_path = Path(row["source"])
        source_meta = probe(source_path)
        source_fps = parse_fps(source_meta.get("fps"))
        duration = row["out_seconds"] - row["in_seconds"] if row["out_seconds"] is not None else max(0.0, source_meta["duration_seconds"] - row["in_seconds"])
        if duration <= 0:
            raise ValueError(f"Durée vide pour slot {index}")
        output = clip_dir / f"{row['id']}.mp4"
        vf = build_filter(row["fit_mode"], row["mirror"])
        cmd = [
            "ffmpeg", "-y", "-v", "error", "-ss", f"{row['in_seconds']:.6f}", "-i", str(source_path),
            "-t", f"{duration:.6f}", "-vf", vf,
            "-an", "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
            "-r", f"{args.fps:.6f}", "-movflags", "+faststart", str(output),
        ]
        run(cmd)
        result_meta = probe(output)
        if result_meta["codec"] != "h264" or result_meta["width"] != OUTPUT_WIDTH or result_meta["height"] != OUTPUT_HEIGHT:
            raise RuntimeError(f"Clip invalide après préparation: {output}")
        outputs.append({
            **row,
            "file": f"clips/{output.name}",
            "source_metadata": source_meta,
            "output_metadata": result_meta,
            "duration_seconds": round(duration, 6),
            "duration_frames": max(1, round(duration * args.fps)),
            "prepared": True,
        })

    manifest = {
        "schema_version": "dev8.reveal-clips.v1",
        "format": "reveal_compilation",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "fps": args.fps,
        "width": OUTPUT_WIDTH,
        "height": OUTPUT_HEIGHT,
        "source_count": len(outputs),
        "sources": outputs,
        "validation": {"all_clips_prepared": True, "prepared_count": len(outputs)},
    }
    destination = args.out / "reveal_sources.json"
    destination.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    report = {
        "status": "ok",
        "stage": "F00-E_REVEAL_CLIP_PREP",
        "source_count": len(outputs),
        "manifest": str(destination),
        "directory": str(clip_dir),
    }
    (args.out / "reveal_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
