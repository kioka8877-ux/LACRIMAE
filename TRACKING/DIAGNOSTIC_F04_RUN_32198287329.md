# Diagnostic F04 — run 32198287329

## Source
Rapport utilisateur : `/home/ubuntu/upload/pasted_content_2.txt`.

## Résultats observés
- Le rendu F04 a réussi pour `clip-001`, avec `../OUT/clip_001_finale.mp4` de 6.6 MB.
- Le rendu F04 a réussi pour `clip-002`, avec `../OUT/clip_002_finale.mp4` de 6 MB.
- Le rendu F04 a progressé jusqu'à `clip-005` avant le blocage suivant.
- Le blocage intervient au début de `clip-006`.

## Erreur bloquante
`Received a status code of 404 while downloading file http://localhost:3000/public/clip_006.mp4`.
Le renderer Remotion ne trouve donc pas l'asset `clip_006.mp4` dans `F04_RENDER/CODEBASE/public/` au moment du rendu.

## Diagnostic
Le correctif `masterClip` est efficace : l'erreur JavaScript précédente n'apparaît plus et au moins les clips 001 et 002 sont encodés avec succès.
Le nouvel échec est un problème de préparation/téléchargement des assets F04, pas un problème de composition SIGNE ou de `TweetCard`.

## Reprise
Le workflow actuel télécharge l'artifact `lac-clips` puis copie les MP4 dans `F04_RENDER/CODEBASE/public/`, mais ne présente pas de paramètre de reprise `start_clip`, `resume` ou `from_clip`. La reprise exacte au clip 006 n'est donc pas disponible nativement. Il faut soit corriger le téléchargement pour récupérer les 8 clips puis relancer F04 depuis le début, soit ajouter un mécanisme de reprise explicite après accord.

## Point à vérifier avant patch
Comparer le contenu de l'artifact `lac-clips` et le filtrage/copie dans `.github/workflows/lacrimae_orchestrator.yml` autour des lignes 469-470. Le workflow doit garantir la présence de `clip_001.mp4` à `clip_008.mp4` dans `F04_RENDER/CODEBASE/public/` avant le premier rendu.

Aucun F05/F06/CLOSE ne doit être lancé.
