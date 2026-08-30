# F03 PREVIEW — dev8 (Reveal Compilation)

F03_PREVIEW est la salle de contrôle interactive du Short LACRIMAE. En mode **reveal_compilation**, elle affiche 4 clips vidéo avec narration textuelle, musique synchronisée, effets dark luxury et transitions beat cut.

## Mode de fonctionnement

| | dev4 (Fast Match Cut) | dev8 (Reveal Compilation) |
|---|---|---|
| **Source** | 1 vidéo source longue | 4 clips MP4 indépendants |
| **Manifeste** | `sequences.json` | `reveal_sources.json` |
| **Montage** | Frames extraites, montage auto | Clips pleine durée, transition manuelle |
| **Narration** | Texte par séquence | Labels (OTHERS, THIS ONE, WAIT) |
| **Musique** | Pas de sync | Audio sync (loop → drop) |

## Entrées

```text
F03_PREVIEW/CODEBASE/public/
├── codex.json              ← manifeste principal (contient reveal_manifest)
├── reveal_sources.json     ← sources vidéo + narrative + styles
├── clips/
│   ├── clip1.2.mp4         ← reveal_01 (6s) — OTHERS SPIDERMAN
│   ├── clip2.2.mp4         ← reveal_02 (4s) — OTHERS SPIDERMAN
│   ├── clip3.2.mp4         ← reveal_03 (7s) — OTHERS SPIDERMAN
│   └── clip4.2.mp4         ← reveal_04 (3s) — THIS ONE (final)
├── audio/
│   └── music.mp3           ← musique synchronisée
└── backgrounds/            ← arrière-plans optionnels
```

## Lancement

```bash
cd F03_PREVIEW/CODEBASE
npm ci
npm run dev
```

## Panels de contrôle

| Panel | Contrôles |
|-------|-----------|
| **REVEAL** | Labels, narration, shake, darkness, darkLuxury, transitions |
| **TEXTES** | 5 panneaux (Theme, Others, Wait, This One, Camo) : scale, position, couleurs, dual_color |
| **EFFECTS** | Presets visuels, vignette, grain, bloom, zoom |
| **MUSIQUE** | Waveform, match cut IN/OUT, volume, speed, mode sync |
| **AUDIO SYNC** | Loop/reveal, upload audio, lecteur play/pause, waveform interactive |

### Détails des panels

**REVEAL** : Labels narrative (OTHERS SPIDERMAN, THIS ONE, WAIT FOR THIS ONE), mode narration (off/roll/shake), shake_power, shake_duration, darkness, dark_luxury (0-100%), transitions (cut/crossfade/blur/zoom_glitch).

**TEXTES** : 5 panneaux individuels avec scale, position V/H, color_1, color_2, dual_color. Le panneau "2 couleurs" n'apparaît que si le texte contient 2+ mots.

**AUDIO SYNC** : Mode off/reveal_loop, loop_in/loop_out (segment répété), reveal_in/reveal_out (partie forte), transition beat_cut/crossfade/fade_out, upload fichier audio, lecteur play/pause/stop/seek, waveform SVG avec régions.

## Contrat avec F00 et F04

```text
F00-E (Reveal Clip Prep)
    │ clips/*.mp4 + reveal_sources.json
    ▼
F03_PREVIEW (validation)
    │ codex.json + reveal_sources.json
    ├──► Preview interactive (dev server)
    └──► F04 SIGNUM (render Remotion)
            │ short_final.mp4
            ▼
         F05 CAMOUFLAGE → F06 LUTHER
            │ short_master.mp4
            ▼
         Livrable final
```

## Notes techniques

- Les clips doivent être **H.264** (pas H.265/HEVC) — Chrome Headless Shell ne supporte pas HEVC
- Le timeout Remotion est configuré à **120s** dans `package.json`
- `revealWaveformPoints` est calculé dynamiquement dans OmniComposition.jsx
- Le filter `darkLuxuryNoirFilter` est appliqué au clip final via le slider Dark Luxury
- `whiteSpace: 'nowrap'` empêche le retour à la ligne du texte
- `renderColoredText()` applique des couleurs par span si dual_color activé
