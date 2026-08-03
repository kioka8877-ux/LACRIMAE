"""
LAC_F01_SELECT — Frégate F01 SÉLECTION
=======================================
Mission : choisir les séquences intéressantes d'une vidéo longue via un modèle
de vision OpenRouter. Le modèle regarde des frames échantillonnées "comme un
humain" et sélectionne N séquences de durée [min-dur, max-dur].

Aucun transcript nécessaire (stars, foot, etc.) — vision seule.

Usage:
  python lac_f01_select.py --input /path/IN/ --output /path/OUT/ --sequences 2
  python lac_f01_select.py --input /path/IN/ --output /path/OUT/ --prepare
  python lac_f01_select.py --input /path/IN/ --output /path/OUT/ --validate cutlist_genere.json

Entrée : IN/video_source.mp4 (sortie F00)
Sortie : OUT/cutlist.json + OUT/frames/ (échantillons analysés)

Env :
  ORACLE_API_KEY (ou OPENROUTER_API_KEY)  — clé OpenRouter
  ORACLE_MODEL                            — défaut : google/gemini-2.0-flash-exp:free
                                            (vision gratuit ; alternatives :
                                             meta-llama/llama-3.2-11b-vision-instruct:free,
                                             qwen/qwen-2.5-vl-7b-instruct:free)
"""

import argparse
import base64
import json
import math
import os
import re
import subprocess
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    subprocess.check_call(
        [sys.executable, "-m", "pip", "install", "requests", "--quiet"]
    )
    import requests

INPUT_VIDEO = "video_source.mp4"
OUTPUT_CUTLIST = "cutlist.json"
FRAMES_DIR = "frames"
MAX_FRAMES = 24


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


# ─── ÉCHANTILLONNAGE DE FRAMES ───────────────────────────────────────────────

def extract_frames(video_path, out_dir, max_frames=MAX_FRAMES):
    """
    Extrait max_frames frames réparties uniformément sur toute la vidéo.
    FFmpeg filtre select mod(n,K) → un seul passage, rapide.
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    meta = probe_video(video_path)
    duration = meta["duration_seconds"]
    fps = meta["fps"]
    total_frames = int(duration * fps)

    n = min(max_frames, max(2, int(duration // 2)))
    k = max(1, int(total_frames / n))
    sample_path = out_dir / "frame_%03d.jpg"
    cmd = [
        "ffmpeg", "-y", "-i", str(video_path),
        "-vf", f"select=not(mod(n\\,{k})),scale=480:-2",
        "-vsync", "vfr", "-frames:v", str(n),
        "-q:v", "5", str(sample_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        log_fail(f"Extraction des frames échouée : {result.stderr[-800:]}")
        sys.exit(1)

    frames = sorted(out_dir.glob("frame_*.jpg"))
    log_ok(f"{len(frames)} frames extraites dans {out_dir}")
    return frames


def frames_to_data_uris(frames, max_frames=MAX_FRAMES):
    uris = []
    step = max(1, len(frames) // max_frames)
    for f in frames[::step][:max_frames]:
        b64 = base64.b64encode(f.read_bytes()).decode("ascii")
        uris.append(f"data:image/jpeg;base64,{b64}")
    return uris


# ─── PROMPT ORACLE ───────────────────────────────────────────────────────────

def build_prompt(meta, nb_sequences, min_dur, max_dur):
    return f"""# MISSION F01 - SELECTEUR DE SEQUENCES (VISION)

Tu regardes des frames échantillonnées d'une vidéo longue, comme un humain qui
la visionne. Tu dois sélectionner les {nb_sequences} MEILLEURES séquences pour
des Shorts YouTube 9:16.

CONTRAINTES :
- Exactement {nb_sequences} séquences (ni plus, ni moins)
- Chaque séquence dure entre {min_dur}s et {max_dur}s
- Fenêtres dans la vidéo (durée totale : {meta['duration_seconds']:.1f}s)
- Prioriser : action, émotion, réaction forte, moment drôle, payoff, tension
- Éviter : plans vides, transitions molles, moments sans intérêt visuel
- Répartir si possible les séquences dans la vidéo (pas toutes au même endroit)

FORMAT DE SORTIE (JSON valide uniquement) :
{{
  "sequences": [
    {{
      "start_sec": 0.0,
      "end_sec": 8.0,
      "reason": "Description de l'intérêt de la séquence (max 15 mots)"
    }}
  ]
}}
Aucun texte avant ou après le JSON."""


def call_vision_oracle(prompt, image_uris, api_key, model, base_url):
    url = base_url.rstrip("/") + "/chat/completions"
    content = [{"type": "text", "text": prompt}]
    for uri in image_uris:
        content.append({"type": "image_url", "image_url": {"url": uri}})

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "Tu es un sélecteur de séquences pour YouTube Shorts. JSON valide uniquement."},
            {"role": "user", "content": content},
        ],
        "temperature": 0.3,
        "max_tokens": 2048,
        "response_format": {"type": "json_object"},
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    last_err = ""
    for attempt in range(3):
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=180)
            if resp.status_code != 200:
                last_err = f"HTTP {resp.status_code}: {resp.text[:300]}"
            else:
                result = resp.json()
                raw = result["choices"][0]["message"]["content"]
                m = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', raw)
                raw_json = m.group(1) if m else raw.strip()
                return json.loads(raw_json)
        except Exception as e:
            last_err = str(e)
        log_fail(f"Oracle tentative {attempt + 1}/3 : {last_err} — retry dans 10s")
        time.sleep(10)
    return None


# ─── VALIDATION ──────────────────────────────────────────────────────────────

def validate_cutlist(cutlist, meta, nb_sequences, min_dur, max_dur):
    errors = []
    sequences = cutlist.get("sequences", [])
    if not sequences:
        errors.append("Aucune séquence")
    if len(sequences) != nb_sequences:
        errors.append(f"{len(sequences)} séquences (attendu {nb_sequences})")

    duration = meta["duration_seconds"]
    for i, s in enumerate(sequences):
        start, end = s.get("start_sec"), s.get("end_sec")
        if start is None or end is None:
            errors.append(f"Séquence {i} : start_sec/end_sec manquants")
            continue
        if not (0 <= start < end <= duration):
            errors.append(f"Séquence {i} : fenêtre invalide ({start}-{end}s, durée {duration:.1f}s)")
            continue
        dur = end - start
        if not (min_dur - 0.5 <= dur <= max_dur + 0.5):
            errors.append(f"Séquence {i} : durée {dur:.1f}s hors plage ({min_dur}-{max_dur}s)")
        if not s.get("reason"):
            errors.append(f"Séquence {i} : raison manquante")

    for i in range(len(sequences)):
        for j in range(i + 1, len(sequences)):
            a, b = sequences[i], sequences[j]
            if a.get("start_sec") is None or b.get("start_sec") is None:
                continue
            if a["start_sec"] < b["end_sec"] and b["start_sec"] < a["end_sec"]:
                errors.append(f"Chevauchement entre séquence {i} et {j}")

    if errors:
        section("ERREURS DE VALIDATION")
        for e in errors:
            log_fail(e)
        return False

    cutlist["video_duration_sec"] = round(duration, 2)
    cutlist["requested_sequences"] = nb_sequences
    return True


# ─── MODES ───────────────────────────────────────────────────────────────────

def run_prepare(input_dir, output_dir, nb_sequences, min_dur, max_dur):
    section("F01 PREPARE — Extraction des frames + prompt")
    video_path = input_dir / INPUT_VIDEO
    if not video_path.exists():
        log_fail(f"Vidéo introuvable : {video_path}")
        sys.exit(1)
    meta = probe_video(video_path)
    frames = extract_frames(video_path, output_dir / FRAMES_DIR)
    prompt = build_prompt(meta, nb_sequences, min_dur, max_dur)
    prompt_path = output_dir / "oracle_prompt.txt"
    prompt_path.write_text(prompt, encoding="utf-8")
    log_ok(f"Prompt écrit : {prompt_path}")
    log_info("Pour générer la cutlist : lancer le mode --oracle, ou coller le prompt "
             "avec les frames dans un chat vision, puis --validate cutlist.json")
    return frames, meta


def run_oracle(input_dir, output_dir, nb_sequences, min_dur, max_dur, model=None):
    section("F01 ORACLE — Sélection par vision")
    api_key = os.environ.get("ORACLE_API_KEY") or os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        log_fail("ORACLE_API_KEY (ou OPENROUTER_API_KEY) non définie")
        sys.exit(1)
    base_url = os.environ.get("ORACLE_BASE_URL", "https://openrouter.ai/api/v1")
    if not model:
        model = os.environ.get("ORACLE_MODEL", "google/gemini-2.0-flash-exp:free")

    frames, meta = run_prepare(input_dir, output_dir, nb_sequences, min_dur, max_dur)
    uris = frames_to_data_uris(frames)
    log_info(f"Appel modèle vision : {model} ({len(uris)} frames)")
    cutlist = call_vision_oracle(build_prompt(meta, nb_sequences, min_dur, max_dur),
                                 uris, api_key, model, base_url)
    if cutlist is None:
        log_fail("Oracle en échec après 3 tentatives")
        sys.exit(1)

    if not validate_cutlist(cutlist, meta, nb_sequences, min_dur, max_dur):
        sys.exit(1)

    cutlist_path = output_dir / OUTPUT_CUTLIST
    cutlist_path.write_text(
        json.dumps(cutlist, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    log_ok(f"cutlist.json écrit : {cutlist_path}")
    print()
    print("═" * 52)
    print(" F01 SELECT — MISSION ACCOMPLIE")
    for i, s in enumerate(cutlist["sequences"]):
        print(f"  S{i} : {s['start_sec']:6.1f}s - {s['end_sec']:6.1f}s  ({s['reason']})")
    print("═" * 52)


def run_validate(input_dir, output_dir, cutlist_file, nb_sequences, min_dur, max_dur):
    section("F01 VALIDATE — Vérification cutlist")
    cutlist_path = output_dir / cutlist_file
    if not cutlist_path.exists():
        cutlist_path = input_dir / cutlist_file
    if not cutlist_path.exists():
        log_fail(f"cutlist introuvable : {cutlist_file}")
        sys.exit(1)

    cutlist = json.loads(cutlist_path.read_text(encoding="utf-8"))
    meta = probe_video(input_dir / INPUT_VIDEO)
    if not validate_cutlist(cutlist, meta, nb_sequences, min_dur, max_dur):
        sys.exit(1)

    out_path = output_dir / OUTPUT_CUTLIST
    out_path.write_text(json.dumps(cutlist, ensure_ascii=False, indent=2), encoding="utf-8")
    log_ok(f"cutlist validée et écrite : {out_path}")
    print("═" * 52)
    print(" F01 VALIDATE — CUTLIST VALIDÉE")
    print("═" * 52)


# ─── CLI ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="F01 SELECT — Sélection de séquences par modèle de vision"
    )
    parser.add_argument("--input", required=True, help="Dossier IN/")
    parser.add_argument("--output", required=True, help="Dossier OUT/")
    parser.add_argument("--sequences", type=int, default=2, help="Nombre de séquences (défaut 2)")
    parser.add_argument("--min-dur", type=float, default=3.0, help="Durée min par séquence (défaut 3)")
    parser.add_argument("--max-dur", type=float, default=10.0, help="Durée max par séquence (défaut 10)")
    parser.add_argument("--model", default=None, help="Modèle vision OpenRouter (override)")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--prepare", action="store_true", help="Extrait frames + prompt sans API")
    group.add_argument("--oracle", action="store_true", help="Mode complet : frames + appel vision + validation")
    group.add_argument("--validate", metavar="FILE", help="Valide une cutlist générée")
    args = parser.parse_args()

    input_dir = Path(args.input)
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    if args.prepare:
        run_prepare(input_dir, output_dir, args.sequences, args.min_dur, args.max_dur)
    elif args.oracle:
        run_oracle(input_dir, output_dir, args.sequences, args.min_dur, args.max_dur, args.model)
    elif args.validate:
        run_validate(input_dir, output_dir, args.validate, args.sequences, args.min_dur, args.max_dur)


if __name__ == "__main__":
    main()
