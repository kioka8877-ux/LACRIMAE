# LACRIMAE — HANDOFF AU PROCHAIN DÉVELOPPEUR

> **ÉTAT COURANT — 2026-08-24 — branche `dev5`.** Le cycle New York Bagel reste terminé sur `dev3`. `dev5` est la branche d’évolution dédiée à MEME V2 ; la production Wayvee/M7 est terminée jusqu’à F06.

## Reprise immédiate — MEME V2

MEME V2 consomme un pack réaction préparé en amont et rend quatre couches dans cet ordre strict : **réaction Lacrimae → capture source → text_emotion → clip MEME**. La réaction est au-dessus de la capture. Chaque couche reste visible après son apparition.

La timeline par défaut est `0 %`, `15 %`, `33 %` et `41 %`. Le bridge exige `reaction_tweet`, `source_post.screenshot_png`, `text_emotion` et `meme`. Les captures locales sont transitées vers `public/source_posts/` de F03 et F04. LACRIMAE ne génère aucun contenu éditorial.

Le renderer F04 est `F04_RENDER/CODEBASE/src/components/MemeV2Composition.jsx`; le preview est `F03_PREVIEW/CODEBASE/src/preview/MemeV2Composition.jsx`. Le routage est activé par `sub_mode: "meme_v2"` et laisse MEME V1 inchangé. Les validations sont couvertes par `LAC_CUSTOS.py`, `tools/validate_f04_codex.py` et `tools/test_meme_v2_contract.py`.

**Vérifications déjà passées :** `py_compile`, test de contrat MEME V2, préflight F04, build Vite F03 et bundle statique F04. Le test Oracle réel du pack `production_pack_meme_wayvee_phone_bounce.json` a récupéré 5 angles, résolu le tag Release `M7` vers `M7.mp4` et transité la capture source vers F03/F04. F04 est réussi via le run `32742959306`, puis F05/F06 sont réussis via le run `32743467732`. Les artifacts `lac-clean` et les métadonnées YouTube officielles ont été récupérés. La session est prête à être fermée opérationnellement ; la gate CLOSE reste distincte d’une validation Champion future.

---

> *"Que l'Empereur protège son output."* — État exact de la forge, à reprendre dans un sandbox neuf.

---

## 1. OÙ ON EN EST (2026-08-09)

**Production SANDOVAL « SIEGE LOGO » — TERMINÉE de bout en bout sur `dev`.**

| Frégate | Statut | Preuve |
|---------|--------|--------|
| F00 INGEST | 🟢 SCELLÉE | 2026-08-03 |
| F01 SELECT (forge) | 🟢 SCELLÉE | 2026-08-03 |
| F02 FORMAT | 🟢 SCELLÉE | 2026-08-03 |
| F03 PREVIEW | 🟢 SCELLÉE | 2026-08-03 (Pages) |
| F04 RENDER | 🟢 SCELLÉE | run `31325383646` (5 clips) |
| F05 CAMOUFLAGE | 🟢 SCELLÉE | run `31326992043` |
| F06 LUTHER | 🟢 SCELLÉE | run `31326992043` |
| CLOSE | 🟢 SCELLÉE | run `31328179178` |

Ledger : `TRACKING/LACRIMAE_LEDGER.json` → `status: TERMINEE`, `fregate_actuelle: CLOSE`.

**Livrables (artifacts GHA) :**
- `lac-clean` → `clip_001_clean.mp4` … `clip_005_clean.mp4` (empreinte zéro, à publier).
- `lac-youtube` → `clip_00X_youtube.mp4` + `rapport_f05.html` (QA avant/après camouflage).

---

## 2. REPARTIR DANS UN SANDBOX NEUF (CHECKLIST)

```bash
# 1. Cloner sur la bonne branche
git clone -b dev https://github.com/kioka8877-ux/LACRIMAE.git
cd LACRIMAE

# 2. Récupérer les assets commités (déjà présents après clone)
ls SHARED/IN/backgrounds/   # 7 PNG
ls SHARED/IN/logos/logo.png
ls F02_FORMAT/OUT/clips/    # 5 clips (git lfs/plein → déjà commités)

# 3. Médias > 100 Mo : à re-télécharger depuis les Releases GitHub
#    - Release `sandoval-01` → asset video_source.mp4 (vidéo source)
#    - Release `codex`     → asset codex.1.json (codex confirmé, validated_by_magos)
#    Usage : _tools/download_release_video.py ; API Releases via UI GitHub.

# 4. Dépendances (rendu + preview)
cd F04_RENDER/CODEBASE && npm ci
cd F03_PREVIEW/CODEBASE && npm ci
sudo apt-get install -y ffmpeg   # requis F05/F06

# 5. Vérifier le rendu local (Remotion)
npx remotion compositions src/index.jsx          # attendu : clip-001..clip-005
npx remotion still src/index.jsx clip-001 OUT/f.png --frame=15

# 6. Preview locale
cd F03_PREVIEW/CODEBASE && npm run dev           # http://127.0.0.1:5173
```

**HEAD historique documenté :** `a466e57` (branche `dev`). Pour MEME V2, travailler exclusivement sur `dev5` — **ne pas coder sur main ni dev3**.

---

## 3. ARBORESCENCE DU REPO

```
/ (branche dev)
├── README.md                 ← vue générale
├── GUIDE_UTILISATION.md      ← guide utilisateur (Champion + Oracle), 4 portes, lore
├── LAC_RUN.py                ← orchestrateur local (Oracle) : run / forge
├── LAC_CUSTOS.py             ← Gardien : check-in/out, validation à chaque transit
├── SHARED/IN/                ← assets communs : backgrounds/ (7 PNG), logos/logo.png, video_source.mp4 (gitignoré)
├── BRIDGE_PERTURABO/         ← pack production + lac_bridge_forge.py (mode forge)
├── F00_INGEST/  F01_SELECT/  F02_FORMAT/  F03_PREVIEW/  F04_RENDER/  F05_CAMOUFLAGE/  F06_LUTHER/
├── TRACKING/                 ← ledger, carnets de campagne, DEUX_MODES_DESIGN, HANDOFF_NEXT_DEV
├── _tools/                   ← lac_release_video.sh, download_artifact.py, update_ledger.py, make_pack_*.py
└── .github/workflows/
    ├── lacrimae_orchestrator.yml   ← 1 run = 1 frégate (F00-F06/CLOSE), inputs, transits artifacts
    ├── f04-render.yml              ← RENDUS matrix (1 job/clip, input `clip`), artifacts clip-001..005
    ├── f05-f06.yml                 ← CAMOUFLAGE + LUTHER (2 frégates, 1 run) → lac-youtube + lac-clean
    ├── preview_pages.yml           ← Preview F03 sur GitHub Pages
    └── render.yml                  ← rendu (branche main, F03 RENDER)
```

---

## 4. LES PIÈGES DÉCOUVERTS (À NE PAS RETOMBER DESSUS)

1. **`props` n'existe pas sur `<Composition>` (Remotion v4)** — on passe `defaultProps`.
   Symptôme : toutes les compositions chargent `codexData.clips[0]` (donc `clip_001`),
   les autres font 404. Correctif : `Root.jsx` → `defaultProps={{codex: clip, session}}`.
2. **Ids de composition sanitizés** : Remotion refuse l'underscore (`clip_001` invalide)
   → ids convertis en `clip-001` … `clip-005`. Ne pas remettre d'underscore dans `Root.jsx`.
3. **Doublon titre** : le codex émet `texts` (v4) ET `text_overlays` (v3) →
   `OmniComposition.jsx` masque les overlays quand `texts` est actif
   (`(textMode === 'none' || !texts.title) &&`), et les **bandes**
   (`title_box` / `paragraph_box`) sont rendues derrière titre + paragraphe.
4. **`public/` gitignoré** : `F03_PREVIEW/CODEBASE/public/` et `F04_RENDER/CODEBASE/public/`
   ne sont PAS commités. Les workflows GHA re-stagent les assets depuis
   `SHARED/IN` + `F02_FORMAT/OUT/clips` à chaque run. Ne pas chercher les assets dans `public/` en local après un fresh clone.
5. **Dispatch GHA lent à indexer** : un workflow fraîchement poussé peut mettre 1-2 min
   avant d'être dispatchable. Un `push` sur le fichier du workflow force le rescan.
6. **La vidéo ne transite PLUS jamais par artifact GHA** (> 400 Mo interdits, quota
   500 Mo/repo). Source de vérité vidéo = **Release** (`sandoval-01`). Chaque frégate re-fetch.
7. **`requests` absent dans GHA Ubuntu runner** (module Python non tirable) →
   `pip install requests` dans le workflow AVANT tout usage. Vu sur l'échec du run F05-F06 précédent.
8. **Artifact `lac-video-finale` absent des runs custom** : le rendu réel passe par les
   workflows dédiés (`f04-render.yml` → artifacts `clip-001..005`), PAS par l'orchestrateur.
9. **Concurrence GHA** : plafond de 20 jobs simultanés au niveau *jobs* — la matrix
   `f04-render.yml` (5 jobs) passe sans problème.

---

## 5. CE QUI RESTE OUVERT (BACKLOG)

| # | Item | Priorité | Détail |
|---|------|----------|--------|
| 1 | **Mode `libre` jamais testé en réel** | Moyenne | F01 SELECT par vision IA (OpenRouter) n'a eu que des runs de test ; le flux réel SANDOVAL était en `forge`. |
| 2 | **`blur` / `reframe` non codés** | Faible | 3 profils de design (`background` / `blur` / `reframe`) ; seuls `background` (contain) est implémenté. **Ne rien coder pour blur/reframe sans demande.** |
| 3 | **Revérifier les livrables** | Faible | Télécharger `lac-clean` depuis le run `31326992043` et contrôler les 5 `clip_00X_clean.mp4`. |
| 4 | **Token GitHub (celui utilisé pour les pushes dev) à révoquer** | Urgente | Terminé avec les pushes — supprimer dans GitHub → Settings → Developer settings → Tokens. |
| 5 | **GitHub Pages** | Faible | La preview `https://kioka8877-ux.github.io/LACRIMAE/` peut être re-lancée (workflow Preview Pages). |

---

## 6. COMMENT LANCER UNE NOUVELLE PRODUCTION

1. **Assets** : nouveau pack dans `BRIDGE_PERTURABO/IN/` + vidéo (< 100 Mo dans
   `SHARED/IN/video_source.mp4` ; sinon `_tools/lac_release_video.sh` → Release).
2. **F00** — Orchestrateur `fregate: F00` (brief) → **Porte I**.
3. **F01** — `fregate: F01`, `mode: libre|forge` → **Porte II** (édition cutlist).
4. **F02** — `fregate: F02` → **Porte III** : éditer `codex.json` dans l'UI GitHub,
   passer `validated_by_magos: true`.
5. **F04** — `f04-render.yml` (matrix) → valider le rendu des clips.
6. **F05 + F06** — `f05-f06.yml` → **Porte IV**, vérifier `lac-youtube`, luther → `lac-clean`.
7. **CLOSE** — Orchestrateur `fregate: CLOSE` → ledger scellé, victoire dans les docs.

> Règle des 3 modes `profile` : seul `background` est codé — **ne rien coder pour blur/reframe**.

---

## 7. OUTILS DE LA FORGE

| Outil | Rôle |
|-------|------|
| `LAC_RUN.py run` | Exécute jusqu'à la prochaine Porte (local). |
| `LAC_RUN.py forge` | Mode forge : bridge Perturabo auto-fetch du pack. |
| `LAC_CUSTOS.py --frigate F05 --mode check-out --drive-base .` | Gardien : valide l'état d'une frégate. |
| `_tools/download_artifact.py` | Télécharge un artifact GHA (transit inter-frégates). |
| `_tools/update_ledger.py` | Met à jour `TRACKING/LACRIMAE_LEDGER.json`. |
| `_tools/lac_release_video.sh` | Upload vidéo > 100 Mo en asset de Release. |
| `_tools/make_pack_sa_video.py` | Ajuste un pack aux cuts ≤ durée de la vidéo. |

---

## 8. LORE (RAPPEL, POUR LA CONTINUITÉ)

LACRIMAE rend hommage aux **Blood Angels** (IXe Légion, Sanguinius — les larmes de
l'Ange). Vocabulaire : frégates (étapes), Portes (gates), Magos (dev), Oracle
(exécuteur IA), Champion (valideur), CUSTOS (gardien), Fleet Seal (sceau final).
Devises : *« La transformation ne s'arrête jamais. »* / *« Que l'Empereur protège son output. »*

---

## 9. FIL DE SUIVI

- Journal détaillé : `TRACKING/LACRIMAE_DEV_CAMPAIGN_LOG.md` (77 lignes, section VICTOIRE en tête).
- Design 2 modes : `TRACKING/LACRIMAE_DEUX_MODES_DESIGN.md`.
- Carnet de campagne global : `TRACKING/LACRIMAE_CAMPAIGN_LOG.md` + `TRACKING/LACRIMAE_TRANSFER_LOG.md`.

*Mise à jour : 2026-08-09 — forge dev TERMINÉE, victoire proclamée.* 🏆
