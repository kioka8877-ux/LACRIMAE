"""Worker Modal dev6 avec Volume vidéo partagé.

L'Oracle reste dans le sandbox et transmet des chemins relatifs de campagne.
Le conteneur Modal monte le Volume vidéo sous /data et le Volume modèles sous
/models. Les secrets Modal ne sont jamais présents dans les missions.
"""
from __future__ import annotations

import json
import os
import shutil
from pathlib import Path

import modal

APP_NAME = os.environ.get("LACRIMAE_MODAL_APP", "lacrimae-dev6-video")
VIDEO_DIR = "/data"
MODEL_DIR = "/models"
GPU_STAGES = {"F02_MOTUS", "F03_RESTAURA", "F04_UPSCALE", "F05_LUMEN"}

image = modal.Image.from_dockerfile("modal/images/Dockerfile.video-gpu")

app = modal.App(APP_NAME)
video_volume = modal.Volume.from_name(
    os.environ.get("LACRIMAE_VIDEO_VOLUME", "lacrimae-dev6-video"),
    create_if_missing=True,
)
model_volume = modal.Volume.from_name(
    os.environ.get("LACRIMAE_MODEL_VOLUME", "lacrimae-dev6-models"),
    create_if_missing=True,
)


def safe_relative(value: str) -> Path:
    """Convertit un chemin relatif de campagne et interdit toute traversée."""
    raw = value.removeprefix("modal://").lstrip("/")
    path = Path(raw)
    if not raw or path.is_absolute() or ".." in path.parts:
        raise ValueError("le chemin doit être relatif et rester dans le Volume")
    return path


@app.function(
    image=image,
    gpu=os.environ.get("LACRIMAE_GPU", "L4"),
    volumes={VIDEO_DIR: video_volume, MODEL_DIR: model_volume},
    timeout=60 * 60,
    retries=1,
)
def run_stage(
    stage: str,
    input_uri: str,
    output_uri: str,
    campaign_id: str,
    profile: str = "balanced",
) -> dict:
    """Exécute le contrat d'une frégate dans le Volume partagé.

    La copie contractuelle est volontairement le comportement MVP actuel.
    Les moteurs IA réels seront branchés par étape après validation du transit.
    """
    if stage not in GPU_STAGES:
        raise ValueError(f"stage GPU non supporté: {stage}")
    if not input_uri or not output_uri or not campaign_id:
        raise ValueError("input_uri, output_uri et campaign_id sont obligatoires")
    source = Path(VIDEO_DIR) / safe_relative(input_uri)
    destination = Path(VIDEO_DIR) / safe_relative(output_uri)
    if source == destination:
        raise ValueError("entrée et sortie doivent être différentes")
    if not source.is_file():
        raise FileNotFoundError(f"entrée absente du Volume vidéo: {input_uri}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)
    report = {
        "status": "SUCCEEDED",
        "stage": stage,
        "campaign_id": campaign_id,
        "input_uri": input_uri,
        "output_uri": output_uri,
        "profile": profile,
        "implementation": "modal_volume_contract_copy_v1",
        "model_dir": MODEL_DIR,
        "output_size_bytes": destination.stat().st_size,
    }
    report_path = destination.with_suffix(destination.suffix + ".report.json")
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    video_volume.commit()
    return report


@app.local_entrypoint()
def main(
    stage: str = "F02_MOTUS",
    input_uri: str = "",
    output_uri: str = "",
    campaign_id: str = "",
    profile: str = "balanced",
):
    print(run_stage.remote(stage, input_uri, output_uri, campaign_id, profile))
