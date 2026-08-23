# F00 INGEST — dev4

F00 prépare la matière première du Fast Match Cut en deux sous-étapes déterministes. **F00-A SCOUT** identifie et classe les passages exploitables. **F00-B EXTRACT** matérialise ensuite les séquences retenues avec FFmpeg et vérifie qu’elles sont lisibles avant F03 Preview et PICTOR.

## Entrées

Placez la vidéo dans `IN/video_source.mp4` et renseignez `IN/production_request.json` :

```json
{
  "project_title": "Luxury Match Cut 01",
  "target_duration_seconds": 10,
  "cut_interval_frames": 7,
  "candidate_count": 172,
  "scout_sample_fps": 2,
  "min_mean_luma": 0.075,
  "min_luma_std": 0.025,
  "min_candidate_gap_seconds": 0.35
}
```

## Exécution

```bash
python3 CODEBASE/f00_scout.py \
  --source IN/video_source.mp4 \
  --request IN/production_request.json \
  --out OUT/scout

python3 CODEBASE/f00_extract.py \
  --source IN/video_source.mp4 \
  --plan OUT/scout/sequences_plan.json \
  --out OUT/materialized
cp OUT/materialized/sequences.json OUT/sequences.json
```

## Sorties

`OUT/scout/sequences_plan.json` est le contrat Oracle de F00-A. Il contient les candidats, leurs scores de visibilité et les positions de timeline.

`OUT/materialized/sequences.json` est le contrat validé de F00-B. Il référence les fichiers `OUT/materialized/sequences/seq_XXXX.mp4`. Chaque séquence est un petit fichier H.264 indépendant, contrôlé avec FFprobe et une mesure de luminosité sur l’ensemble des frames.

Le schéma matérialisé est `dev4.materialized-sequences.v1`. Pour une cible de 10 secondes à environ 60 FPS et 7 frames par cut, il contient environ 86 séquences. F03 et PICTOR utilisent ces fichiers locaux ; ils ne doivent plus chercher aléatoirement les frames dans la source longue lorsqu’un champ `file` est présent.

`f00_ingest.py` reste disponible pour la compatibilité avec les anciens manifestes virtuels `dev4.virtual-sequences.v1`, mais le flux direct dev4 utilise désormais F00-A puis F00-B.
