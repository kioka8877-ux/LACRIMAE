# LACRIMAE dev8 — Spider-Man Reveal Compilation

> *For the Angel's Tears shall become gold.*

LACRIMAE dev8 est un pipeline de production de Shorts verticaux en mode **reveal compilation**. Contrairement à dev4 (Fast Match Cut depuis une source unique), dev8 assemble **4 clips vidéo indépendants** avec narration textuelle, musique synchronisée (loop → drop) et effets dark luxury.

## Vue d'ensemble

```text
Clips Spider-Man + Musique
        │
        ▼
F00-E Reveal Clip Prep          F00-MUSIC Audio Analysis
prépare les 4 clips H.264       analyse la musique (beats, timeline)
        │                                │
        ▼                                ▼
    reveal_sources.json          music.mp3 + music_timeline.json
        │                                │
        └──────────┬─────────────────────┘
                   ▼
           F03 PREVIEW
     visualisation interactive
     (panels: Reveal, Text, Effects, Music, Audio Sync)
                   │
                   ▼
           F04 SIGNUM
     rendu Remotion → short_final.mp4
                   │
                   ▼
           F05 CAMOUFLAGE
     H.264 yuv420p, faststart, loudnorm -14 LUFS
                   │
                   ▼
           F06 LUTHER
     nettoyage métadonnées, stream copy
                   │
                   ▼
         short_master.mp4 (livrable)
```

## Prérequis

- **Node.js** ≥ 20
- **FFmpeg** (pour F00-E, F05, F06)
- **Python** ≥ 3.8 (pour F00-E, F05, F06)
- **npm** (pour F03 Preview et F04 Render)

## Quickstart — Preview locale

```bash
cd F03_PREVIEW/CODEBASE
npm ci
npm run dev
```

→ Ouvre `http://localhost:5173` pour voir la preview interactive.

## Frégates dev8

| Étape | Nom | Mission | Sortie |
|-------|-----|---------|--------|
| **F00-E** | Reveal Clip Prep | Préparer les clips vidéo (H.264, 30fps) | `reveal_sources.json` + `clips/*.mp4` |
| **F00-MUSIC** | Audio Analysis | Analyser la musique (beats, waveform, segments) | `music.mp3` + `music_timeline.json` |
| **F03** | Preview | Visualisation interactive du montage | `codex.json` validé |
| **F04** | Signum | Rendu Remotion → MP4 | `short_final.mp4` |
| **F05** | Camouflage | Réencodage H.264 yuv420p, faststart, loudnorm | `short_camouflaged.mp4` |
| **F06** | Luther | Nettoyage métadonnées, stream copy | `short_master.mp4` |

### Workflows GitHub Actions

| Workflow | Fichier | Rôle |
|----------|---------|------|
| F00-E | `dev8_f00e.yml` | Prépare les clips à partir d'un artifact source |
| F00-MUSIC | `dev8_f00_music.yml` | Analyse le fichier audio |
| F03+F04 | `dev8_spiderman_render.yml` | Rendu complet (download artifacts → inject → build → render) |
| F03+F04 (reveal) | `dev8_reveal_render.yml` | Rendu reveal compilation |
| F05+F06 | `f05-f06.yml` | Post-traitement et livrable final |

## Assets

```text
F03_PREVIEW/CODEBASE/public/
├── codex.json              ← manifeste principal (contient reveal_manifest)
├── reveal_sources.json     ← sources vidéo + narrative + styles
├── clips/
│   ├── clip1.2.mp4         ← 6s — OTHERS SPIDERMAN (reveal_01)
│   ├── clip2.2.mp4         ← 4s — OTHERS SPIDERMAN (reveal_02)
│   ├── clip3.2.mp4         ← 7s — OTHERS SPIDERMAN (reveal_03)
│   └── clip4.2.mp4         ← 3s — THIS ONE (reveal_04, final)
├── audio/
│   └── music.mp3           ← musique synchronisée
├── backgrounds/            ← arrière-plans
├── logo.png                ← logo projet
├── codex.10.json           ← backup du codex
└── music_timeline.json     ← beats et segments audio
```

### Taille des assets

| Fichier | Taille | Codec |
|---------|--------|-------|
| clip1.2.mp4 | 2.4 MB | H.264 |
| clip2.2.mp4 | 1.2 MB | H.264 |
| clip3.2.mp4 | 5.3 MB | H.264 |
| clip4.2.mp4 | 17.7 MB | H.264 |
| music.mp3 | 0.9 MB | AAC |
| **Total** | **~27 MB** | |

> **Important** : Tous les clips doivent être **H.264** (pas H.265/HEVC). Chrome Headless Shell ne supporte pas HEVC, ce qui provoque un timeout au render.

## Panels F03 Preview

| Panel | Contrôles |
|-------|-----------|
| **REVEAL** | Labels, narration, shake, darkness, darkLuxury, transitions |
| **TEXTES** | 5 panneaux (Theme, Others, Wait, This One, Camo) : scale, position, couleurs, dual_color |
| **EFFECTS** | Presets visuels, vignette, grain, bloom, zoom |
| **MUSIQUE** | Waveform, match cut IN/OUT, volume, speed, mode sync |
| **AUDIO SYNC** | Loop/reveal, upload audio, lecteur play/pause, waveform interactive |

## Format du Codex

Le codex contient un objet `reveal_manifest` :

```json
{
  "reveal_manifest": {
    "format": "reveal_compilation",
    "mode": "reveal_compilation",
    "fps": 30,
    "total_frames": 600,
    "duration_seconds": 20,
    "audio_src": "audio/music.mp3",
    "final_scene_id": "reveal_04",
    "scenes": [
      { "id": "reveal_01", "start_frame": 0, "end_frame": 180, "source_id": "clip1.2.mp4" },
      { "id": "reveal_02", "start_frame": 180, "end_frame": 300, "source_id": "clip2.2.mp4" },
      { "id": "reveal_03", "start_frame": 300, "end_frame": 510, "source_id": "clip3.2.mp4" },
      { "id": "reveal_04", "start_frame": 510, "end_frame": 600, "source_id": "clip4.2.mp4", "is_final": true }
    ],
    "audio_sync": {
      "mode": "reveal_loop",
      "loop_in": 0, "loop_out": 16.8,
      "reveal_in": 54.2, "reveal_out": 59.4,
      "transition": "beat_cut"
    }
  }
}
```

### Audio Sync (Reveal Loop)

La musique fonctionne en 2 phases :

```
Clips 1-3 (OTHERS) : loop entre loop_in et loop_out
                      ↓
Clip 4 (THIS ONE)  : saute à reveal_in (le drop)
```

## Render F04

### Via GitHub Actions

1. Aller dans **Actions** → **DEV8 — Spider-Man F03+F04 Render**
2. Cliquer **Run workflow**
3. Renseigner les run IDs F00-E et F00-MUSIC
4. Attendre (~5 min)
5. Télécharger l'artefact `short_final.mp4`

### En local

```bash
cd F03_PREVIEW/CODEBASE
npm ci
npm run build
npm run render
# → out/short_final.mp4
```

> Le timeout est configuré à 120s dans `package.json` pour les clips volumineux.

## Release

Le master final est disponible sur :

```
https://github.com/kioka8877-ux/LACRIMAE/releases/download/f04_f05_f06_spiderman_master/short_master.mp4
```

**Spécifications du livrable :**
- Format : MP4 (H.264 + AAC)
- Résolution : 1080×1920 (vertical)
- Durée : 20 secondes (600 frames @ 30fps)
- Taille : ~26 MB
- faststart : ✅ (lecture streaming)
- Audio : normalisé -14 LUFS
- Métadonnées : supprimées

## Notes techniques

- **Codec** : Tous les clips doivent être H.264. HEVC → timeout Chrome Headless.
- **Timeout** : 120s dans `package.json` (clip4.mp4 = 17 MB).
- **Concurrency** : Remotion render avec 2 workers (`--concurrency=2`).
- **darkLuxury** : Filter CSS appliqué au clip final via le slider (0-100%).
- **dual_color** : Si 2+ mots ET dual_color activé, chaque mot a sa couleur.
- **whiteSpace** : `nowrap` pour garder le texte sur 1 ligne.
- **AudioContext** : Nécessite un geste utilisateur pour démarrer (autoplay bloqué).
