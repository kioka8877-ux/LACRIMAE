# LACRIMAE — GUIDE D'UTILISATION
> *"Les larmes de l'Ange ne tombent jamais en vain."*

## 0. LE LORE — À QUELLE LÉGION LACRIMAE REND HOMMAGE ?

**LACRIMAE rend hommage aux BLOOD ANGELS** (IXe Légion des Space Marines, les
Anges de Sang de Sanguinius). « LACRIMAE » = les *larmes* en latin — les larmes
de l'Ange (Sanguinius, le Primarque de la Légion). Tout le vocabulaire du projet
est calqué sur le lore et la doctrine de chapitre :

- **L'Ange** → la vidéo finale produite (le « sang » du projet, livré au client).
- **Frégates (F00–F06)** → les étapes de la forge, chacune isolée comme une île
  (Loi d'Isolement : une frégate = une tâche = un run).
- **Magos** → l'opérateur / développeur qui forge.
- **Oracle** → l'exécuteur qui fait tourner les frégates (IA).
- **Champion** → celui qui valide aux **PORTES** (les gates).
- **LAC_CUSTOS** → le « Gardien » qui surveille chaque transit (check-in/check-out).
- **Fleet Seal** → le sceau final de la flotte, quand toutes les frégates sont scellées.
- Devises du chapitre : *« La transformation ne s'arrête jamais. »*, *« Que l'Empereur
  protège son output. »* — présentes dans les carnets de campagne.

---

## 1. C'EST QUOI LACRIMAE ?

Un pipeline qui transforme **une vidéo source** + **un pack de production**
(Perturabo) en **N Shorts 9:16** prêts à publier :

```
[assets + pack] → F01..F06 → clip_00X_clean.mp4 (empreinte zéro, prêt YouTube)
```

Chaque frégate produit une sortie, validée par un **Gardien CUSTOS** et par le
**Champion** à une **Porte** (gate) avant de passer à la suivante.

---

## 2. LES 2 RÔLES — QUI FAIT QUOI

| Rôle | C'est qui | Mission |
|------|-----------|---------|
| **Oracle** | L'IA / l'exécuteur | Fait tourner les frégates (workflows GHA ou `LAC_RUN.py`), déplace les fichiers, écrit le ledger. |
| **Champion** | L'humain qui pilote | Valide à chaque **Porte**, édite les fichiers de décision (`cutlist.json`, `codex.json`), donne le feu vert. |
| **Magos** | L'opérateur / dev | Prépare les assets, forge / corrige le code, lance la production. |

Règle d'or : **l'Oracle exécute, le Champion valide.** Personne ne peut
franchir une Porte sans la validation du Champion.

---

## 3. LES 4 PORTES (GATES) — LE RYTHME DE VALIDATION

| Porte | Nom | Après la frégate | Que valide le Champion |
|-------|-----|------------------|------------------------|
| **Porte I** | BRIEF | F00 (INGEST) | Le brief est bon, la vidéo source est ingérée. |
| **Porte II** | CUTLIST | F01 (SELECT / FORGE) | Les découpes (`cutlist.json`) sont correctes — éditables dans l'UI GitHub. |
| **Porte III** | MONTAGE | F02 (FORMAT) | Le `codex.json` est bon : titre, textes, volume, **`validated_by_magos: true`**. C'est LE fichier qui pilote le rendu. |
| **Porte IV** | PUBLICATION | F05 (CAMOUFLAGE) | Les `clip_00X_youtube.mp4` sont propres (métadonnées + loudnorm) → feu vert pour F06 (empreinte zéro). |

À chaque Porte, le workflow GHA affiche « PORTE X : ... Prochaine frégate: Fyy ».
Tant que le Champion n'a pas validé, **on n'enchaîne pas**.

---

## 4. LES 2 MODES DE PIPELINE

| Mode | Quand | Comment ça marche |
|------|-------|-------------------|
| **libre** | Pas de pack Perturabo | F01 (SELECT) analyse la vidéo par **vision IA** (OpenRouter) et génère les cuts + textes. |
| **forge** (défaut pour SANDOVAL) | Pack Perturabo dispo | `BRIDGE_PERTURABO` récupère **seul** le pack (`production_pack_*.json` dans PERTURABO/EXPORT), F01 est sauté → F02 forge le codex avec les textes du pack. |

Assets partagés dans les 2 modes : `SHARED/IN/backgrounds/` (fonds) + `SHARED/IN/logos/logo.png`.

---

## 5. DÉMARRAGE À ZÉRO — LA PREMIÈRE INPUT

### 5.1 Prérequis (une seule fois)
- Node.js 20, Python 3.11, ffmpeg.
- Accès au repo GitHub `kioka8877-ux/LACRIMAE` (branche **`dev`**).
- Les 2 Releases du repo : `codex` (codex confirmé `codex.1.json`) et `sandoval-01`
  (`video_source.mp4`, 33 Mo).

### 5.2 Déposer les assets (une fois pour toutes)
```
SHARED/IN/backgrounds/   ← les 7 fonds PNG (déjà commités)
SHARED/IN/logos/logo.png ← le logo campagne (déjà commité)
```
Pour une NOUVELLE vidéo source :
- **< 100 Mo** : la déposer dans `SHARED/IN/video_source.mp4` (gitignore, non commitée).
- **> 100 Mo** : `sh _tools/lac_release_video.sh <video.mp4> [tag]` → asset d'une
  Release GitHub (2 Go max/asset), F00 la télécharge automatiquement.

### 5.3 Démarrer la production
Via GitHub Actions (recommandé) :
1. **F00** — workflow `LACRIMAE Orchestrator`, input `fregate: F00` (+ brief). → **Porte I**.
2. **F01** — input `fregate: F01`, `mode: libre|forge`, éventuellement
   `pack_path` / `pack_filter`. → **Porte II** (édition `cutlist.json`).
3. **F02** — input `fregate: F02`. → **Porte III** (édition `codex.json`,
   passage `validated_by_magos: true`).
4. **F04** — workflow `F04 RENDER (dev)` (matrix 1 job/clip) OU orchestrateur
   `fregate: F04`. Le Champion valide le rendu visuel.
5. **F05 + F06** — workflow `F05-F06 CAMOUFLAGE + LUTHER (dev)` (2 frégates,
   1 run). → **Porte IV**, puis `CLOSE`.

### 5.4 En local (alternative / débogage)
```
LAC_RUN.py run        → exécute jusqu'à la prochaine Porte
LAC_RUN.py forge      → mode forge (bridge Perturabo)
python3 LAC_CUSTOS.py --frigate F05 --mode check-out --drive-base .
```

---

## 6. LE WORKFLOW COMPLET (F00 → F06 → CLOSE)

| Frégate | Nom | Entrée | Sortie | Gardien |
|---------|-----|--------|--------|---------|
| F00 | INGEST | URL / fichier / Release | `video_source.mp4` | CUSTOS |
| F01 | SELECT / FORGE | vidéo (+ pack) | `cutlist.json` | CUSTOS BRIDGE |
| F02 | FORMAT | cutlist + vidéo | `codex.json` + `clips/clip_00X.mp4` | CUSTOS |
| F03 | PREVIEW | codex + clip_001 | preview GitHub Pages (validation visuelle) | — |
| F04 (+ F04b SIGNE) | RENDER | codex + clips | `clip_00X.mp4` (Remotion, signature anti-doublon par clip) | CUSTOS |
| F05 | CAMOUFLAGE | clips rendus | `clip_00X_youtube.mp4` + `rapport_f05.html` | CUSTOS |
| F06 | LUTHER | youtube_final | `clip_00X_clean.mp4` (stream copy, empreinte zéro) | CUSTOS |
| CLOSE | FERMETURE | — | ledger scellé | — |

### Les workflows GitHub Actions de la branche `dev` / `dev2`

| Workflow | Quand | Inputs | Artifacts sortants |
|----------|-------|--------|--------------------|
| `LACRIMAE Orchestrator` | 1 frégate par run (`fregate: F00..F06/CLOSE`) | url, title, mode, profile, pack… | lac-video, lac-cutlist, lac-clips, lac-video-finale, lac-youtube, lac-clean |
| `F04 RENDER (dev)` | SIGNE (signatures anti-doublon) + Rendu Remotion, **1 job par clip** | `clip` (clip-001..clip-005 ou `all`) | `clip-001` … `clip-005` |
| `F05-F06 CAMOUFLAGE + LUTHER (dev)` | Camouflage + Luther sur les artifacts F04 | — | `lac-youtube`, `lac-clean` |
| `LACRIMAE Preview Pages` | Preview F03 sur GitHub Pages | manuel / push | site Pages |

> ⚠️ **Ordre à retenir** : le workflow `F04 RENDER (dev)` télécharge les clips
> depuis `F02_FORMAT/OUT/clips` (commités) et produit les artifacts `clip-001..005` ;
> `F05-F06` les consomme. L'orchestrateur, lui, utilise `lac-video-finale`.

### Les artifacts finaux (à télécharger dans l'onglet « Artifacts » du run)
- **`lac-clean`** → les livrables `clip_00X_clean.mp4` (empreinte zéro, à publier).
- **`lac-youtube`** → les `clip_00X_youtube.mp4` + `rapport_f05.html` (QA avant/après).
- **`clip-001`…`clip-005`** (workflow F04 RENDER) → les rendus bruts validés.

---

## 7. VALIDER LE RENDU (F04) — RAPPEL DES CORRECTIFS APPLIQUÉS

La production SANDOVAL a révélé 3 pièges corrigés, à connaître absolument :

1. **`props` n'existe pas sur `<Composition>` (Remotion v4) — c'est `defaultProps`**.
   Sinon toutes les compositions rendent le 1er clip (`clip_001`).
2. **Les ids de composition ne supportent PAS l'underscore** (`clip_001` invalide
   → sanitizés en `clip-001` dans `Root.jsx`).
3. **Doublon de titre** : le codex émet `texts` (v4) ET `text_overlays` (v3) —
   le rendu masque les overlays quand les textes v4 sont actifs, et rend les
   **bandes** (`title_box` / `paragraph_box`) derrière titre et paragraphe.
4. **Anti-doublon (F04b SIGNE)** : le miroir s'applique **uniquement à la
   vidéo** (L2), jamais aux textes ; le fond PNG est surdimensionné pour le
   mouvement ; le grain est **seedé unique par clip** — le tout généré
   automatiquement et déterministe.

Réglages validés de la session SANDOVAL : fond `bg_paper_crumpled`, logo 89 %
position custom (x 45.8 / y 67.5), offset vidéo -12 %, contraste 1.3,
luminosité 1.1, preset couleurs `cold_desaturated`, clips 900 frames @30fps 1080x1920.

---

## 8. F04b SIGNE — LA COUCHE ANTI-DOUBLON

Pour éviter que les plateformes (YouTube…) flaggent les Shorts en
« reused content », chaque clip reçoit une **signature unique** générée par
la sous-frégate **F04b SIGNE** — automatique, rien à faire à la main.

### Le bloc `sig` par clip (déterministe)

`F04_RENDER/CODEBASE/lac_signe.py` lit le codex confirmé (`IN/codex.json`)
et génère pour chaque clip un bloc `sig` **déterministe** : le seed est dérivé
du `pack_id` + de l'id du clip → même codex = mêmes signatures = re-render
identique.

| Effet | Zone | Description |
|-------|------|-------------|
| **Grain** | Toute l'image | Grain film **seedé unique par clip** + intensité variable — casse l'empreinte, invisible à l'œil. |
| **Mouvement de fond** | L1 (PNG) | Le PNG dérive selon un trajet **unique par clip** (sinusoïde + dérive), caméra fixe. PNG surdimensionné pour ne jamais révéler les bords. |
| **Miroir** | L2 (vidéo) | Flip horizontal **de la vidéo uniquement** — les textes ne sont jamais flippés. |
| **Micro-dérive caméra** | L2 (vidéo) | Zoom lent + léger pan, à peine perceptible. |
| **Slide des textes** | L3 / L4 | Titre et paragraphe **entrent en slide** (gauche→droite ou autre direction) puis **se figent**. |
| **Flash blanc** | Toute l'image | Light leak subtil et court en début de clip. |

### Fichiers produits
- `F04_RENDER/IN/signatures.json` — les signatures par clip (consultables).
- `F04_RENDER/CODEBASE/src/codexData.js` — le codex **regénéré** avec les
  blocs `sig` mergés, utilisé par le rendu Remotion.

> Le workflow `F04 RENDER (dev)` exécute SIGNE automatiquement entre le
> staging des assets et le rendu. Un vieux codex **sans** `sig` rend comme
> avant (rétro-compat).

---

## 9. RÉCUPÉRER LE PROJET DANS UN AUTRE ENVIRONNEMENT

```bash
git clone -b dev https://github.com/kioka8877-ux/LACRIMAE.git
cd LACRIMAE
# Rendu : 
cd F04_RENDER/CODEBASE && npm ci
npx remotion compositions src/index.jsx            # liste les 5 compositions
npx remotion still src/index.jsx clip-001 OUT/f.png --frame=15
# Preview locale :
cd F03_PREVIEW/CODEBASE && npm ci && npm run dev   # http://127.0.0.1:5173
```

Les assets (fonds, logo, clips) sont déjà commités ; la vidéo source et le codex
confirmé sont dans les Releases (`sandoval-01`, `codex`).

---

## 10. GARDE-FOUS & PIÈGES

- **Tokens** : ne jamais exposer de clé (ex. token GitHub `ghp_…` passé en clair).
  Révoquer tout token partagé dans un chat dès qu'il ne sert plus.
- **Limite GitHub** : un fichier > 100 Mo ne se push pas → passer par une Release.
  Artifacts = 500 Mo de stockage total (plan gratuit, rétention 90 j).
- **`public/` gitignoré** : `F03_PREVIEW/CODEBASE/public/` et
  `F04_RENDER/CODEBASE/public/` ne sont PAS commités — les workflows re-stagent
  les assets depuis `SHARED/IN` + `F02_FORMAT/OUT/clips` à chaque run.
- **Dispatch GHA** : un workflow fraîchement poussé peut mettre ~1-2 min à être
  indexé avant d'être dispatchable ; un trigger `push` sur le fichier du workflow
  force le rescan et le lancement.
- **Concurrence GHA** : le plafond de 20 jobs simultanés est au niveau *jobs*
  (matrix OK jusqu'à ~5 en toute sécurité).
- **ffmpeg** : non préinstallé en local (`apt-get install -y ffmpeg`) — requis
  pour F05/F06.
- **F04b SIGNE (anti-doublon)** : les signatures sont **déterministes**
  (seed = `pack_id` + id du clip). Ne pas modifier les seeds/signatures à la
  main sous peine de re-render différent. Un codex **sans** `sig` rend en
  rétro-compat.
- **Miroir ≠ textes** : le flip horizontal ne s'applique **qu'à la vidéo**
  (L2). Si un texte apparaît en miroir, c'est que le transform a été appliqué
  au mauvais calque.

---

## 11. SUIVI & LEDGER

- `TRACKING/LACRIMAE_LEDGER.json` — état des frégates exécutées, mis à jour à
  chaque run (via `_tools/update_ledger.py`).
- `TRACKING/LACRIMAE_DEV_CAMPAIGN_LOG.md` — carnet de campagne complet (historique).
- `TRACKING/HANDOFF_NEXT_DEV.md` — état précis + TODO pour le prochain développeur.

---

*Que l'Empereur protège son output.* — LACRIMAE, forge terminée 🏆
