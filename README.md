# LACRIMAE — dev4

> *For the Angel's Tears shall become gold.*

LACRIMAE dev4 est un pipeline de production de Shorts verticaux basé sur une vidéo source. La vidéo de travail reste une source visuelle muette ; le moteur fabrique le montage Fast Match Cut à partir de références de frames, sans exporter un fichier pour chaque séquence.

## Flux principal

```text
vidéo source + demande de production
                │
                ▼
F00 INGEST
repérage et matérialisation des séquences
                │
                ├── F01 SELECT / F02 FORMAT (optionnels)
                │
                ├── F00-D INTRO HYBRID (Mode 2, optionnel)
                │
                ▼
F03 PREVIEW
visualisation et validation du montage
                │
                ▼
F03 PICTOR / F04 HYBRID RENDER
rendu Remotion du Short final
        │
        ▼
F05 CAMOUFLAGE → F06 LUTHER
préparation plateforme + nettoyage final
        │
        ▼
short_master.mp4
```

F00 produit `sequences.json`. Chaque ligne décrit l’emplacement de départ dans la vidéo source et l’emplacement de la séquence sur la timeline finale. Pour une cible de 10 secondes à 30 fps avec un cut toutes les 7 frames, le manifeste contient environ 43 à 44 séquences utilisées.

## Frégates dev4

| Module | Mission | Sortie principale |
|---|---|---|
| **F00 INGEST** | Vérifier la vidéo et créer les références virtuelles, sans découpe MP4. | `F00_INGEST/OUT/sequences.json` |
| **F01 SELECT** | Sélection avancée lorsque le mode standard est demandé. | `cutlist.json` |
| **F02 FORMAT** | Préparer un codex lorsque le mode standard est demandé. | `codex.json` |
| **F03 PREVIEW** | Lire la vidéo source selon le manifeste et régler les presets. | `codex.json` validé |
| **F03 PICTOR** | Rendre la composition validée en MP4. | `short_final.mp4` |
| **F04_RENDER** | Rendu Hybrid dédié à partir d’un codex et des assets F00-D validés. | `lacrimae_hybrid_f04.mp4` |
| **F05 CAMOUFLAGE** | Réencoder, nettoyer et préparer le fichier pour la livraison. | `short_camouflaged.mp4` |
| **F06 LUTHER** | Retirer les métadonnées sans réencodage et sceller le livrable. | `short_master.mp4` |

CANTOR n’est pas requis pour ce flux visuel. Il pourra être réintroduit uniquement si une voix off ou des sous-titres synchronisés deviennent nécessaires.

## Entrées F00

```text
F00_INGEST/IN/
├── video_source.mp4
└── production_request.json
```

Exemple de demande :

```json
{
  "project_title": "Luxury Match Cut 01",
  "target_duration_seconds": 10,
  "cut_interval_frames": 7,
  "candidate_count": 100,
  "shuffle_seed": 2026,
  "short_count": 1
}
```

F00 est lancé avec :

```bash
python3 F00_INGEST/CODEBASE/f00_ingest.py \
  --source F00_INGEST/IN/video_source.mp4 \
  --request F00_INGEST/IN/production_request.json \
  --out F00_INGEST/OUT
```

## Preview et rendu

F03_PREVIEW et F03_PICTOR utilisent la même composition Remotion et le même résolveur de séquences. La preview est interactive et permet de régler la colorimétrie, le contraste, la luminosité, le grain, la vignette, le logo et les effets. Le bouton de validation produit un codex marqué `validated_by_magos`.

```bash
cd F03_PREVIEW/CODEBASE
npm ci
npm run dev
```

Le rendu headless s’effectue avec PICTOR :

```bash
cd F03_PICTOR/CODEBASE
npm install
npm run render
```

## Skip de F01, F02, F04, F05 et F06

Le skip de F04 concerne uniquement l’ancien workflow Matrix lorsqu’il n’est pas requis. Le workflow `.github/workflows/dev4_f04_hybrid.yml` est le chemin dédié au Mode 2 et doit être lancé explicitement après validation de F00-D et de la preview.

Le workflow legacy `.github/workflows/dev4_pipeline.yml` accepte cinq entrées booléennes : `skip_f01`, `skip_f02`, `skip_f04`, `skip_f05` et `skip_f06`. Dans ce workflow legacy, `skip_f04` reste à `true`, car son ancien F04 Matrix est remplacé par PICTOR. Cela ne désactive pas le workflow dédié `.github/workflows/dev4_f04_hybrid.yml`, qui est utilisé explicitement pour le Mode 2. F05 et F06 sont actives par défaut. Lorsque F01, F02 et le F04 legacy sont ignorées, le chemin normal est :

```text
F00 → F00-D (si Mode 2) → F03_PREVIEW → F03_PICTOR/F04 Hybrid → F05_CAMOUFLAGE → F06_LUTHER
```

Le skip est écrit dans `TRACKING/dev4_pipeline_state.txt`. Le F04 legacy est journalisé comme `skipped_by_design_pictor_replacement`, tandis que F04 Hybrid est lancé séparément en Mode 2. F05 et F06 restent actives par défaut ; leurs skips sont réservés au debug. Lorsqu’une frégate facultative n’est pas ignorée, le workflow exige sa sortie attendue au lieu de la contourner silencieusement.

## GitHub Actions

Lancement manuel depuis l’onglet Actions : **LACRIMAE dev4 — Virtual Match Cut**. Le runner installe Node.js, FFmpeg et les dépendances Remotion, exécute F00, prépare un bundle commun, construit la preview, rend PICTOR, exécute F05 et F06, puis publie les JSON, les rapports, le build de preview et `short_master.mp4` comme artifact.

La vidéo source n’est pas commitée. Elle doit être fournie au runner à l’emplacement `F00_INGEST/IN/video_source.mp4`, ou être téléchargée depuis un mécanisme d’asset externe. En Mode 2, F00-D reçoit en plus une image ou une vidéo d’introduction et produit un artifact contenant `hybrid_manifest.json`, `intro/` et `match_cut/`.

## Hybrid Narrative — Mode 2

Le Mode 2 conserve le Mode 1 intact et ajoute la timeline `Intro → hard cut → Match Cut`. La phrase fixe d’introduction et EGO sont des calques séparés. La phrase fixe reste visible selon sa durée configurée ; EGO est strictement masqué pendant l’introduction et démarre uniquement au hard cut. Les réglages EGO et Intro Text se mettent à jour immédiatement dans F03 Preview sans déplacer la tête de lecture.

Le workflow de rendu compatible est `.github/workflows/dev4_f04_hybrid.yml`. Il injecte le manifeste `match_cut/sequences.json`, préserve le champ `file` de chaque séquence et rend les MP4 matérialisés F00-D individuellement. Camouflage et Luther ne sont pas relancées pour la validation visuelle du Mode 2.



## Reveal Compilation — Mode dev8

Le Mode dev8 ajoute le format narratif **Others vs This One**. Une compilation utilise de trois à six sources vidéo : les clips précédents alimentent la comparaison `OTHERS`, et le dernier constitue le `THIS ONE` / `Final Reveal`.

```text
F00-E Reveal Clip Prep → F00-MUSIC audio analysis → F03 Preview → F04 PICTOR
```

### Reveal Panel Controls

F03 Preview propose un panneau d'édition par clip avec : durée (in/out), rotation (-180° à 180°), échelle (0.2x à 3x), position horizontale et verticale (0% à 100%), et type de transition (SFX / silencieux).

### Workflows Spider-Man

Trois workflows automatisés testent le pipeline dev8 avec des clips Spider-Man :
- `dev8_spiderman_test.yml` — F00-E clip prep
- `dev8_spiderman_music.yml` — F00-MUSIC audio analysis
- `dev8_spiderman_render.yml` — F03+F04 render

## Suivi

Le rapport d’implémentation se trouve dans [`TRACKING/DEV4_PHASE1_REPORT.md`](TRACKING/DEV4_PHASE1_REPORT.md). Le journal de campagne est disponible dans [`TRACKING/LACRIMAE_CAMPAIGN_LOG.md`](TRACKING/LACRIMAE_CAMPAIGN_LOG.md).

## Composition configurable et rotation

La vidéo source peut rester horizontale tandis que la composition finale est sélectionnée dans F03_PREVIEW. Les presets disponibles sont `vertical` (1080×1920), `horizontal` (1920×1080) et `square` (1080×1080). Le recadrage utilise `cover` ou `contain`, avec un fond `blurred_video` pour remplir élégamment une composition verticale à partir d’une source horizontale.

Les transformations sont enregistrées dans `session.composition` du codex et sont consommées à l’identique par F03_PREVIEW et F03_PICTOR. La vidéo peut rester fixe, tourner par séquence ou tourner continuellement. La rotation peut être appliquée au calque vidéo seul ou à toute la composition. Le workflow normalise la source vidéo entière pour garantir le décodage Remotion, sans extraire de clips et sans écrire de vidéo intermédiaire dans `F00_INGEST/OUT`.
