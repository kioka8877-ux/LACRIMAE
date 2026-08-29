# DEV8 — Reveal Compilation Implementation

## Date
2026-08-28

## Objectif
Implémenter le mode Reveal Compilation (Others vs This One) pour la branche dev8.

## Architecture

```text
F00-E → F00-MUSIC → F03 Preview → F04 PICTOR
```

F00-E extrait et normalise les clips (3 à 6, H.264 1080×1920). F00-MUSIC analyse l'audio (BPM, beats, climax). F03 Preview est le seul point de montage : l'opérateur valide les textes, la boucle musicale et les paramètres visuels. F04 rend le MP4 déterministe.

## Reveal Panel Controls (F03 Preview)

| Paramètre | Plage | Description |
|-----------|-------|-------------|
| Durée (in/out) | secondes | Plage de découpe du clip source |
| Rotation | -180° à 180° | Rotation du clip en degrés |
| Échelle | 0.2x à 3x | Zoom in/out |
| Position H | 0% à 100% | Position horizontale |
| Position V | 0% à 100% | Position verticale |
| Transition | SFX / Silencieux | Type de transition |

Ces contrôles s'appliquent à chaque clip OTHER ainsi qu'au clip `THIS ONE` (final reveal). Les valeurs sont sauvegardées dans `codex.json` via le bouton d'export.

## Variable Clip Count

Le pipeline supporte de 3 à 6 clips (voir `DEV8_VARIABLE_CLIPS.md`). Le dernier clip est automatiquement marqué `final_reveal`. Le champ explicite `final_reveal: true` reste supporté.

## Workflows GitHub Actions

### dev8_spiderman_test.yml (F00-E)
- Télécharge les clips depuis la release GitHub `spiderman`
- Crée le `reveal_request.json` avec les timings opérateur
- Lance F00-E (clip prep)
- Upload l'artifact `f00e-clips`

### dev8_spiderman_music.yml (F00-MUSIC)
- Télécharge l'audio depuis la release `music-spiderman`
- Lance F00-MUSIC (BPM, beats, climax)
- Upload l'artifact `f00-music`

### dev8_spiderman_render.yml (F03+F04)
- Télécharge les artifacts F00-E et F00-MUSIC
- Injecte dans F03 Preview
- Build + Render Remotion
- Upload `short_final.mp4`

**Note :** Les runners GitHub Actions nécessitent `sudo apt-get install -y ffmpeg` (FFprobe non pré-installé).

## Validation Spider-Man (2026-08-28)

| Étape | Status |
|-------|--------|
| F00-E (4 clips) | ✅ Réussi — clips 1080×1920 H.264 |
| F00-MUSIC (audio) | ✅ Réussi — BPM, beats, climax |
| F03 Preview (sandbox) | ✅ Dev server local — contrôles reveal opérationnels |
| F03+F04 Render | 🔄 Lancé |
