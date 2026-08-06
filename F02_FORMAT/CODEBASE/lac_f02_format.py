"""
LAC_F02_FORMAT — Frégate F02 FORMAT
===================================
Mission : découper les séquences de la cutlist et les formater en 9:16.
Trois profils :
  - blur-pad (défaut) : vidéo nette centrée + fond = même vidéo floutée,
    assombrie et désaturée (optimisé : blur sur petite résolution)
  - reframe           : crop central 9:16 (sujet centré)
  - background        : découpe SEULE (résolution source conservée) — la mise
    en page (fond PNG + vidéo + titre + paragraphe + logo) se fait dans la
    composition Remotion (F03/F04). Profil utilisé par le mode forge Perturabo.

Génère aussi OUT/codex.json — template de départ pour la preview F03.
Codex v4.0 : bloc `session` (style global : fond PNG, logo, textes, presets)
+ blocs `clips[]` (contenu par clip : titre, paragraphe, cut). Une session
= N vidéos (ex : pack Perturabo = 5 vidéos) — le style session s'applique
à tous les clips.

Usage:
  python lac_f02_format.py --input /path/IN/ --output /path/OUT/ --profile blur-pad
  python lac_f02_format.py --input /path/IN/ --output /path/OUT/ --profile background

Entrée : IN/video_source.mp4 + IN/cutlist.json (de F01 ou du bridge forge)
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

# Défauts de la session (style global) — copiés dans le template codex
SESSION_DEFAULTS = {
    "background": {
        "image": None,          # nom du PNG dans public/ (ex "fond_01.png") — None = couleur unie
        "color": "#0a0a0a",
        "scale": 1.0,
    },
    "logo": {
        "src": "logo.png",
        "width_pct": 25,
        "position": "bottom_left",
        "opacity": 1.0,
    },
    "texts_style": {
        "font": "Impact, Arial Black, sans-serif",
        "size_title": 96,
        "size_paragraph": 44,
        "color": "#FFFFFF",
        "stroke_color": "#000000",
        "stroke_width": 4,
        "shadow": "2px 4px 8px rgba(0,0,0,0.9)",
        "glow_intensity": 0,
        "letter_spacing": "0em",
    },
    "presets": {
        "color_preset": "punchy",
        "color_css_filter": COLOR_PRESETS["punchy"],
        "enhance_4k": False,
        "sharpening": 0,
        "denoising": 0,
        "vignette": 0.25,
        "grain_intensity": 0.15,
    },
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

    # Profil background : découpe SEULE — résolution source conservée.
    # La mise en page 9:16 (fond PNG + vidéo) est faite par la compo Remotion.
    if profile == "background":
        cmd = [
            "ffmpeg", "-y",
            "-ss", str(start_sec), "-i", str(video_path),
            "-t", str(duration),
            "-c:v", "libx264", "-preset", "fast", "-crf", str(CRF),
            "-pix_fmt", "yuv420p", "-r", str(FPS_TARGET),
            "-c:a", "aac", "-b:a", "192k",
            "-movflags", "+faststart",
            str(out_path),
        ]
    elif profile == "blur-pad":
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
    else:  # reframe
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


# ─── CODEX TEMPLATE (v4.0 — session + clips) ────────────────────────────────

def write_starter_codex(clips, fps, out_path, title="", preset="punchy",
                        texts=None, mode="libre", forge_base=None):
    """Codex v4.0 : bloc `session` (style global appliqué aux N clips)
    + blocs `clips[]` (contenu par clip). Une session = N vidéos.

    forge_base : codex du bridge (mode forge). Si fourni, la SESSION et le
    bloc `forge` du bridge sont PRÉSERVÉS (fond PNG choisi par l'opérateur,
    logo, textes_style, presets) — F02 ne régénère que les clips[] avec les
    vraies métadonnées de découpe."""
    preset = preset if preset in COLOR_PRESETS else "punchy"

    def merge_session(base_session):
        """Fusionne les défauts avec la session du bridge (le bridge gagne)."""
        base_session = base_session or {}
        merged = {}
        for key, default in SESSION_DEFAULTS.items():
            if isinstance(default, dict) and isinstance(base_session.get(key), dict):
                merged[key] = {**default, **base_session[key]}
            else:
                merged[key] = base_session.get(key, default)
        return merged

    def clip_block(clip):
        # Les clés du mapping textes sont des strings ("1", "2", ...) —
        # clip["index"] est un int → str() obligatoire pour matcher le pack
        clip_texts = (texts or {}).get(str(clip["index"]), {})
        return {
            "id": clip["output"].split("/")[-1].replace(".mp4", ""),
            "video": {
                "source": clip["output"].split("/")[-1],
                "fps": fps,
                "total_frames": clip["total_frames"],
                "width": clip.get("width", TARGET_WIDTH),
                "height": clip.get("height", TARGET_HEIGHT),
            },
            "texts": {
                "mode": clip_texts.get("mode", "title" if clip_texts.get("title") else "none"),
                "title": clip_texts.get("title", title),
                "paragraph": clip_texts.get("paragraph", ""),
                "title_offset_pct": clip_texts.get("title_offset_pct", 8),
                "paragraph_offset_pct": clip_texts.get("paragraph_offset_pct", 8),
            },
            # Rétro-compat : text_overlays reste supporté par la compo
            "text_overlays": [
                {
                    "id": "title_00",
                    "content": clip_texts.get("title", title),
                    "start_frame": 0,
                    "end_frame": clip["total_frames"],
                    "animation": "fade_in",
                    "font": SESSION_DEFAULTS["texts_style"]["font"],
                    "size": SESSION_DEFAULTS["texts_style"]["size_title"],
                    "color": SESSION_DEFAULTS["texts_style"]["color"],
                    "stroke_color": SESSION_DEFAULTS["texts_style"]["stroke_color"],
                    "stroke_width": SESSION_DEFAULTS["texts_style"]["stroke_width"],
                    "shadow": SESSION_DEFAULTS["texts_style"]["shadow"],
                    "position": "top",
                    "letter_spacing": "0em",
                    "glow_intensity": 0,
                    "depth_3d": 0,
                }
            ],
            "zoom_keyframes": [],
            "logo": None,  # hérite du session
            "brutal_cut_interval_frames": 90,
            "volume": 1.0,
            "slowmo_start_frame": 0,
            "slowmo_speed": 1.0,
            "shake_power": 0,
        }

    codex = {
        "version": "4.0",
        "pipeline": "LACRIMAE_DEV",
        "mode": mode,  # "libre" | "forge"
        "session": merge_session((forge_base or {}).get("session")),
        "validated_by_magos": False,
        "clips": [clip_block(c) for c in clips],
    }
    # Rétro-compat : préserver le bloc forge (mode forge) si fourni
    if forge_base and forge_base.get("forge"):
        codex["forge"] = forge_base["forge"]
    # Preset couleurs (défaut punchy si le bridge n'en impose pas)
    if not (forge_base or {}).get("session", {}).get("presets", {}).get("color_preset"):
        codex["session"]["presets"]["color_preset"] = preset
        codex["session"]["presets"]["color_css_filter"] = COLOR_PRESETS[preset]
    out_path.write_text(json.dumps(codex, ensure_ascii=False, indent=2), encoding="utf-8")
    log_ok(f"Template codex.json v4.0 écrit ({len(clips)} clip(s)) : {out_path}")


# ─── MAIN ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="F02 FORMAT — Découpe + format 9:16 (blur-pad, reframe ou background)"
    )
    parser.add_argument("--input", required=True, help="Dossier IN/")
    parser.add_argument("--output", required=True, help="Dossier OUT/")
    parser.add_argument("--profile", default="blur-pad",
                        choices=["blur-pad", "reframe", "background"],
                        help="Profil de formatage (défaut blur-pad)")
    parser.add_argument("--title", default="", help="Titre de la production (brief du Champion)")
    parser.add_argument("--preset", default="punchy", choices=list(COLOR_PRESETS.keys()),
                        help="Preset de couleurs du codex (défaut punchy)")
    parser.add_argument("--texts", default=None,
                        help="JSON optionnel : mapping index → {title, paragraph, mode} "
                             "(utilisé par le bridge forge)")
    parser.add_argument("--forge-codex", default=None,
                        help="Chemin du codex forge du bridge (BRIDGE_PERTURABO/OUT/codex.json) : "
                             "préserve la session (fond PNG/logo/presets) et extrait les textes "
                             "par clip si --texts absent")
    parser.add_argument("--mode", default="libre", choices=["libre", "forge"],
                        help="Mode du codex (défaut libre)")
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

    texts_map = {}
    forge_base = None
    if args.texts:
        try:
            texts_map = json.loads(args.texts)
        except json.JSONDecodeError:
            log_fail("--texts invalide (JSON attendu)")
            sys.exit(1)
    if args.forge_codex:
        forge_path = Path(args.forge_codex)
        if not forge_path.exists():
            log_fail(f"--forge-codex introuvable : {forge_path}")
            sys.exit(1)
        forge_base = json.loads(forge_path.read_text(encoding="utf-8"))
        if not texts_map:
            # Les textes par clip viennent du codex bridge (mode forge)
            for i, clip in enumerate(forge_base.get("clips", []), start=1):
                t = clip.get("texts") or {}
                texts_map[str(i)] = {
                    "title": t.get("title", ""),
                    "paragraph": t.get("paragraph", ""),
                    "mode": t.get("mode", "title"),
                }
            log_ok(f"Forge : {len(texts_map)} block(s) de textes repris du codex bridge")

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
            "width": meta["width"],
            "height": meta["height"],
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

    write_starter_codex(results, FPS_TARGET, output_dir / OUTPUT_CODEX,
                        args.title, args.preset, texts_map, args.mode,
                        forge_base=forge_base)

    print()
    print("═" * 52)
    print(" F02 FORMAT — MISSION ACCOMPLIE")
    print(f"  Profil      : {args.profile}")
    print(f"  Clips       : {len(results)}")
    print(f"  Resolution  : {TARGET_WIDTH}x{TARGET_HEIGHT}"
          + ("" if args.profile == "background" else " (formaté)"))
    print("═" * 52)


if __name__ == "__main__":
    main()
