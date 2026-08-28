"""Phase 2 — Restauration faciale (GFPGAN v1.3).

Tourne APRÈS Phase 1 (denoise) car GFPGAN a besoin d'un signal propre.
Tourne AVANT Phase 3 (grading) car les couleurs de peau doivent être
restaurées avant d'être ajustées par le grading.
"""
from __future__ import annotations

import hashlib
import subprocess
import time
from pathlib import Path

import cv2
import numpy as np
import torch
import torch.nn.functional as F
import sys
sys.modules.setdefault("torchvision.transforms.functional_tensor",
                        __import__("torchvision.transforms.functional", fromlist=["functional"]))


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def _load_gfpgan(params: dict):
    from gfpgan import GFPGANer
    weights = Path("/models/models/GFPGAN/1.3/GFPGANv1.3.pth")
    if not weights.is_file():
        raise FileNotFoundError(f"Poids GFPGAN absents: {weights}")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    restorer = GFPGANer(
        model_path=str(weights),
        upscale=params.get("upscale", 1),
        arch=params.get("arch", "clean"),
        channel_multiplier=params.get("channel_multiplier", 2),
        bg_upsampler=None,
        device=device,
    )
    return restorer


def run_phase2(
    source: Path,
    destination: Path,
    params: dict,
    report_path: Path,
) -> dict:
    """Exécute la Phase 2 — Restauration faciale GFPGAN."""
    started = time.monotonic()
    input_hash = sha256(source)

    weight = max(0.0, min(1.0, params.get("weight", 0.62)))
    frame_stride = max(1, int(params.get("frame_stride", 4)))

    restorer = _load_gfpgan(params)

    capture = cv2.VideoCapture(str(source))
    fps = float(capture.get(cv2.CAP_PROP_FPS) or 0.0)
    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)

    if fps <= 0 or width <= 0 or height <= 0:
        capture.release()
        raise ValueError("Métadonnées vidéo invalides pour Phase 2")

    tmp = destination.with_suffix(".phase2.tmp.mp4")
    tmp.parent.mkdir(parents=True, exist_ok=True)
    writer = cv2.VideoWriter(str(tmp), cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height))
    if not writer.isOpened():
        capture.release()
        raise RuntimeError("VideoWriter indisponible pour Phase 2")

    print(f"[PHASE2] Traitement {frame_count} frames (weight={weight}, stride={frame_stride})...")
    processed = 0
    detected_faces = 0

    while True:
        ok, frame = capture.read()
        if not ok:
            break

        if weight > 0.0 and (processed % frame_stride == 0):
            cropped_faces, _, restored = restorer.enhance(
                frame, has_aligned=False, only_center_face=False,
                paste_back=True, weight=weight,
            )
            detected_faces += len(cropped_faces or [])
            if restored is None:
                restored = frame
        else:
            restored = frame

        writer.write(restored)
        processed += 1

        if processed % 50 == 0:
            print(f"[PHASE2] {processed}/{frame_count} — {detected_faces} visages détectés")

    capture.release()
    writer.release()

    if processed != frame_count:
        raise RuntimeError(f"Phase 2 : {processed}/{frame_count} frames traitées")

    # Muxer audio
    muxed = destination.with_suffix(".phase2.mux.tmp.mp4")
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error",
        "-i", str(tmp), "-i", str(source),
        "-map", "0:v:0", "-map", "1:a?",
        "-c:v", "copy", "-c:a", "copy",
        "-movflags", "+faststart", str(muxed),
    ], check=True)
    muxed.replace(destination)
    tmp.unlink(missing_ok=True)

    elapsed = round(time.monotonic() - started, 3)
    output_hash = sha256(destination)

    if torch.cuda.is_available():
        torch.cuda.empty_cache()

    import json
    report = {
        "phase": "phase2_faces",
        "status": "SUCCEEDED",
        "model": "gfpgan_v1.3",
        "weight": weight,
        "frame_stride": frame_stride,
        "faces_detected": detected_faces,
        "input_resolution": [width, height],
        "output_resolution": [width, height],
        "source_fps": fps,
        "input_frames": frame_count,
        "output_frames": processed,
        "input_sha256": input_hash,
        "output_sha256": output_hash,
        "device": "cuda" if torch.cuda.is_available() else "cpu",
        "elapsed_seconds": elapsed,
    }
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"[PHASE2] Terminé en {elapsed}s — {detected_faces} visages")
    return report
