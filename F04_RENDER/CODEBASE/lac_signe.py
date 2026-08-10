#!/usr/bin/env python3
"""LACRIMAE F04b SIGNE — signatures anti-doublon par clip.

Sous-frégate de F04 : lit le codex confirmé (IN/codex.json), génère un bloc
`sig` déterministe PAR CLIP (seed dérivé du pack + clip id) et le merge dans
le codex final utilisé par le rendu Remotion (src/codexData.js).

Règles :
  - Déterminisme : mêmes inputs => mêmes signatures (re-render identique).
  - Variation : chaque clip obtient un trajet de fond, un seed de grain et
    des paramètres d'animation uniques.
  - Rétro-compat : un codex sans bloc `sig` rend comme avant (défauts neutres).

Usage :
  python3 lac_signe.py --codex ../IN/codex.json --js src/codexData.js
"""
import argparse
import hashlib
import json
import math
import random
import sys
from pathlib import Path

DEFAULT_SALT = "LACRIMAE-SIGNE-v1"


def derive_seed(salt: str, clip_id: str) -> int:
    """Seed déterministe dérivé du sel (pack/campagne) + id du clip."""
    return int(hashlib.sha256(f"{salt}|{clip_id}".encode("utf-8")).hexdigest(), 16)


def gen_sig(clip_id: str, salt: str) -> dict:
    """Génère le bloc `sig` d'un clip, de façon déterministe et unique."""
    seed = derive_seed(salt, clip_id)
    rnd = random.Random(seed)
    return {
        "grain": {
            "seed": rnd.randint(1, 9999),
            "intensity": round(rnd.uniform(0.10, 0.22), 3),
        },
        "bg_motion": {
            "base_scale": 1.12,
            "amp_x": round(rnd.uniform(8.0, 28.0), 1),
            "amp_y": round(rnd.uniform(8.0, 28.0), 1),
            "freq": round(rnd.uniform(0.5, 1.5), 2),
            "phase": round(rnd.uniform(0.0, 2.0 * math.pi), 3),
            "drift_x": round(rnd.uniform(-18.0, 18.0), 1),
            "drift_y": round(rnd.uniform(-18.0, 18.0), 1),
        },
        "mirror": rnd.random() < 0.6,
        "cam_drift": {
            "zoom_from": round(rnd.uniform(1.0, 1.01), 3),
            "zoom_to": round(rnd.uniform(1.03, 1.08), 3),
            "dx": round(rnd.uniform(-12.0, 12.0), 1),
            "dy": round(rnd.uniform(-12.0, 12.0), 1),
        },
        "text_anim": {
            "direction": rnd.choice(["ltr", "rtl", "up", "down"]),
            "duration_frames": rnd.randint(20, 45),
            "ease": "in_out",
        },
        "flash": {
            "frame": rnd.randint(2, 6),
            "opacity": round(rnd.uniform(0.06, 0.14), 3),
        },
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="LACRIMAE F04b SIGNE")
    ap.add_argument("--codex", default="../IN/codex.json",
                    help="Codex confirmé en entrée")
    ap.add_argument("--signatures", default="../IN/signatures.json",
                    help="Sortie : signatures JSON par clip")
    ap.add_argument("--js", default="src/codexData.js",
                    help="Sortie : codexData.js regénéré avec les blocs sig")
    ap.add_argument("--salt", default=DEFAULT_SALT,
                    help="Sel de campagne (override seed)")
    args = ap.parse_args()

    codex_path = Path(args.codex)
    if not codex_path.exists():
        print(f"[SIGNE] CODEX INTROUVABLE : {codex_path}")
        return 1

    codex = json.loads(codex_path.read_text(encoding="utf-8"))
    forge = codex.get("forge") or {}

    salt = args.salt
    if forge.get("pack_id"):
        salt = f"{args.salt}|{forge['pack_id']}"
    elif codex.get("session", {}).get("background", {}).get("image"):
        salt = f"{args.salt}|{codex['session']['background']['image']}"
    print(f"[SIGNE] sel : {salt}")

    clips = codex.get("clips") or []
    if not clips:
        print("[SIGNE] AUCUN CLIP dans le codex")
        return 1

    signatures = {}
    for clip in clips:
        cid = clip.get("id", "clip_000")
        sig = gen_sig(cid, salt)
        clip["sig"] = sig
        signatures[cid] = sig
        print(f"  [SIGNE] {cid}: mirror={sig['mirror']} "
              f"grain_seed={sig['grain']['seed']} "
              f"bg_freq={sig['bg_motion']['freq']} "
              f"text_anim={sig['text_anim']['direction']}")

    sig_path = Path(args.signatures)
    sig_path.parent.mkdir(parents=True, exist_ok=True)
    sig_path.write_text(json.dumps(signatures, ensure_ascii=False, indent=2),
                        encoding="utf-8")
    print(f"[SIGNE] signatures écrites : {sig_path} ({len(signatures)} clip(s))")

    js_path = Path(args.js)
    js = "// Généré par lac_signe.py (F04b SIGNE) — ne pas éditer à la main.\n"
    js += "export const codex = " + json.dumps(codex, ensure_ascii=False,
                                               indent=2) + ";\n"
    js_path.write_text(js, encoding="utf-8")
    print(f"[SIGNE] codexData.js regénéré : {js_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
