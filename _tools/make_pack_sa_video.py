#!/usr/bin/env python3
"""Crée le pack ajusté pour la vidéo opérateur (182 s) — cuts recalibrés,
textes du pack original conservés. Ne modifie PAS le pack original auto-récupéré."""
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "BRIDGE_PERTURABO" / "IN" / "production_pack.json"
DST = ROOT / "BRIDGE_PERTURABO" / "IN" / "production_pack_SA_VIDEO.json"

# Vidéo opérateur : 182.37 s. Marge de sécurité → dernier cut ≤ 180 s.
VIDEO_DURATION = 182.37
MAX_END = 180.0

pack = json.loads(SRC.read_text(encoding="utf-8"))
videos = pack["videos"]

# 5 fenêtres de 30 s réparties uniformément dans [0, MAX_END], ordre narratif conservé.
n = len(videos)
step = (MAX_END - 30.0) / max(n - 1, 1)
cuts = []
for i in range(n):
    start = round(i * step, 1)
    end = round(start + 30.0, 1)
    cuts.append((start, end))

for i, v in enumerate(videos):
    start, end = cuts[i]
    duration = round(end - start, 1)
    old = v["cut"]
    v["cut"] = {
        "start_sec": start,
        "end_sec": end,
        "duration_sec": duration,
        "cut_source": "recut_video_operateur",
        "note": f"Re-cut opérateur (vidéo {VIDEO_DURATION:.0f}s) — fenêtre {start}-{end}s "
                f"({duration:.0f}s) répartie uniformément. Ajustable à la Porte II "
                f"(editer F02_FORMAT/IN/cutlist.json). {old.get('note', '')}",
    }

# Trace que la source n'est plus la vidéo YouTube mais la vidéo opérateur.
pack["pack_id"] = pack.get("pack_id", "PACK") + "-SA_VIDEO"
pack["clip_source_ref"] = {
    **pack.get("clip_source_ref", {}),
    "source_type": "operator_file",
    "reference": "SHARED/IN/video_source.mp4",
    "duration_sec": VIDEO_DURATION,
    "timecodes": None,
    "note": "Vidéo fournie par l'opérateur (182 s). Cuts recalibrés par rapport au pack original.",
}

DST.write_text(json.dumps(pack, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"[✓] Pack ajusté écrit : {DST}")
print(f"[→] {n} clips, dernière fenêtre {cuts[-1][0]}-{cuts[-1][1]}s ≤ {MAX_END}s")
for i, v in enumerate(videos):
    c = v["cut"]
    print(f"  - {v['angle_id']}: {c['start_sec']}-{c['end_sec']}s "
          f"({v['title'][:45]})")
