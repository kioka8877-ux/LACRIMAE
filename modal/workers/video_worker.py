"""Worker Modal GPU - Frégate Mère F02 (dev6-C)."""
from __future__ import annotations

import hashlib
import importlib
import json
import os
import subprocess
import sys
import time
from pathlib import Path

import modal

APP_NAME = "lacrimae-dev6-video"
VIDEO_DIR = "/data"
MODEL_DIR = "/models"
RIFE_VERSION = "4.25"
RIFE_MODEL_DIR = Path(MODEL_DIR) / "models" / "RIFE" / RIFE_VERSION / "train_log"
GPU_STAGES = {"F02_MOTUS", "F02_MOTUS_RIFE", "F02_MOTHER"}

image = modal.Image.from_dockerfile("modal/images/Dockerfile.video-gpu")
app = modal.App(APP_NAME)
video_volume = modal.Volume.from_name("lacrimae-dev6-video", create_if_missing=True)
model_volume = modal.Volume.from_name("lacrimae-dev6-models", create_if_missing=True)


def safe_relative(value: str) -> Path:
    raw = value.removeprefix("modal://").lstrip("/")
    path = Path(raw)
    if not raw or path.is_absolute() or ".." in path.parts:
        raise ValueError("chemin invalide")
    return path


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as h:
        for chunk in iter(lambda: h.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _load_rife():
    required = [
        RIFE_MODEL_DIR / "flownet.pkl",
        RIFE_MODEL_DIR / "IFNet_HDv3.py",
        RIFE_MODEL_DIR / "RIFE_HDv3.py",
        RIFE_MODEL_DIR / "refine.py",
    ]
    missing = [str(p) for p in required if not p.is_file()]
    if missing:
        raise FileNotFoundError("RIFE absents: " + ", ".join(missing))
    rt = Path("/app/rife_runtime")
    if str(rt) not in sys.path:
        sys.path.insert(0, str(rt))
    vr = str(RIFE_MODEL_DIR.parent)
    if vr not in sys.path:
        sys.path.insert(0, vr)
    m = importlib.import_module("train_log.RIFE_HDv3")
    model = m.Model()
    model.load_model(str(RIFE_MODEL_DIR), -1)
    model.eval()
    model.device()
    return model


def _tensor_from_frame(fb, torch, F, device, pad):
    import cv2
    import numpy as np
    rgb = cv2.cvtColor(fb, cv2.COLOR_BGR2RGB)
    t = torch.from_numpy(np.transpose(rgb, (2, 0, 1))).to(device, non_blocking=True)
    return F.pad(t.unsqueeze(0).float() / 255.0, pad)


def _run_rife(source, destination, target_fps):
    import cv2
    import numpy as np
    import torch
    import torch.nn.functional as F

    cap = cv2.VideoCapture(str(source))
    sf = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
    fc = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    if sf <= 0 or w <= 0 or h <= 0:
        cap.release()
        raise ValueError("metadata invalides")
    mult = round(target_fps / sf)
    if mult < 2:
        cap.release()
        raise ValueError(f"facteur entier requis: {sf}->{target_fps}")
    ok, first = cap.read()
    if not ok:
        cap.release()
        raise ValueError("pas de premiere image")
    cap.release()
    tmp = destination.with_suffix(".rife.tmp.mp4")
    wr = cv2.VideoWriter(str(tmp), cv2.VideoWriter_fourcc(*"mp4v"), float(target_fps), (w, h))
    dev = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = _load_rife()
    ps = 0.5 if max(w, h) >= 3000 else 1.0
    bk = max(128, int(128 / ps))
    ph = ((h - 1) // bk + 1) * bk
    pw = ((w - 1) // bk + 1) * bk
    pad = (0, pw - w, 0, ph - h)
    prev = _tensor_from_frame(first, torch, F, dev, pad)
    written = 0
    started = time.monotonic()

    def wt(t):
        nonlocal written
        rgb = (t[0, :, :h, :w].clamp(0, 1) * 255.0).byte().cpu().numpy()
        bgr = cv2.cvtColor(np.transpose(rgb, (1, 2, 0)), cv2.COLOR_RGB2BGR)
        wr.write(bgr)
        written += 1

    cap = cv2.VideoCapture(str(source))
    cap.read()
    with torch.inference_mode():
        while True:
            ok, fr = cap.read()
            if not ok:
                break
            cur = _tensor_from_frame(fr, torch, F, dev, pad)
            wt(prev)
            for i in range(1, mult):
                wt(model.inference(prev, cur, i / mult, ps))
            prev = cur
        wt(prev)
    cap.release()
    wr.release()
    mx = destination.with_suffix(".mux.tmp.mp4")
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error", "-i", str(tmp), "-i", str(source),
        "-map", "0:v:0", "-map", "1:a?", "-c:v", "copy", "-c:a", "copy",
        "-movflags", "+faststart", str(mx),
    ], check=True)
    mx.replace(destination)
    tmp.unlink(missing_ok=True)
    el = time.monotonic() - started
    torch.cuda.empty_cache() if torch.cuda.is_available() else None
    return {
        "implementation": "rife_hd_v3_4.25", "source_fps": sf,
        "target_fps": target_fps, "multiplier": mult,
        "input_frames": fc, "output_frames": written,
        "resolution": [w, h], "inference_seconds": round(el, 3),
    }


def _run_mother_frigate(src, dst, cid, preset, skip):
    sys.path.insert(0, "/app/F02_MOTHER/CODEBASE")
    from mother_frigate import run_mother_frigate
    rp = dst.with_suffix(".mother_report.json")
    return run_mother_frigate(src, dst, preset, rp, skip)


@app.function(
    image=image,
    gpu="L4",
    volumes={VIDEO_DIR: video_volume, MODEL_DIR: model_volume},
    timeout=60 * 60,
    retries=1,
)
def run_stage(
    stage, input_uri, output_uri, campaign_id,
    profile="balanced", target_fps=120,
    preset="clean_realistic", skip_phases=None,
):
    skip_phases = skip_phases or []
    src = Path(VIDEO_DIR) / safe_relative(input_uri)
    dst = Path(VIDEO_DIR) / safe_relative(output_uri)
    if src == dst:
        raise ValueError("input=output")
    if not src.is_file():
        raise FileNotFoundError(f"absent: {input_uri}")
    dst.parent.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()

    if stage in ("F02_MOTUS", "F02_MOTUS_RIFE"):
        metrics = _run_rife(src, dst, target_fps)
    elif stage == "F02_MOTHER":
        metrics = _run_mother_frigate(src, dst, campaign_id, preset, skip_phases)
    else:
        raise ValueError(f"stage non supporte: {stage}")

    elapsed = round(time.monotonic() - started, 3)
    report = {
        "status": "SUCCEEDED", "stage": stage, "campaign_id": campaign_id,
        "input_uri": input_uri, "output_uri": output_uri, "profile": profile,
        "preset": preset,
        "output_size_bytes": dst.stat().st_size if dst.exists() else 0,
        "output_sha256": sha256(dst) if dst.exists() else None,
        "elapsed_seconds": elapsed, **metrics,
    }
    dst.with_suffix(dst.suffix + ".report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8",
    )
    video_volume.commit()
    return report


@app.local_entrypoint()
def main(
    stage="F02_MOTHER", input_uri="", output_uri="", campaign_id="",
    profile="balanced", target_fps=120, preset="clean_realistic",
):
    print(run_stage.remote(stage, input_uri, output_uri, campaign_id, profile, target_fps, preset))
