# F03 PICTOR — dev4

## Mission

PICTOR est le renderer headless de LACRIMAE. Il rend la même composition Remotion que F03_PREVIEW à partir de la vidéo source, du manifeste de séquences virtuelles et du codex validé. Il ne reçoit pas de petits clips exportés.

## Entrées

```text
public/video_source.mp4
src/data/sequences.json
src/data/codex.json
```

`sequences.json` contient les frames de départ dans la source et les positions correspondantes dans la timeline finale. Le moteur lit directement la vidéo source, affiche chaque séquence au moment prévu et met la piste audio source en sourdine. Une voix externe pourra être ajoutée séparément dans une évolution ultérieure.

## Exécution

```bash
cd F03_PICTOR/CODEBASE
npm install
npm run render
```

La sortie est `out/short_final.mp4`. Le workflow GitHub Actions copie les données générées par F00 avant le rendu.

## Architecture partagée

F03_PREVIEW et F03_PICTOR utilisent `OmniComposition` et `virtualSequences.js`. Cette composition contient la vidéo, les presets de colorimétrie, le grain, la vignette, le logo et les éléments textuels. La preview sert à contrôler la composition ; PICTOR la rend sans interface.

## Compatibilité avec F00

```text
F00/OUT/sequences.json
        │
        ▼
src/data/sequences.json
        │
        ▼
OmniComposition
        │
        ▼
out/short_final.mp4
```

Pour une cible de 10 secondes à 30 fps avec 7 frames par séquence, le manifeste contient environ 43 à 44 séquences de timeline.

## Ancien moteur Colab

`LAC_F03.ipynb`, `components/LacrimaeShort.jsx` et `Root.colab.legacy.jsx` sont conservés comme référence historique. Ils ne font pas partie du chemin de rendu dev4.
