#!/usr/bin/env bash
set -euo pipefail
APP_FILE="modal/workers/f00h_hook_worker.py"
VIDEO_VOLUME="${LACRIMAE_VIDEO_VOLUME:-lacrimae-dev10-video}"
MODEL_VOLUME="${LACRIMAE_MODEL_VOLUME:-lacrimae-dev10-models}"

command -v modal >/dev/null 2>&1 || {
  echo "ERREUR: installez le CLI Modal et authentifiez-vous avant ce script." >&2
  exit 1
}

modal volume create "$VIDEO_VOLUME" 2>/dev/null || true
modal volume create "$MODEL_VOLUME" 2>/dev/null || true

# Uploader les backgrounds et SFX dans le volume modeles
echo "Upload des backgrounds et SFX..."
if [ -d "F00H/IN/backgrounds" ]; then
  for f in F00H/IN/backgrounds/*; do
    [ -f "$f" ] && modal volume put "$MODEL_VOLUME" "$f" "backgrounds/$(basename $f)" 2>/dev/null || true
  done
fi
if [ -d "F00H/IN/sfx" ]; then
  for f in F00H/IN/sfx/*; do
    [ -f "$f" ] && modal volume put "$MODEL_VOLUME" "$f" "sfx/$(basename $f)" 2>/dev/null || true
  done
fi

# Deploiement du worker
modal deploy "$APP_FILE"
echo "Volumes prets : $VIDEO_VOLUME, $MODEL_VOLUME"
echo "Application deploiee : $APP_FILE"
