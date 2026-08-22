# F03 PREVIEW — dev4

F03_PREVIEW est l’interface interactive qui permet de voir le Short avant son rendu final. Elle utilise Vite, React et Remotion Player. Dans `dev4`, elle lit une vidéo source et le manifeste `sequences.json` produit par F00 : les séquences sont virtuelles et aucun fichier clip n’est exporté.

## Entrées

```text
CODEBASE/public/video_source.mp4
CODEBASE/public/sequences.json
CODEBASE/public/codex.json
```

La composition parcourt les références de frames du manifeste, affiche chaque portion pendant sa durée de timeline et garde la source vidéo muette. La durée de preview est celle de `sequences.json`.

## Lancement

```bash
cd F03_PREVIEW/CODEBASE
npm ci
npm run dev
```

## Validation

L’interface permet de vérifier l’ordre des séquences, le rythme du Fast Match Cut, le cadrage, le texte, le logo et les presets visuels. Les contrôles de contraste, luminosité, grain, vignette, zoom et colorimétrie sont appliqués à la composition. L’export du `codex.json` conserve la session et les réglages validés par le Champion.

## Contrat avec F00 et PICTOR

```text
F00/OUT/sequences.json
        │
        ▼
F03_PREVIEW/public/sequences.json
        │
        ▼
Preview validée
        │
        ▼
F03_PICTOR
```

F03_PREVIEW et F03_PICTOR doivent utiliser la même composition Remotion et le même manifeste. La preview sert à visualiser et valider ; PICTOR sert à rendre le MP4 final.

## Composition et transformations

Le codex peut définir une composition `vertical` (1080×1920), `horizontal` (1920×1080) ou `square` (1080×1080). La vidéo source peut être adaptée avec `fit: cover` ou `fit: contain`. Le mode `background_fill: blurred_video` utilise une copie agrandie et floutée de la source pour remplir les zones libres lors du passage d’une source horizontale à une composition verticale.

Les rotations sont définies dans `session.composition`. `rotation_mode: per_sequence` ajoute `rotation_step_deg` à chaque séquence virtuelle ; `rotation_mode: continuous` interpole jusqu’à `rotation_total_deg` sur la durée de la composition. `rotation_layer` vaut `video` pour garder textes et logo droits, ou `composition` pour faire tourner l’ensemble des calques. Ces paramètres sont exportés dans le codex et réutilisés par PICTOR.
