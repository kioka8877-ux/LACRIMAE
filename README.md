# LACRIMAE — dev4

> *For the Angel's Tears shall become gold.*

LACRIMAE dev4 est un pipeline de production de Shorts verticaux basé sur une vidéo source. La vidéo de travail reste une source visuelle muette ; le moteur fabrique le montage Fast Match Cut à partir de références de frames, sans exporter un fichier pour chaque séquence.

## Flux principal

```text
vidéo source + demande de production
                │
                ▼
F00 INGEST
repérage et manifeste de séquences virtuelles
                │
                ├── F01 SELECT / F02 FORMAT (optionnels)
                │
                ▼
F03 PREVIEW
visualisation et validation du montage
                │
                ▼
F03 PICTOR
rendu Remotion du Short final
                │
                ▼
short_final.mp4
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
| **F04** | Frégate ignorée : PICTOR fournit déjà le rendu final. | Aucun traitement dev4 |

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

## Skip de F01 et F02

Le workflow `.github/workflows/dev4_pipeline.yml` accepte trois entrées booléennes : `skip_f01`, `skip_f02` et `skip_f04`. `skip_f04` doit rester à `true`, car dev4 s’arrête volontairement après PICTOR. Lorsque les trois valent `true`, le chemin direct est :

```text
F00 → F03_PREVIEW → F03_PICTOR
```

Le skip est écrit dans `TRACKING/dev4_pipeline_state.txt`. F04 est journalisée comme `skipped_by_design_after_pictor`. Lorsqu’une frégate facultative n’est pas ignorée, le workflow exige sa sortie attendue au lieu de la contourner silencieusement.

## GitHub Actions

Lancement manuel depuis l’onglet Actions : **LACRIMAE dev4 — Virtual Match Cut**. Le runner installe Node.js, FFmpeg et les dépendances Remotion, exécute F00, prépare un bundle commun, construit la preview, rend PICTOR et publie les JSON, le build de preview et le MP4 final comme artifact.

La vidéo source n’est pas commitée. Elle doit être fournie au runner à l’emplacement `F00_INGEST/IN/video_source.mp4`, ou être téléchargée depuis un mécanisme d’asset externe qui sera ajouté dans une phase ultérieure.

## Suivi

Le rapport d’implémentation se trouve dans [`TRACKING/DEV4_PHASE1_REPORT.md`](TRACKING/DEV4_PHASE1_REPORT.md). Le journal de campagne est disponible dans [`TRACKING/LACRIMAE_CAMPAIGN_LOG.md`](TRACKING/LACRIMAE_CAMPAIGN_LOG.md).
