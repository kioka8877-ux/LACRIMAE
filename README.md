# LACRIMAE
> *"For the Angel's Tears shall become gold."*

**Outil d'automatisation de Shorts YouTube / TikTok — Style Premium Poétique**
Architecture en Frégates | Google Colab + Drive | Coût opérationnel : 0$

---

## Concept

LACRIMAE est une machine de production de contenu vidéo vertical (1080x1920) entièrement automatisée, conçue pour tourner sur Google Colab (GPU T4 gratuit) avec stockage sur Google Drive. L'objectif : générer 10+ vidéos par jour au format "citations / poésie premium" avec sous-titres synchronisés, fast match cut et esthétique cinématographique luxe.

Nommé d'après les **Larmes de l'Ange** — les larmes de Sanguinius, Primarque des Blood Angels, forgé en arme et en beauté.

---

## Architecture de la Flotte

```
[audio_clean.mp3 + images/]  ← Fournis par le Magos dans SHARED/
         │
         ▼
[F01 CANTOR] ──► timing.json                    (Whisper — transcription mot par mot)
         │
         ▼
[F02 VISIO] ──► creative_config.json            (Viewer HTML — preview & validation)
         │
         ▼
[F03 PICTOR] ──► short_final.mp4                (Remotion — rendu frame par frame)
         │
         ▼
[F04 SIGNUM] ──► short_master.mp4               (FFmpeg — finalisation & métadonnées)
```

---

## Frégates

| Frégate | Nom | Mission | Technologie |
|---------|-----|---------|-------------|
| F01 | **CANTOR** | Transcription audio → timing JSON | faster-whisper |
| F02 | **VISIO** | Viewer interactif preview | Flask + HTML + Port Colab |
| F03 | **PICTOR** | Rendu vidéo frame par frame | Remotion (React) |
| F04 | **SIGNUM** | Assemblage final MP4 | FFmpeg |
| — | **LAC_CUSTOS** | Validation inter-frégates | Python stdlib only |
| F03 | **PREVIEW** | Preview interactive du codex v4 | Vite + React + Remotion Player |

---

## Lois de la Flotte — Les Rites du Sang

1. **LOI D'ISOLEMENT** — Chaque frégate est une île. Aucun accès croisé aux données.
2. **RITE DE VALIDATION** — LAC_CUSTOS obligatoire avant chaque transit.
3. **GRATUITÉ ABSOLUE** — 0€ de coût opérationnel. Colab T4 + Drive uniquement.
4. **CHECKPOINT SACRÉ** — F03 PICTOR est toujours récupérable après interruption Colab.
5. **TRANSIT MANUEL** — Le Magos déplace les fichiers. Jamais les scripts.
6. **DURÉE PAR L'AUDIO** — La durée de la vidéo finale est dictée par l'audio fourni.

---

## Structure Drive

```
DRIVE_LACRIMAE/
│
├── SHARED/
│   ├── audio_clean.mp3          ← Audio voix propre (fourni par le Magos)
│   └── images/
│       ├── img_01.jpg           ← 9:16 ou 1:1 (bandes noires si 1:1)
│       └── img_02.jpg ...
│
├── F01_CANTOR/
│   ├── CODEBASE/
│   │   ├── LAC_F01.ipynb
│   │   ├── lac_f01_cantor.py
│   │   └── README_DEV.md
│   └── OUT/
│       └── timing.json
│
├── F02_VISIO/
│   ├── CODEBASE/
│   │   ├── LAC_F02.ipynb
│   │   ├── lac_f02_flask.py
│   │   ├── lac_f02_viewer.html
│   │   └── README_DEV.md
│   └── OUT/
│       └── creative_config.json
│
├── F03_PICTOR/
│   ├── CODEBASE/
│   │   ├── LAC_F03.ipynb
│   │   ├── src/                 ← Template Remotion (React)
│   │   └── README_DEV.md
│   └── OUT/
│       └── short_final.mp4
│
├── F04_SIGNUM/
│   ├── CODEBASE/
│   │   ├── LAC_F04.ipynb
│   │   ├── lac_f04_signum.py
│   │   └── README_DEV.md
│   └── OUT/
│       └── short_master.mp4
│
├── LAC_CUSTOS.py
│
└── TRACKING/
    ├── LACRIMAE_CAMPAIGN_LOG.md
    └── LACRIMAE_TRANSFER_LOG.md
```

---

## Spécifications Vidéo

| Paramètre | Valeur |
|-----------|--------|
| Résolution | 1080 x 1920 (9:16 vertical) |
| Framerate | 30 fps |
| Durée | = durée de l'audio fourni (automatique) |
| Format sortie | MP4 H.264 |
| Images 9:16 | Plein cadre |
| Images 1:1 | Centré, bandes noires latérales |
| Fast Cut | 6 à 8 frames par image (~0.2-0.27s) |
| Sous-titres | Synchronisés mot par mot via timing.json |

---

## Esthétique Visuelle

- **Typographie** : Cinzel (corps) + Playfair Display Italic (mots forts) — via @remotion/google-fonts
- **Film Grain** : Overlay vidéo `mix-blend-mode: screen` opacité 0.3
- **Colorimétrie** : Filtres CSS `contrast(1.2) brightness(0.9) sepia(0.15)` — tons chauds, sombres
- **Animations** : Fade-in par mot, micro-zoom `scale(1.02)` à l'apparition

---

## Démarrage Rapide

```
1. Monter Drive dans Colab
2. Copier SHARED/ avec ton audio + images
3. Ouvrir F01_CANTOR/CODEBASE/LAC_F01.ipynb → Lancer
4. Valider avec LAC_CUSTOS.py --frigate F01 --mode check-out
5. Copier F01/OUT/ → F02/IN/
6. Ouvrir F02_VISIO → Prévisualiser, ajuster, valider
7. ... (suivre le registre des transferts)
8. Récupérer short_master.mp4 dans F04/OUT/
```

---

## Tracking

- [Carnet de Campagne](./TRACKING/LACRIMAE_CAMPAIGN_LOG.md)
- [Registre des Transferts](./TRACKING/LACRIMAE_TRANSFER_LOG.md)

---

> *LACRIMAE — Né des larmes de Sanguinius, forgé en or.*
> *Ad Victoriam.*
