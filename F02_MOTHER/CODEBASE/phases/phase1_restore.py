"""Phase 1 — Restauration IA (remplace Topaz Video AI).

Modèles utilisés :
- SCUNet : débruitage blind + suppression de halos
- Real-ESRGAN : récupération de détails (mode restoration, pas upscale)

Ces modèles font ce que Topaz fait en une passe :
Fix compression + Reduce noise + Dehalo + Improve detail + Reveal detail
"""
from __future__ import annotations

import hashlib
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


def _load_scunet(params: dict):
    """Charge le modèle SCUNet pour débruitage blind."""
    from scunet import SCUNet

    noise_level = params.get("noise_level", 0)
    model = SCUNet(in_nc=3, out_nc=3, config=[4, 6, 6, 8], blk_size=48, noise_level=noise_level)

    # Chercher les poids dans le Volume modèles ou les télécharger
    weights_path = Path("/models/models/SCUNet/realworld_model.pth")
    if not weights_path.is_file():
        # Fallback : essayer le cache torch hub
        weights_path = Path(torch.hub.get_dir()) / "scunet_realworld.pth"
        if not weights_path.is_file():
            raise FileNotFoundError(
                "Poids SCUNet absents. Télécharger depuis https://github.com/cszn/SCUNet "
                "et placer dans /models/models/SCUNet/realworld_model.pth"
            )

    state_dict = torch.load(weights_path, map_location="cpu")
    model.load_state_dict(state_dict, strict=True)
    return model


def _load_realesrgan_detail(params: dict):
    """Charge Real-ESRGAN en mode restoration (scale=1, pas d'upscaling)."""
    from basicsr.archs.rrdbnet_arch import RRDBNet
    from realesrgan import RealESRGANer

    model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4)

    weights_path = Path("/models/models/RealESRGAN/0.1.0/RealESRGAN_x4plus.pth")
    if not weights_path.is_file():
        raise FileNotFoundError(f"Poids Real-ESRGAN absents: {weights_path}")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    upsampler = RealESRGANer(
        scale=4,
        model_path=str(weights_path),
        model=model,
        tile=params.get("tile_size", 512),
        tile_pad=params.get("tile_pad", 16),
        pre_pad=0,
        half=params.get("half", True) and device == "cuda",
        gpu_id=0 if device == "cuda" else None,
    )
    return upsampler


def _process_frame_scunet(frame: np.ndarray, model, tile_size: int = 256) -> np.ndarray:
    """Traitement SCUNet frame par frame avec tiling pour mémoire limitée."""
    device = next(model.parameters()).device
    h, w = frame.shape[:2]

    # Padding au multiple de 48 (blk_size de SCUNet)
    pad_h = (48 - h % 48) % 48
    pad_w = (48 - w % 48) % 48
    if pad_h > 0 or pad_w > 0:
        frame = cv2.copyMakeBorder(frame, 0, pad_h, 0, pad_w, cv2.BORDER_REFLECT)

    # Convertir en tensor
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    tensor = torch.from_numpy(np.transpose(rgb, (2, 0, 1))).unsqueeze(0).float() / 255.0
    tensor = tensor.to(device)

    with torch.inference_mode():
        output = model(tensor)

    # Retour en image
    output = output[0].cpu().clamp(0, 1).numpy()
    output = np.transpose(output, (1, 2, 0))
    output = (output * 255).astype(np.uint8)
    output = cv2.cvtColor(output, cv2.COLOR_RGB2BGR)

    # Retirer le padding
    if pad_h > 0 or pad_w > 0:
        output = output[:h, :w]

    return output


def _process_frame_realesrgan(frame: np.ndarray, upsampler, strength: float = 1.0) -> np.ndarray:
    """Traitement Real-ESRGAN en mode restoration (scale=1 = pas d'upscaling)."""
    # Real-ESRGAN avec scale=1 fait de la restoration sans agrandir
    output, _ = upsampler.enhance(frame, outscale=1)

    if strength < 1.0:
        # Blend avec l'original pour contrôler l'intensité
        output = cv2.addWeighted(frame, 1.0 - strength, output, strength, 0)

    return output


def run_phase1(
    source: Path,
    destination: Path,
    params: dict,
    report_path: Path,
) -> dict:
    """Exécute la Phase 1 — Restauration IA.

    Args:
        source: Vidéo d'entrée (après F02 MOTUS si activé)
        destination: Vidéo de sortie
        params: Paramètres du preset compositing
        report_path: Chemin du rapport JSON
    """
    device = "cuda" if torch.cuda.is_available() else "cpu"
    scunet_params = params.get("scunet", {})
    realesrgan_params = params.get("realesrgan", {})

    started = time.monotonic()
    input_hash = sha256(source)

    # Charger les modèles
    print("[PHASE1] Chargement SCUNet...")
    scunet_model = _load_scunet(scunet_params)
    scunet_model.eval()
    if device == "cuda":
        scunet_model = scunet_model.cuda()

    print("[PHASE1] Chargement Real-ESRGAN...")
    realesrgan_upsampler = _load_realesrgan_detail(realesrgan_params)

    # Ouvrir la vidéo source
    capture = cv2.VideoCapture(str(source))
    fps = float(capture.get(cv2.CAP_PROP_FPS) or 0.0)
    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)

    if fps <= 0 or width <= 0 or height <= 0:
        capture.release()
        raise ValueError("Métadonnées vidéo invalides pour Phase 1")

    # Préparer la sortie
    tmp = destination.with_suffix(".phase1.tmp.mp4")
    tmp.parent.mkdir(parents=True, exist_ok=True)
    writer = cv2.VideoWriter(
        str(tmp), cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height)
    )
    if not writer.isOpened():
        capture.release()
        raise RuntimeError("VideoWriter indisponible pour Phase 1")

    print(f"[PHASE1] Traitement {frame_count} frames ({width}x{height} @ {fps:.1f}fps)...")
    processed = 0

    while True:
        ok, frame = capture.read()
        if not ok:
            break

        # Étape 1a : SCUNet (denoise + dehalo)
        restored = _process_frame_scunet(
            frame, scunet_model,
            tile_size=scunet_params.get("tile_size", 256),
        )

        # Étape 1b : Real-ESRGAN (detail recovery)
        enhanced = _process_frame_realesrgan(
            restored, realesrgan_upsampler,
            strength=realesrgan_params.get("strength", 1.0),
        )

        writer.write(enhanced)
        processed += 1

        if processed % 50 == 0:
            print(f"[PHASE1] {processed}/{frame_count} frames traitées")

    capture.release()
    writer.release()

    if processed != frame_count:
        raise RuntimeError(f"Phase 1 : {processed}/{frame_count} frames traitées")

    # Muxer l'audio depuis la source
    muxed = destination.with_suffix(".phase1.mux.tmp.mp4")
    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", str(tmp), "-i", str(source),
            "-map", "0:v:0", "-map", "1:a?",
            "-c:v", "copy", "-c:a", "copy",
            "-movflags", "+faststart",
            str(muxed),
        ],
        check=True,
    )
    muxed.replace(destination)
    tmp.unlink(missing_ok=True)

    elapsed = round(time.monotonic() - started, 3)
    output_hash = sha256(destination)

    if device == "cuda":
        torch.cuda.empty_cache()

    report = {
        "phase": "phase1_restore",
        "status": "SUCCEEDED",
        "models": {
            "scunet": {"type": "realworld", "noise_level": scunet_params.get("noise_level", 0)},
            "realesrgan": {"model": "x4plus", "mode": "restoration", "scale": 1},
        },
        "input_resolution": [width, height],
        "output_resolution": [width, height],
        "source_fps": fps,
        "input_frames": frame_count,
        "output_frames": processed,
        "input_sha256": input_hash,
        "output_sha256": output_hash,
        "device": device,
        "elapsed_seconds": elapsed,
    }

    report_path.write_text(
        __import__("json").dumps(report, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"[PHASE1] Terminé en {elapsed}s — {processed} frames")
    return report
