"""
LAC_BRIDGE_FORGE — Pont entre PERTURABO (MONDES_FORGES/CLIPPING) et LACRIMAE
=============================================================================
Mode FORGE : LACRIMAE ne réfléchit pas, il crée ce que Perturabo lui dit de créer.

L'ORACLE (bridge) est AUTONOME pour UNE chose : récupérer le pack dans le monde
forge CLIPPING de Perturabo, sans intervention du Champion. Il ne prend QUE le
production_pack_*.json du dossier EXPORT — RIEN D'AUTRE.

  PAS dans le pack → fourni par l'opérateur :
    - la VIDÉO à découper  (SHARED/IN/video_source.mp4 — directement dans IN)
    - les PNG fonds        (faits une fois pour toutes → SHARED/IN/backgrounds/)
    - le LOGO              (campagne → SHARED/IN/logos/logo.png)

Flux :
  1. RÉCUPÉRATION : liste EXPORT/ du repo PERTURABO via l'API GitHub (public par
     défaut, GITHUB_TOKEN supporté), télécharge le production_pack_*.json le
     plus récent (ou filtré par --pack-filter) → BRIDGE_PERTURABO/IN/.
  2. Contrôle (CUSTOS) : schéma du pack + cuts validés + présence de la vidéo
     locale, des fonds partagés et du logo → CONTRÔLE 1 (notre v1).
  3. Mapping pack → artefacts LACRIMAE :
       videos[].cut.start_sec/end_sec → F02_FORMAT/IN/cutlist.json
       videos[].title / viral_paragraph / on_screen_text → texts par clip
       logo_placement → session.logo (image transparente campagne)
       reference_clip_style → session (fond : blur=false → profil background)
  4. Transite : vidéo → F02/IN, TOUS les fonds partagés → public/backgrounds/
     des frégates F03+F04 + manifest.json (menu déroulant preview), logo →
     public/logo.png, codex → F03/F04 IN + public.

Le mode forge SAUTE F01 (les cuts viennent du pack, pas de vision OpenRouter).
Le mode forge UTILISE le profil F02 `background` (découpe seule — la mise en
page se fait dans la composition Remotion, fond PNG + vidéo).

Usage:
  # Oracle : le bridge va chercher le pack seul dans PERTURABO/EXPORT
  python lac_bridge_forge.py [--pack-filter SANDOVAL]
                              [--video /path/video_source.mp4]
  # Manuel : pack fourni en local
  python lac_bridge_forge.py --pack /path/EXPORT/production_pack_logo.json \
                             [--video /path/video_source.mp4]
                             [--mode logo]        # logo (défaut) | libre
                             [--dry-run]

Assets opérateur (PAS dans Perturabo) :
    - vidéo  : SHARED/IN/video_source.mp4 (directement dans IN) — ou --video,
               repli BRIDGE_PERTURABO/IN/video_source.mp4
    - fonds  : SHARED/IN/backgrounds/*.png  (une fois pour toutes)
    - logo   : SHARED/IN/logos/logo.png

Sorties :
  BRIDGE_PERTURABO/OUT/cutlist.json + OUT/codex.json + OUT/bridge_report.json
  + transits vers F02/IN, F03, F04 (public + IN)
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent  # racine LACRIMAE
BRIDGE_BASE = ROOT / "BRIDGE_PERTURABO"
BRIDGE_IN = BRIDGE_BASE / "IN"
BRIDGE_OUT = BRIDGE_BASE / "OUT"
# Dossier partagé IN — l'opérateur dépose ici les assets qui ne sont PAS dans
# le pack Perturabo :
#   SHARED/IN/video_source.mp4  — la vidéo à découper (directement dans IN,
#                                  pas de sous-dossier videos/)
#   SHARED/IN/backgrounds/*.png — fonds (faits une fois pour toutes)
#   SHARED/IN/logos/logo.png    — logo de campagne (optionnel)
SHARED_IN_DIR = ROOT / "SHARED" / "IN"
SHARED_VIDEO_SOURCE = SHARED_IN_DIR / "video_source.mp4"
SHARED_BACKGROUNDS_DIR = SHARED_IN_DIR / "backgrounds"
SHARED_LOGOS_DIR = SHARED_IN_DIR / "logos"
LOGO_FILENAME = "logo.png"

FRIGATES = {
    "F02": ROOT / "F02_FORMAT",
    "F03": ROOT / "F03_PREVIEW",
    "F04": ROOT / "F04_RENDER",
}

# Deux formats de pack acceptés :
#  A) Pack EXPORT réel (production_pack_logo.json) : pack_id, clip_source_ref,
#     videos[] (cut + title + viral_paragraph + on_screen_text), logo_placement
#  B) Pack conforme au schéma canonique (production_pack_schema.json) :
#     identite, cibles, source, angle, cut_directives, ...
PACK_KEYS_REQUIRED = [
    "identite", "cibles", "source", "angle", "cut_directives",
    "reference_style", "text_payload", "compliance", "metadata",
    "submission_checklist",
]
PACK_KEYS_LOGO = ["pack_id", "clip_source_ref", "videos"]

# ─── PERTURABO : adresse du monde forge CLIPPING (défauts) ───────────────────
PERTURABO_REPO = "kioka8877-ux/PERTURABO"
PERTURABO_EXPORT_PATH = "MONDES_FORGES/CLIPPING/EXPORT"
PERTURABO_BRANCH = "main"


def log_ok(msg): print(f"  [✓] {msg}")
def log_err(msg): print(f"  [✗] {msg}")
def log_warn(msg): print(f"  [!] {msg}")
def log_controle(msg): print(f"\n  ╔══ CONTRÔLE ══ {msg} ══╗")


def section(title):
    print(f"\n{'─' * 60}\n  {title}\n{'─' * 60}")


# ─── RÉCUPÉRATION DU PACK (mode Oracle) ──────────────────────────────────────

def github_api(url: str) -> dict:
    """GET l'API GitHub (stdlib urllib). GITHUB_TOKEN optionnel (repo privé)."""
    headers = {"User-Agent": "LACRIMAE-BRIDGE", "Accept": "application/vnd.github+json"}
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read().decode("utf-8"))


def download_file(url: str, dest: Path) -> None:
    headers = {"User-Agent": "LACRIMAE-BRIDGE"}
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=180) as resp:
        dest.write_bytes(resp.read())


def fetch_pack_from_perturabo(repo=PERTURABO_REPO, export_path=PERTURABO_EXPORT_PATH,
                              branch=PERTURABO_BRANCH, pack_filter=None, mode="logo") -> Path:
    """Mode Oracle : va chercher le pack dans PERTURABO/EXPORT tout seul.

    Ne récupère QUE le production_pack_*.json — ni zip, ni vidéo, ni PNG.
    1. Liste le dossier EXPORT via l'API GitHub
    2. Choisit le production_pack_*.json : filtré par pack_filter si fourni,
       sinon le plus récent dont le nom reflète le mode du pack (ex:
       production_pack_logo.json) — repli sur le plus récent
    3. Télécharge le pack dans BRIDGE_PERTURABO/IN/

    Retourne le chemin local du pack téléchargé.
    """
    section("ORACLE — Récupération du pack depuis PERTURABO/EXPORT")
    listing = github_api(
        f"https://api.github.com/repos/{repo}/contents/{export_path}?ref={branch}")
    files = [f for f in listing if f.get("type") == "file"]

    packs = [f for f in files if f["name"].startswith("production_pack") and f["name"].endswith(".json")]
    if not packs:
        packs = [f for f in files if "production" in f["name"].lower() and f["name"].endswith(".json")]
    if not packs:
        log_err(f"Aucun production_pack_*.json dans {export_path} (repo {repo})")
        for f in files:
            print(f"    - {f['name']}")
        sys.exit(1)

    if pack_filter:
        matched = [f for f in packs if pack_filter.lower() in f["name"].lower()]
        if not matched:
            log_err(f"--pack-filter '{pack_filter}' : aucun pack correspondant."
                    f"Packs dispo : {[f['name'] for f in packs]}")
            sys.exit(1)
        packs = matched

    # Le plus récent = le dernier par ordre alphabétique (timestamp dans le nom),
    # avec préférence au pack dont le nom reflète le mode (logo par défaut)
    chosen = sorted(packs, key=lambda f: f["name"])[-1]
    mode_packs = [f for f in packs if mode.lower() in f["name"].lower()]
    if mode_packs:
        chosen = sorted(mode_packs, key=lambda f: f["name"])[-1]
    log_ok(f"Pack trouvé : {chosen['name']}")

    BRIDGE_IN.mkdir(parents=True, exist_ok=True)
    pack_dest = BRIDGE_IN / "production_pack.json"
    download_file(chosen["download_url"], pack_dest)
    log_ok(f"Pack téléchargé → {pack_dest} ({pack_dest.stat().st_size} octets)")
    log_ok("Rien d'autre n'est récupéré depuis Perturabo (vidéo + PNG = opérateur)")
    return pack_dest


# ─── CONTRÔLE 1 : validation du pack ─────────────────────────────────────────

def validate_pack(pack: dict) -> list:
    """Retourne la liste des erreurs (vide = pack OK). Accepte le pack EXPORT
    réel (format logo) OU le pack conforme au schéma canonique."""
    errors = []
    is_logo_format = all(k in pack for k in PACK_KEYS_LOGO)

    if not is_logo_format:
        # Format schéma canonique
        for key in PACK_KEYS_REQUIRED:
            if key not in pack:
                errors.append(f"pack.{key} manquant")

    videos = pack.get("videos")
    if not isinstance(videos, list) or len(videos) == 0:
        errors.append("pack.videos doit être une liste non vide")
    else:
        for v in videos:
            cut = v.get("cut") or {}
            if "start_sec" not in cut or "end_sec" not in cut:
                errors.append(f"video {v.get('angle_id', '?')} : cut.start_sec/end_sec manquant")
            elif cut.get("end_sec", 0) <= cut.get("start_sec", 0):
                errors.append(f"video {v.get('angle_id', '?')} : cut invalide (end<=start)")
            if not v.get("title") and not v.get("on_screen_text") and not v.get("viral_paragraph"):
                errors.append(f"video {v.get('angle_id', '?')} : ni title ni on_screen_text")
    return errors


# ─── MAPPING pack → cutlist ──────────────────────────────────────────────────

def pack_to_cutlist(pack: dict) -> dict:
    """Videos[].cut → cutlist.json (format F02/F01). Gère les 2 formats."""
    videos = pack.get("videos", [])
    source = pack.get("clip_source_ref") or {}
    if not source:
        source = (pack.get("source") or {}).get("video_url") and {
            "reference": (pack.get("source") or {}).get("video_url")
        } or {}
    sequences = []
    for v in videos:
        cut = v.get("cut") or {}
        reason = v.get("title") or v.get("on_screen_text") or cut.get("note", "")
        sequences.append({
            "start_sec": float(cut["start_sec"]),
            "end_sec": float(cut["end_sec"]),
            "reason": f"[{v.get('angle_id', '?')}] {reason}",
        })
    return {
        "requested_sequences": len(sequences),
        "video_duration_sec": source.get("duration_sec"),
        "source": source.get("reference"),
        "sequences": sequences,
        "origin": "PERTURABO_FORGE",
    }


# ─── MAPPING pack → texts (par clip) ─────────────────────────────────────────

def pack_to_texts(pack: dict) -> dict:
    """Videos[] → mapping index → {title, paragraph, mode} pour F02."""
    texts_map = {}
    videos = pack.get("videos", [])
    for i, v in enumerate(videos):
        paragraph = v.get("viral_paragraph") or ""
        title = v.get("on_screen_text") or v.get("title") or ""
        # Par défaut titre seul ; titre+paragraphe si le pack fournit le paragraphe
        mode = "title+paragraph" if paragraph and title else ("title" if title else "none")
        texts_map[str(i + 1)] = {
            "title": title,
            "paragraph": paragraph,
            "mode": mode,
        }
    return texts_map


# ─── CONTRÔLE 1 : vérification des assets OPÉRATEUR ──────────────────────────

def check_assets(video_path, shared_backgrounds, logo_path) -> list:
    """Vérifie la présence des assets fournis par l'opérateur (Contrôle 1).
    Retourne les manquants."""
    missing = []
    if not video_path.exists():
        missing.append(f"VIDÉO manquante : {video_path} "
                       f"(déposée par l'opérateur dans SHARED/IN/)")
    # Fonds PNG partagés : le mode logo de Perturabo interdit le blur → fond requis
    if not shared_backgrounds:
        missing.append(f"FONDS PNG manquants : {SHARED_BACKGROUNDS_DIR} "
                       f"(déposés une fois pour toutes)")
    if logo_path is not None and not logo_path.exists():
        missing.append(f"LOGO manquant : {logo_path}")
    return missing


def probe_video_duration(video_path) -> float | None:
    """Durée de la vidéo via ffprobe (None si ffprobe indisponible)."""
    try:
        out = subprocess.check_output(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=nw=1", str(video_path)],
            stderr=subprocess.DEVNULL)
        return float(out.decode().split("=")[1].strip())
    except Exception:
        return None


def check_cuts_within_duration(pack: dict, video_path) -> list:
    """Vérifie que TOUS les cuts du pack sont dans la durée de la vidéo fournie.
    Retourne les erreurs (vide = OK).

    Pourquoi : sans ce contrôle, un cut au-delà de la durée produit un clip VIDE
    à F02 (ffmpeg -ss 200 sur une vidéo de 182s) — l'opérateur découvrirait le
    problème hors porte. La garde bloque au CONTRÔLE 1 avec un message clair : la
    vidéo fournie ne correspond pas au pack (clip_source_ref)."""
    errors = []
    duration = probe_video_duration(video_path)
    if duration is None:
        log_warn("ffprobe indisponible — contrôle durée vidéo sauté")
        return errors
    for v in pack.get("videos", []):
        cut = v.get("cut") or {}
        end = float(cut.get("end_sec", 0))
        if end > duration:
            errors.append(
                f"video {v.get('angle_id', '?')} : cut {cut.get('start_sec')}-{end}s "
                f"dépasse la durée vidéo ({duration:.1f}s) — la vidéo fournie ne "
                f"correspond pas au pack (voir clip_source_ref)")
    return errors


# ─── TRANSITS ────────────────────────────────────────────────────────────────

def transit_to_f02(video_path, cutlist_path):
    f02 = FRIGATES["F02"]
    f02_in = f02 / "IN"
    f02_in.mkdir(parents=True, exist_ok=True)
    shutil.copy2(video_path, f02_in / "video_source.mp4")
    shutil.copy2(cutlist_path, f02_in / "cutlist.json")
    log_ok(f"F02/IN : video_source.mp4 + cutlist.json")


def transit_backgrounds_to_preview_render():
    """TOUS les fonds partagés → public/backgrounds/ des F03+F04 + manifest.json.
    (Le menu déroulant de la preview se nourrit de ce manifest.json.)"""
    manifest = []
    backgrounds = sorted(SHARED_BACKGROUNDS_DIR.glob("*.png")) if SHARED_BACKGROUNDS_DIR.exists() else []
    for name, frig in FRIGATES.items():
        if name == "F02":
            continue
        bg_dir = frig / "CODEBASE" / "public" / "backgrounds"
        bg_dir.mkdir(parents=True, exist_ok=True)
        for bg in backgrounds:
            shutil.copy2(bg, bg_dir / bg.name)
        manifest = sorted(bg.name for bg in backgrounds)
        (bg_dir / "manifest.json").write_text(
            json.dumps({"files": manifest}, ensure_ascii=False, indent=2),
            encoding="utf-8")
        log_ok(f"{frig.name} : {len(manifest)} fond(s) transité(s) + manifest.json")
    return manifest


def transit_logo(logo_path):
    if not logo_path or not logo_path.exists():
        return
    for name, frig in FRIGATES.items():
        if name == "F02":
            continue
        shutil.copy2(logo_path, frig / "CODEBASE" / "public" / LOGO_FILENAME)
    log_ok("logo.png transité vers F03 + F04 (public/)")


def transit_codex(codex_path):
    """codex.json forge → F03/IN + F03/public + F04/IN + F04/public."""
    for name in ("F03", "F04"):
        frig = FRIGATES[name]
        for dst in (frig / "IN", frig / "CODEBASE" / "public"):
            dst.mkdir(parents=True, exist_ok=True)
            shutil.copy2(codex_path, dst / "codex.json")
    log_ok("codex.json forge transité vers F03 + F04")


# ─── CODEX FORGE (v4.0, session + clips) ─────────────────────────────────────

def build_forge_codex(pack: dict, texts_map: dict, background_name, fps=30) -> dict:
    videos = pack.get("videos", [])
    clips = []
    for i, v in enumerate(videos):
        cut = v.get("cut") or {}
        duration = float(cut.get("duration_sec") or (cut.get("end_sec", 0) - cut.get("start_sec", 0)))
        t = texts_map.get(str(i + 1), {})
        clips.append({
            "id": f"clip_{i + 1:03d}",
            "angle_id": v.get("angle_id", f"A{i + 1:02d}"),
            "video": {
                "source": f"clip_{i + 1:03d}.mp4",
                "fps": fps,
                "total_frames": int(duration * fps),
                "width": 1080,
                "height": 1920,
            },
            "texts": {
                "mode": t.get("mode", "title"),
                "title": t.get("title", ""),
                "paragraph": t.get("paragraph", ""),
                "title_offset_pct": 8,
                "paragraph_offset_pct": 8,
            },
            "text_overlays": [
                {
                    "id": "title_00",
                    "content": t.get("title", ""),
                    "start_frame": 0,
                    "end_frame": int(duration * fps),
                    "animation": "fade_in",
                    "font": "Impact, Arial Black, sans-serif",
                    "size": 96,
                    "color": "#FFFFFF",
                    "stroke_color": "#000000",
                    "stroke_width": 4,
                    "shadow": "2px 4px 8px rgba(0,0,0,0.9)",
                    "position": "top",
                    "letter_spacing": "0em",
                    "glow_intensity": 0,
                    "depth_3d": 0,
                }
            ],
            "zoom_keyframes": [],
            "logo": None,  # session.logo
            "brutal_cut_interval_frames": 0,  # forge : pas de coup brutal imposé
            "volume": 1.0,
            "slowmo_start_frame": 0,
            "slowmo_speed": 1.0,
            "shake_power": 0,
        })

    codex = {
        "version": "4.0",
        "pipeline": "LACRIMAE_DEV",
        "mode": "forge",
        "forge": {
            "pack_id": pack.get("pack_id"),
            "siege_id": pack.get("siege_id"),
            "pack_mode": pack.get("mode", "logo"),
            "campaign_id": (pack.get("identite") or {}).get("campaign_id"),
        },
        "session": {
            "background": {
                "image": background_name,  # fond partagé choisi (défaut = 1er trié)
                "color": "#0a0a0a",
                "scale": 1.0,
            },
            "logo": {
                "src": LOGO_FILENAME,
                "width_pct": 20,
                "position": "bottom_left",
                "opacity": 1.0,
            },
            "texts_style": {
                "font": "Impact, Arial Black, sans-serif",
                "size_title": 96,
                "size_paragraph": 44,
                "color": "#FFFFFF",
                "stroke_color": "#000000",
                "stroke_width": 4,
                "shadow": "2px 4px 8px rgba(0,0,0,0.9)",
                "glow_intensity": 0,
                "letter_spacing": "0em",
            },
            "presets": {
                "color_preset": "punchy",
                "color_css_filter": "contrast(1.3) saturate(1.5) brightness(1.1)",
                "enhance_4k": False,
                "sharpening": 0,
                "denoising": 0,
                "vignette": 0.25,
                "grain_intensity": 0.15,
            },
        },
        "validated_by_magos": False,
        "clips": clips,
    }
    return codex


# ─── MAIN ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="LAC_BRIDGE_FORGE — Pont PERTURABO → LACRIMAE")
    parser.add_argument("--pack", default=None,
                        help="Chemin du production_pack.json — SI ABSENT, le bridge va le "
                             "chercher seul dans PERTURABO/EXPORT (mode Oracle)")
    parser.add_argument("--pack-filter", default=None,
                        help="Filtre du pack à auto-récupérer (substring du nom, ex: SANDOVAL)")
    parser.add_argument("--video", help="Vidéo source locale (déposée par l'opérateur)")
    parser.add_argument("--mode", default="logo", choices=["logo", "libre"],
                        help="Mode du pack (défaut logo)")
    parser.add_argument("--dry-run", action="store_true", help="Affiche le plan sans écrire")
    args = parser.parse_args()

    section("LAC_BRIDGE_FORGE — import du pack Perturabo")
    log_controle("CONTRÔLE 1 — VALIDATION DU PACK")

    # 0. Pack : local fourni OU auto-récupéré depuis PERTURABO/EXPORT (Oracle)
    if args.pack:
        pack_path = Path(args.pack)
        if not pack_path.exists():
            log_err(f"Pack introuvable : {pack_path}")
            sys.exit(1)
        log_ok(f"Pack local : {pack_path}")
    else:
        pack_path = fetch_pack_from_perturabo(pack_filter=args.pack_filter,
                                              mode=args.mode)
        log_ok(f"Pack auto-récupéré : {pack_path}")

    pack = json.loads(pack_path.read_text(encoding="utf-8"))

    # 1. Validation schéma + cuts
    errors = validate_pack(pack)
    if errors:
        for e in errors:
            log_err(e)
        print("\n  ══ CONTRÔLE 1 : ✗ ÉCHOUÉ — corriger le pack ══")
        sys.exit(1)
    log_ok(f"Pack valide : {pack.get('pack_id', '?')} | mode={pack.get('mode', '?')} | "
           f"{len(pack.get('videos', []))} vidéo(s)")

    # 2. Assets OPÉRATEUR (jamais dans Perturabo) :
    #    - vidéo  : SHARED/IN/video_source.mp4 (directement dans IN) — ou
    #               --video / repli BRIDGE_PERTURABO/IN/video_source.mp4
    #    - fonds  : SHARED/IN/backgrounds/*.png  (une fois pour toutes)
    #    - logo   : SHARED/IN/logos/logo.png
    if args.video:
        video_path = Path(args.video)
    elif SHARED_VIDEO_SOURCE.exists():
        video_path = SHARED_VIDEO_SOURCE
    else:
        video_path = BRIDGE_IN / "video_source.mp4"
    shared_backgrounds = sorted(SHARED_BACKGROUNDS_DIR.glob("*.png")) if SHARED_BACKGROUNDS_DIR.exists() else []
    logo_path = SHARED_LOGOS_DIR / LOGO_FILENAME
    if not logo_path.exists():
        logo_path = None

    missing = check_assets(video_path, shared_backgrounds, logo_path)
    if missing:
        for m in missing:
            log_err(m)
        print("\n  ══ CONTRÔLE 1 : ✗ ÉCHOUÉ — assets opérateur manquants ══")
        print("  Le bridge ne prend QUE le pack depuis Perturabo. Fournis :")
        print(f"    - vidéo → {SHARED_VIDEO_SOURCE} (directement dans SHARED/IN)")
        print(f"    - fonds → {SHARED_BACKGROUNDS_DIR}/ (PNG, une fois pour toutes)")
        print(f"    - logo  → {SHARED_LOGOS_DIR / LOGO_FILENAME} (optionnel)")
        sys.exit(1)

    # Garde durée : TOUS les cuts du pack doivent être dans la vidéo fournie.
    # (Sinon F02 produirait des clips vides — l'opérateur n'agit qu'aux portes.)
    cut_errors = check_cuts_within_duration(pack, video_path)
    if cut_errors:
        for e in cut_errors:
            log_err(e)
        print("\n  ══ CONTRÔLE 1 : ✗ ÉCHOUÉ — vidéo incompatible avec les cuts du pack ══")
        print("  Le pack référence une source précise (clip_source_ref) — la vidéo")
        print("  fournie doit la couvrir intégralement. Remplace-la dans la release :")
        print("    sh _tools/lac_release_video.sh <bonne_video.mp4> [tag]")
        sys.exit(1)
    background_name = shared_backgrounds[0].name  # défaut = 1er fond trié
    log_ok(f"Assets opérateur : vidéo ✓ | {len(shared_backgrounds)} fond(s) "
           f"(défaut {background_name}) ✓ | logo {'✓' if logo_path else '— (sans logo)'}")

    print("\n  ══ CONTRÔLE 1 : ✓ VALIDÉ — pack + assets prêts ══")

    if args.dry_run:
        print("\n[DRY-RUN] Plan :")
        print(f"  pack     : {pack.get('pack_id', '?')} (mode {pack.get('mode', '?')})")
        print(f"  cutlist  : {len(pack.get('videos', []))} séquences (cuts perturabo_validated)")
        print(f"  profil F02 : background (découpe seule, pas de blur — mode logo)")
        print(f"  textes   : {len(pack.get('videos', []))} clips (title/paragraph du pack)")
        print(f"  fonds    : {len(shared_backgrounds)} PNG partagés → preview + rendu")
        print("  Aucun fichier écrit.")
        sys.exit(0)

    # 3. Mapping pack → cutlist + texts
    BRIDGE_OUT.mkdir(parents=True, exist_ok=True)
    cutlist = pack_to_cutlist(pack)
    cutlist_path = BRIDGE_OUT / "cutlist.json"
    cutlist_path.write_text(json.dumps(cutlist, ensure_ascii=False, indent=2), encoding="utf-8")
    log_ok(f"cutlist forge écrit : {cutlist_path}")

    texts_map = pack_to_texts(pack)

    # 4. Codex forge v4.0 (session + clips)
    codex = build_forge_codex(pack, texts_map, background_name)
    codex_path = BRIDGE_OUT / "codex.json"
    codex_path.write_text(json.dumps(codex, ensure_ascii=False, indent=2), encoding="utf-8")
    log_ok(f"codex forge v4.0 écrit : {codex_path} ({len(codex['clips'])} clip(s))")

    # 5. Transits
    transit_to_f02(video_path, cutlist_path)
    transit_backgrounds_to_preview_render()
    transit_logo(logo_path)
    transit_codex(codex_path)

    # 6. Rapport bridge
    source = pack.get("clip_source_ref") or {}
    report = {
        "pack_id": pack.get("pack_id"),
        "mode": pack.get("mode"),
        "videos_count": len(pack.get("videos", [])),
        "controle1": "validated",
        "profile_f02": "background",
        "background": background_name,
        "backgrounds_available": [b.name for b in shared_backgrounds],
        "f01_skipped": True,
        "pack_fetched": not args.pack,  # True si auto-récupéré depuis PERTURABO
        "source_video": source.get("reference"),
        "source_type": source.get("source_type"),
        "video_local": str(video_path),
        "clips": [{"angle_id": v.get("angle_id"), "title": v.get("title"),
                   "cut": v.get("cut")} for v in pack.get("videos", [])],
    }
    (BRIDGE_OUT / "bridge_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print()
    print("═" * 52)
    print(" BRIDGE FORGE — MISSION ACCOMPLIE")
    print(f"  Pack     : {pack.get('pack_id', '?')} (récupéré par l'Oracle)")
    print(f"  Mode     : {pack.get('mode', '?')}")
    print(f"  Vidéos   : {len(codex['clips'])}")
    print(f"  F01      : SAUTÉE (cuts du pack)")
    print(f"  Prochain : LAC_RUN.py run (F02 profile background → preview F03)")
    print("═" * 52)


if __name__ == "__main__":
    main()
