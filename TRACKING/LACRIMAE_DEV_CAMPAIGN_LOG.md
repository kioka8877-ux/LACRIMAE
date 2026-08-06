# LACRIMAE — DEV : CARNET DE CAMPAGNE (branche dev)
> *"La transformation ne s'arrête jamais."*

## ÉTAT DE LA FLOTTE DEV

| Frégate | Nom | Statut | Date |
|---------|-----|--------|------|
| F00 | INGEST | 🟢 FORGÉE | 2026-08-03 |
| F01 | SELECT | 🟡 EN FORGE | 2026-08-03 |
| F02 | FORMAT | 🟡 EN FORGE | 2026-08-03 |
| F03 | PREVIEW | 🟢 PILLÉE (OMNIS F02_PREVIEW) | 2026-08-03 |
| F04 | RENDER | 🟢 PILLÉE (OMNIS F03A_REMOTION) | 2026-08-03 |
| F05 | CAMOUFLAGE | 🟢 PILLÉE (OMNIS F04) | 2026-08-03 |
| F06 | LUTHER | 🟢 PILLÉE (OMNIS F05) | 2026-08-03 |
| — | LAC_CUSTOS | 🟢 ADAPTÉ | 2026-08-03 |

**Légende :** ⚪ En attente | 🟡 En forge | 🔵 En test | 🟢 SCELLÉE | 🔴 BLOQUÉE

## FIL D'ARIANE

| Date | Frégate | Phase | Action | Validation |
|------|---------|-------|--------|------------|
| 2026-08-03 | FLOTTE | DEV | Branche dev créée — pipeline transformé (meme 9:16) | ✅ |
| 2026-08-03 | F00 | FORGE | INGEST pillé d'OMNIS delta F00 — yt-dlp/fichier | ✅ |
| 2026-08-03 | F01 | FORGE | SELECT vision OpenRouter — ZÉRO transcript (stars/foot) | 🔵 à tester |
| 2026-08-03 | F02 | FORGE | FORMAT blur-pad optimisé (160px→boxblur→upscale) + reframe + template codex | 🔵 à tester |
| 2026-08-03 | F03 | FORGE | PREVIEW pillée d'OMNIS beta F02_PREVIEW — **logo + coup brutal + volume intégrés (OmniComposition + App.jsx)** | 🔵 à tester |
| 2026-08-03 | F04 | FORGE | RENDER pillé d'OMNIS beta F03A_REMOTION — **logo + titre + coup brutal + Audio intégrés, codexData = template F02, Root aligné** | 🔵 à tester |
| 2026-08-03 | F05 | FORGE | rapport → `rapport_f05.html` | ✅ |
| 2026-08-03 | FLOTTE | DEV | **Commit `0291931` + push `origin/dev`** | ✅ |
| 2026-08-03 | RUBICON | DOCTRINE | **LAC_RUN.py orchestrateur (Exécuteur) + 4 portes + ledger** — CUSTOS gardien à chaque output, greffes brief→oracle F01 / titre+preset→codex F02, fallback ffprobe F00, UTF-8 Windows | ✅ commit `c5ba23a` |
| 2026-08-03 | RUBICON | GHA | **GitHub Actions — `lacrimae_orchestrator.yml`** (pattern OMNIS delta : un run par gate G1-G5/CLOSE, workflow_dispatch, transits par artifacts + `_tools/download_artifact.py`, ledger commité `TRACKING/LACRIMAE_LEDGER.json`, codex éditable via UI GitHub, sync codexData.js avant render) | ✅ à tester |
| 2026-08-03 | FLOTTE | MULTI-CLIPS | **Codex multi-clips (jusqu'à 5 Shorts par vidéo longue)** — un block de réglages par clip (titre/volume/couleurs), Root.jsx = 1 Composition par clip, F04 rend N `clip_00X_finale.mp4`, F05/F06 bouclent sur les N clips, CUSTOS patterns `*.mp4`, preview F03 sur clip 1, LAC_RUN transits multi-fichiers | ✅ à tester |
| 2026-08-03 | CUSTOS | FORGE | Manifeste 7 frégates + validations JSON (cutlist, codex, manifest) | ✅ |
| 2026-08-05 | RUBICON | AUDIT | **Audit production avant run réel — 4 bugs bloquants corrigés** : workflow YAML invalide (python en colonne 1 → heredocs indentés, parse OK + bash -n 0 fail), IN/ cutlist+codex gitignorés → commitables (médias volumineux ignorés), codex.json copié vers OUT/ F04 pour CUSTOS check-out (GHA + LAC_RUN), Dockerfile F04 rend le 1er clip (id codex) | ✅ commit `5850695` |
| 2026-08-05 | RUBICON | DESIGN | **Design 2 modes figé — `TRACKING/LACRIMAE_DEUX_MODES_DESIGN.md`** : mode libre (existant) + mode forge Perturabo (bridge → production_pack_logo.json → Gate 1 CUSTOS → mapping pack→codex), stack 6 calques (background → clip → titre → paragraphe → logo → presets global), fond PNG façon CRUSADER F03 (cover+scale+fallback couleur), blur-pad/reframe conservés + 3ᵉ profil `background` ajouté, clipping normal/timing JSON hors scope v1, plan d'implémentation 5 phases | ✅ |
| 2026-08-05 | RUBICON | FORGE | **Les 2 modes CODÉS (phases 0-5)** : codex v4.0 (bloc `session` + clips, textes titre/paragraphe), OmniComposition 6 calques (F03+F04) avec fond PNG façon CRUSADER + presets global sur toute la scène, preview F03 tout ajustable (menu déroulant fonds `public/backgrounds/` + manifest.json, taille logo, mode texte titre/titre+paragraphe), F02 profil `background`, **BRIDGE_PERTURABO/lac_bridge_forge.py** (Gate 1 : pack + vidéo locale + fond + logo → cutlist + codex forge v4), LAC_RUN commande `forge`, GHA input `mode` libre/forge + G2 bridge | 🔵 à tester |
| 2026-08-05 | RUBICON | TEST | **Bridge testé sur pack réel Sandoval** : 5 vidéos, cuts validés (12-47s…), mapping title/viral_paragraph/on_screen_text → texts, codex forge v4 (mode=forge, session.background=fond.png), CUSTOS F02 check-out v4.0 OK, esbuild JSX F03/F04 OK, YAML OK, py_compile OK | 🔵 à tester en réel |
| 2026-08-05 | RUBICON | FIX | **3 bugs bloquants corrigés avant run réel** : (1) GHA G3 passait `--texts '$TEXTS_ARG'` (word-splitting JSON → textes perdus) remplacé par `--forge-codex` + commit du codex bridge à G2 (persistance inter-run) + re-transit fond/logo à G4 (public/ gitignoré) ; (2) F02 écrivait un codex avec session par défaut (fond PNG perdu) → `--forge-codex` préserve session/forge du bridge, LAC_RUN le passe automatiquement ; (3) `str(clip["index"])` — les textes du pack n'étaient pas appliqués aux clips (clé int vs string) ; + CUSTOS BRIDGE n'exige plus validated_by_magos (template pré-Porte III) ; + LAC_RUN run_bridge passe `pack_mode` (et non `mode=forge`) au bridge | ✅ testé (pack synthétique 2 vidéos + flux LAC_RUN forge complet) |
| 2026-08-05 | RUBICON | ORACLE | **L'ORACLE EST AUTONOME — `LAC_RUN.py forge` sans `--pack`** : le bridge va chercher le pack **seul** dans PERTURABO/EXPORT (API GitHub stdlib, `--pack-filter` optionnel, préférence au nom reflétant le mode) et ne prend **QUE** `production_pack_*.json` (ni zip, ni vidéo, ni PNG) ; vidéo + PNG = opérateur : fonds `SHARED/IN/backgrounds/` + logo `SHARED/IN/logos/logo.png` (faits une fois pour toutes, transités par le bridge vers F03/F04 + manifest.json, re-transités à G4) ; GHA G2 forge en auto-fetch (pack auto-récupéré commité) | ✅ testé (vrai pack Sandoval : auto-fetch, 5 vidéos, session préservée par F02, CUSTOS BRIDGE check-out ✓) |
| 2026-08-05 | RUBICON | TEST | **Test Oracle gates sautées + sans vidéo** : bridge lancé **directement** (pas de LAC_RUN/gate/CUSTOS) avec une **vidéo placeholder** (retirée après test) — auto-récupération du pack `production_pack_logo.json` (Sandoval, 5 vidéos), Gate 1 validé, cutlist + codex forge v4.0 écrits (session + 5 clips avec texts du pack title+paragraph), transits F02/F03/F04 OK, manifest régénéré à vide après nettoyage des placeholders | ✅ |
| 2026-08-05 | RUBICON | PAGES | **Preview F03 publiée sur GitHub Pages** — workflow `preview_pages.yml` (build Vite + deploy Pages, déclencheurs : manuel / workflow_run après l'orchestrateur / push sur IN+SHARED+src), clip preview tracké `F03_PREVIEW/IN/clips/clip_001.mp4` (négation gitignore — le SEUL clip de la preview), transit_f02 le copie automatiquement, public/ régénéré à chaque build (codex IN + clip + fonds + logo + manifest) | ✅ config — deploy à activer (Settings → Pages → GitHub Actions) |
| 2026-08-06 | RUBICON | PAGES | Pages **activé** par le Champion (Source = GitHub Actions, build_type workflow, URL `https://kioka8877-ux.github.io/LACRIMAE/`) — 1er run push échoué (Pages pas encore activé), 2e run échoué (protection env `github-pages` : seul `main` autorisé) → **`dev` ajouté aux branches autorisées** via API (policies : main + dev), workflow passé en `npm ci` (lockfile commité) | ✅ prêt — reste à lancer le workflow |
| 2026-08-06 | RUBICON | ASSETS | **Fonds PNG importés depuis CRUSADER** (gamma/F03_SIGISMUND/CODEBASE/public, repo public) vers `SHARED/IN/backgrounds/` — 7 fonds : bg_grid_dark, bg_paper_crumpled, bg_paper_new, bg_papyrus_old, bg_solid_blue, custom_storm_001, custom_storm_002 (~12 Mo, PNG vérifiés) — menu déroulant « FOND » de la preview alimenté, déploiement Pages déclenché au push | ✅ |
| 2026-08-06 | RUBICON | ASSETS | **La vidéo source se dépose DIRECTEMENT dans `SHARED/IN/`** (pas de sous-dossier `videos/`) — `SHARED/IN/video_source.mp4` : bridge lit ce chemin par défaut (repli `BRIDGE_PERTURABO/IN/` conservé), G1 Ingest accepte la vidéo depuis `SHARED/IN/`, gitignorée (média volumineux max ~200 Mo), `SHARED/IN/README.md` créé + README backgrounds mis à jour | ✅ commit + push |
| 2026-08-06 | RUBICON | MEDIA | **Vidéos > 100 Mo → GitHub Releases** (git refuse > 100 Mo push / > 25 Mo web) — `_tools/lac_release_video.sh` (upload opérateur : vidéo → asset `video_source.mp4` d'une release, 2 Go max/asset, gratuit repo public) + `_tools/download_release_video.py` (télécharge l'asset, dernière release ou tag via input `release_tag`) + G1 Ingest fallback : URL → SHARED/IN → Release, docs mises à jour | ✅ commit + push |
| 2026-08-06 | RUBICON | MEDIA | **Goulot artifacts cassé — vidéos jusqu'à 1 Go OK** : les artifacts GHA = 500 Mo de stockage total/repo (plan gratuit, rétention 90 j) → la vidéo ne transite PLUS jamais par artifact. G1 n'upload l'artifact `lac-video` que si < 400 Mo (garde-fou quota), G2/G3 re-téléchargent depuis la **Release** en priorité (repli artifact) — la Release est la source de vérité vidéo, chaque porte la re-fetch | ✅ commit + push |

## DÉCISIONS DE FORGE

- Sélection par **vision OpenRouter** (modèle gratuit par défaut), pas de transcript.
- Blur-pad : fond = dupliqué flouté **+ assombri + désaturé**, blur fait sur
  downscale 160px (rapidité) — correction de l'ancien test où tout était flou.
- Trois profils F02 : `blur-pad` (défaut) / `reframe` (crop central) / `background`
  (découpe seule — mode forge, mise en page dans la compo Remotion).
- Titre statique (fade_in) en zone safe, logo en calque permanent, coup brutal
  toutes les 3s (90 frames), volume seul réglage audio.
- PAS de SFX, PAS de sous-titres, PAS de voix off.

## PROCHAINES ÉTAPES (test réel)

- [ ] **Mode libre** : configurer secret GitHub `ORACLE_API_KEY` (+ vars `ORACLE_MODEL`/`ORACLE_BASE_URL`), commiter `SHARED/IN/logos/logo.png`, run G1 → G5
- [ ] **Mode forge** : déposer les PNG une fois pour toutes (`SHARED/IN/backgrounds/` + `SHARED/IN/logos/logo.png`), la vidéo **dans `SHARED/IN/video_source.mp4`** si < 100 Mo — sinon `sh _tools/lac_release_video.sh <video.mp4> [tag]` (Release GitHub, G1 la télécharge) — puis run G2 (mode=forge) — **l'Oracle va chercher le pack SEUL dans PERTURABO/EXPORT** → G5
- [ ] Valider le flux complet jusqu'à `lac-clean` (clean_final.mp4)
- [x] **Preview en ligne** : Pages activé (Source = GitHub Actions) + branche `dev` autorisée sur l'environnement `github-pages` — **reste** : lancer le workflow "LACRIMAE Preview Pages" (manuel, ou auto au prochain push PNG/clip) — URL : `https://kioka8877-ux.github.io/LACRIMAE/`
