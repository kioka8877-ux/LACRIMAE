#!/usr/bin/env bash
# =============================================================================
# LAC_RELEASE_VIDEO — upload la vidéo opérateur comme asset d'une GitHub
# Release (jusqu'à ~2 Go par fichier, gratuit sur repo public).
#
# POURQUOI : git refuse les fichiers > 100 Mo (push) / > 25 Mo (web GitHub).
# La vidéo source (~200 Mo → 1 Go) se dépose donc dans une Release :
#   https://github.com/kioka8877-ux/LACRIMAE/releases
# La frégate F00 du workflow la télécharge automatiquement (asset video_source.mp4).
#
# Usage (depuis la racine du repo, gh connecté au repo) :
#   sh _tools/lac_release_video.sh /chemin/video.mp4 [tag]
#
#   tag  : optionnel — ex. "lac-video-sandoval-01" (défaut : lac-video)
#         Le tag peut être réutilisé (--clobber remplace l'asset existant).
# =============================================================================
set -eu

REPO="kioka8877-ux/LACRIMAE"
VIDEO="${1:?Usage: sh _tools/lac_release_video.sh /chemin/video.mp4 [tag]}"
TAG="${2:-lac-video}"

if [ ! -f "$VIDEO" ]; then
  echo "  [✗] Fichier introuvable : $VIDEO" >&2
  exit 1
fi

SIZE_MB=$(du -m "$VIDEO" | cut -f1)
echo "  [→] $VIDEO ($SIZE_MB Mo) → release '$TAG' de $REPO"

# L'asset doit s'appeler exactement video_source.mp4 pour F00.
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT
cp "$VIDEO" "$TMP_DIR/video_source.mp4"

# Crée la release si le tag n'existe pas encore, sinon ré-upload (remplace).
if gh release view "$TAG" --repo "$REPO" >/dev/null 2>&1; then
  echo "  [→] Release '$TAG' existante — remplacement de l'asset…"
  gh release upload "$TAG" "$TMP_DIR/video_source.mp4" --repo "$REPO" --clobber
else
  echo "  [→] Création de la release '$TAG'…"
  gh release create "$TAG" "$TMP_DIR/video_source.mp4" \
    --repo "$REPO" \
    --title "LACRIMAE — vidéo source ($TAG)" \
    --notes "Vidéo source opérateur pour le pipeline (asset: video_source.mp4). F00 la télécharge automatiquement."
fi

echo "  [✓] Vidéo en ligne : https://github.com/$REPO/releases/tag/$TAG"
echo "  [✓] Lance maintenant la frégate F00 (sans URL) : elle récupérera la vidéo depuis cette release."
