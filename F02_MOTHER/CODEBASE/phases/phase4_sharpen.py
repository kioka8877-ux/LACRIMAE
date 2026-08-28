"""Phase 4 — Netteté edge-aware (remplace BCC3 Unsharp + S_Sharpen).

Utilise Real-ESRGAN en mode restoration pour un sharpening
qui sépare naturellement luma/chroma et préserve les bords.
Le paramètre strength contrôle le blend avec l'original.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import time
from pathlib import Path

import cv2
import numpy as np
import torch


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def _load_realesrgan(params: dict):
    from basicsr.archs.rrdbnet_arch import RRDBNet
    from realesrgan import RealESRGANer
    model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4)
    weights = Path("/models/models/RealESRGAN/0.1.0/RealESRGAN_x4plus.pth")
    if not weights.is_file():
        raise FileNotFoundError(f"Poids Real-ESRGAN absents: {weights}")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    upsampler = RealESRGANer(
        scale=4, model_path=str(weights), model=model,
        tile=params.get("tile_size", 512), tile_pad=16, pre_pad=0,
        half=params.get("half", True) and device == "cuda",
        gpu_id=0 if device == "cuda" else None,
    )
    return upsampler


def run_phase4(
    source: Path,
    destination: Path,
    params: dict,
    report_path: Path,
) -> dict:
    """Exécute la Phase 4 — Sharpen edge-aware."""
    started = time.monotonic()
    input_hash = sha256(source)

    strength = max(0.0, min(1.0, params.get("strength", 0.7)))

    upsampler = _load_realesrgan(params)

    capture = cv2.VideoCapture(str(source))
    fps = float(capture.get(cv2.CAP_PROP_FPS) or 0.0)
    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)

    if fps <= 0 or width <= 0 or height <= 0:
        capture.release()
        raise ValueError("Métadonnées vidéo invalides pour Phase 4")

    tmp = destination.with_suffix(".phase4.tmp.mp4")
    tmp.parent.mkdir(parents=True, exist_ok=True)
    writer = cv2.VideoWriter(str(tmp), cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height))
    if not writer.isOpened():
        capture.release()
        raise RuntimeError("VideoWriter indisponible pour Phase 4")

    print(f"[PHASE4] Sharpen edge-aware (strength={strength})...")
    processed = 0

    while True:
        ok, frame = capture.read()
        if not ok:
            break

        sharpened, _ = upsampler.enhance(frame, outscale=1)

        if strength < 1.0:
            sharpened = cv2.addWeighted(frame, 1.0 - strength, sharpened, strength, 0)

        writer.write(sharpened)
        processed += 1

        if processed % 50 == 0:
            print(f"[PHASE4] {processed}/{frame_count}")

    capture.release()
    writer.release()

    if processed != frame_count:
        raise RuntimeError(f"Phase 4 : {processed}/{frame_count} frames traitées")

    muxed = destination.with_suffix(".phase4.mux.tmp.mp4")
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

    report = {
        "phase": "phase4_sharpen",
        "status": "SUCCEEDED",
        "model": "realesrgan-x4plus-restoration",
        "strength": strength,
        "input_resolution": [width, height],
        "output_resolution": [width, height],
        "source_fps": fps,
        "input_frames": frame_count,
        "output_frames": processed,
        "input_sha256": input_hash,
        "output_sha256": output_hash,
        "elapsed_seconds": elapsed,
    }
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"[PHASE4] Terminé en {elapsed}s")
    return report
