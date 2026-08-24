"""Workers Modal dev6.

Le worker est volontairement mince : l'Oracle lui transmet une mission et
une référence de fichier. Les implémentations GPU réelles seront branchées
par frégate, sans modifier le contrat d'appel.
"""
from __future__ import annotations

import os
from pathlib import Path

import modal

APP_NAME = os.environ.get("LACRIMAE_MODAL_APP", "lacrimae-dev6-video")
MODEL_DIR = "/models"

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "git")
    .pip_install("numpy", "opencv-python-headless")
)

app = modal.App(APP_NAME)
model_volume = modal.Volume.from_name(
    os.environ.get("LACRIMAE_MODEL_VOLUME", "lacrimae-dev6-models"),
    create_if_missing=True,
)


@app.function(
    image=image,
    gpu=os.environ.get("LACRIMAE_GPU", "L4"),
    volumes={MODEL_DIR: model_volume},
    timeout=60 * 60,
    retries=1,
)
def run_stage(stage: str, input_uri: str, output_uri: str, campaign_id: str, profile: str = "balanced") -> dict:
    """Point d'entrée stable pour une frégate GPU.

    Cette première version vérifie les arguments et retourne un contrat.
    Le traitement concret sera ajouté dans les modules F02/F03/F04.
    """
    if stage not in {"F02_MOTUS", "F03_RESTAURA", "F04_UPSCALE", "F05_LUMEN"}:
        raise ValueError(f"stage GPU non supporté: {stage}")
    if not input_uri or not output_uri or not campaign_id:
        raise ValueError("input_uri, output_uri et campaign_id sont obligatoires")
    return {
        "status": "ACCEPTED",
        "stage": stage,
        "campaign_id": campaign_id,
        "input_uri": input_uri,
        "output_uri": output_uri,
        "profile": profile,
        "model_dir": str(Path(MODEL_DIR)),
        "implementation": "worker_contract_stub_v1",
    }


@app.local_entrypoint()
def main(stage: str = "F02_MOTUS", input_uri: str = "", output_uri: str = "", campaign_id: str = "", profile: str = "balanced"):
    result = run_stage.remote(stage, input_uri, output_uri, campaign_id, profile)
    print(result)
