"""Phase 6 — Export contrôlé (remplace HandBrake).

FFmpeg avec les paramètres exacts capturés dans la release cc :
H.264 x264, CRF 21, slow, High profile, paramètres x264 dédiés.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import time
from pathlib import Path


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def run_phase6(
    source: Path,
    destination: Path,
    params: dict,
    report_path: Path,
) -> dict:
    """Exécute la Phase 6 — Export contrôlé H.264."""
    started = time.monotonic()
    input_hash = sha256(source)

    codec = params.get("codec", "libx264")
    preset = params.get("preset", "slow")
    crf = params.get("crf", 21)
    profile = params.get("profile", "high")
    level = params.get("level", 4)
    pix_fmt = params.get("pix_fmt", "yuv420p")
    movflags = params.get("movflags", "+faststart")
    x264_params = params.get("x264_params", "")

    cmd = [
        "ffmpeg", "-y", "-loglevel", "warning",
        "-i", str(source),
        "-map", "0:v:0", "-map", "0:a?",
        "-c:v", codec,
        "-preset", preset,
        "-crf", str(crf),
        "-profile:v", profile,
        "-level:v", str(level),
        "-pix_fmt", pix_fmt,
    ]

    if x264_params:
        cmd.extend(["-x264-params", x264_params])

    cmd.extend([
        "-c:a", "copy",
        "-movflags", movflags,
        str(destination),
    ])

    print(f"[PHASE6] Export H.264 — CRF={crf} preset={preset} profile={profile}...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"Phase 6 FFmpeg échoué: {result.stderr[-500:]}")

    elapsed = round(time.monotonic() - started, 3)
    output_hash = sha256(destination)

    # Probe la sortie
    probe = subprocess.run([
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height,avg_frame_rate,nb_frames,codec_name",
        "-of", "json", str(destination),
    ], capture_output=True, text=True)
    stream_info = json.loads(probe.stdout).get("streams", [{}])[0]

    report = {
        "phase": "phase6_export",
        "status": "SUCCEEDED",
        "codec": codec,
        "preset": preset,
        "crf": crf,
        "profile": profile,
        "level": level,
        "output_codec": stream_info.get("codec_name", codec),
        "input_resolution": [int(stream_info.get("width", 0)), int(stream_info.get("height", 0))],
        "source_fps": stream_info.get("avg_frame_rate", "0/0"),
        "input_sha256": input_hash,
        "output_sha256": output_hash,
        "output_size_bytes": destination.stat().st_size,
        "elapsed_seconds": elapsed,
    }
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"[PHASE6] Terminé en {elapsed}s — {destination.stat().st_size / 1024 / 1024:.1f} Mo")
    return report
