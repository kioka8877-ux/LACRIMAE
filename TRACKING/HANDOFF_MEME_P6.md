# LACRIMAE — HANDOFF MODE MEME (P6 GHA) — reprise par un autre chat

> Note de continuation. Session 2026-08-17 TERMINÉE : chaîne meme réelle ALLER-RETOUR
> COMPLÈTE et validée par l'opérateur. Branche de travail : **`dev3`**.
> Dernier SHA poussé : `04c7427` (git log origin/dev3 pour vérifier).
> CE FICHIER EST LA SOURCE DE VÉRITÉ — relire ce bloc puis les sections utiles avant toute action.

---

## ÉTAT DE PRODUCTION ACTUEL — DOOMSDAY / F02 VALIDÉE — 2026-08-18

La production active est le pack `production_pack_meme_marvel_doomsday.json`, récupéré par l’Oracle depuis `kioka8877-ux/PERTURABO` (`MONDES_FORGES/CLIPPING/EXPORT`). Pack ID : `LOGO-SIEGE-siege_20260818_134224`. Le pack est en `sub_mode: meme`, contient 8 angles A01-A08 et fixe chaque durée à 6 secondes.

Le **gate F00 / Bridge** est validé : contrat MEME présent, pack conforme, `f01_skipped: true`, codex meme v4.1 généré, et références `meme_002` / `meme_003` trouvées dans la méméthèque. Le **gate F02 check-in** puis le **gate F02 check-out** sont validés. F02 a réellement produit 8 clips `clip_001.mp4` à `clip_008.mp4` et `F02_FORMAT/OUT/f02_manifest.json`.

La production est volontairement arrêtée avant la preview F03. **Aucun F03, F04, F05, F06 ou CLOSE n’a été lancé pour ce pack.** La prochaine étape autorisée est la preview F03, puis le gate `--codex` sous validation du Champion.

Fichiers de vérité produits : `BRIDGE_PERTURABO/OUT/bridge_report.json`, `BRIDGE_PERTURABO/OUT/codex.json`, `F02_FORMAT/OUT/f02_manifest.json`, `F02_FORMAT/OUT/codex.json` et `TRACKING/LACRIMAE_LEDGER.json`.

---

## ✅ ÉTAT FINAL (2026-08-17, fin de session) — CHAÎNE MEME COMPLÈTE VALIDÉE

### OÙ ON EST (tout est terminé et validé)
- Chaîne meme réelle : F01 ✅ → F02 ✅ → **F04 RENDER ✅** → **F05 CAMOUFLAGE ✅** →
  **F06 LUTHER ✅** → **CLOSE ✅**. Toutes les portes validées par l'opérateur.
- **Livrables finaux** : artifact `lac-clean` (5 clips `clip_001..005_finale_youtube_clean.mp4`,
  ~4,5-5,7 Mo chacun) + artifact `lac-video-finale` (rendus F04).
- Le fix « clip 1 = MAÎTRE » (tailles tweet/émotion propagées à TOUS les clips) est
  **implémenté, pushé et re-validé** via un re-rendu F04 complet (les 5 clips ressortent
  avec les réglages du clip 1 : taille émotion 100px, position 92%, tweet 51px).

### COMMITS À CONNAÎTRE (dev3, ordre chronologique)
1. `9fe7bb0` — **fix(F04) police Anton via staticFile au runtime** : webpack ne résout pas
   `url('/fonts/…')` du `fonts.css` au bundle → injection `@font-face` via `staticFile()`
   (`src/fonts.js`) + attente chargement police (`delayRender`). `fonts.css` vidé.
2. `2cb2ed2` + `c9fca63` — **fix(F04) téléchargement clips** : les `503` transitoires de
   l'API artifacts GitHub sur `archive_download_url` → `download_artifact.py` retravaillé
   (mode `find`, 8 retries + backoff exponentiel borné 60s). `download-artifact@v4` avec
   `run-id` a été testé mais ne trouve pas les artifacts d'autres runs → on reste sur le
   script python (testé : extraction 5 clips OK).
3. `dd492a6` — **fix(meme) clip 1 = MAÎTRE** : tout réglage de style validé sur le clip 1
   (taille tweet/émotion, position, hauteur meme) se répercute à l'identique sur les clips
   2-5. 3 volets :
   - codex `F03_PREVIEW/IN/codex.json` normalisé (les 4 params de style copiés clips 1→2-5) ;
   - rendu : `Root.jsx` passe `masterClip=clips[0]`, `MemeComposition` (F04 + F03 preview)
     tombe sur `masterClip` AVANT les défauts (`clip.X ?? masterClip.X ?? défaut`) ;
   - prévention : `exportCodex` dans `F03_PREVIEW/CODEBASE/src/App.jsx` propage les réglages
     de style du clip édité à TOUS les clips à l'export → plus de codex divergent possible.

### POUR LA PROCHAINE SESSION
- La chaîne meme student debt est BOUCLÉE (pack `LOGO-SIEGE-siege_20260815_195037`,
  sub_mode meme, 5 clips). Rien à relancer.
- Le pack ORIGINAL chez Perturabo (`kioka8877-ux/PERTURABO`, `MONDES_FORGES/CLIPPING/EXPORT`,
  `production_pack_meme_student_debt.json`) n'a **PAS** de champ `metadata` (pas de
  description/tags) — les descriptions venaient du pack local transformé (tronquées).
  Durée réelle dans l'original : **8s** (le pack local transformé dit 6s) → à surveiller
  si le bridge re-lit l'original.
- Mémo de travail : une frégate à la fois, jamais sans feu vert opérateur ; le suivi des
  runs se fait par l'OPÉRATEUR (lien du run donné, pas de surveillance automatique).

---

## ⚡ RAPPEL CHRONOLOGIE RUN MEME RÉEL (F01✅ F02✅ → F04 en cours)

## ⚡ RAPPEL CHRONOLOGIE RUN MEME RÉEL (F01✅ F02✅ → F04 en cours)

- **CODEX23 VALIDÉ** : l'opérateur a exporté le codex final dans la Release
  `codex23` (asset `codex.3.json`) et l'a ajusté dans la preview (clip 1 :
  `text_emotion: "This Actually Hurts :"`, position 92%, taille 100px — CHOIX
  OPÉRATEUR, ne pas toucher). `validated_by_magos` passé à **true** (Porte III
  franchie) et installé dans `F03_PREVIEW/IN/codex.json` (source de vérité F04).
  Blocs **`sig`** (SIGNE : bg_motion, mirror, cam_drift, text_anim, flash, grain)
  injectés de façon déterministe (sel `LACRIMAE-SIGNE-v1|pack_id`) — identiques
  à ceux que F04b régénérera (même sel).
- **F04 RENDER** : run `32047911817` → **SUCCÈS** (5 clips rendus
  `clip_001..005_finale.mp4`, ~6.5 Mo chacun). Bug fixé au passage : le workflow
  appelait Remotion avec `clip_001` (underscores) alors que les IDs de
  composition sont en tirets (`clip-001`) → fix dans
  `lacrimae_orchestrator.yml` (ligne ~536-556) qui sépare `RAW` (nom fichier,
  underscores) de `CID` (composition, tirets).
- **FIX POLICE (non validé encore)** : le rendu sortait en fallback Arial Black
  car Impact n'existe pas sur le runner Linux. Police **Anton** (Impact-like,
  licence OFL) embarquée dans `SHARED/IN/fonts/Anton-Regular.ttf`, chargée via
  `@font-face` (`src/fonts.css`) dans F03+F04, pile de polices `Anton, Impact,
  Arial Black, sans-serif` quand Impact est demandé. Le workflow copie la police
  vers `public/fonts/` des deux projets. Commit `61a9329`. **PORTE IV non
  validée — attend la revalidation du clip 1 par l'opérateur.**
- **Preview F03 + miroir SIGNE** : la preview affiche maintenant le mouvement
  de fond (`sig.bg_motion`), le mirror/zoom meme (`sig.mirror`/`cam_drift`) et
  le flash (`sig.flash`) comme F04 render — vérifié esbuild.

- **Pack conforme** : `BRIDGE_PERTURABO/IN/production_pack_meme_student_debt.json`
  transformé au format contrat (commit `1436b8d`) : `montage_guide_ref` ajouté,
  `tweet_text`→`tweet.text`, `reaction_text`→`text_emotion`, `meme` affecté
  (A01-A03→meme_001, A04-A05→meme_002), `duration_sec: 6`. Bridge dry-run : 0 erreur.
- **F01 FORGE validé** (run `32015947432`, Porte II ✓) — bridge écrit
  `BRIDGE_PERTURABO/OUT/codex.json` (codex meme v4.1, 5 clips) + `bridge_report.json`
  (`sub_mode: meme`, `profile_f02: meme`, `f01_skipped: true`).
- **F02 FORGE validé** (run `32016600916`, Porte III ✓) — 5 clips stagés/formatés
  (`F02_FORMAT/OUT/clips/clip_001..005.mp4`), `F03_PREVIEW/IN/codex.json` + manifest
  committés, codex meme = clip_001-003→meme_001, clip_004-005→meme_002.
- **Preview F03 améliorée** (commit en cours) : panneau meme enrichi —
  taille textes tweet (`tweet.text_size`, défaut 17px, curseur 12-30),
  position texte émotion haut→bas (`clip.text_emotion_position_pct`, défaut 43,
  curseur 10-80), taille texte émotion (`clip.text_emotion_size`, défaut 40,
  curseur 20-80), hauteur du meme (`clip.meme.height_pct`, défaut 48, curseur 30-75).
  Les 2 miroirs (F03 preview `MemeComposition.jsx` + F04 render) sont synchronisés.
- **F00B/cuts.txt** : réinitialisé (plus de coupe active) — poser la coupe de la prochaine
  vidéo source avant un harvest.

---

## ⚡ MISE À JOUR (2026-08-17) — reprise d'URGENCE, chat suivant

- **F00B « RÉCOLTE DES MEMES » opérationnelle** (workflow `f00b-harvest.yml`, 2 phases).
  Fix important `bf360b2` : en déclenchement par push, `${{ inputs.cuts_file }}` est VIDE
  → le workflow définit par défaut `F00B/cuts.txt` (sinon `--cuts` sans argument, exit 2).
- **Méméthèque RÉELLE** (`SHARED/memes/`, placeholders de test archivés dans `_retired/`) :
  - `meme_001` = Fallen Knight (release `m4`, coupe 2s→7s) — publish `f013df3`
  - `meme_002` = NO IT CAN'T BE (release `m5`, coupe 0s→7s) — publish `5b7e80b`
  - `meme_003` = John Cena sad (release `m3`, déjà coupé, posé directement) — `16ff6a3`
  - Flush : les release GitHub m1-m5 ont chacune une vidéo source taguée ; pour un
    run F00B, l'asset DOIT s'appeler `video_source.mp4` dans la release (sinon le
    pipeline ne le trouve pas).
- **BLOCAGE avant run meme réel** : le pack `BRIDGE_PERTURABO/IN/production_pack_meme_student_debt.json`
  (v2.5) est **NON-CONFORME** au contrat `GUIDE_UTILISATION/05_NOTE_PERTURABO_PACK_MEME.md`.
  `validate_meme_pack` = **15 erreurs** : `videos[].meme` manquant, `videos[].tweet.text`
  manquant (le pack a `tweet_text` string), `videos[].text_emotion` manquant (le pack a
  `emotion`). → **le run serait bloqué au bridge (CUSTOS BRIDGE), F02 ne sortirait rien.**
  Contenu exploitable présent (`tweet_text`, `emotion`, `reaction_text`, `duration_sec_range`
  5-7s). Déblocage : (a) Perturabo refait le pack au format contrat, ou (b) transformation
  locale du pack (mapping tweet_text→tweet.text, emotion→text_emotion, affectation
  A01-A03→meme_001, A04-A05→meme_002).
- **F00B/cuts.txt** : réinitialisé (plus de coupe active) — poser la coupe de la prochaine
  vidéo source avant un harvest.
- Dernier SHA poussé `dev3` : voir la section suivante / `git log origin/dev3`.

---

## 1. OÙ ON EN EST (2026-08-15) — branche `dev3`

| Phase | Contenu | Statut |
|-------|---------|--------|
| P0 | Méméthèque plate `SHARED/memes/meme_XXX.mp4` + `SHARED/memes/README.md` | ✅ poussé (`b7d0a7b`) |
| P1 | Contrat `GUIDE_UTILISATION/04_MODE_MEME.md` (7 calques, format pack `sub_mode: meme`) | ✅ poussé (`b7d0a7b`) |
| P4 | `F04_RENDER/CODEBASE/src/components/MemeComposition.jsx` + `Root.jsx` dispatch meme | ✅ poussé (`b7d0a7b`) |
| P2 | Bridge `lac_bridge_forge.py` : détection `sub_mode: meme`, refus bloquant si contrat absent, validation memes, cards tweet déterministes (5 personas seed pack_id+clip), `codex v4.1` avec `session.watermark`, transits memes → F02/IN + `public/memes/` F03/F04 + manifest.json | ✅ poussé (`2d3e397`) |
| P3 | F02 `lac_f02_format.py` : profil `meme` (staging = copie meme → `clip_00X.mp4`, aucune découpe) | ✅ poussé (`2d3e397`) |
| P5 | Preview F03 : `src/preview/MemeComposition.jsx` (miroir 7 calques) + `App.jsx` onglet MEME (panneaux tweet / émotion / watermark / méméthèque / titre) | ✅ poussé (`2d3e397`) |
| P7 | `LAC_CUSTOS.py` (validations codex meme + manifeste détendu) + `LAC_RUN.py` (profil F02 → meme via bridge_report) | ✅ poussé (`2d3e397`) |
| **P6** | **GHA : orchestrator + f04-render + f05-f06 + preview_pages adaptés au mode meme** | ✅ poussé (`47e4429`) |

Commits sur `dev3` :
- `b7d0a7b` — P0/P1/P4 (meméthèque + contrat + MemeComposition rendu)
- `2d3e397` — P2/P3/P5/P7 (bridge + F02 + preview + CUSTOS)
- `47e4429` — P6 GHA (workflows meme-aware sans casser le mode stars)

Vérifications déjà faites : `py_compile` OK (4 fichiers Python), esbuild OK (2 JSX),
YAML OK (4 workflows), bash -n OK (blocs run), simulation locale meme OK
(bridge sans vidéo → CUSTOS BRIDGE ✓ → F02 detect/stage/format meme → CUSTOS F02 ✓).

---

## 2. P6 GHA — TERMINÉ (à relire avant run de bout en bout)

Fichiers : `.github/workflows/orchestrator.yml`, `f04-render.yml`, `f05-f06.yml`, `preview_pages.yml`.

Objectif : la chaîne GHA doit tourner en mode MEME comme en mode stars, sans casser l'existant.

### 2.1 Staging des memes dans les jobs GHA
- Remplacer/supplémenter la copie `SHARED/IN/*.png` et `backgrounds/` par la copie de `SHARED/memes/*.mp4` quand le pack est `sub_mode: meme`.
- F02 en profil `meme` lit `F02_FORMAT/IN/memes/` (transité par le bridge) et copie vers `F02_FORMAT/OUT/clips/`.
- Les jobs GHA qui posent `public/` (F03 preview, F04 render) doivent aussi poser `public/memes/` (dossier + manifest.json).

### 2.2 Matrix f04-render en mode meme
- `f04-render.yml` : le job `select` liste `clip-001..clip-005` ; en meme c'est pareil (N clips), mais le staging du clip doit prendre `F02_FORMAT/OUT/clips/clip_00X.mp4` (déjà le cas). Vérifier que le codex transité est bien le `codex.json` meme (v4.1).
- Vérifier que `lac_signe.py` (F04b) fonctionne sur le codex meme (bloc `sig` ajouté par clip — rétro-compatible, défauts neutres).

### 2.3 Orchestrator (bridge → F02 en meme)
- `orchestrator.yml` : input frégates `F00`-`F06`/`CLOSE`. En mode forge meme : BRIDGE → F02 (`--profile meme`), pas de cutlist/video source. Adapter la détection (le bridge écrit `BRIDGE_PERTURABO/OUT/bridge_report.json` avec `sub_mode: meme`).

### 2.4 Preview Pages en meme
- `preview_pages.yml` : poser `public/memes/` + `public/backgrounds/` + le codex meme dans `F03_PREVIEW/CODEBASE/public/`.

### 2.5 À vérifier après P6
- esbuild sur les JSX, py_compile sur les Python, puis un run GHA de bout en bout avec un pack `sub_mode: meme` réel.

---

## 3. MÉMÉTHÈQUE RÉELLE + F00B (2026-08-17) — prêt pour le run meme réel

- **F00B « RÉCOLTE DES MEMES » opérationnelle** : workflow `.github/workflows/f00b-harvest.yml`
  (2 phases : harvest artifact → publish après validation opérateur), fix `cuts_file` par défaut
  en push (`bf360b2`). Script : `F00B/CODEBASE/lac_f00b_harvest.py`.
- **Méméthèque non vide** (`SHARED/memes/`, placeholders archivés dans `_retired/`) :
  - `meme_001` = Fallen Knight (release `m4`), coupe 2s→7s — publish `f013df3`
  - `meme_002` = NO IT CAN'T BE (release `m5`), coupe 0s→7s — publish `5b7e80b`
  - `meme_003` = John Cena sad (release `m3`), déjà coupé, posé directement — `16ff6a3`
- **Pack Perturabo** : `BRIDGE_PERTURABO/IN/production_pack_meme_student_debt.json`
  (v2.5, sub_mode meme, 5 angles A01-A05) — commit `c0a6839`.
  ⚠️ **NON-CONFORME au contrat** `05_NOTE_PERTURABO_PACK_MEME.md` : validation bridge
  `validate_meme_pack` = **15 erreurs** (les 5 angles) — `videos[].meme` manquant,
  `videos[].tweet.text` manquant (le pack utilise `tweet_text` en string),
  `videos[].text_emotion` manquant (le pack utilise `emotion`). Le run meme réel
  est donc **BLOQUÉ au bridge (CUSTOS BRIDGE), F02 ne sortirait rien**.
  Contenu utilisable présent : `tweet_text`, `emotion`, `reaction_text` par angle,
  `duration_sec_range: {min:5, max:7}`. Deux options : (a) Perturabo refait le pack
  au format contrat ; (b) transformation locale (mapping tweet_text→tweet.text,
  emotion→text_emotion, affectation A01-A03→meme_001, A04-A05→meme_002).
- **PROCHAINE ÉTAPE** : résoudre le blocage pack (option a ou b), puis lancer la
  chaîne meme réelle (orchestrator/F00→F02→F04 avec le pack student debt v2.5).

---

## 4. RAPPELS CONTEXTE (à relire avant de coder)

- Repo : `kioka8877-ux/LACRIMAE`, branche de travail : **`dev3`**.
- Mode MEME : **aucune découpe** (memes pré-coupés dans `SHARED/memes/`), durée pilotée par le pack (défaut 5-7s), loop net / trim dans la composition, pas de SFX.
- Card tweet : texte = pack, persona/likes/stats = générés par le bridge (seed `LACRIMAE-MEME-v1|pack_id|clip_id`), rendu natif Remotion, zéro réseau.
- Contrat : `GUIDE_UTILISATION/04_MODE_MEME.md`. Méméthèque : `SHARED/memes/README.md`.
- 7 calques (bas→haut) : 1 Background, 2 Tweet, 3 Titre (optionnel), 4 Texte émotion, 5 Meme, 6 Watermark @chaine, 7 Logo.
- Mémo de la session : on code phase par phase, commit + push + rapport, l'utilisateur valide avant de passer à la suite.
- Les workflows GHA existants (orchestrator/f04-render/f05-f06/preview_pages) couvrent le mode stars ; P6 = les rendre compatibles meme SANS casser le mode stars.
