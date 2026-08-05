"""
LAC_RUN — Orchestrateur LACRIMAE (branche dev) — Rubicon Primaris
Le nerf central : enchaîne les frégates, copie les artefacts entre elles,
appelle LAC_CUSTOS après chaque output, et s'arrête UNIQUEMENT aux portes.

Doctrine (VERBUM §VIII) :
  - Exécuteur : ce script fait tourner les frégates sans main humaine.
  - Portes    : 4 moments de souveraineté du Champion.
  - Gardien   : LAC_CUSTOS valide chaque output avant tout transit.
  - Ledger    : TRACKING/LEDGER_DEV.json — mémoire nomade de la production.

PORTES :
  I  BRIEF      — init (le Champion écrit le brief)
  II CUTLIST    — gate --cutlist  (après F01, avant F02)
  III MONTAGE   — gate --codex    (après F02/preview F03, avant F04)
  IV PUBLICATION — gate --publish (après F05, avant F06)

Usage :
  python LAC_RUN.py init  --source <url|file> --title "..." --sujet "..." [--vibe "..."]
                          [--sequences 2] [--min-dur 3] [--max-dur 10]
                          [--profile blur-pad] [--preset punchy]
  python LAC_RUN.py run                     # exécute jusqu'à la prochaine porte
  python LAC_RUN.py gate --cutlist|--codex|--publish
  python LAC_RUN.py status
  python LAC_RUN.py reset                   # remet les frégates à pending (garde le brief)
"""

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# Windows : stdout en cp1252 par défaut — forcer l'UTF-8 pour les glyphes du rapport
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

ROOT = Path(__file__).resolve().parent
LEDGER_PATH = ROOT / "TRACKING" / "LEDGER_DEV.json"
SHARED_OUT = ROOT / "SHARED" / "OUT"
LOGO_SOURCE = ROOT / "SHARED" / "IN" / "logos" / "logo.png"

DEFAULT_MODEL = os.environ.get("ORACLE_MODEL", "google/gemini-2.0-flash-exp:free")

# Chaîne d'exécution : F03 n'a pas de script — c'est la porte III (preview manuelle)
RUN_ORDER = ["F00", "F01", "F02", "F04", "F05", "F06"]
GATE_AFTER = {"F01": "gate2_cutlist", "F02": "gate3_codex", "F05": "gate4_publish"}

FRIGATE_PATHS = {
    "F00": ROOT / "F00_INGEST",
    "F01": ROOT / "F01_SELECT",
    "F02": ROOT / "F02_FORMAT",
    "F03": ROOT / "F03_PREVIEW",
    "F04": ROOT / "F04_RENDER",
    "F05": ROOT / "F05_CAMOUFLAGE",
    "F06": ROOT / "F06_LUTHER",
}


def log_ok(msg): print(f"  [✓] {msg}")
def log_err(msg): print(f"  [✗] {msg}")
def log_gate(msg): print(f"\n  ╔══ PORTE ══ {msg} ══╗")
def section(title):
    print(f"\n{'─' * 60}\n  {title}\n{'─' * 60}")


# ─── LEDGER ───────────────────────────────────────────────────────────────────

def empty_ledger():
    return {
        "pipeline": "LACRIMAE_DEV",
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "updated_at": datetime.now().isoformat(timespec="seconds"),
        "brief": None,
        "gates": {
            "gate1_brief": {"signed": False, "at": None},
            "gate2_cutlist": {"signed": False, "at": None},
            "gate3_codex": {"signed": False, "at": None},
            "gate4_publish": {"signed": False, "at": None},
        },
        "frigates": {
            f: {"status": "pending", "at": None, "custos": None}
            for f in ["F00", "F01", "F02", "F03", "F04", "F05", "F06"]
        },
    }


def load_ledger():
    if LEDGER_PATH.exists():
        return json.loads(LEDGER_PATH.read_text(encoding="utf-8"))
    return empty_ledger()


def save_ledger(ledger):
    ledger["updated_at"] = datetime.now().isoformat(timespec="seconds")
    LEDGER_PATH.parent.mkdir(parents=True, exist_ok=True)
    LEDGER_PATH.write_text(json.dumps(ledger, ensure_ascii=False, indent=2), encoding="utf-8")


def sign_gate(ledger, gate):
    ledger["gates"][gate]["signed"] = True
    ledger["gates"][gate]["at"] = datetime.now().isoformat(timespec="seconds")


def mark(ledger, frigate, status, custos=None):
    ledger["frigates"][frigate]["status"] = status
    ledger["frigates"][frigate]["at"] = datetime.now().isoformat(timespec="seconds")
    if custos is not None:
        ledger["frigates"][frigate]["custos"] = custos


def gate_open(ledger, gate):
    return not ledger["gates"].get(gate, {}).get("signed", False)


# ─── GARDIEN ──────────────────────────────────────────────────────────────────

def custos(frigate, mode):
    """Appelle LAC_CUSTOS — le gardien. Exit 0 = verdict OK."""
    section(f"CUSTOS — {frigate} {mode.upper()}")
    cmd = [
        sys.executable, str(ROOT / "LAC_CUSTOS.py"),
        "--frigate", frigate, "--mode", mode, "--drive-base", str(ROOT),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True,
                            encoding="utf-8", errors="replace")
    if result.stdout:
        print(result.stdout.strip())
    if result.stderr.strip():
        print(result.stderr.strip(), file=sys.stderr)
    return result.returncode == 0


def run_cli(args_list, cwd=None):
    result = subprocess.run(args_list, cwd=cwd, capture_output=True, text=True,
                            encoding="utf-8", errors="replace")
    if result.stdout:
        print(result.stdout.strip())
    if result.stderr.strip():
        print(result.stderr.strip(), file=sys.stderr)
    return result.returncode == 0


def copy_artefact(src: Path, dst: Path) -> bool:
    if not src.exists():
        log_err(f"Artefact introuvable : {src}")
        return False
    dst.parent.mkdir(parents=True, exist_ok=True)
    import shutil
    shutil.copy2(str(src), str(dst))
    log_ok(f"{src.parent.name}/{src.name} → {dst}")
    return True


# ─── TRANSITS (copies inter-frégates) ────────────────────────────────────────

def transit_f00(ledger):
    f00, f01, f02 = FRIGATE_PATHS["F00"], FRIGATE_PATHS["F01"], FRIGATE_PATHS["F02"]
    video = f00 / "OUT" / "video_source.mp4"
    return all([
        copy_artefact(video, f01 / "IN" / "video_source.mp4"),
        copy_artefact(video, f02 / "IN" / "video_source.mp4"),
    ])


def transit_f01(ledger):
    f01, f02 = FRIGATE_PATHS["F01"], FRIGATE_PATHS["F02"]
    return copy_artefact(f01 / "OUT" / "cutlist.json", f02 / "IN" / "cutlist.json")


def transit_f02(ledger):
    """F02 → F03/IN, F04/IN + public/ des deux preview/render (+ logo)."""
    f02 = FRIGATE_PATHS["F02"]
    ok = True
    clips = list((f02 / "OUT" / "clips").glob("*.mp4"))
    for target in (FRIGATE_PATHS["F03"], FRIGATE_PATHS["F04"]):
        for clip in clips:
            ok = copy_artefact(clip, target / "IN" / "clips" / clip.name) and ok
        ok = copy_artefact(f02 / "OUT" / "codex.json", target / "IN" / "codex.json") and ok
        ok = copy_artefact(f02 / "OUT" / "f02_manifest.json", target / "IN" / "f02_manifest.json") and ok
        # public/ pour la preview (F03) et le render (F04)
        for clip in clips:
            ok = copy_artefact(clip, target / "CODEBASE" / "public" / clip.name) and ok
        ok = copy_artefact(f02 / "OUT" / "codex.json", target / "CODEBASE" / "public" / "codex.json") and ok
        if LOGO_SOURCE.exists():
            ok = copy_artefact(LOGO_SOURCE, target / "CODEBASE" / "public" / "logo.png") and ok
    return ok


def transit_f03(ledger):
    """Porte III : le codex validé par le Magos repart vers F04 (render)."""
    f03, f04 = FRIGATE_PATHS["F03"], FRIGATE_PATHS["F04"]
    validated = f03 / "CODEBASE" / "public" / "codex.json"
    if not validated.exists():
        log_err("codex.json validé introuvable — exporte-le depuis la preview F03 "
                "(bouton ⬇ dans public/)")
        return False
    data = json.loads(validated.read_text(encoding="utf-8"))
    if not data.get("validated_by_magos"):
        log_err("codex.json non validé (validated_by_magos false) — "
                "clique 'Valider le montage' puis exporte")
        return False
    return all([
        copy_artefact(validated, f03 / "OUT" / "codex.json"),
        copy_artefact(validated, f04 / "IN" / "codex.json"),
        copy_artefact(validated, f04 / "CODEBASE" / "public" / "codex.json"),
    ])


def transit_f04(ledger):
    """Copie tous les *_finale.mp4 → F05/IN."""
    f04, f05 = FRIGATE_PATHS["F04"], FRIGATE_PATHS["F05"]
    finals = list((f04 / "OUT").glob("*_finale.mp4"))
    if not finals:
        log_err("Aucun *_finale.mp4 dans F04/OUT")
        return False
    ok = True
    for f in finals:
        ok = copy_artefact(f, f05 / "IN" / f.name) and ok
    return ok


def transit_f05(ledger):
    """Copie tous les *_youtube.mp4 → F06/IN."""
    f05, f06 = FRIGATE_PATHS["F05"], FRIGATE_PATHS["F06"]
    vids = list((f05 / "OUT").glob("*_youtube.mp4"))
    if not vids:
        log_err("Aucun *_youtube.mp4 dans F05/OUT")
        return False
    ok = True
    for f in vids:
        ok = copy_artefact(f, f06 / "IN" / f.name) and ok
    return ok


def transit_f06(ledger):
    """Copie tous les *_clean.mp4 → SHARED/OUT."""
    f06 = FRIGATE_PATHS["F06"]
    vids = list((f06 / "OUT").glob("*_clean.mp4"))
    if not vids:
        log_err("Aucun *_clean.mp4 dans F06/OUT")
        return False
    ok = True
    for f in vids:
        ok = copy_artefact(f, SHARED_OUT / f.name) and ok
    return ok


TRANSITS = {
    "F00": transit_f00, "F01": transit_f01, "F02": transit_f02,
    "F03": transit_f03, "F04": transit_f04, "F05": transit_f05, "F06": transit_f06,
}


# ─── EXÉCUTION DES FRÉGATES ──────────────────────────────────────────────────

def run_f00(ledger):
    brief = ledger["brief"]
    f00 = FRIGATE_PATHS["F00"]
    script = f00 / "CODEBASE" / "lac_f00_ingest.py"
    cmd = [sys.executable, str(script), "--output", str(f00 / "OUT")]
    if brief.get("source_type") == "youtube":
        cmd += ["--url", brief["source"]]
    else:
        cmd += ["--file", brief["source"]]
    return run_cli(cmd)


def run_f01(ledger):
    brief = ledger["brief"]
    f01 = FRIGATE_PATHS["F01"]
    script = f01 / "CODEBASE" / "lac_f01_select.py"
    brief_txt = " | ".join(
        [v for v in (brief.get("sujet"), brief.get("vibe"), brief.get("title")) if v]
    )
    cmd = [
        sys.executable, str(script), "--oracle",
        "--input", str(f01 / "IN"), "--output", str(f01 / "OUT"),
        "--sequences", str(brief.get("sequences", 2)),
        "--min-dur", str(brief.get("min_dur", 3.0)),
        "--max-dur", str(brief.get("max_dur", 10.0)),
    ]
    if brief_txt:
        cmd += ["--brief", brief_txt]
    if brief.get("model"):
        cmd += ["--model", brief["model"]]
    return run_cli(cmd)


def run_f02(ledger):
    brief = ledger["brief"]
    f02 = FRIGATE_PATHS["F02"]
    script = f02 / "CODEBASE" / "lac_f02_format.py"
    cmd = [
        sys.executable, str(script),
        "--input", str(f02 / "IN"), "--output", str(f02 / "OUT"),
        "--profile", brief.get("profile", "blur-pad"),
        "--preset", brief.get("preset", "punchy"),
    ]
    if brief.get("title"):
        cmd += ["--title", brief["title"]]
    return run_cli(cmd)


def run_f04(ledger):
    f04 = FRIGATE_PATHS["F04"]
    codebase = f04 / "CODEBASE"
    # Sync codexData.js depuis le codex validé (multi-clips) — Root.jsx importe statiquement
    codex_path = f04 / "IN" / "codex.json"
    if not codex_path.exists():
        log_err(f"codex.json introuvable : {codex_path}")
        return False
    import json as _json
    data = _json.loads(codex_path.read_text(encoding="utf-8"))
    (codebase / "src" / "codexData.js").write_text(
        "export const codex = " + _json.dumps(data, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8")
    clips = data.get("clips") or [data]
    ids = [(c.get("id") or c["video"]["source"].replace(".mp4", "")) for c in clips]
    (f04 / "OUT").mkdir(parents=True, exist_ok=True)
    for cid in ids:
        log_ok(f"Render : {cid}")
        if not run_cli(
            ["npm", "run", "render", "--", cid, f"../OUT/{cid}_finale.mp4",
             "--codec", "h264", "--image-format", "jpeg", "--concurrency", "1"],
            cwd=str(codebase)):
            return False
    # CUSTOS F04 check-out exige OUT/codex.json — y déposer le codex validé
    (f04 / "OUT" / "codex.json").write_text(
        _json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return True


def run_f05(ledger):
    f05 = FRIGATE_PATHS["F05"]
    script = f05 / "CODEBASE" / "lac_f05_camouflage.py"
    cmd = [sys.executable, str(script), "--input", str(f05 / "IN"), "--output", str(f05 / "OUT")]
    return run_cli(cmd)


def run_f06(ledger):
    f06 = FRIGATE_PATHS["F06"]
    script = f06 / "CODEBASE" / "lac_f06_luther.py"
    cmd = [sys.executable, str(script), "--input", str(f06 / "IN"), "--output", str(f06 / "OUT")]
    return run_cli(cmd)


RUNNERS = {"F00": run_f00, "F01": run_f01, "F02": run_f02, "F04": run_f04, "F05": run_f05, "F06": run_f06}


# ─── COMMANDES ───────────────────────────────────────────────────────────────

def cmd_init(args):
    ledger = load_ledger()
    if not args.source:
        log_err("--source requis (URL YouTube ou chemin fichier local)")
        sys.exit(1)
    ledger["brief"] = {
        "source": args.source,
        "source_type": "youtube" if args.source.startswith("http") else "file",
        "title": args.title or "",
        "sujet": args.sujet or "",
        "vibe": args.vibe or "",
        "sequences": args.sequences,
        "min_dur": args.min_dur,
        "max_dur": args.max_dur,
        "profile": args.profile,
        "preset": args.preset,
        "model": args.model,
    }
    sign_gate(ledger, "gate1_brief")
    save_ledger(ledger)
    section("PORTE I FRANCHIE — BRIEF")
    for k, v in ledger["brief"].items():
        log_ok(f"{k} : {v}")
    log_gate("II CUTLIST — LAC_RUN.py run puis gate --cutlist")


def cmd_gate(args):
    ledger = load_ledger()
    if ledger["brief"] is None:
        log_err("Pas de brief — lance d'abord : LAC_RUN.py init ...")
        sys.exit(1)
    if args.cutlist:
        section("PORTE II — CUTLIST")
        if not custos("F01", "check-out"):
            sys.exit(1)
        if not transit_f01(ledger):
            sys.exit(1)
        if not custos("F02", "check-in"):
            sys.exit(1)
        sign_gate(ledger, "gate2_cutlist")
        mark(ledger, "F01", "validated", custos="check-out")
        save_ledger(ledger)
        log_gate("III MONTAGE — LAC_RUN.py run (F02) puis preview F03, gate --codex")
    elif args.codex:
        section("PORTE III — MONTAGE")
        if not transit_f03(ledger):
            sys.exit(1)
        if not custos("F03", "check-out"):
            sys.exit(1)
        sign_gate(ledger, "gate3_codex")
        mark(ledger, "F03", "validated", custos="check-out")
        save_ledger(ledger)
        log_gate("IV PUBLICATION — LAC_RUN.py run (F04→F05) puis gate --publish")
    elif args.publish:
        section("PORTE IV — PUBLICATION")
        if not custos("F05", "check-out"):
            sys.exit(1)
        sign_gate(ledger, "gate4_publish")
        mark(ledger, "F05", "validated", custos="check-out")
        save_ledger(ledger)
        log_ok("Publication approuvée — LAC_RUN.py run pour F06 LUTHER")
    else:
        log_err("Précise la porte : --cutlist | --codex | --publish")
        sys.exit(1)


def cmd_run(args):
    ledger = load_ledger()
    if ledger["brief"] is None or not ledger["gates"]["gate1_brief"]["signed"]:
        log_gate("I BRIEF")
        log_err("Porte I ouverte — écris le brief :")
        log_err('  python LAC_RUN.py init --source "URL|fichier" --title "..." --sujet "..."')
        sys.exit(1)

    for frigate in RUN_ORDER:
        if ledger["frigates"][frigate]["status"] in ("done", "validated"):
            continue
        gate_after = GATE_AFTER.get(frigate)
        if gate_after and gate_open(ledger, gate_after):
            log_gate(f"{gate_after.upper()} — frégate {frigate} en attente du Champion")
            log_err(f"Commande : LAC_RUN.py gate --{gate_after.split('_')[1]}")
            sys.exit(0)

        section(f"FRÉGATE {frigate}")
        if not RUNNERS[frigate](ledger):
            log_err(f"{frigate} a échoué — corrige puis relance LAC_RUN.py run")
            sys.exit(1)
        if not custos(frigate, "check-out"):
            log_err(f"{frigate} : verdict CUSTOS négatif — le transit est refusé")
            sys.exit(1)
        if not TRANSITS[frigate](ledger):
            log_err(f"{frigate} : transit échoué")
            sys.exit(1)
        mark(ledger, frigate, "done", custos="check-out")
        save_ledger(ledger)
        log_ok(f"{frigate} scellée — output validé et transité")

    section("FIN DE CHAÎNE")
    if ledger["frigates"]["F06"]["status"] == "done":
        log_ok("Pipeline complet — clean_final.mp4 dans SHARED/OUT/")
    else:
        remaining = [g for g, v in ledger["gates"].items() if not v["signed"]]
        log_gate(f"Portes restantes : {', '.join(remaining)}")


def cmd_status(args):
    ledger = load_ledger()
    section("LACRIMAE — ÉTAT DU LEDGER")
    if ledger["brief"]:
        b = ledger["brief"]
        print(f"  Source   : {b['source_type']} — {b['source']}")
        print(f"  Titre    : {b.get('title') or '—'}")
        print(f"  Sujet    : {b.get('sujet') or '—'}")
        print(f"  Profil   : {b.get('profile')} | {b.get('sequences')} séq. "
              f"{b.get('min_dur')}-{b.get('max_dur')}s | preset {b.get('preset')}")
    else:
        print("  Brief    : AUCUN")
    print()
    for gate in ["gate1_brief", "gate2_cutlist", "gate3_codex", "gate4_publish"]:
        g = ledger["gates"][gate]
        label = gate.upper().replace("_", " ")
        print(f"  {'✓' if g['signed'] else '○'} {label}" + (f"  ({g['at']})" if g['signed'] else ""))
    print()
    for frigate in ["F00", "F01", "F02", "F03", "F04", "F05", "F06"]:
        f = ledger["frigates"][frigate]
        state = {"pending": "◦ en attente", "done": "✓ scellée", "validated": "✓ validée"}.get(
            f["status"], f["status"])
        extra = f" (custos {f['custos']})" if f["custos"] else ""
        print(f"  {frigate} {state}{extra}")


def cmd_reset(args):
    ledger = load_ledger()
    if args.full:
        LEDGER_PATH.unlink(missing_ok=True)
        print("[LAC_RUN] Ledger supprimé — reprise à zéro.")
        return
    for f in ledger["frigates"]:
        ledger["frigates"][f] = {"status": "pending", "at": None, "custos": None}
    for g in ledger["gates"]:
        ledger["gates"][g] = {"signed": False, "at": None}
    save_ledger(ledger)
    print("[LAC_RUN] Frégates + portes remises à pending (brief conservé).")


def main():
    parser = argparse.ArgumentParser(
        description="LAC_RUN — Orchestrateur LACRIMAE (Rubicon Primaris)"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_init = sub.add_parser("init", help="Porte I — écrire le brief")
    p_init.add_argument("--source", required=True, help="URL YouTube ou fichier local")
    p_init.add_argument("--title", default="", help="Titre de la production")
    p_init.add_argument("--sujet", default="", help="Sujet / contexte (brief oracle)")
    p_init.add_argument("--vibe", default="", help="Vibe / tonalité souhaitée")
    p_init.add_argument("--sequences", type=int, default=2)
    p_init.add_argument("--min-dur", type=float, default=3.0)
    p_init.add_argument("--max-dur", type=float, default=10.0)
    p_init.add_argument("--profile", default="blur-pad", choices=["blur-pad", "reframe"])
    p_init.add_argument("--preset", default="punchy")
    p_init.add_argument("--model", default=None, help="Modèle vision OpenRouter (override)")

    p_run = sub.add_parser("run", help="Exécuter jusqu'à la prochaine porte")
    p_run.set_defaults(func=cmd_run)

    p_gate = sub.add_parser("gate", help="Franchir une porte")
    p_gate.add_argument("--cutlist", action="store_true")
    p_gate.add_argument("--codex", action="store_true")
    p_gate.add_argument("--publish", action="store_true")
    p_gate.set_defaults(func=cmd_gate)

    p_status = sub.add_parser("status", help="État du ledger")
    p_status.set_defaults(func=cmd_status)

    p_reset = sub.add_parser("reset", help="Reset (frégates/portes, ou --full)")
    p_reset.add_argument("--full", action="store_true")
    p_reset.set_defaults(func=cmd_reset)

    args = parser.parse_args()
    if args.command == "init":
        cmd_init(args)
    else:
        args.func(args)


if __name__ == "__main__":
    main()
