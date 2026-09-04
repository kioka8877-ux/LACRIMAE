#!/usr/bin/env python3
"""Masque CPU (rembg) : detoure le streamer frame par frame.
Genere :
- F00H/OUT/masked/<clip>/frame_%04d.png  (RGBA, fond transparent)
- F00H/OUT/masked/<clip>/alpha_preview.mp4 (webm alpha pour preview)
C'est l'approximation CPU du travail SAM 2 que fera le worker Modal.
"""
import subprocess
import sys
from pathlib import Path

from PIL import Image
from rembg import new_session, remove

SESSION = None  # chargé paresseusement (u2netp = modèle léger rapide)
HOOK_FRAMES = 60  # on ne masque que les 2 premières secondes (hook)


def get_session():
    global SESSION
    if SESSION is None:
        SESSION = new_session("u2netp")
    return SESSION


def main() -> int:
    clip_path = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])
    frames_dir = out_dir / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)

    # 1) Extraire les frames du clip (hook uniquement, 640px)
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", str(clip_path),
         "-frames:v", str(HOOK_FRAMES),
         "-vf", "fps=30,scale=640:-2", str(frames_dir / "frame_%04d.png")],
        check=True,
    )

    # 2) Détourer chaque frame (fond -> alpha 0)
    masked_dir = out_dir / "masked"
    masked_dir.mkdir(parents=True, exist_ok=True)
    frames = sorted(frames_dir.glob("frame_*.png"))
    session = get_session()
    for i, f in enumerate(frames):
        out_file = masked_dir / f.name
        if out_file.exists():  # reprenable : skip si deja fait
            continue
        img = Image.open(f).convert("RGBA")
        result = remove(img, session=session)
        result.save(out_file)
        if i % 10 == 0:
            print(f"  {i}/{len(frames)} frames masquées", flush=True)

    # 3) Recomposer en MP4 (le fond transparent sera remplacé au montage)
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error",
         "-framerate", "30", "-i", str(masked_dir / "frame_%04d.png"),
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "ultrafast",
         str(out_dir / "masked_preview.mp4")],
        check=True,
    )
    print(f"OK: {masked_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
