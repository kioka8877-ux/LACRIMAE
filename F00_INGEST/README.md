# F00 INGEST — dev4

F00 prépare la matière première pour le Fast Match Cut. Il reçoit une vidéo source et une demande de production, puis produit un manifeste JSON de **séquences virtuelles**. Il ne crée pas de fichiers clip intermédiaires.

## Entrées

Placez la vidéo dans `IN/video_source.mp4` et renseignez `IN/production_request.json` :

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

## Exécution

```bash
python3 CODEBASE/f00_ingest.py \
  --source IN/video_source.mp4 \
  --request IN/production_request.json \
  --out OUT
```

## Sorties

`OUT/sequences.json` contient les frames de départ de la vidéo originale, leur position sur la timeline finale et leur durée. F00 ne copie pas la vidéo et ne produit pas de découpes MP4 : la source reste dans `IN` et le pipeline la transmet directement aux étapes suivantes. Pour 10 secondes à 30 fps avec 7 frames par changement, le manifeste contient environ 43 à 44 séquences utilisées.
