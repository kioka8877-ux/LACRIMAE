"""
LAC_CUSTOS — Gardien de la Flotte LACRIMAE (branche dev)
Mission : Validation inter-frégates — vérifie l'intégrité des inputs/outputs
          avant et après chaque transit manuel.

Pipeline dev : F00 INGEST → F01 SELECT → F02 FORMAT → F03 PREVIEW
               → F04 RENDER → F05 CAMOUFLAGE → F06 LUTHER

LOIS :
  - stdlib Python uniquement (pas de dépendances externes)
  - Jamais de déplacement de fichiers (LOI D'ISOLEMENT)
  - Retourne exit code 0 si validation OK, 1 si échec

Usage :
  python LAC_CUSTOS.py --frigate F01 --mode check-out [--drive-base /path]
  python LAC_CUSTOS.py --frigate F02 --mode check-in  [--drive-base /path]
"""

import argparse
import json
import os
import sys
from pathlib import Path

# Windows : stdout en cp1252 par défaut — forcer l'UTF-8 pour les glyphes du verdict
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass


# ─── CONFIGURATION ────────────────────────────────────────────────────────────

DEFAULT_DRIVE_BASE = "/content/drive/MyDrive/DRIVE_LACRIMAE_DEV"

# Manifeste des fichiers attendus par frégate
MANIFEST = {
    "F00": {
        "check-out": {
            "OUT": ["video_source.mp4", "d00_manifest.json"],
        },
        "check-in": {},
    },
    "F01": {
        "check-out": {
            "OUT": ["cutlist.json"],
        },
        "check-in": {
            "IN": ["video_source.mp4"],
        },
    },
    "F02": {
        "check-out": {
            "OUT": ["f02_manifest.json", "codex.json"],
            "OUT/clips": [],
        },
        "check-in": {
            "IN": ["video_source.mp4", "cutlist.json"],
        },
    },
    "F03": {
        "check-out": {
            "OUT": ["codex.json"],
        },
        "check-in": {
            "IN": ["codex.json"],
            "IN/clips": [],
        },
    },
    "F04": {
        "check-out": {
            "OUT": ["codex.json", "*.mp4"],
        },
        "check-in": {
            "IN": ["codex.json"],
            "IN/clips": [],
        },
    },
    "F05": {
        "check-out": {
            "OUT": ["*.mp4", "rapport_f05.html"],
        },
        "check-in": {
            "IN": ["*.mp4"],
        },
    },
    "F06": {
        "check-out": {
            "OUT": ["*.mp4"],
        },
        "check-in": {
            "IN": ["*.mp4"],
        },
    },
}

# Validateurs de contenu JSON par fichier
JSON_VALIDATORS = {
    "d00_manifest.json": ["source_type", "source", "output", "meta"],
    "cutlist.json": ["sequences", "video_duration_sec", "requested_sequences"],
    "f02_manifest.json": ["profile", "clips_count", "clips"],
    "codex.json": [
        "version", "pipeline", "clips", "validated_by_magos"
    ],
}

MEDIA_EXTENSIONS = {".jpg", ".jpeg", ".png", ".mp4", ".webm"}


# ─── UTILITAIRES ──────────────────────────────────────────────────────────────

def log_ok(msg: str) -> None:
    print(f"  [✓] {msg}")

def log_err(msg: str) -> None:
    print(f"  [✗] {msg}")

def log_warn(msg: str) -> None:
    print(f"  [!] {msg}")

def log_section(title: str) -> None:
    print(f"\n{'─' * 60}")
    print(f"  {title}")
    print(f"{'─' * 60}")


# ─── VALIDATEURS ──────────────────────────────────────────────────────────────

def check_file_exists(path: Path) -> bool:
    if path.exists() and path.is_file():
        size = path.stat().st_size
        log_ok(f"{path.name} — {size} octets")
        return True
    log_err(f"{path.name} — INTROUVABLE ({path})")
    return False


def check_json_content(path: Path) -> bool:
    """Valide le contenu JSON d'un fichier selon son manifeste."""
    filename = path.name
    if filename not in JSON_VALIDATORS:
        return True

    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        log_err(f"{filename} — JSON invalide : {e}")
        return False

    required_keys = JSON_VALIDATORS[filename]
    missing = [k for k in required_keys if k not in data]
    if missing:
        log_err(f"{filename} — Clés manquantes : {missing}")
        return False

    # Vérifications spécifiques cutlist.json
    if filename == "cutlist.json":
        if not isinstance(data.get("sequences"), list) or len(data["sequences"]) == 0:
            log_err("cutlist.json — 'sequences' doit être une liste non vide")
            return False
        log_ok(f"cutlist.json — {len(data['sequences'])} séquence(s)")

    # Vérifications spécifiques f02_manifest.json
    if filename == "f02_manifest.json":
        if data.get("clips_count") != len(data.get("clips", [])):
            log_err("f02_manifest.json — clips_count incohérent")
            return False
        log_ok(f"f02_manifest.json — {data['clips_count']} clip(s), "
               f"profil={data.get('profile')}")

    # Vérifications spécifiques codex.json (multi-clips)
    if filename == "codex.json":
        clips = data.get("clips", [])
        if not isinstance(clips, list) or len(clips) == 0:
            log_err("codex.json — 'clips' doit être une liste non vide")
            return False
        if not data.get("validated_by_magos"):
            log_err("codex.json — 'validated_by_magos' doit être true "
                    "(validation obligatoire via la porte III / preview F03)")
            return False
        for clip in clips:
            if clip.get("volume", 1.0) < 0:
                log_err(f"codex.json — volume invalide sur {clip.get('id', '?')}")
                return False
            if not clip.get("video", {}).get("source"):
                log_err(f"codex.json — video.source manquant sur {clip.get('id', '?')}")
                return False
        log_ok(f"codex.json — {len(clips)} clip(s), validé par le Magos")

    return True


def check_dir_non_empty(path: Path) -> bool:
    """Vérifie qu'un dossier contient au moins 1 fichier média."""
    if not path.exists() or not path.is_dir():
        log_err(f"Dossier introuvable : {path}")
        return False
    files = [f for f in path.iterdir() if f.suffix.lower() in MEDIA_EXTENSIONS]
    if len(files) == 0:
        log_err(f"Dossier vide : {path}")
        return False
    log_ok(f"{path.name}/ — {len(files)} fichier(s) média")
    return True


def check_mp4_non_empty(path: Path) -> bool:
    """Vérifie qu'un fichier .mp4 a une taille plausible (> 100Ko)."""
    if not path.exists():
        return False
    size = path.stat().st_size
    if size < 100_000:
        log_warn(f"{path.name} — taille suspecte ({size} octets < 100Ko)")
        return False
    return True


# ─── VALIDATION PRINCIPALE ────────────────────────────────────────────────────

def run_custos(frigate: str, mode: str, drive_base: Path) -> bool:
    if frigate not in MANIFEST:
        print(f"[CUSTOS] Frégate inconnue : {frigate}")
        return False
    if mode not in MANIFEST[frigate]:
        print(f"[CUSTOS] Mode inconnu : {mode} pour {frigate}")
        return False

    frigate_dirs = {
        "F00": drive_base / "F00_INGEST",
        "F01": drive_base / "F01_SELECT",
        "F02": drive_base / "F02_FORMAT",
        "F03": drive_base / "F03_PREVIEW",
        "F04": drive_base / "F04_RENDER",
        "F05": drive_base / "F05_CAMOUFLAGE",
        "F06": drive_base / "F06_LUTHER",
    }

    frigate_base = frigate_dirs[frigate]
    rules = MANIFEST[frigate][mode]
    all_ok = True

    log_section(f"LAC_CUSTOS — {frigate} | {mode.upper()}")
    print(f"  Base : {frigate_base}")

    for folder_rel, files in rules.items():
        folder_path = frigate_base / folder_rel

        # Cas dossier (liste vide = check existence + contenu)
        if not files:
            ok = check_dir_non_empty(folder_path)
            all_ok = all_ok and ok
            continue

        for filename in files:
            if "*" in filename:
                # Pattern multi-clips : au moins un fichier non vide dans le dossier
                matches = list(folder_path.glob(filename)) if folder_path.exists() else []
                if not matches:
                    log_err(f"{folder_path.name}/{filename} — AUCUN fichier trouvé")
                    all_ok = False
                    continue
                mp4_ok = True
                for m in matches:
                    if not check_mp4_non_empty(m):
                        mp4_ok = False
                log_ok(f"{folder_path.name}/ — {len(matches)} fichier(s) ({filename})")
                all_ok = all_ok and mp4_ok
                continue

            file_path = folder_path / filename
            ok = check_file_exists(file_path)
            all_ok = all_ok and ok

            if ok and filename.endswith(".json"):
                ok_json = check_json_content(file_path)
                all_ok = all_ok and ok_json

            if ok and filename.endswith(".mp4"):
                ok_mp4 = check_mp4_non_empty(file_path)
                all_ok = all_ok and ok_mp4

    print()
    if all_ok:
        print(f"  ══ CUSTOS VERDICT : ✓ {frigate} {mode.upper()} VALIDÉ ══")
        print(f"  Transit autorisé.\n")
    else:
        print(f"  ══ CUSTOS VERDICT : ✗ {frigate} {mode.upper()} ÉCHOUÉ ══")
        print(f"  Corriger les erreurs avant tout transit.\n")

    return all_ok


# ─── CLI ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="LAC_CUSTOS — Gardien de la Flotte LACRIMAE (dev)"
    )
    parser.add_argument(
        "--frigate", required=True,
        choices=["F00", "F01", "F02", "F03", "F04", "F05", "F06"],
        help="Frégate à valider"
    )
    parser.add_argument(
        "--mode", required=True, choices=["check-in", "check-out"],
        help="check-in = valider les inputs | check-out = valider les outputs"
    )
    parser.add_argument(
        "--drive-base", default=DEFAULT_DRIVE_BASE,
        help=f"Racine Drive LACRIMAE (défaut: {DEFAULT_DRIVE_BASE})"
    )

    args = parser.parse_args()
    drive_base = Path(args.drive_base)

    if not drive_base.exists():
        print(f"[CUSTOS] ERREUR : drive-base introuvable : {drive_base}")
        sys.exit(1)

    ok = run_custos(args.frigate, args.mode, drive_base)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
