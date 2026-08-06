#!/usr/bin/env python3
"""
LAC_DOWNLOAD_RELEASE_VIDEO — télécharge video_source.mp4 depuis la dernière
GitHub Release du repo (asset "video_source.mp4").

Pourquoi ? Les vidéos opérateur (> 100 Mo, jusqu'à ~1 Go) ne peuvent pas être
commitées dans git (limite GitHub : 100 Mo par fichier via push, 25 Mo via le
web). L'opérateur les upload donc comme asset d'une GitHub Release (2 Go max
par fichier, gratuit sur repo public) via _tools/lac_release_video.sh.

Usage (exécuté par la frégate F00 du workflow, depuis la racine du repo) :
    python3 _tools/download_release_video.py <dest_dir> [tag]

    dest_dir : où écrire video_source.mp4 (ex: F00_INGEST/IN/)
    tag      : tag de release (optionnel — défaut : dernière release)

Exit 0 si la vidéo est téléchargée, 1 sinon (message d'erreur lisible).
"""
import json
import os
import sys
import urllib.request
from pathlib import Path

REPO = "kioka8877-ux/LACRIMAE"
ASSET_NAME = "video_source.mp4"


def gh_api(url: str) -> dict:
    headers = {"User-Agent": "LACRIMAE-F00", "Accept": "application/vnd.github+json"}
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def find_asset_url(tag: str | None) -> str | None:
    """Retourne l'URL de download de l'asset video_source.mp4 dans la release
    visée (tag donné, ou dernière release si tag absent)."""
    if tag:
        rel = gh_api(f"https://api.github.com/repos/{REPO}/releases/tags/{tag}")
    else:
        rel = gh_api(f"https://api.github.com/repos/{REPO}/releases/latest")
    assets = rel.get("assets", [])
    for a in assets:
        if a.get("name") == ASSET_NAME:
            return a.get("browser_download_url")
    return None


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python3 download_release_video.py <dest_dir> [tag]", file=sys.stderr)
        return 1
    dest_dir = Path(sys.argv[1])
    tag = sys.argv[2] if len(sys.argv) > 2 else None

    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / ASSET_NAME
    if dest.exists():
        print(f"  [✓] Vidéo déjà présente : {dest} — skip")
        return 0

    try:
        url = find_asset_url(tag)
    except Exception as exc:
        print(f"  [✗] API GitHub : {exc}", file=sys.stderr)
        return 1

    if not url:
        where = f"tag '{tag}'" if tag else "dernière release"
        print(f"  [✗] Aucun asset '{ASSET_NAME}' dans la {where} du repo {REPO}",
              file=sys.stderr)
        print("  → L'opérateur doit l'uploader : sh _tools/lac_release_video.sh <video.mp4>",
              file=sys.stderr)
        return 1

    print(f"  [→] Téléchargement de {ASSET_NAME} depuis {REPO}…")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "LACRIMAE-F00"})
        with urllib.request.urlopen(req, timeout=1800) as resp, open(dest, "wb") as f:
            total = 0
            while True:
                chunk = resp.read(1 << 20)
                if not chunk:
                    break
                f.write(chunk)
                total += len(chunk)
    except Exception as exc:
        print(f"  [✗] Téléchargement : {exc}", file=sys.stderr)
        return 1

    print(f"  [✓] Vidéo téléchargée : {dest} ({total / 1e6:.1f} Mo)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
