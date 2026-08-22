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
