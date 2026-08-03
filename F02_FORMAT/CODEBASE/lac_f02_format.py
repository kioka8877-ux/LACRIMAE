"""
LAC_F02_FORMAT — Frégate F02 FORMAT
===================================
Mission : découper les séquences de la cutlist et les formater en 9:16.
Deux profils :
  - blur-pad (défaut) : vidéo nette centrée + fond = même vidéo floutée,
    assombrie et désaturée (optimisé : blur sur petite résolution)
  - reframe           : crop central 9:16 (sujet centré)

Génère aussi OUT/codex.json — template de départ pour la preview F03
(titre statique, logo, presets, volume, coup brutal).

Usage:
  python lac_f02_format.py --input /path/IN/ --output /path/OUT/ --profile blur-pad
  python lac_f02_format.py --input /path/IN/ --output /path/OUT/ --profile reframe

Entrée : IN/video_source.mp4 + IN/cutlist.json (de F01)
Sortie : OUT/clips/clip_001.mp4 ... + OUT/f02_manifest.json + OUT/codex.json
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path

INPUT_VIDEO = "video_source.mp4"
INPUT_CUTLIST = "cutlist.json"
OUTPUT_DIR_CLIPS = "clips"
OUTPUT_MANIFEST = "f02_manifest.json"
OUTPUT_CODEX = "codex.json"

TARGET_WIDTH = 1080
TARGET_HEIGHT = 1920
FPS_TARGET = 30
CRF = 20

COLOR_PRESETS = {
    "warm_vibrant": "contrast(1.2) saturate(1.15) brightness(1.05) hue-rotate(3deg)",
    "cold_desaturated": "contrast(1.1) saturate(0.6) brightness(0.95) hue-rotate(-10deg)",
    "high_contrast": "contrast(1.5) saturate(1.3) brightness(1.0)",
    "punchy": "contrast(1.3) saturate(1.5) brightness(1.1)",
    "sepia_soft": "sepia(0.3) contrast(1.1) saturate(0.9) brightness(1.05)",
}


def log_ok(msg): print(f"  [OK] {msg}")
def log_fail(msg): print(f"  [FAIL] {msg}")
def log_info(msg): print(f"  [...] {msg}")

def section(title):
    bar = "─" * max(0, 50 - len(title))
    print(f"\n── {title} {bar}")


# ─── MÉTADONNÉES ─────────────────────────────────────────────────────────────

def probe_video(path):
    cmd = [
        "ffprobe", "-v", "quiet", "-print_format", "json",
        "-show_format", "-show_streams", str(path)
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe failed: {result.stderr}")
    data = json.loads(result.stdout)
    video_stream = next(
        (s for s in data["streams"] if s["codec_type"] == "video"), None
    )
    if not video_stream:
        raise RuntimeError("Aucun stream vidéo trouvé")
    fps = video_stream.get("r_frame_rate", "30/1")
    if "/" in fps:
        num, den = fps.split("/")
        fps = float(num) / float(den) if den else 30.0
    else:
        fps = float(fps)
    return {
        "duration_seconds": float(data["format"].get("duration", 0)),
        "fps": fps,
        "width": int(video_stream["width"]),
        "height": int(video_stream["height"]),
    }


# ─── FILTRES 9:16 ────────────────────────────────────────────────────────────

def build_blurpad_filter(src_w, src_h, dst_w, dst_h):
    """
    Blur-pad optimisé :
      - fond : downscale 160px → boxblur léger → eq (assombri/désaturé) → upscale
        (20x plus rapide qu'un boxblur=20 sur pleine résolution)
      - premier plan : vidéo nette fit par largeur, centrée verticalement
    """
    src_ratio = src_w / src_h
    dst_ratio = dst_w / dst_h

    if src_ratio > dst_ratio:
        scaled_w = dst_w
        scaled_h = int(dst_w / src_ratio)
    else:
        scaled_h = dst_h
        scaled_w = int(dst_h * src_ratio)

    offset_y = max(0, (dst_h - scaled_h) // 2)
    offset_x = max(0, (dst_w - scaled_w) // 2)

    filter_complex = (
        f"[0:v]split=2[bg][fg];"
        f"[bg]scale=160:-2,boxblur=6:1,"
        f"eq=brightness=-0.12:saturation=0.8,"
        f"scale={dst_w}:{dst_h}:force_original_aspect_ratio=increase,"
        f"crop={dst_w}:{dst_h}[bg];"
        f"[fg]scale={scaled_w}:{scaled_h}[fg];"
        f"[bg][fg]overlay={offset_x}:{offset_y}[v]"
    )
    return filter_complex


def build_reframe_filter(src_w, src_h, dst_w, dst_h):
    """Crop central 9:16 (perd les côtés — sujet centré uniquement)."""
    src_ratio = src_w / src_h
    dst_ratio = dst_w / dst_h

    if src_ratio > dst_ratio:
        crop_w = int(src_h * dst_ratio)
        crop_h = src_h
        crop_x = (src_w - crop_w) // 2
        crop_y = 0
    else:
        crop_w = src_w
        crop_h = int(src_w / dst_ratio)
        crop_x = 0
        crop_y = (src_h - crop_h) // 2

    return f"crop={crop_w}:{crop_h}:{crop_x}:{crop_y},scale={dst_w}:{dst_h}"


# ─── EXTRACTION D'UN CLIP ────────────────────────────────────────────────────

def extract_clip(video_path, start_sec, end_sec, profile, src_info, out_path):
    duration = end_sec - start_sec

    if profile == "blur-pad":
        fc = build_blurpad_filter(src_info["width"], src_info["height"],
                                  TARGET_WIDTH, TARGET_HEIGHT)
        cmd = [
            "ffmpeg", "-y",
            "-ss", str(start_sec), "-i", str(video_path),
            "-t", str(duration),
            "-filter_complex", fc, "-map", "[v]",
            "-map", "0:a?",
            "-c:v", "libx264", "-preset", "fast", "-crf", str(CRF),
            "-pix_fmt", "yuv420p", "-r", str(FPS_TARGET),
            "-c:a", "aac", "-b:a", "192k",
            "-movflags", "+faststart",
            str(out_path),
        ]
    else:
        vf = build_reframe_filter(src_info["width"], src_info["height"],
                                  TARGET_WIDTH, TARGET_HEIGHT)
        cmd = [
            "ffmpeg", "-y",
            "-ss", str(start_sec), "-i", str(video_path),
            "-t", str(duration),
            "-vf", vf,
            "-c:v", "libx264", "-preset", "fast", "-crf", str(CRF),
            "-pix_fmt", "yuv420p", "-r", str(FPS_TARGET),
            "-c:a", "aac", "-b:a", "192k",
            "-movflags", "+faststart",
            str(out_path),
        ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        log_fail(f"Échec FFmpeg clip {start_sec}-{end_sec}s : {result.stderr[-800:]}")
        return False
    return True


# ─── CODEX TEMPLATE ──────────────────────────────────────────────────────────

def write_starter_codex(clips, fps, out_path, title="", preset="punchy"):
    """Template de départ : titre statique + logo + presets + volume + coup brutal."""
    preset = preset if preset in COLOR_PRESETS else "punchy"
    codex = {
        "version": "3.0",
        "pipeline": "LACRIMAE_DEV",
        "video": {
            "source": "clip_001.mp4",
            "fps": fps,
            "total_frames": clips[0]["total_frames"],
            "width": TARGET_WIDTH,
            "height": TARGET_HEIGHT,
        },
        "text_overlays": [
            {
                "id": "title_00",
                "content": title,
                "start_frame": 0,
                "end_frame": clips[0]["total_frames"],
                "animation": "fade_in",
                "font": "Impact, Arial Black, sans-serif",
                "size": 96,
                "color": "#FFFFFF",
                "stroke_color": "#000000",
                "stroke_width": 4,
                "shadow": "2px 4px 8px rgba(0,0,0,0.9)",
                "position": "top",
                "letter_spacing": "0em",
                "glow_intensity": 0,
                "depth_3d": 0,
            }
        ],
        "zoom_keyframes": [],
        "logo": {
            "src": "logo.png",
            "width_pct": 25,
            "position": "top_left",
            "opacity": 1.0,
        },
        "brutal_cut_interval_frames": 90,
        "volume": 1.0,
        "color_preset": preset,
        "color_css_filter": COLOR_PRESETS[preset],
        "enhance_4k": False,
        "sharpening": 0,
        "denoising": 0,
        "vignette": 0.25,
        "grain_intensity": 0.15,
        "slowmo_start_frame": 0,
        "slowmo_speed": 1.0,
        "shake_power": 0,
        "validated_by_magos": False,
    }
    out_path.write_text(json.dumps(codex, ensure_ascii=False, indent=2), encoding="utf-8")
    log_ok(f"Template codex.json écrit : {out_path}")


# ─── MAIN ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="F02 FORMAT — Découpe + format 9:16 (blur-pad ou reframe)"
    )
    parser.add_argument("--input", required=True, help="Dossier IN/")
    parser.add_argument("--output", required=True, help="Dossier OUT/")
    parser.add_argument("--profile", default="blur-pad", choices=["blur-pad", "reframe"],
                        help="Profil de formatage (défaut blur-pad)")
    parser.add_argument("--title", default="", help="Titre de la production (brief du Champion)")
    parser.add_argument("--preset", default="punchy", choices=list(COLOR_PRESETS.keys()),
                        help="Preset de couleurs du codex (défaut punchy)")
    args = parser.parse_args()

    input_dir = Path(args.input)
    output_dir = Path(args.output)
    clips_dir = output_dir / OUTPUT_DIR_CLIPS
    clips_dir.mkdir(parents=True, exist_ok=True)

    video_path = input_dir / INPUT_VIDEO
    cutlist_path = input_dir / INPUT_CUTLIST

    section("Vérification des entrées")
    if not video_path.exists():
        log_fail(f"Vidéo introuvable : {video_path}")
        sys.exit(1)
    if not cutlist_path.exists():
        log_fail(f"Cutlist introuvable : {cutlist_path}")
        sys.exit(1)

    cutlist = json.loads(cutlist_path.read_text(encoding="utf-8"))
    sequences = cutlist.get("sequences", [])
    if not sequences:
        log_fail("Aucune séquence dans la cutlist")
        sys.exit(1)

    section(f"Profil : {args.profile} | {len(sequences)} séquence(s)")
    src_info = probe_video(video_path)
    log_ok(f"Source : {src_info['width']}x{src_info['height']}, "
           f"{src_info['duration_seconds']:.1f}s")

    results = []
    for i, seq in enumerate(sequences):
        start, end = seq["start_sec"], seq["end_sec"]
        reason = seq.get("reason", "")
        section(f"Clip {i + 1} : [{start:.1f}s - {end:.1f}s] {reason}")
        clip_path = clips_dir / f"clip_{i + 1:03d}.mp4"
        if not extract_clip(video_path, start, end, args.profile, src_info, clip_path):
            sys.exit(1)
        meta = probe_video(clip_path)
        total_frames = int(meta["duration_seconds"] * meta["fps"])
        size_mb = clip_path.stat().st_size / 1_000_000
        log_ok(f"{clip_path.name} — {meta['duration_seconds']:.2f}s, "
               f"{total_frames} frames, {size_mb:.1f} Mo")
        results.append({
            "index": i + 1,
            "start_sec": start,
            "end_sec": end,
            "duration_sec": end - start,
            "reason": reason,
            "output": f"{OUTPUT_DIR_CLIPS}/{clip_path.name}",
            "total_frames": total_frames,
            "size_mb": round(size_mb, 2),
        })

    manifest = {
        "profile": args.profile,
        "clips_count": len(results),
        "clips": results,
    }
    (output_dir / OUTPUT_MANIFEST).write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    log_ok(f"{OUTPUT_MANIFEST} écrit")

    write_starter_codex(results, FPS_TARGET, output_dir / OUTPUT_CODEX, args.title, args.preset)

    print()
    print("═" * 52)
    print(" F02 FORMAT — MISSION ACCOMPLIE")
    print(f"  Profil      : {args.profile}")
    print(f"  Clips       : {len(results)}")
    print(f"  Resolution  : {TARGET_WIDTH}x{TARGET_HEIGHT}")
    print("═" * 52)


if __name__ == "__main__":
    main()
