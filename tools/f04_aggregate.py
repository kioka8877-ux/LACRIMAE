#!/usr/bin/env python3
from __future__ import annotations
import argparse
import json
from pathlib import Path


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--results", required=True)
    ap.add_argument("--report", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    results = Path(args.results)
    out = Path(args.out)
    expected = {c["raw"]: c for c in manifest["clips"]}
    found = {}
    for clip in expected:
        src = results / f"{clip}_finale.mp4"
        if src.is_file() and src.stat().st_size > 0:
            found[clip] = src
    missing = sorted(set(expected) - set(found))
    report = {
        "schema": "f04-aggregate-v1",
        "pack_id": manifest.get("pack_id"),
        "expected_count": len(expected),
        "rendered_count": len(found),
        "missing": missing,
        "complete": not missing and len(found) == len(expected),
    }
    Path(args.report).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    if missing:
        print(json.dumps(report, indent=2))
        raise SystemExit("F04 AGGREGATE ERROR: clips manquants: " + ", ".join(missing))
    out.mkdir(parents=True, exist_ok=True)
    for clip, src in found.items():
        target = out / src.name
        target.write_bytes(src.read_bytes())
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
