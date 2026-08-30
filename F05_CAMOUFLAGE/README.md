# F05_CAMOUFLAGE — dev8

F05 reçoit le rendu `short_final.mp4` produit par F04 SIGNUM et prépare une version destinée à la livraison. Il réencode la vidéo en H.264 `yuv420p`, applique `+faststart`, supprime les métadonnées de conteneur, normalise l'audio à -14 LUFS et produit un rapport QA JSON.

## Usage

```bash
python3 F05_CAMOUFLAGE/CODEBASE/lac_f05_camouflage.py \
  --input F05_CAMOUFLAGE/IN/short_final.mp4 \
  --output F05_CAMOUFLAGE/OUT
```

## Entrées / Sorties

```text
IN/short_final.mp4  →  OUT/short_camouflaged.mp4 + camouflage_report.json
```

## Ce que fait F05

| Opération | Détail |
|-----------|--------|
| Réencodage vidéo | H.264 yuv420p (compatibilité max) |
| faststart | `moov atom` au début (lecture streaming) |
| Métadonnées | Supprimées (`-map_metadata -1`) |
| Audio | AAC loudnorm -14 LUFS (si piste audio) |
| FPS | Conservé (pas de force fps) |

## Compatibilité

YouTube ✅ | TikTok ✅ | Instagram Reels ✅ | Twitter/X ✅

## Notes

- F05 ne modifie pas le montage ni la colorimétrie.
- En dev8, F05 est exécuté en local (pas de workflow GitHub Actions dédié).
