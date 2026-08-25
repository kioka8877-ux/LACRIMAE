# DEV7 — Audio Sync, Loop & Climax

## Objectif

`dev7` ajoute une couche audio optionnelle à LACRIMAE sans modifier le comportement existant de `dev4`. Une musique peut être chargée dans F03 Preview, synchronisée avec la timeline vidéo, bouclée pendant l’introduction, puis libérée sur un climax avant le Match Cut.

## Contrat

Le manifeste `dev7.music-timeline.v1` porte le fichier audio, le mode de synchronisation, les beats, l’offset, la zone `loop_in`/`loop_out`, le climax, le frame de début du Match Cut et les volumes intro/Match Cut. F03 et PICTOR utilisent la même normalisation et les mêmes calculs de segments.

## Flux

```text
F00-MUSIC → music_timeline.json → F03 Preview → validation → F04/PICTOR → F05/F06
```

`F00-MUSIC` est optionnel. Son workflow isolé reçoit une URL audio publique et publie un artifact contenant `music_timeline.json` et l’audio. Le workflow F04 accepte ensuite l’identifiant de cet artifact via `music_run_id`.

## Preview

Le panneau `Audio Sync` permet de charger le fichier, choisir le mode `off`, `manual`, `assisted` ou `beat_locked`, afficher les marqueurs, régler l’offset, définir la boucle, positionner le climax et régler les volumes. L’audio est lu dans le même Player que la vidéo. Lorsque la boucle est active, la section choisie est répétée jusqu’au climax ou au début du Match Cut.

## Parité

La composition Preview et PICTOR consomment la même logique de segments audio. Les effets vidéo et le texte EGO restent pilotés par la timeline Hybrid. Un climax musical peut prolonger l’introduction jusqu’à sa position, puis déplacer le Hard Cut et le début du Match Cut.

## Compatibilité

Sans musique, les modes 1 et 2 restent inchangés. F06 Luther conserve la normalisation finale YouTube déjà validée : MP4/H.264, `yuv420p`, FPS constant et AAC-LC stéréo 48 kHz.

## Test réel à venir

Pour un test audio réel, fournir un fichier musical ou une URL publique. Le premier test doit valider la lecture, la boucle manuelle, le climax manuel et la parité F03/PICTOR avant d’activer l’analyse automatique avancée.
