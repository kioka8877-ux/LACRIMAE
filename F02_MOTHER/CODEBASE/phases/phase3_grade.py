"""Phase 3 — Color Grading ACES (remplace MB LookSuite3).

Utilise colour-science pour la transform ACES 1.0.3 → Rec.709,
et OpenCV pour le grading sélectif (tection de peau, protection
des teintes chair, S-curve de tonemapping).

C'est ici que le "look" est créé — le cœur artistique du pipeline.
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


def _srgb_to_linear(img: np.ndarray) -> np.ndarray:
    """Convertit sRGB [0,1] vers linéaire [0,1]."""
    return np.where(img <= 0.04045, img / 12.92, ((img + 0.055) / 1.055) ** 2.4)


def _linear_to_srgb(img: np.ndarray) -> np.ndarray:
    """Convertit linéaire [0,1] vers sRGB [0,1]."""
    return np.where(img <= 0.0031308, img * 12.92, 1.055 * np.power(np.maximum(img, 0), 1.0 / 2.4) - 0.055)


def _apply_aces_tonemap(img: np.ndarray, version: str = "1.0.3") -> np.ndarray:
    """Application simplifiée du tonemapping ACES → Rec.709.

    Utilise la approximation mathématique de la RRT (Reference Rendering Transform)
    d'ACES 1.0.3, qui écrête les hautes lumières et protège les ombres.
    """
    # ACES fit constants (Stephen Hill's fit)
    a = 2.51
    b = 0.03
    c = 2.43
    d = 0.59
    e = 0.14

    # Appliquer la curve ACES
    numerator = np.clip(img * (a * img + b), 0, None)
    denominator = np.clip(img * (c * img + d) + e, 1e-6, None)
    mapped = numerator / denominator

    return np.clip(mapped, 0, 1)


def _apply_s_curve(img: np.ndarray, strength: float = 0.3) -> np.ndarray:
    """Applique une S-curve de contraste (protège ombres et hautes lumières)."""
    if strength <= 0:
        return img
    # Curve sigmoid ajustable
    midpoint = 0.5
    steepness = 1.0 + strength * 2.0
    curve = 1.0 / (1.0 + np.exp(-steepness * (img - midpoint)))
    # Blend avec l'original selon la force
    return img * (1.0 - strength) + curve * strength


def _detect_skin_mask(frame: np.ndarray) -> np.ndarray:
    """Détecte les zones de peau en HSV pour protéger les teintes chair."""
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    # Plage HSV pour la peau (approximation)
    lower = np.array([0, 20, 70], dtype=np.uint8)
    upper = np.array([25, 150, 255], dtype=np.uint8)
    mask = cv2.inRange(hsv, lower, upper)
    # Lisser le masque
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    mask = cv2.GaussianBlur(mask, (21, 21), 0)
    return mask.astype(np.float32) / 255.0


def _apply_selective_grading(
    frame: np.ndarray,
    saturation: float,
    contrast: float,
    temperature: float,
    tint: float,
    shadow_lift: float,
    highlight_roll_off: float,
    skin_protect: bool,
    skin_protect_strength: float,
    s_curve_strength: float,
) -> np.ndarray:
    """Grading sélectif avec protection peau et S-curve."""
    result = frame.astype(np.float32) / 255.0

    # 1. ACES tonemap
    result = _apply_aces_tonemap(result)

    # 2. S-curve
    if s_curve_strength > 0:
        result = _apply_s_curve(result, s_curve_strength)

    # 3. Contrast
    if contrast != 1.0:
        result = np.clip((result - 0.5) * contrast + 0.5, 0, 1)

    # 4. Temperature / Tint
    if temperature != 0 or tint != 0:
        result[:, :, 2] = np.clip(result[:, :, 2] + temperature * 0.1, 0, 1)  # Rouge
        result[:, :, 0] = np.clip(result[:, :, 0] - temperature * 0.1, 0, 1)  # Bleu
        result[:, :, 1] = np.clip(result[:, :, 1] + tint * 0.05, 0, 1)        # Vert

    # 5. Saturation
    if saturation != 1.0:
        gray = cv2.cvtColor((result * 255).astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
        gray = cv2.cvtColor((gray * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR).astype(np.float32) / 255.0
        result = gray + (result - gray) * saturation
        result = np.clip(result, 0, 1)

    # 6. Shadow lift
    if shadow_lift > 0:
        shadow_mask = np.clip(1.0 - result * 3.0, 0, 1)  # Zones sombres
        result = result + shadow_lift * shadow_mask
        result = np.clip(result, 0, 1)

    # 7. Highlight roll-off (protège les hautes lumières)
    if highlight_roll_off < 1.0:
        highlight_mask = np.clip(result * 2.0 - 1.0, 0, 1)  # Zones claires
        roll = 1.0 - (1.0 - highlight_roll_off) * highlight_mask
        result = result * roll
        result = np.clip(result, 0, 1)

    # 8. Protection peau
    if skin_protect and skin_protect_strength > 0:
        skin_mask = _detect_skin_mask(frame)
        skin_mask = skin_mask[:, :, np.newaxis] if skin_mask.ndim == 2 else skin_mask
        if skin_mask.shape[2] == 1:
            skin_mask = np.repeat(skin_mask, 3, axis=2)
        # Pour les zones de peau, revenir vers l'original (moins de grading)
        result = result * (1 - skin_mask * skin_protect_strength) + \
                 (frame.astype(np.float32) / 255.0) * (skin_mask * skin_protect_strength)
        result = np.clip(result, 0, 1)

    return (result * 255).astype(np.uint8)


def run_phase3(
    source: Path,
    destination: Path,
    params: dict,
    report_path: Path,
) -> dict:
    """Exécute la Phase 3 — Color Grading ACES."""
    started = time.monotonic()
    input_hash = sha256(source)

    capture = cv2.VideoCapture(str(source))
    fps = float(capture.get(cv2.CAP_PROP_FPS) or 0.0)
    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)

    if fps <= 0 or width <= 0 or height <= 0:
        capture.release()
        raise ValueError("Métadonnées vidéo invalides pour Phase 3")

    # Paramètres de grading
    saturation = params.get("saturation", 1.0)
    contrast = params.get("contrast", 1.0)
    temperature = params.get("temperature", 0.0)
    tint = params.get("tint", 0.0)
    shadow_lift = params.get("shadow_lift", 0.02)
    highlight_roll_off = params.get("highlight_roll_off", 0.95)
    skin_protect = params.get("skin_protect", False)
    skin_protect_strength = params.get("skin_protect_strength", 0.7)
    s_curve_strength = params.get("s_curve_strength", 0.0)

    tmp = destination.with_suffix(".phase3.tmp.mp4")
    tmp.parent.mkdir(parents=True, exist_ok=True)
    writer = cv2.VideoWriter(str(tmp), cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height))
    if not writer.isOpened():
        capture.release()
        raise RuntimeError("VideoWriter indisponible pour Phase 3")

    print(f"[PHASE3] Grading ACES — sat={saturation} contrast={contrast} temp={temperature}...")
    processed = 0

    while True:
        ok, frame = capture.read()
        if not ok:
            break

        graded = _apply_selective_grading(
            frame,
            saturation=saturation,
            contrast=contrast,
            temperature=temperature,
            tint=tint,
            shadow_lift=shadow_lift,
            highlight_roll_off=highlight_roll_off,
            skin_protect=skin_protect,
            skin_protect_strength=skin_protect_strength,
            s_curve_strength=s_curve_strength,
        )
        writer.write(graded)
        processed += 1

        if processed % 50 == 0:
            print(f"[PHASE3] {processed}/{frame_count}")

    capture.release()
    writer.release()

    if processed != frame_count:
        raise RuntimeError(f"Phase 3 : {processed}/{frame_count} frames traitées")

    # Muxer audio
    muxed = destination.with_suffix(".phase3.mux.tmp.mp4")
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
        "phase": "phase3_grade",
        "status": "SUCCEEDED",
        "method": "aces_1.0.3_tonemap_selective_grading",
        "params": {
            "saturation": saturation, "contrast": contrast,
            "temperature": temperature, "tint": tint,
            "shadow_lift": shadow_lift, "highlight_roll_off": highlight_roll_off,
            "skin_protect": skin_protect, "s_curve_strength": s_curve_strength,
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
    print(f"[PHASE3] Terminé en {elapsed}s")
    return report
