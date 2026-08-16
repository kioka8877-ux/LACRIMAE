#!/usr/bin/env python3
"""
lac_f00b_harvest.py — F00B « RÉCOLTE DES MEMES »
=========================================================================
Découpe une vidéo source en memes (`meme_00X.mp4`) pour la méméthèque.

L'opérateur donne les découpes (début/fin) — F00B coupe avec ffmpeg, nomme,
valide (ffprobe) et range dans OUT/ pour vérification. Après validation, la
publication vers `SHARED/memes/` (numérotation depuis le max existant, jamais
d'écrasement) se fait avec --publish.

Usage (la racine du repo est détectée automatiquement depuis ce script) :
  python3 F00B/CODEBASE/lac_f00b_harvest.py --video IN/source.mp4 --cuts IN/cuts.txt --out OUT/
  python3 F00B/CODEBASE/lac_f00b_harvest.py --video IN/source.mp4 --ranges "12.5-18,45-52.5" --out OUT/
  python3 F00B/CODEBASE/lac_f00b_harvest.py --video IN/source.mp4 --cuts IN/cuts.txt --publish

cuts.txt — 1 coupe par ligne :  START END   (# meme_XXX force le numéro)
  12.5 18.0
  45.0 52.5 # meme_007
  # commentaire pleine ligne autorisé

Entrée  : vidéo source + cuts.txt (ou --ranges)
Sortie  : OUT/meme_00X.mp4 + OUT/meme_00X.jpg + OUT/memes_manifest.json
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

OUT_FILENAME = "memes_manifest.json"
README_MARKER = "<!-- F00B-LISTING -->"


def log_ok(msg): print(f"  [OK] {msg}")
def log_fail(msg): print(f"  [FAIL] {msg}")
def log_info(msg): print(f"  [...] {msg}")

def section(title):
    bar = "-" * max(0, 50 - len(title))
    print(f"\n-- {title} {bar}")


def find_repo_root() -> Path:
    """Remonte depuis ce script jusqu'au dossier contenant SHARED/ et .git."""
    here = Path(__file__).resolve().parent
    for d in [here, *here.parents]:
        if (d / "SHARED").is_dir() and (d / ".git").is_dir():
            return d
    raise RuntimeError("Impossible de localiser la racine du repo (SHARED/ + .git introuvables).")


def run(cmd, desc):
    log_info(desc)
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"{desc}\n  Échec (rc={result.returncode}): {result.stderr[-800:]}")
    return result


def parse_cuts(path: Path):
    """Retourne [(start, end, forced_number_or_None), ...]."""
    if not path.exists():
        raise ValueError(f"Fichier de coupes introuvable : {path}")
    cuts = []
    for lineno, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        m = re.match(r"^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)(?:\s*#\s*(.*))?$", line)
        if not m:
            raise ValueError(f"coupes.txt:{lineno} — ligne invalide : {raw!r}")
        start, end = float(m.group(1)), float(m.group(2))
        forced = None
        label = (m.group(3) or "").strip()
        fm = re.fullmatch(r"meme_(\d+)", label)
        if fm:
            forced = int(fm.group(1))
        if start < 0 or end <= start:
            raise ValueError(f"coupes.txt:{lineno} — coupe invalide (start>=0, end>start) : {start}..{end}")
        cuts.append((start, end, forced))
    if not cuts:
        raise ValueError("Aucune coupe valide (fichier vide ou commenté).")
    return cuts


def parse_ranges(ranges: str):
    cuts = []
    for part in ranges.split(","):
        part = part.strip()
        if "-" not in part:
            raise ValueError(f"--ranges invalide : {part!r} (attendu start-end)")
        a, b = part.split("-", 1)
        start, end = float(a), float(b)
        if start < 0 or end <= start:
            raise ValueError(f"--ranges invalide : {part!r}")
        cuts.append((start, end, None))
    if not cuts:
        raise ValueError("--ranges vide.")
    return cuts


def probe(path):
    cmd = ["ffprobe", "-v", "quiet", "-print_format", "json",
           "-show_format", "-show_streams", str(path)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe échoué sur {path}: {result.stderr[-500:]}")
    data = json.loads(result.stdout)
    v = next((s for s in data["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in data["streams"] if s["codec_type"] == "audio"), None)
    if not v:
        raise RuntimeError(f"{path}: aucun stream vidéo.")
    dur = float(data["format"].get("duration", 0) or 0)
    return {
        "duration_seconds": dur,
        "width": int(v.get("width", 0)),
        "height": int(v.get("height", 0)),
        "video_codec": v.get("codec_name", "unknown"),
        "pix_fmt": v.get("pix_fmt", "unknown"),
        "fps": v.get("avg_frame_rate", "0/1"),
        "audio_codec": a.get("codec_name") if a else None,
    }


def validate_clip(path) -> dict:
    meta = probe(path)
    errors = []
    if meta["video_codec"] != "h264":
        errors.append(f"codec vidéo {meta['video_codec']} != h264")
    if meta["pix_fmt"] != "yuv420p":
        errors.append(f"pix_fmt {meta['pix_fmt']} != yuv420p")
    if meta["audio_codec"] not in (None, "aac"):
        errors.append(f"audio {meta['audio_codec']} non aac (muet accepté)")
    if meta["duration_seconds"] <= 0.2:
        errors.append(f"durée {meta['duration_seconds']:.2f}s trop courte")
    meta["validated"] = len(errors) == 0
    meta["errors"] = errors
    return meta


def compute_assignments(cuts, existing_numbers):
    """Mappe index de coupe -> numéro final. Les numéros forcés sont
    respectés, les autres suivent max(existant)+1 en sautant les pris."""
    forced = {}
    for i, c in enumerate(cuts):
        if c[2] is not None:
            if c[2] in forced.values():
                raise ValueError(f"numéro forcé dupliqué : meme_{c[2]:03d}")
            forced[i] = c[2]
    taken = set(existing_numbers)
    next_auto = (max(existing_numbers, default=0)) + 1
    assignments = {}
    forced_set = set(forced.values())
    for i in range(len(cuts)):
        if i in forced:
            num = forced[i]
            if num in set(existing_numbers):
                raise ValueError(
                    f"meme_{num:03d}.mp4 existe déjà dans SHARED/memes/ — jamais d'écrasement, "
                    "choisis un autre numéro ou retire la coupe.")
            assignments[i] = num
        else:
            while next_auto in taken or next_auto in forced_set:
                next_auto += 1
            assignments[i] = next_auto
            next_auto += 1
        taken.add(assignments[i])
    return assignments


def harvest(video, cuts, out_dir, repo_root):
    out_dir.mkdir(parents=True, exist_ok=True)
    src_meta = probe(video)
    dur = src_meta["duration_seconds"]
    existing = existing_memes(repo_root)
    assignments = compute_assignments(cuts, existing)

    for i, ((start, end, _), num) in enumerate(zip(cuts, assignments.values()), 1):
        if end > dur:
            raise ValueError(f"Coupe {i} : fin {end}s > durée vidéo {dur:.1f}s.")
        clip = out_dir / f"meme_{num:03d}.mp4"
        thumb = out_dir / f"meme_{num:03d}.jpg"
        run([
            "ffmpeg", "-y",
            "-ss", f"{start:.3f}", "-i", str(video),
            "-t", f"{end - start:.3f}",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
            str(clip),
        ], f"Coupe {i} : {start:.1f}s-{end:.1f}s → {clip.name}")
        mid = start + (end - start) / 2
        run([
            "ffmpeg", "-y", "-ss", f"{mid:.3f}", "-i", str(clip),
            "-frames:v", "1", "-q:v", "3", str(thumb),
        ], f"Miniature {i} : {thumb.name}")

    clips = []
    for i, ((start, end, _), num) in enumerate(zip(cuts, assignments.values()), 1):
        clip = out_dir / f"meme_{num:03d}.mp4"
        meta = validate_clip(clip)
        clips.append({
            "file": clip.name, "number": num,
            "source_start": start, "source_end": end,
            "duration": meta["duration_seconds"],
            "validated": meta["validated"], "errors": meta["errors"],
            "meta": {k: v for k, v in meta.items() if k not in ("validated", "errors")},
        })

    all_valid = all(c["validated"] for c in clips)
    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": str(video),
        "source_duration_seconds": dur,
        "all_validated": all_valid,
        "clips": clips,
    }
    with open(out_dir / OUT_FILENAME, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    section("RÉSULTAT F00B")
    for c in clips:
        status = "VALIDÉ" if c["validated"] else "INVALIDE"
        print(f"  {c['file']:<16} {c['duration']:5.1f}s  {status}")
    print(f"  Manifest : {out_dir / OUT_FILENAME}")
    return manifest


def existing_memes(repo_root) -> list:
    memes_dir = repo_root / "SHARED" / "memes"
    if not memes_dir.is_dir():
        return []
    nums = []
    for p in memes_dir.glob("meme_*.mp4"):
        m = re.fullmatch(r"meme_(\d+)\.mp4", p.name)
        if m:
            nums.append(int(m.group(1)))
    return sorted(nums)


def publish(out_dir, manifest, repo_root):
    if not manifest["all_validated"]:
        log_fail("--publish refusé : au moins un clip est invalide (voir manifest).")
        return 1
    memes_dir = repo_root / "SHARED" / "memes"
    memes_dir.mkdir(parents=True, exist_ok=True)
    section("PUBLISH → SHARED/memes/")
    for c in manifest["clips"]:
        src = out_dir / c["file"]
        dst = memes_dir / c["file"]
        if dst.exists():
            log_fail(f"Refus d'écrasement : {dst.name} existe déjà.")
            return 1
        shutil.copy2(src, dst)
        log_ok(f"{src.name} → {dst}")
    update_readme_listing(memes_dir)
    log_ok("Méméthèque publiée. Un run meme réel (P6) peut maintenant l'utiliser.")
    return 0


def update_readme_listing(memes_dir):
    readme = memes_dir / "README.md"
    files = sorted(p.name for p in memes_dir.glob("meme_*.mp4"))
    listing = (
        f"{README_MARKER}\n"
        "## Méméthèque actuelle (généré par F00B)\n\n"
        + "\n".join(f"- {name}" for name in files)
        + "\n\n"
    )
    if readme.exists():
        text = readme.read_text(encoding="utf-8")
        if README_MARKER in text:
            text = re.sub(rf"{README_MARKER}.*?(?=\n## |\Z)", listing, text, flags=re.S)
        else:
            text = text.rstrip() + "\n\n" + listing
        readme.write_text(text, encoding="utf-8")
    else:
        readme.write_text("# Méméthèque LACRIMAE — mode MEME\n\n" + listing, encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description="F00B RÉCOLTE DES MEMES")
    parser.add_argument("--video", required=True, help="Vidéo source à couper")
    parser.add_argument("--cuts", help="Fichier cuts.txt (START END par ligne)")
    parser.add_argument("--ranges", help="Découpes directes : \"12.5-18,45-52.5\"")
    parser.add_argument("--out", help="Dossier de sortie (défaut: F00B/OUT/)")
    parser.add_argument("--publish", action="store_true",
                        help="Copier les clips validés vers SHARED/memes/")
    args = parser.parse_args()

    if not args.cuts and not args.ranges:
        parser.error("--cuts OU --ranges requis.")
    if args.cuts and args.ranges:
        parser.error("--cuts et --ranges sont mutuellement exclusifs.")

    repo_root = find_repo_root()
    video = Path(args.video).resolve()
    if not video.exists():
        log_fail(f"Vidéo source introuvable : {video}")
        return 1

    try:
        cuts = parse_cuts(Path(args.cuts)) if args.cuts else parse_ranges(args.ranges)
    except ValueError as exc:
        log_fail(str(exc))
        return 1

    out_dir = Path(args.out).resolve() if args.out else (repo_root / "F00B" / "OUT")

    section("F00B — DÉCOUPES")
    for i, (s, e, forced) in enumerate(cuts, 1):
        tag = f" → meme_{forced:03d}" if forced else ""
        print(f"  {i}. {s:>8.2f}s → {e:>8.2f}s{tag}")

    try:
        manifest = harvest(video, cuts, out_dir, repo_root)
    except (RuntimeError, ValueError, FileNotFoundError) as exc:
        log_fail(str(exc))
        return 1

    if args.publish:
        return publish(out_dir, manifest, repo_root)
    print("\n  Vérifie les clips + miniatures dans OUT/, puis relance avec --publish.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
