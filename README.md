# LACRIMAE — branche `dev`
> *"For the Angel's Tears shall become gold."*

**Machine à memes 9:16 automatisée** — transforme une vidéo longue en clips viraux.
Branche de transformation du pipeline LACRIMAE original (visible sur `main`).
Pipeline héritier : F00-F02 nouveaux, F03-F06 pillés d'OMNIS-WATCH (monteur qui
marche déjà en production).

---

## Pipeline dev

```
[video longue + logos] ← fournis par le Magos dans SHARED/IN
         │
         ▼
[F00 INGEST]  ──► video_source.mp4 + d00_manifest.json      (yt-dlp ou fichier local)
         │
         ▼
[F01 SELECT]  ──► cutlist.json                               (modèle de vision OpenRouter —
         │                                                   regarde la vidéo comme un humain,
         │                                                   N séquences de 3-10s, ZÉRO transcript)
         │
         ▼
[F02 FORMAT]  ──► clips/clip_XXX.mp4 9:16 + codex.json       (profil blur-pad OU reframe)
         │
         ▼
[F03 PREVIEW] ──► codex.json validé                           (Vite + @remotion/player :
         │                                                   presets, titre statique, logo,
         │                                                   volume, coup brutal, validation)
         │
         ▼
[F04 RENDER]  ──► video_finale.mp4                            (Remotion — logo + titre + clip)
         │
         ▼
[F05 CAMOUFLAGE] ──► youtube_final.mp4                        (métadonnées + loudnorm -14 LUFS)
         │
         ▼
[F06 LUTHER]  ──► clean_final.mp4                             (stream copy — empreinte zéro)
```

## Frégates

| Frégate | Nom | Mission | Technologie |
|---------|-----|---------|-------------|
| F00 | INGEST | Collecte de la vidéo longue (URL YouTube ou fichier) | yt-dlp / FFmpeg |
| F01 | SELECT | Sélection des séquences par vision (comme un humain) | OpenRouter vision |
| F02 | FORMAT | Découpe + 9:16 (blur-pad/reframe) OU découpe seule (`background`) + template codex v4 | FFmpeg |
| F03 | PREVIEW | Aperçu temps réel, 6 calques, presets, fond PNG, logo, textes, validation | Vite + @remotion/player |
| F04 | RENDER | Rendu final logo + titre + paragraphe + coup brutal | Remotion |
| F05 | CAMOUFLAGE | Wipe métadonnées + loudnorm | FFmpeg |
| F06 | LUTHER | Effacement empreinte numérique (stream copy) | FFmpeg |
| BRIDGE | PERTURABO | Pont mode forge : **auto-récupère** le pack `MONDES_FORGES/CLIPPING/EXPORT` → cutlist + codex | Python stdlib |
| — | LAC_CUSTOS | Validation inter-frégates | Python stdlib |

## Choix de conception (dev)

- **PAS de transcript** : la sélection se fait par un modèle de vision (OpenRouter),
  adapté aux vidéos sans sous-titres (stars, foot, extraits).
- **PAS de reframe par défaut** : blur-pad (duplique + flou) — la vidéo nette
  remplit la largeur, le fond est flouté/assombri/désaturé. Le profil `reframe`
  (crop central) existe en alternative. Troisième profil `background` :
  découpe seule (résolution source conservée) — la mise en page 9:16 se fait
  dans la composition Remotion (fond PNG + vidéo + textes + logo).
- **DEUX MODES** : `libre` (F01 vision OpenRouter → cutlist) et
  `forge` (pack Perturabo → BRIDGE → cutlist validée, F01 sautée). En mode
  forge, le codex contient un bloc `session` (style global : fond PNG, logo,
  textes, presets — décidé 1× en preview, appliqué aux N clips) + blocs
  `clips[]` (contenu du pack). Voir
  [`TRACKING/LACRIMAE_DEUX_MODES_DESIGN.md`](TRACKING/LACRIMAE_DEUX_MODES_DESIGN.md).
- **PAS de SFX, PAS de sous-titres** : le titre est un texte statique (fade-in)
  positionné dans la zone safe (bandes floues), couleur et font au choix.
- **Coup brutal** : flash/impact toutes les 3s (90 frames) — réglable, 0 = désactivé.
- **Audio** : uniquement un réglage de volume (le Magos ajoute l'audio sur YouTube).

## Rites du Sang

1. **LOI D'ISOLEMENT** — chaque frégate lit son `IN/`, écrit son `OUT/`.
2. **RITE DE VALIDATION** — `LAC_CUSTOS.py` obligatoire après chaque output (automatique dans GHA et LAC_RUN).
3. **TRANSIT** — par l'orchestrateur (`LAC_RUN.py` local ou GitHub Actions), jamais à la main.
4. **PRÉVIEW AVANT RENDU** — aucun rendu sans `validated_by_magos: true` dans codex.json.
5. **DURÉE PAR LA CUTLIST** — la durée des clips est dictée par F01 (3-10s par séquence).
6. **PORTES** — l'opérateur n'intervient qu'aux 4 portes : I Brief, II Cutlist, III Montage, IV Publication.

## GitHub Actions (production)

Le pipeline tourne sur GitHub Actions, comme OMNIS-WATCH : **un run par porte**,
déclenché depuis l'onglet **Actions → LACRIMAE Orchestrator → Run workflow**.

**Multi-clips** : une seule vidéo longue produit jusqu'à **5 Shorts** par run —
le codex.json contient un block de réglages PAR clip (titre, volume, couleurs,
coup brutal). F04 rend une composition par clip, F05/F06 traitent les N clips.

| Porte | Input `gate` | Ce qui s'exécute | Intervention du Champion |
|-------|--------------|------------------|--------------------------|
| G1 | BRIEF + INGEST | F00 (yt-dlp) | Fournit url/titre/sujet/vibe/params dans l'UI |
| G2 | ORACLE | libre : F01 vision → cutlist · forge : BRIDGE **auto-récupère** le pack PERTURABO/EXPORT → cutlist | Vérifie/édite `F02_FORMAT/IN/cutlist.json` (UI GitHub) |
| G3 | FORMAT | F02 blur-pad/reframe → codex multi-clips | Édite `F03_PREVIEW/IN/codex.json` (titre/volume/couleurs de chaque clip + `validated_by_magos: true`) |
| G4 | RENDER | F04 Remotion → 1 rendu par clip (`clip_00X_finale.mp4`) | Télécharge l'artifact `lac-video-finale` |
| G5 | CAMOUFLAGE + LUTHER | F05 → F06 → `clip_00X_clean.mp4` (N clips) | Télécharge l'artifact `lac-clean` |
| CLOSE | Fermeture | Ledger final | — |

**Secrets/vars à configurer** (Settings → Secrets and variables) :
- `ORACLE_API_KEY` (secret) — clé OpenRouter pour F01
- `ORACLE_MODEL` (var, optionnel) — ex. `google/gemini-2.0-flash-exp:free`
- `ORACLE_BASE_URL` (var, optionnel) — défaut OpenRouter

**Prérequis** : `SHARED/IN/logos/logo.png` (logo calque permanent) commité dans le repo.

**Le gardien tourne à chaque sortie** : `LAC_CUSTOS.py` est appelé après chaque
frégate — aucun artefact ne transite sans verdict.

## Mode forge (Perturabo)

**L'ORACLE est autonome** : le bridge va chercher le pack **seul** dans
`PERTURABO/MONDES_FORGES/CLIPPING/EXPORT` (`production_pack_*.json`, API GitHub,
stdlib) — il ne prend **rien d'autre**. Tu ne fournis que ce qui n'est **pas**
dans le pack : la vidéo et les PNG.

```
1. (UNE FOIS POUR TOUTES) déposer tes fonds : SHARED/IN/backgrounds/*.png
   et ton logo transparent de campagne : SHARED/IN/logos/logo.png
2. Déposer la vidéo à couper DIRECTEMENT dans SHARED/IN/ :
   SHARED/IN/video_source.mp4  (pas de sous-dossier videos/ — gitignorée,
   max ~200 Mo ; repli ancien emplacement BRIDGE_PERTURABO/IN/ conservé)
3. python LAC_RUN.py forge [--pack-filter SANDOVAL]
   → l'Oracle récupère le pack, Gate 1 (pack + cuts + assets) → cutlist + codex v4
4. python LAC_RUN.py run       → F02 profil background (découpe seule)
5. Preview F03 : choisir le fond PNG (menu déroulant), ajuster, valider → gate --codex
6. python LAC_RUN.py run       → F04 → F05 → F06 → clean_final.mp4
```

En GHA : `gate G1` (ingère `SHARED/IN/video_source.mp4` s'il n'y a pas d'URL)
puis `gate G2` avec `mode: forge` suffit — le pack est auto-récupéré, les PNG
viennent de `SHARED/IN/` (commités une fois pour toutes) et la vidéo de
l'artifact G1.

## Démarrage rapide (local)

```
1. Déposer la vidéo longue dans SHARED/IN/video_source.mp4 + logos dans SHARED/IN/logos/
2. LAC_RUN.py init --source "URL|fichier" --title "..." --sujet "..." --vibe "..."
3. LAC_RUN.py run        → F00 seule, puis s'arrête à la Porte II
4. LAC_RUN.py gate --cutlist | --codex | --publish
5. LAC_RUN.py run        → exécute jusqu'à la prochaine porte
6. LAC_RUN.py status     → état du ledger (portes + frégates)
```

Ou en manuel frégate par frégate :
```
1. F00 : python lac_f00_ingest.py --file ... --output F00_INGEST/OUT/
2. F01 : python lac_f01_select.py --input F01_SELECT/IN/ --output F01_SELECT/OUT/ \
         --sequences 2 --oracle          (clé ORACLE_API_KEY requise)
3. LAC_CUSTOS --frigate F01 --mode check-out
4. F02 : python lac_f02_format.py --input F02_FORMAT/IN/ --output F02_FORMAT/OUT/ \
         --profile blur-pad
5. F03 : npm install + déposer clip + codex.json dans public/ → npm run dev → valider
6. F04 : npm install → npm run render
7. F05 → F06 : python lac_f05_camouflage.py ... ; python lac_f06_luther.py ...
8. Récupérer clean_final.mp4 dans F06/OUT/
```

> *LACRIMAE — Né des larmes de Sanguinius, forgé en or.*
> *Ad Victoriam.*
