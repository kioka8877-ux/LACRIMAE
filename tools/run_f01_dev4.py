#!/usr/bin/env python3
"""Adaptateur CLI dev4 pour F01_CANTOR."""
from __future__ import annotations

import argparse
import importlib.util
from pathlib import Path


def load_cantor():
    path = Path(__file__).resolve().parents[1] / "F01_CANTOR" / "CODEBASE" / "lac_f01_cantor.py"
    spec = importlib.util.spec_from_file_location("lac_f01_cantor", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Impossible de charger {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main() -> int:
    parser = argparse.ArgumentParser(description="Run F01 CANTOR in dev4")
    parser.add_argument("--audio", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--model", default="tiny")
    parser.add_argument("--language", default="fr")
    args = parser.parse_args()
    if not args.audio.is_file():
        raise SystemExit(f"Audio introuvable: {args.audio}")
    cantor = load_cantor()
    language = None if args.language.lower() in {"auto", "none"} else args.language
    timing = cantor.transcribe(str(args.audio), model_size=args.model, model_language=language)
    if not cantor.validate_timing(timing):
        raise SystemExit("Timing F01 invalide")
    cantor.write_output(timing, str(args.output))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
