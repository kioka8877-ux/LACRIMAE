"""F00-D HYBRID / EGO — prépare une composition d’introduction + Match Cut.

F00-D est optionnel. Il ne sélectionne pas les séquences et ne remplace pas F00-A/B/C.
Il matérialise une image ou une portion de vidéo d’introduction, copie le manifeste
Match Cut validé dans un artifact autonome et écrit hybrid_manifest.json.
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True)


def probe(path: Path) -> dict:
    raw = subprocess.check_output([
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=codec_name,width,height,avg_frame_rate,nb_frames,duration",
        "-of", "json", str(path),
    ], text=True)
    return json.loads(raw)["streams"][0]


def is_image(path: Path) -> bool:
    return path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}


def materialize_intro(source: Path, destination: Path, intro_in: float | None, intro_out: float | None,
                      image_duration: float, fps: float, intro_type: str = 'auto') -> dict:
    destination.parent.mkdir(parents=True, exist_ok=True)
    source_is_image = intro_type == 'image' or (intro_type == 'auto' and is_image(source))
    if source_is_image:
        if image_duration <= 0:
            raise ValueError("--image-duration doit être supérieur à 0 pour une image")
        run([
            "ffmpeg", "-y", "-v", "error", "-loop", "1", "-i", str(source),
            "-t", f"{image_duration:.6f}", "-r", f"{fps:.6f}", "-an",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(destination),
        ])
        source_type = "image"
        in_seconds, out_seconds = 0.0, image_duration
    else:
        stream = probe(source)
        source_duration = float(stream.get("duration") or 0)
        in_seconds = 0.0 if intro_in is None else intro_in
        out_seconds = source_duration if intro_out is None else intro_out
        if in_seconds < 0 or out_seconds <= in_seconds or (source_duration and out_seconds > source_duration + 0.05):
            raise ValueError(f"Découpage intro invalide: {in_seconds}-{out_seconds}s (durée source {source_duration}s)")
        duration = out_seconds - in_seconds
        run([
            "ffmpeg", "-y", "-v", "error", "-ss", f"{in_seconds:.6f}", "-i", str(source),
            "-t", f"{duration:.6f}", "-map", "0:v:0", "-an", "-c:v", "libx264",
            "-profile:v", "main", "-pix_fmt", "yuv420p", "-r", f"{fps:.6f}",
            "-movflags", "+faststart", str(destination),
        ])
        source_type = "video"
    info = probe(destination)
    frames = int(info.get("nb_frames") or round(float(info.get("duration") or 0) * fps))
    return {
        "source_type": source_type,
        "file": "intro/intro.mp4",
        "in_seconds": round(in_seconds, 6),
        "out_seconds": round(out_seconds, 6),
        "duration_seconds": round(frames / fps, 6),
        "duration_frames": frames,
        "validation": {
            "codec": info.get("codec_name"),
            "width": info.get("width"),
            "height": info.get("height"),
            "fps": info.get("avg_frame_rate"),
            "frame_count": frames,
            "file_bytes": destination.stat().st_size,
        },
    }


def copy_matchcut(manifest_path: Path, out: Path) -> tuple[dict, str]:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    target_manifest = out / "match_cut" / "sequences.json"
    target_manifest.parent.mkdir(parents=True, exist_ok=True)
    rows = []
    for row in manifest.get("sequences", []):
        source_file = manifest_path.parent / row["file"]
        if not source_file.exists():
            raise FileNotFoundError(f"Séquence Match Cut introuvable: {source_file}")
        destination = out / "match_cut" / row["file"]
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_file, destination)
        copied = dict(row)
        copied["file"] = f"match_cut/{row['file']}"
        rows.append(copied)
    copied_manifest = dict(manifest)
    copied_manifest["sequences"] = rows
    copied_manifest["manifest_role"] = "hybrid_match_cut_input"
    target_manifest.write_text(json.dumps(copied_manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return copied_manifest, "match_cut/sequences.json"


def main() -> int:
    parser = argparse.ArgumentParser(description="F00-D Hybrid / EGO")
    parser.add_argument("--matchcut-manifest", type=Path, required=True)
    parser.add_argument("--intro", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--intro-in", type=float, default=None)
    parser.add_argument("--intro-out", type=float, default=None)
    parser.add_argument("--image-duration", type=float, default=2.0)
    parser.add_argument("--intro-type", choices=["auto", "image", "video"], default="auto")
    parser.add_argument("--intro-text", default="C'EST JUSTE UN JOUEUR")
    parser.add_argument("--intro-text-duration-mode", choices=["until_match_cut", "until_end", "custom"], default="until_match_cut")
    parser.add_argument("--intro-text-duration-frames", type=int, default=0)
    parser.add_argument("--intro-text-color", default="#FFFFFF")
    parser.add_argument("--intro-text-font", default="Impact")
    parser.add_argument("--intro-text-scale", type=float, default=1.0)
    parser.add_argument("--intro-text-rotation", type=float, default=0.0)
    parser.add_argument("--ego", default="EGO")
    parser.add_argument("--ego-duration-mode", choices=["until_match_cut", "until_end", "custom"], default="until_match_cut")
    parser.add_argument("--ego-duration-frames", type=int, default=0)
    parser.add_argument("--ego-color", default="#FFFFFF")
    parser.add_argument("--ego-font", default="Impact")
    parser.add_argument("--ego-scale", type=float, default=2.0)
    parser.add_argument("--ego-rotation", type=float, default=0.0)
    parser.add_argument("--matchcut-color-preset", default="punchy")
    parser.add_argument("--matchcut-color-intensity", type=int, default=100)
    args = parser.parse_args()
    if not args.matchcut_manifest.exists(): raise FileNotFoundError(args.matchcut_manifest)
    if not args.intro.exists(): raise FileNotFoundError(args.intro)
    if not 1 <= args.ego_scale <= 10: raise ValueError("--ego-scale doit être compris entre 1 et 10")
    if not 1 <= args.intro_text_scale <= 10: raise ValueError("--intro-text-scale doit être compris entre 1 et 10")
    if not -180 <= args.ego_rotation <= 180: raise ValueError("--ego-rotation doit être compris entre -180 et 180")
    if not -180 <= args.intro_text_rotation <= 180: raise ValueError("--intro-text-rotation doit être compris entre -180 et 180")
    args.out.mkdir(parents=True, exist_ok=True)
    matchcut, matchcut_ref = copy_matchcut(args.matchcut_manifest, args.out)
    fps = float(matchcut.get("fps") or 30)
    intro = materialize_intro(args.intro, args.out / "intro" / "intro.mp4", args.intro_in, args.intro_out, args.image_duration, fps, args.intro_type)
    intro_frames = int(intro["duration_frames"])
    matchcut_frames = int(matchcut.get("total_frames") or 0)
    total_frames = intro_frames + matchcut_frames
    if args.intro_text_duration_mode == "until_match_cut":
        intro_text_start, intro_text_duration = 0, intro_frames
    elif args.intro_text_duration_mode == "until_end":
        intro_text_start, intro_text_duration = 0, total_frames
    else:
        intro_text_start, intro_text_duration = 0, max(1, args.intro_text_duration_frames)
    if args.ego_duration_mode == "until_match_cut":
        ego_start, ego_duration = intro_frames, max(1, min(intro_frames, matchcut_frames or intro_frames))
    elif args.ego_duration_mode == "until_end":
        ego_start, ego_duration = intro_frames, max(1, total_frames - intro_frames)
    else:
        ego_start, ego_duration = intro_frames, max(1, args.ego_duration_frames)
    output = {
        "schema_version": "dev4.hybrid-narrative.v1",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "mode": "hybrid_narrative",
        "fps": fps,
        "total_frames": total_frames,
        "duration_seconds": round(total_frames / fps, 6),
        "intro": intro,
        "transition": {"type": "hard_cut", "match_cut_start_frame": intro_frames},
        "intro_text": {
            "text": args.intro_text.upper(), "duration_mode": args.intro_text_duration_mode,
            "start_frame": intro_text_start, "duration_frames": intro_text_duration,
            "font_family": args.intro_text_font, "color": args.intro_text_color,
            "scale": args.intro_text_scale, "rotation_deg": args.intro_text_rotation,
            "position_x": 50, "position_y": 78, "blur_frames": 0,
        },
        "ego": {
            "text": args.ego.upper(), "duration_mode": args.ego_duration_mode,
            "start_frame": ego_start, "duration_frames": ego_duration,
            "font_family": args.ego_font, "color": args.ego_color,
            "scale": args.ego_scale, "rotation_deg": args.ego_rotation,
            "position_x": 50, "position_y": 50, "blur_frames": 0,
        },
        "match_cut": {
            "manifest": matchcut_ref, "sequence_count": len(matchcut.get("sequences", [])),
            "color_preset": args.matchcut_color_preset, "color_intensity": args.matchcut_color_intensity,
        },
        "validation": {
            "intro_present": True, "match_cut_present": True,
            "sequence_count": len(matchcut.get("sequences", [])), "validated": True,
        },
    }
    destination = args.out / "hybrid_manifest.json"
    destination.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    report = {"status": "ok", "stage": "F00-D_HYBRID_EGO", "mode": "hybrid_narrative", "intro_frames": intro_frames, "matchcut_frames": matchcut_frames, "total_frames": total_frames, "duration_seconds": output["duration_seconds"], "sequence_count": len(matchcut.get("sequences", [])), "manifest": str(destination)}
    (args.out / "hybrid_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
