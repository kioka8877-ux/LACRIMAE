"""Invoke a deployed LACRIMAE Modal function."""
from __future__ import annotations
import argparse, json, modal

parser = argparse.ArgumentParser(description="Invoke LACRIMAE Modal function")
parser.add_argument("--app", default="lacrimae-dev10-video")
parser.add_argument("--stage", required=True)
parser.add_argument("--input-uri", required=True)
parser.add_argument("--output-uri", required=True)
parser.add_argument("--campaign-id", required=True)
parser.add_argument("--preset", default="backrooms")
parser.add_argument("--hook-duration-seconds", type=float, default=2.0)
args = parser.parse_args()

if args.stage == "F00H_HOOK":
    function = modal.Function.from_name(args.app, "run_f00h_hook")
    result = function.remote(
        args.input_uri, args.output_uri, args.campaign_id,
        args.preset, args.hook_duration_seconds,
    )
else:
    raise ValueError(f"Stage inconnu: {args.stage}. Stages supportes: F00H_HOOK")

print(json.dumps(result, ensure_ascii=False))
