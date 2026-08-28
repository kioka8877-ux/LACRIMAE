"""F02 FRÉGATE MÈRE — Orchestrateur du pipeline vidéo IA.

dev6-C : Cette frégate remplace F02-F09 par un pipeline unifié
qui utilise de vrais modèles IA sur Modal GPU, pas du FFmpeg basique.

Pipeline (7 phases) :
  0. MOTUS     — RIFE interpolation temporelle
  1. RESTAURE  — SCUNet (denoise+dehalo) + Real-ESRGAN (détails)
  2. FACIES    — GFPGAN restauration visages
  3. GRADE     — ACES tonemap + grading sélectif + protection peau
  4. SHARPEN   — Real-ESRGAN edge-aware
  5. GLOW      — Bloom/halation via OpenCV
  6. EXPORT    — FFmpeg H.264 (paramètres HandBrake)

Usage :
  python3 mother_frigate.py \\
    --input video.mp4 \\
    --output resultat.mp4 \\
    --preset clean_realistic \\
    --report rapport.json
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# Ajouter les phases au path
PHASES_DIR = Path(__file__).parent / "phases"
if str(PHASES_DIR) not in sys.path:
    sys.path.insert(0, str(PHASES_DIR))

# Importer les phases
from phase1_restore import run_phase1
from phase2_faces import run_phase2
from phase3_grade import run_phase3
from phase4_sharpen import run_phase4
from phase5_glow import run_phase5
from phase6_export import run_phase6

# Phase 0 (RIFE) est gérée séparément via le worker Modal car elle
# nécessite le Volume de modèles RIFE spécifique.


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load_compositing_config() -> dict:
    """Charge la config compositing depuis CONFIG/atom_ic_compositing.json."""
    config_paths = [
        Path("/app/CONFIG/atom_ic_compositing.json"),
        Path(__file__).parent.parent.parent / "CONFIG" / "atom_ic_compositing.json",
    ]
    for p in config_paths:
        if p.is_file():
            return json.loads(p.read_text(encoding="utf-8"))
    raise FileNotFoundError("CONFIG/atom_ic_compositing.json introuvable")


def get_preset_config(config: dict, preset_name: str) -> dict:
    """Récupère la config d'un preset donné."""
    presets = config.get("presets", {})
    if preset_name not in presets:
        default = config.get("default_preset", "clean_realistic")
        print(f"[MOTHER] Preset '{preset_name}' introuvable — utilisation de '{default}'")
        preset_name = default
    return presets[preset_name]["phases"]


def list_presets(config: dict) -> str:
    """Affiche le tableau des presets disponibles."""
    presets = config.get("presets", {})
    order = config.get("presets_order", list(presets.keys()))

    lines = []
    lines.append("")
    lines.append("  F02 FRÉGATE MÈRE — Presets disponibles (dev6-C)")
    lines.append("  " + "=" * 70)
    lines.append(f"  {'#':<4} {'Preset':<18} {'Description'}")
    lines.append("  " + "-" * 70)
    for i, name in enumerate(order, 1):
        p = presets.get(name, {})
        desc = p.get("description", "")[:50]
        lines.append(f"  {i:<4} {name:<18} {desc}")
    lines.append("  " + "=" * 70)
    lines.append("")
    return "\n".join(lines)


def run_mother_frigate(
    input_path: Path,
    output_path: Path,
    preset: str,
    report_path: Path,
    skip_phases: list[str] | None = None,
) -> dict:
    """Orchestre toutes les phases du pipeline.

    Args:
        input_path: Vidéo source
        output_path: Vidéo de sortie finale
        preset: Nom du preset (silver_gray, dark, warm, viral_hdr, clean_realistic)
        report_path: Chemin du rapport JSON final
        skip_phases: Phases à ignorer (ex: ["phase0_motus"] si déjà interpolé)
    """
    skip_phases = skip_phases or []
    started = time.monotonic()
    overall_input_hash = sha256(input_path)

    # Charger la config
    config = load_compositing_config()
    preset_phases = get_preset_config(config, preset)

    print(f"\n{'='*60}")
    print(f"  F02 FRÉGATE MÈRE — Pipeline IA dev6-C")
    print(f"  Preset : {preset}")
    print(f"  Source : {input_path.name}")
    print(f"{'='*60}\n")

    # Créer un répertoire temporaire pour les étapes intermédiaires
    tmp_dir = output_path.parent / f".mother_tmp_{int(time.time())}"
    tmp_dir.mkdir(parents=True, exist_ok=True)

    current_input = input_path
    phase_reports = {}
    phase_order = [
        "phase0_motus",
        "phase1_restore",
        "phase2_faces",
        "phase3_grade",
        "phase4_sharpen",
        "phase5_glow",
        "phase6_export",
    ]

    try:
        for phase_name in phase_order:
            phase_config = preset_phases.get(phase_name, {})
            enabled = phase_config.get("enabled", True)

            if phase_name in skip_phases:
                print(f"\n[SKIP] {phase_name} — ignoré (skip_phases)")
                continue

            if not enabled:
                print(f"\n[SKIP] {phase_name} — désactivé par le preset '{preset}'")
                continue

            # Déterminer la sortie de cette phase
            if phase_name == "phase6_export":
                phase_output = output_path
            else:
                phase_output = tmp_dir / f"{phase_name}_output.mp4"

            phase_report_path = tmp_dir / f"{phase_name}_report.json"

            print(f"\n{'─'*60}")
            print(f"  ▶ {phase_name.upper()}")
            print(f"{'─'*60}")

            phase_started = time.monotonic()

            # Exécuter la phase
            if phase_name == "phase0_motus":
                # Phase 0 est gérée par le worker Modal (RIFE)
                # Ici on la skip car elle est appelée séparément
                print(f"  [INFO] Phase 0 (MOTUS/RIFE) gérée par le worker Modal")
                print(f"  [INFO] Si la vidéo est déjà interpolée, passez --skip-phase0")
                continue
            elif phase_name == "phase1_restore":
                report = run_phase1(current_input, phase_output, phase_config, phase_report_path)
            elif phase_name == "phase2_faces":
                report = run_phase2(current_input, phase_output, phase_config, phase_report_path)
            elif phase_name == "phase3_grade":
                report = run_phase3(current_input, phase_output, phase_config, phase_report_path)
            elif phase_name == "phase4_sharpen":
                report = run_phase4(current_input, phase_output, phase_config, phase_report_path)
            elif phase_name == "phase5_glow":
                report = run_phase5(current_input, phase_output, phase_config, phase_report_path)
            elif phase_name == "phase6_export":
                report = run_phase6(current_input, phase_output, phase_config, phase_report_path)
            else:
                print(f"  [WARN] Phase inconnue: {phase_name}")
                continue

            phase_elapsed = round(time.monotonic() - phase_started, 3)
            report["phase_elapsed_seconds"] = phase_elapsed
            phase_reports[phase_name] = report

            # La sortie de cette phase devient l'entrée de la suivante
            if phase_name != "phase6_export":
                current_input = phase_output

            print(f"  ✅ {phase_name} terminé en {phase_elapsed}s")

    finally:
        # Nettoyer les fichiers intermédiaires (sauf la sortie finale)
        if tmp_dir.exists():
            shutil.rmtree(tmp_dir, ignore_errors=True)

    # Rapport final
    total_elapsed = round(time.monotonic() - started, 3)
    overall_output_hash = sha256(output_path) if output_path.exists() else None

    final_report = {
        "pipeline": "F02_MOTHER_FRIGATE",
        "version": "dev6-C",
        "status": "SUCCEEDED" if output_path.exists() else "FAILED",
        "preset": preset,
        "input_path": str(input_path),
        "output_path": str(output_path),
        "input_sha256": overall_input_hash,
        "output_sha256": overall_output_hash,
        "phases_executed": list(phase_reports.keys()),
        "phases_skipped": skip_phases,
        "phase_reports": phase_reports,
        "total_elapsed_seconds": total_elapsed,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(
        json.dumps(final_report, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    print(f"\n{'='*60}")
    print(f"  ✅ PIPELINE TERMINÉ — {total_elapsed}s")
    print(f"  Preset : {preset}")
    print(f"  Phases : {', '.join(phase_reports.keys())}")
    print(f"  Sortie : {output_path}")
    if output_path.exists():
        size_mo = output_path.stat().st_size / 1024 / 1024
        print(f"  Taille : {size_mo:.1f} Mo")
    print(f"{'='*60}\n")

    return final_report


def main():
    parser = argparse.ArgumentParser(
        description="F02 Frégate Mère — Pipeline vidéo IA dev6-C"
    )
    parser.add_argument("--input", type=Path, required=True, help="Vidéo source")
    parser.add_argument("--output", type=Path, required=True, help="Vidéo de sortie")
    parser.add_argument(
        "--preset", type=str, default="clean_realistic",
        choices=["silver_gray", "dark", "warm", "viral_hdr", "clean_realistic"],
        help="Preset compositing",
    )
    parser.add_argument("--report", type=Path, default=None, help="Chemin du rapport JSON")
    parser.add_argument("--list-presets", action="store_true", help="Afficher les presets")
    parser.add_argument(
        "--skip-phase", action="append", default=[],
        help="Phase à ignorer (ex: --skip-phase phase0_motus)",
    )
    args = parser.parse_args()

    config = load_compositing_config()

    if args.list_presets:
        print(list_presets(config))
        return 0

    if not args.input.is_file():
        raise SystemExit(f"Entrée absente: {args.input}")

    report_path = args.report or args.output.with_suffix(".report.json")

    report = run_mother_frigate(
        input_path=args.input,
        output_path=args.output,
        preset=args.preset,
        report_path=report_path,
        skip_phases=args.skip_phase,
    )

    return 0 if report["status"] == "SUCCEEDED" else 1


if __name__ == "__main__":
    raise SystemExit(main())
