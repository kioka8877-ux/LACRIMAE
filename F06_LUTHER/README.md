# F06_LUTHER — dev8

F06 reçoit `short_camouflaged.mp4` et produit le livrable final `short_master.mp4`. Il retire les métadonnées restantes avec FFmpeg en **stream copy** (sans réencoder).

## Usage

```bash
python3 F06_LUTHER/CODEBASE/lac_f06_luther.py \
  --input F06_LUTHER/IN/short_camouflaged.mp4 \
  --output F06_LUTHER/OUT
```

## Entrées / Sorties

```text
IN/short_camouflaged.mp4  →  OUT/short_master.mp4 + luther_report.json
```

## Différence F05 vs F06

| | F05 Camouflage | F06 Luther |
|---|---|---|
| Réencodage | ✅ H.264 yuv420p | ❌ Stream copy |
| Audio | Loudnorm -14 LUFS | Inchangé |
| Purpose | Compatibilité plateforme | Nettoyage métadonnées |
| Perte qualité | Légère | Aucune |

## Notes

- F06 utilise **stream copy** — aucune perte de qualité.
- En dev8, F06 est exécuté en local.
