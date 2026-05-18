# LACRIMAE — CARNET DE BORD DE CAMPAGNE
> *"Les larmes de l'Ange ne tombent jamais en vain."*
> Croisade active : — | Magos : —

---

## ÉTAT DE LA FLOTTE

| Frégate | Nom | Statut | Date Scellage |
|---------|-----|--------|---------------|
| F01 | CANTOR | ⚪ EN ATTENTE | — |
| F02 | VISIO | ⚪ EN ATTENTE | — |
| F03 | PICTOR | ⚪ EN ATTENTE | — |
| F04 | SIGNUM | ⚪ EN ATTENTE | — |
| — | LAC_CUSTOS | ⚪ EN ATTENTE | — |

**Légende :** ⚪ En attente | 🟡 En forge | 🔵 En test | 🟢 SCELLÉE | 🔴 BLOQUÉE

---

## FIL D'ARIANE

| Date | Frégate | Phase | Action | Validation |
|------|---------|-------|--------|------------|
| 2026-05-18 | FLOTTE | ALPHA | Cahier des charges V1 validé — brainstorming terminé | ✅ |
| 2026-05-18 | FLOTTE | ALPHA | Architecture 4 frégates validée — Lore Blood Angels appliqué | ✅ |
| 2026-05-18 | FLOTTE | ALPHA | Repo GitHub créé — documentation initiale poussée | ✅ |

---

## COMPTEUR DE GUERRE

```
Forge des Frégates : [░░░░░░░░░░] 0/4 Frégates Scellées (0%)
LAC_CUSTOS         : [░░░░░░░░░░] En attente
Fleet Seal         : [░░░░░░░░░░] En attente — Test E2E requis
Objectif           : Fleet Seal Certificate + 1er Short rendu
```

---

## ARCHITECTURE DE LA FLOTTE

```
[audio_clean.mp3 + images/]
         │
         ▼
[F01 CANTOR] ──► timing.json                            ⚪ EN ATTENTE
         │
         ▼
[F02 VISIO] ──► creative_config.json                    ⚪ EN ATTENTE
         │
         ▼
[F03 PICTOR] ──► short_final.mp4                        ⚪ EN ATTENTE
         │
         ▼
[F04 SIGNUM] ──► short_master.mp4                       ⚪ EN ATTENTE
```

---

## FRÉGATE F01 — CANTOR ⚪ EN ATTENTE

### Mission
Transcrire l'audio propre via faster-whisper et produire le fichier de timing mot par mot en JSON.

### Composants à Forger
- ⚪ `LAC_F01.ipynb` — Notebook principal Colab
- ⚪ `lac_f01_cantor.py` — Script transcription faster-whisper
- ⚪ `README_DEV.md` — Documentation développeur

### Inputs
```
IN/
└── audio_clean.mp3     ← Depuis SHARED/ (manuel)
```

### Outputs
```
OUT/
└── timing.json         ← {words: [{word, start_frame, end_frame, is_strong}]}
```

---

## FRÉGATE F02 — VISIO ⚪ EN ATTENTE

### Mission
Servir un viewer HTML interactif via Flask + port Colab natif. Permet de prévisualiser le timing, les images, les fast cuts et les sous-titres avant tout rendu lourd. Produit le creative_config.json de validation.

### Composants à Forger
- ⚪ `LAC_F02.ipynb` — Notebook principal Colab
- ⚪ `lac_f02_flask.py` — Serveur Flask (endpoints REST)
- ⚪ `lac_f02_viewer.html` — Viewer HTML (timeline, images, sous-titres, sliders)
- ⚪ `README_DEV.md` — Documentation développeur

### Inputs
```
IN/
├── timing.json             ← De F01 CANTOR
└── images/                 ← Depuis SHARED/ (manuel)
```

### Outputs
```
OUT/
└── creative_config.json    ← {fps, cut_interval, font_main, font_strong, grain_opacity, filters}
```

---

## FRÉGATE F03 — PICTOR ⚪ EN ATTENTE

### Mission
Rendre la vidéo frame par frame via Remotion (React). Intègre les images en fast cut, les sous-titres synchronisés, l'overlay grain et les filtres CSS. Checkpoint par batch de frames.

### Composants à Forger
- ⚪ `LAC_F03.ipynb` — Notebook principal Colab
- ⚪ `src/` — Template Remotion (composants React)
- ⚪ `README_DEV.md` — Documentation développeur

### Inputs
```
IN/
├── timing.json             ← De F01 CANTOR
├── creative_config.json    ← De F02 VISIO
├── audio_clean.mp3         ← Depuis SHARED/
└── images/                 ← Depuis SHARED/
```

### Outputs
```
OUT/
└── short_final.mp4         ← Vidéo rendue 1080x1920
```

---

## FRÉGATE F04 — SIGNUM ⚪ EN ATTENTE

### Mission
Finalisation FFmpeg : ajout métadonnées, optimisation codec, vérification durée = durée audio.

### Composants à Forger
- ⚪ `LAC_F04.ipynb` — Notebook principal Colab
- ⚪ `lac_f04_signum.py` — Pipeline FFmpeg finalisation
- ⚪ `README_DEV.md` — Documentation développeur

### Inputs
```
IN/
├── short_final.mp4         ← De F03 PICTOR
└── timing.json             ← De F01 CANTOR (pour vérification durée)
```

### Outputs
```
OUT/
└── short_master.mp4        ← Livrable final Magos
```

---

## NOTES DE FORGE

### 2026-05-18 — Séance de Fondation
Architecture validée. Décisions actées :
- Audio séparé fourni directement par le Magos (pas de Demucs requis en V1)
- Pas de ngrok — port forwarding Colab natif (google.colab.output.eval_js)
- Images 1:1 : bandes noires latérales, pas de zoom
- Durée vidéo = durée exacte audio_clean.mp3
- Fast cut : 6 à 8 frames par image
- Lore Blood Angels appliqué. Projet baptisé LACRIMAE.

---

## PRINCIPES — LES RITES DU SANG

1. **LOI D'ISOLEMENT** — Chaque frégate est une île. Aucun accès croisé.
2. **RITE DE VALIDATION** — LAC_CUSTOS obligatoire avant chaque transit.
3. **GRATUITÉ ABSOLUE** — 0€ de coût opérationnel.
4. **CHECKPOINT SACRÉ** — F03 PICTOR est toujours récupérable après interruption.
5. **TRANSIT MANUEL** — Le Magos déplace les fichiers. Jamais les scripts.
6. **DURÉE PAR L'AUDIO** — La durée de la vidéo est dictée par l'audio. Toujours.
