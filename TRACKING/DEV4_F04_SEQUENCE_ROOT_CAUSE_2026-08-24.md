# Diagnostic F04 — répétition d’une seule séquence

## Constat

Le MP4 F04 précédent contenait 719 frames et environ 12 secondes, mais la partie Match Cut répétait le même visuel. Le hash du MP4 précédent était `d44e312f904e19024c547f81a809a7c6478e39b91d5418dbd1d1f0da28a56ddd`.

## Cause exacte

Le workflow F04 injectait `F03_PREVIEW/CODEBASE/public/sequences.json`, qui est le manifeste F00-A générique. Ses champs `file` pointent vers `sequences/seq_0001.mp4`, alors que l’artifact F00-D réel est décrit par `F03_PREVIEW/CODEBASE/public/match_cut/sequences.json` et pointe vers `match_cut/sequences/seq_0001_normal.mp4`, `match_cut/sequences/seq_0002_normal.mp4`, etc.

En parallèle, `F03_PICTOR/CODEBASE/src/virtualSequences.js` ne conservait pas `row.file` lors de la normalisation. Le JSX PICTOR ne recevait donc jamais le chemin matérialisé et retombait sur `video_source.mp4`. Le workflow fabriquait ce fallback à partir de la première séquence, ce qui expliquait la répétition.

## Vérifications

Après correction locale du normaliseur, le manifeste Match Cut produit 86 entrées avec :

- première entrée : `match_cut/sequences/seq_0001_normal.mp4` ;
- dernière entrée : `match_cut/sequences/seq_0086_normal.mp4` ;
- tous les chemins matérialisés conservés.

Trois frames PICTOR rendues après l’introduction montrent des contenus distincts : une lumière rouge, un personnage criant, puis un vaisseau dans l’espace. Cela confirme que les fichiers matérialisés sont bien différents et que le correctif de résolution fonctionne localement.

## Correctif requis avant relance

Le workflow doit utiliser `match_cut/sequences.json`, le normaliseur doit conserver `file`, et PICTOR doit lire chaque fichier matérialisé avec `startFrom=0`. Aucun nouveau run n’a été lancé pendant ce diagnostic.
