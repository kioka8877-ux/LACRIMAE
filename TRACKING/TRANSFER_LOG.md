# LACRIMAE — TRANSFER LOG

## Procédure standard

Chaque transfert entre fregates doit indiquer la source, la destination, le commit ou run d’origine, les fichiers transférés, le checksum et la validation opérateur.

> Aucun artifact ne doit être considéré comme récupérable sans emplacement documenté et checksum vérifiable.

## Routes officielles

| Source | Destination | Données |
|---|---|---|
| F00-A/F00-B | F03 Preview | Séquences ou clips matérialisés et manifestes |
| F00-D | F03 Preview Hybrid | Intro, manifeste Hybrid et clips Match Cut |
| F00-E | F03 Preview Reveal | Clips préparés et manifeste Reveal |
| F00-F | F03 Preview Ranking | `ranking_manifest.json` et labels par rang |
| F00-MUSIC | F03 Preview | Audio, beats, BPM, segments et climax |
| F03 Preview | F04 PICTOR | `codex.json` validé et manifests associés |
| F04 PICTOR | Opérateur | MP4 rendu |

## État au 2026-08-28

| # | Branche | Source | Destination | Artifact | Statut |
|---:|---|---|---|---|---|
| 1 | `dev7` | F00-D Hybrid | F03 Preview | Intro Stan Lee, Match Cut Avengers, manifests | Présent localement ; récupération séparée à publier |
| 2 | `dev8` | F00-E/F00-MUSIC | F03 Reveal | Code et contrats | Poussé sur `origin/dev8` |
| 3 | `dev9` | F00-E/F00-F/F00-MUSIC | F03 Ranking | Code et contrats | Poussé sur `origin/dev9` |

## Artifacts hors Git

Les artifacts lourds de dev7 doivent être publiés dans une Release ou un artifact GitHub Actions dédié, puis ajoutés ici avec URL, run/release, taille et SHA-256. Les dossiers `node_modules`, caches, logs temporaires et binaires Chromium sont exclus.

## Journal à compléter

| Date | Branche | Source → destination | Fichiers | Commit/run | Checksum | Validation |
|---|---|---|---|---|---|---|
| 2026-08-28 | `dev7` | Sandbox → GitHub | Documents de continuité | commit à venir | à générer | à vérifier après push |
