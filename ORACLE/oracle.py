#!/usr/bin/env python3
"""Oracle LACRIMAE dev6-C — avec frégate mère F02.

Le mode `create` lance une campagne avec un preset compositing.
Le mode `presets` affiche le tableau des presets disponibles.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

STAGES = [
    "F00_PORTA_INGRESSUS",
    "F01_AUSPEX_OCULUS",
    "F02_MOTHER_FRIGATE",
    "F10_CUSTOS_RESTITUTIO",
]


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def campaign_dir(root: Path, campaign_id: str) -> Path:
    return root / "campaigns" / campaign_id


def state_path(root: Path, campaign_id: str) -> Path:
    return campaign_dir(root, campaign_id) / "campaign_state.json"


def save_state(path: Path, state: dict[str, Any]) -> None:
    state["updated_at"] = now()
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    tmp.replace(path)


def load_state(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def load_compositing_config() -> dict:
    config_paths = [
        Path(__file__).parent.parent / "CONFIG" / "atom_ic_compositing.json",
        Path("/app/CONFIG/atom_ic_compositing.json"),
    ]
    for p in config_paths:
        if p.is_file():
            return json.loads(p.read_text(encoding="utf-8"))
    raise FileNotFoundError("CONFIG/atom_ic_compositing.json introuvable")


def show_presets() -> None:
    config = load_compositing_config()
    presets = config.get("presets", {})
    order = config.get("presets_order", list(presets.keys()))

    print()
    print("  F02 FRÉGATE MÈRE — Presets disponibles (dev6-C)")
    print("  " + "=" * 70)
    print(f"  {'#':<4} {'Preset':<18} {'Description'}")
    print("  " + "-" * 70)
    for i, name in enumerate(order, 1):
        p = presets.get(name, {})
        desc = p.get("description", "")[:55]
        phases = p.get("phases", {})
        active = sum(1 for v in phases.values() if v.get("enabled", True))
        total = len(phases)
        print(f"  {i:<4} {name:<18} {desc} ({active}/{total} phases)")
    print("  " + "=" * 70)
    print()


def create_campaign(args: argparse.Namespace) -> dict:
    root = Path(args.workdir) if hasattr(args, "workdir") else Path(".")
    cid = args.campaign_id
    cdir = campaign_dir(root, cid)
    cdir.mkdir(parents=True, exist_ok=True)

    config = load_compositing_config()
    preset = args.preset
    if preset not in config.get("presets", {}):
        default = config.get("default_preset", "clean_realistic")
        print(f"[ORACLE] Preset '{preset}' inconnu — utilisation de '{default}'")
        preset = default

    state = {
        "campaign_id": cid,
        "created_at": now(),
        "source": str(args.source),
        "profile": args.profile,
        "preset_compositing": preset,
        "stages": {},
        "status": "CREATED",
    }
    save_state(state_path(root, cid), state)
    print(f"[ORACLE] Campagne '{cid}' créée — preset: {preset}")
    return state


def run_campaign(args: argparse.Namespace) -> dict:
    root = Path(args.workdir) if hasattr(args, "workdir") else Path(".")
    cid = args.campaign_id
    sp = state_path(root, cid)
    if not sp.is_file():
        raise SystemExit(f"Campagne '{cid}' introuvable")
    state = load_state(sp)
    source = Path(state["source"])
    if not source.is_file():
        raise SystemExit(f"Source absente: {source}")

    preset = state.get("preset_compositing", "clean_realistic")
    output = campaign_dir(root, cid) / f"{cid}_final.mp4"
    report = campaign_dir(root, cid) / f"{cid}_report.json"

    print(f"[ORACLE] Lancement pipeline — preset: {preset}")

    # Appeler la frégate mère
    sys.path.insert(0, str(Path(__file__).parent.parent / "F02_MOTHER" / "CODEBASE"))
    from mother_frigate import run_mother_frigate

    result = run_mother_frigate(source, output, preset, report)

    state["status"] = result["status"]
    state["stages"]["F02_MOTHER"] = {
        "status": result["status"],
        "elapsed_seconds": result["total_elapsed_seconds"],
        "output": str(output),
    }
    save_state(sp, state)
    return result


def main():
    parser = argparse.ArgumentParser(description="Oracle LACRIMAE dev6-C")
    sub = parser.add_subparsers(dest="command")

    # create
    p_create = sub.add_parser("create", help="Créer une campagne")
    p_create.add_argument("--campaign-id", required=True)
    p_create.add_argument("--source", type=Path, required=True)
    p_create.add_argument("--profile", default="balanced")
    p_create.add_argument("--preset", default="clean_realistic")

    # run
    p_run = sub.add_parser("run", help="Lancer une campagne")
    p_run.add_argument("--campaign-id", required=True)

    # presets
    sub.add_parser("presets", help="Afficher les presets")

    args = parser.parse_args()

    if args.command == "create":
        create_campaign(args)
    elif args.command == "run":
        run_campaign(args)
    elif args.command == "presets":
        show_presets()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
