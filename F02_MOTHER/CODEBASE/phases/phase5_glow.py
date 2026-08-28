"""Phase 5 — Bloom/Halation (remplace S_Glow de Sapphire).

Extrait les hautes lumières, applique un flou gaussien proportionnel,
et blend en mode screen pour créer un halation organique.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import time
from pathlib import Path

import cv2
import numpy as np


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def _extract_highlights(frame: np.ndarray, threshold: float = 0.7) -> np.ndarray:
    """Extrait un masque des hautes lumières."""
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
    # Masque binaire des zones claires
    mask = np.clip((gray - threshold) / (1.0 - threshold), 0, 1)
    # Appliquer le masque à chaque canal
    mask_3ch = np.stack([mask] * 3, axis=-1)
    return frame.astype(np.float32) / 255.0 * mask_3ch


def _apply_bloom(
    frame: np.ndarray,
    gaussian_sigma: float,
    blend_opacity: float,
    highlight_threshold: float,
) -> np.ndarray:
    """Applique un bloom à partir des hautes lumières."""
    highlights = _extract_highlights(frame, highlight_threshold)

    # Flou gaussien des hautes lumières
    if gaussian_sigma > 0:
        ksize = int(gaussian_sigma * 6) | 1  # Impair
        ksize = max(3, ksize)
        blurred = cv2.GaussianBlur(highlights, (ksize, ksize), gaussian_sigma)
    else:
        blurred = highlights

    # Blend en mode screen : result = 1 - (1-a) * (1-b)
    original = frame.astype(np.float32) / 255.0
    bloom = blurred * blend_opacity
    screen = 1.0 - (1.0 - original) * (1.0 - bloom)
    screen = np.clip(screen, 0, 1)

    return (screen * 255).astype(np.uint8)


def run_phase5(
    source: Path,
    destination: Path,
    params: dict,
    report_path: Path,
) -> dict:
    """Exécute la Phase 5 — Bloom/Halation."""
    started = time.monotonic()
    input_hash = sha256(source)

    gaussian_sigma = params.get("gaussian_sigma", 20)
    blend_opacity = params.get("blend_opacity", 0.15)
    highlight_threshold = params.get("highlight_threshold", 0.7)

    capture = cv2.VideoCapture(str(source))
    fps = float(capture.get(cv2.CAP_PROP_FPS) or 0.0)
    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)

    if fps <= 0 or width <= 0 or height <= 0:
        capture.release()
        raise ValueError("Métadonnées vidéo invalides pour Phase 5")

    tmp = destination.with_suffix(".phase5.tmp.mp4")
    tmp.parent.mkdir(parents=True, exist_ok=True)
    writer = cv2.VideoWriter(str(tmp), cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height))
    if not writer.isOpened():
        capture.release()
        raise RuntimeError("VideoWriter indisponible pour Phase 5")

    print(f"[PHASE5] Bloom — sigma={gaussian_sigma} opacity={blend_opacity}...")
    processed = 0

    while True:
        ok, frame = capture.read()
        if not ok:
            break

        bloomed = _apply_bloom(frame, gaussian_sigma, blend_opacity, highlight_threshold)
        writer.write(bloomed)
        processed += 1

        if processed % 50 == 0:
            print(f"[PHASE5] {processed}/{frame_count}")

    capture.release()
    writer.release()

    if processed != frame_count:
        raise RuntimeError(f"Phase 5 : {processed}/{frame_count} frames traitées")

    muxed = destination.with_suffix(".phase5.mux.tmp.mp4")
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

    report = {
        "phase": "phase5_glow",
        "status": "SUCCEEDED",
        "method": "opencv_bloom_screen_blend",
        "params": {
            "gaussian_sigma": gaussian_sigma,
            "blend_opacity": blend_opacity,
            "highlight_threshold": highlight_threshold,
        },
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
    print(f"[PHASE5] Terminé en {elapsed}s")
    return report
