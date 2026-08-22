# Rapport final — LACRIMAE `dev4`

Date : 2026-08-22

## Résultat global

Le pipeline vidéo dev4 est maintenant structuré autour d’une source vidéo unique et de séquences virtuelles. F00 ne produit pas de clips intermédiaires : il écrit un manifeste JSON qui indique quelles frames de la source doivent apparaître sur la timeline finale. F03_PREVIEW lit ce manifeste pour montrer le Fast Match Cut et permet de valider les réglages. F03_PICTOR reprend la même composition Remotion pour rendre le MP4 final.

## Phases terminées

### F00 et contrat virtuel

`F00_INGEST/CODEBASE/f00_ingest.py` utilise FFprobe pour lire les caractéristiques de la source, calcule la durée cible, le nombre de frames et le nombre de séquences nécessaires, puis écrit `sequences.json` et `ingest_report.json`. Les séquences contiennent leur frame de départ dans la source et leur position dans la timeline finale. Aucun MP4 n’est écrit dans F00 OUT.

Un validateur commun, `tools/validate_dev4_contracts.py`, vérifie le schéma, la timeline, les durées, la monotonie des séquences et la présence de la source dans le codex.

### F03_PREVIEW

La preview existante a été conservée et raccordée au manifeste. Elle affiche le nombre de séquences, le rythme de coupe, les frames sources et la timeline. Le lecteur Remotion affiche les portions référencées de la vidéo originale sans créer de fichiers intermédiaires.

Les réglages existants restent disponibles : presets couleur, contraste, luminosité, grain, vignette, netteté, zoom, logo, texte et effets. La source vidéo est muette par défaut. L’export du codex inclut maintenant le manifeste virtuel et l’état de validation `validated_by_magos`.

### F03_PICTOR

PICTOR a été sorti de son ancien chemin Colab/images. Il possède désormais un package autonome dev4, un Root Remotion qui charge `codex.json` et `sequences.json`, et une copie de la composition commune utilisée par la preview. Le rendu headless produit `out/short_final.mp4`.

La parité de la composition et du résolveur de séquences entre preview et PICTOR a été vérifiée avec `cmp`. Le workflow resynchronise également ces deux fichiers avant le rendu afin d’éviter une divergence future.

### Skip de F01, F02 et F04

Le workflow `.github/workflows/dev4_pipeline.yml` accepte `skip_f01`, `skip_f02` et `skip_f04`. F04 doit rester ignorée dans dev4 : PICTOR produit déjà le MP4 final et le flux s’arrête volontairement après F03_PICTOR. Lorsque les trois paramètres valent `true`, le chemin direct est F00 → F03_PREVIEW → F03_PICTOR. Les skips sont inscrits dans `TRACKING/dev4_pipeline_state.txt`. Si `skip_f04` est désactivé, le workflow arrête explicitement le job, car la finalisation F04 est hors périmètre dev4.

### GitHub Actions

Un job unique installe FFmpeg, Node.js et les dépendances Remotion, exécute F00, valide le manifeste, prépare les entrées communes, construit la preview, rend PICTOR et publie les JSON, le build de preview et le MP4 comme artifact.

La vidéo source n’est pas commitée. Le runner attend `F00_INGEST/IN/video_source.mp4`. Le support d’une Release GitHub ou d’un stockage externe reste une amélioration ultérieure.

## Vérifications finales

| Vérification | Résultat |
|---|---|
| Test unitaire F00 | Réussi |
| F00 sur vidéo de test | Réussi |
| 10 secondes à 30 fps et 7 frames | 43 séquences virtuelles |
| Aucun clip dans F00 OUT | Confirmé |
| Validation des contrats JSON | Réussie |
| Build Vite de F03_PREVIEW | Réussi |
| Rendu PICTOR Remotion | Réussi, MP4 de 10,048 secondes |
| Parité preview / PICTOR | Confirmée |
| Contrôle `git diff --check` | Réussi |

## Limites connues

La sélection F00 actuelle est déterministe et utilise un échantillonnage de positions dans la vidéo. Elle ne réalise pas encore une détection sémantique des plans par vision artificielle. Le pipeline produit donc un socle fonctionnel et reproductible, mais la qualité éditoriale des passages sélectionnés devra être améliorée dans une phase dédiée.

La validation humaine entre la preview et le rendu est représentée par l’export du codex validé. Le workflow actuel enchaîne ensuite le rendu dans le même job ; une vraie pause avec approbation GitHub devra être ajoutée si le Champion doit bloquer le rendu jusqu’à une validation manuelle formelle.

## Commit final

Commit fonctionnel : `263d0c848d7b85571ac46fc4467012e4e258cc2b` (`feat(dev4): complete virtual match-cut pipeline`). Le commit de documentation final est `c1db925` et inclut l’exclusion explicite de F04. La branche `dev4` a été poussée sur `origin/dev4` et la branche `main` n’a pas été modifiée.
