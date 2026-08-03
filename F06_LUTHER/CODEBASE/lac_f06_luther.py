"""
lac_f06_luther.py — Frégate F06 LUTHER
=======================================
Effacement complet de l'empreinte numérique.
Pillé d'OMNIS-WATCH (omnis_f05_luther.py).

Protocole :
  - Strip TOTAL des métadonnées container (title, date, encoder, tout)
  - Stream copy uniquement — zéro re-encode, zéro dégradation qualité
  - Normalisation timestamp fichier → date de production
  - Vérification post-strip : aucun tag résiduel autorisé

IN  : youtube_final.mp4 (sortie F05)
OUT : clean_final.mp4 (artefact livrable)

Usage:
    python lac_f06_luther.py --input /path/IN/ --output /path/OUT/ [--date YYYY-MM-DD]
"""

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import date, datetime
from pathlib import Path

INPUT_FILE  = "youtube_final.mp4"
OUTPUT_FILE = "clean_final.mp4"

SUSPICIOUS_TAGS = ["remotion", "manim", "ffmpeg", "lavf", "lavc", "libav", "python", "claude"]

# ─── Logging ──────────────────────────────────────────────────────────────────

def log_ok(msg):   print(f"  [OK]   {msg}")
def log_fail(msg): print(f"  [FAIL] {msg}")
def log_info(msg): print(f"  [...]  {msg}")
def log_warn(msg): print(f"  [WARN] {msg}")

def section(title):
    bar = "─" * max(0, 50 - len(title))
    print(f"\n── {title} {bar}")

# ─── Probe ────────────────────────────────────────────────────────────────────

def probe(path: str) -> dict:
    cmd = [
        "ffprobe", "-v", "quiet",
        "-print_format", "json",
        "-show_format", "-show_streams",
        path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        return {}
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return {}


def extract_tags(probe_data: dict) -> dict:
    fmt_tags = probe_data.get("format", {}).get("tags", {})
    stream_tags = {}
    for s in probe_data.get("streams", []):
        stream_tags.update(s.get("tags", {}))
    all_tags = {}
    all_tags.update(stream_tags)
    all_tags.update(fmt_tags)
    return {k.lower(): v for k, v in all_tags.items()}


def has_suspicious_tags(tags: dict) -> list:
    found = []
    for key, val in tags.items():
        combined = f"{key} {val}".lower()
        for s in SUSPICIOUS_TAGS:
            if s in combined:
                found.append(f"{key}={val!r}")
    return found

# ─── Strip ────────────────────────────────────────────────────────────────────

def strip(input_path: str, output_path: str) -> bool:
    """
    Stream copy + wipe intégral des tags container.
    Aucun tag ajouté en sortie — empreinte zéro absolue.
    """
    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-c", "copy",
        "-map_metadata", "-1",
        "-fflags", "+bitexact",
        "-flags:v", "+bitexact",
        "-flags:a", "+bitexact",
        output_path,
    ]
    log_info(f"ffmpeg strip → {os.path.basename(output_path)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        log_fail("ffmpeg strip échoué")
        print(result.stderr[-800:])
        return False
    return True


def normalize_timestamp(path: str, date_str: str):
    """Aligne mtime/atime sur la date de production — efface la date de génération réelle."""
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d").replace(hour=12, minute=0, second=0)
        ts = time.mktime(dt.timetuple())
        os.utime(path, (ts, ts))
        log_ok(f"Timestamp normalisé → {date_str}")
    except (ValueError, OSError) as e:
        log_warn(f"Timestamp ignoré : {e}")

# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="F06 LUTHER — Effacement empreinte (multi-clips)")
    parser.add_argument("--input",  required=True, help="Dossier IN/ (contient les *_youtube.mp4)")
    parser.add_argument("--output", required=True, help="Dossier OUT/ (recevra les *_clean.mp4)")
    parser.add_argument("--date",   default=date.today().isoformat(), help="Date production YYYY-MM-DD")
    args = parser.parse_args()

    input_dir  = Path(args.input)
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    print()
    print("═" * 50)
    print("  F06 LUTHER — Effacement en cours")
    print("═" * 50)

    # ── Multi-clips : tous les vidéos de IN/ ─────────────────────────────────
    section("Vérification source")
    input_files = sorted(input_dir.glob("*.mp4"))
    if not input_files:
        log_fail(f"Aucun .mp4 dans {input_dir}")
        sys.exit(1)
    log_ok(f"{len(input_files)} clip(s) trouvé(s) dans IN/")

    for input_path in input_files:
        clip_name = input_path.stem
        output_path = output_dir / f"{clip_name}_clean.mp4"
        section(f"Luther : {clip_name}")

        size_mb = input_path.stat().st_size / 1_000_000
        log_ok(f"{input_path.name} — {size_mb:.1f} MB")

        # ── Audit pre-strip ──────────────────────────────────────────────────
        pre_data = probe(str(input_path))
        pre_tags = extract_tags(pre_data)
        if pre_tags:
            log_warn(f"{len(pre_tags)} tag(s) détecté(s) :")
            for k, v in pre_tags.items():
                print(f"         {k} = {v!r}")
        else:
            log_info("Aucun tag détecté en source")
        suspicious_pre = has_suspicious_tags(pre_tags)
        if suspicious_pre:
            log_warn(f"Tags suspects à effacer : {suspicious_pre}")

        # ── Strip ────────────────────────────────────────────────────────────
        if not strip(str(input_path), str(output_path)):
            sys.exit(1)
        log_ok("Strip terminé")

        # ── Normalisation timestamp ──────────────────────────────────────────
        normalize_timestamp(str(output_path), args.date)

        # ── Audit post-strip ─────────────────────────────────────────────────
        post_data = probe(str(output_path))
        post_tags = extract_tags(post_data)
        suspicious_post = has_suspicious_tags(post_tags)

        if post_tags:
            log_warn(f"{len(post_tags)} tag(s) résiduel(s) :")
            for k, v in post_tags.items():
                print(f"         {k} = {v!r}")
        else:
            log_ok("Aucun tag résiduel — empreinte zéro")

        if suspicious_post:
            log_fail(f"Tags suspects résiduels : {suspicious_post}")
            sys.exit(1)

        # ── Intégrité sortie ─────────────────────────────────────────────────
        out_size = output_path.stat().st_size / 1_000_000
        log_ok(f"{output_path.name} — {out_size:.1f} MB")

        for s in post_data.get("streams", []):
            if s["codec_type"] == "video":
                log_ok(f"Vidéo : {s.get('codec_name')} {s.get('width')}×{s.get('height')}")
            elif s["codec_type"] == "audio":
                log_ok(f"Audio : {s.get('codec_name')} {s.get('sample_rate')}Hz")

    print()
    print("═" * 50)
    print("  LUTHER — EMPREINTE EFFACÉE")
    print("═" * 50)
    print()


if __name__ == "__main__":
    main()
