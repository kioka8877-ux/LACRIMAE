#!/usr/bin/env python3
"""Orchestrateur LACRIMAE dev10.

Execute les etapes du pipeline. F00H est optionnel et s'insere
entre F00G (validation) et F03 Preview.

Usage :
  python3 ORACLE/universal_run.py --campaign-id test --source clip.mp4
  python3 ORACLE/universal_run.py --campaign-id test --source clip.mp4 --hook --hook-preset backrooms
"""
from __future__ import annotations
import argparse, json, subprocess, sys, time
from datetime import datetime, timezone
from pathlib import Path

def now():
    return datetime.now(timezone.utc).isoformat()

def run(cmd, dry_run=False):
    print("$", " ".join(cmd))
    if dry_run:
        return ""
    result = subprocess.run(cmd, check=True, capture_output=True, text=True)
    if result.stdout:
        print(result.stdout.strip())
    return result.stdout

def main():
    parser = argparse.ArgumentParser(description="Orchestrateur LACRIMAE dev10")
    parser.add_argument("--root", default=".")
    parser.add_argument("--campaign-id", required=True)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--hook", action="store_true", help="Activer le hook F00H")
    parser.add_argument("--hook-preset", default="random", help="Preset de fond pour F00H")
    parser.add_argument("--hook-duration", type=float, default=2.0, help="Duree du hook en secondes")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    root = Path(args.root)
    campaign_dir = root / "campaigns" / args.campaign_id
    campaign_dir.mkdir(parents=True, exist_ok=True)

    # Etat de la campagne
    state = {
        "campaign_id": args.campaign_id,
        "status": "RUNNING",
        "source": str(args.source.resolve()),
        "hook_enabled": args.hook,
        "hook_preset": args.hook_preset if args.hook else None,
        "completed_stages": [],
        "created_at": now(),
    }

    def save_state():
        state["updated_at"] = now()
        (campaign_dir / "campaign_state.json").write_text(
            json.dumps(state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )

    def write_report(stage, report):
        stage_dir = campaign_dir / stage
        stage_dir.mkdir(parents=True, exist_ok=True)
        report_path = stage_dir / "stage_report.json"
        report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        state["completed_stages"].append(stage)
        state["artifacts"] = state.get("artifacts", {})
        state["artifacts"][stage] = str(report_path)
        save_state()

    # ── F00H LOCAL VALIDATION (si hook active) ──
    if args.hook:
        print("\n=== F00H LOCAL VALIDATION ===")
        f00h_script = root / "F00H" / "CODEBASE" / "f00h.py"
        clips_dir = campaign_dir / "clips"
        clips_dir.mkdir(parents=True, exist_ok=True)

        # Copier le clip source dans le dossier clips
        import shutil
        dest_clip = clips_dir / args.source.name
        if not dest_clip.exists():
            shutil.copy2(args.source, dest_clip)

        f00h_out = campaign_dir / "f00h_output"
        cmd = [
            sys.executable, str(f00h_script),
            "--clips-dir", str(clips_dir),
            "--out", str(f00h_out),
            "--preset", args.hook_preset,
            "--validate",
            "--extract-frames",
        ]
        stdout = run(cmd, args.dry_run)
        report = json.loads(stdout.strip().splitlines()[-1]) if stdout.strip() else {"status": "PLANNED"}
        write_report("F00H_LOCAL_VALIDATION", report)

        # ── F00H HOOK (Modal GPU) ──
        if not args.dry_run and report.get("status") == "ok":
            print("\n=== F00H HOOK (Modal GPU) ===")
            for clip_report in json.loads(Path(f00h_out / "f00h_local_report.json").read_text()).get("reports", []):
                if clip_report.get("status") != "READY_FOR_GPU":
                    print(f"  SKIP {clip_report['clip']}: {clip_report['status']}")
                    continue
                clip_name = Path(clip_report["clip"]).stem
                input_uri = f"campaigns/{args.campaign_id}/clips/{clip_report['clip']}"
                output_uri = f"campaigns/{args.campaign_id}/clips_hooked/{clip_report['clip']}"
                hook_cmd = [
                    sys.executable, "modal/invoke_remote.py",
                    "--app", "lacrimae-dev10-video",
                    "--stage", "F00H_HOOK",
                    "--input-uri", input_uri,
                    "--output-uri", output_uri,
                    "--campaign-id", args.campaign_id,
                    "--preset", clip_report["selected_background"],
                    "--hook-duration-seconds", str(clip_report["hook_duration_seconds"]),
                ]
                hook_stdout = run(hook_cmd, args.dry_run)
                hook_report = json.loads(hook_stdout.strip().splitlines()[-1]) if hook_stdout.strip() else {"status": "PLANNED"}
                write_report(f"F00H_HOOK_{clip_name}", hook_report)

    # ── F10 CUSTOS ──
    print("\n=== F10 CUSTOS ===")
    state["status"] = "SEALED"
    save_state()

    print(json.dumps({"status": state["status"], "campaign_id": args.campaign_id}, ensure_ascii=False))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
