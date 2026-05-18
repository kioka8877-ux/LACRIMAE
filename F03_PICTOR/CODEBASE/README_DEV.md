# F03 PICTOR — README DÉVELOPPEUR
> *"Le Peintre rend. Frame par frame, les larmes deviennent lumière."*

---

## Mission

Rendre la vidéo verticale 1080x1920 frame par frame via Remotion (React). Intègre les images en fast cut, les sous-titres synchronisés mot par mot, l'overlay grain et les filtres CSS cinématographiques.

---

## Technologie

| Composant | Version cible |
|-----------|---------------|
| Node.js | 20 LTS |
| Remotion | ^4.0.0 |
| React | ^18.0.0 |
| @remotion/google-fonts | ^4.0.0 |
| Colab GPU | T4 (rendu CPU possible mais lent) |

---

## Fichiers

```
CODEBASE/
├── LAC_F03.ipynb           ← Notebook Colab — point d'entrée
├── README_DEV.md           ← Ce fichier
└── src/
    ├── index.jsx           ← Entry point Remotion (registerRoot)
    ├── Root.jsx            ← Template — réécrit par le notebook avec les props réels
    ├── package.json        ← Dépendances npm
    └── components/
        └── LacrimaeShort.jsx   ← Composant principal de rendu
```

---

## Architecture du composant

```
LacrimaeShort
├── Audio (audio_clean.mp3)
├── ImageBackground
│   ├── Img (image courante selon cut_interval)
│   └── micro-zoom scale(1.02 → 1.0) à chaque cut
├── Overlay gradient sombre (bottom)
├── GrainOverlay (SVG feTurbulence, mix-blend-mode: screen)
└── SubtitleLayer
    ├── Font: Cinzel (mots normaux) | Playfair Display Italic (mots forts)
    ├── Couleur: #FFF (normal) | #e8c96a or (fort)
    └── Fade-in par mot (interpolate opacity 0→1 sur 6 frames)
```

---

## Inputs / Outputs

```
IN/
├── timing.json             ← De F01 CANTOR
├── creative_config.json    ← De F02 VISIO
├── audio_clean.mp3         ← De SHARED
└── images/
    ├── img_01.jpg
    └── ...

OUT/
└── short_final.mp4         ← 1080x1920, 30fps, H.264
```

---

## Spécifications rendu

| Paramètre | Valeur |
|-----------|--------|
| Résolution | 1080 × 1920 (9:16) |
| FPS | 30 (issu de timing.json) |
| Durée | = timing.audio_duration_s (LOIT D'AUDIO) |
| Codec | H.264 (défaut Remotion) |
| Images 1:1 | object-fit: cover (cadrage auto centre) |
| Images 9:16 | Plein cadre |
| Fast cut | cut_interval_frames (issu de creative_config.json) |

---

## CHECKPOINT SACRÉ

Si Colab se déconnecte pendant le rendu, Remotion utilise son cache interne de frames. En relançant le rendu depuis l'étape 3, il reprend automatiquement là où il s'est arrêté. **Ne jamais supprimer `/content/lacrimae_render/` avant la fin du rendu.**

---

## Rites du Sang applicables

- **LOI D'ISOLEMENT** : PICTOR ne lit que `F03/IN/`. Aucun accès aux autres frégates.
- **CHECKPOINT SACRÉ** : F03 est toujours récupérable après interruption Colab.
- **DURÉE PAR L'AUDIO** : `durationInFrames = timing.total_frames`. Immuable.
- **RITE DE VALIDATION** : LAC_CUSTOS check-in avant tout rendu, check-out avant transit.
