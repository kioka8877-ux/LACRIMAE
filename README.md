# LACRIMAE — branche `dev`
> *"For the Angel's Tears shall become gold."*

**Machine à memes 9:16 automatisée** — transforme une vidéo longue en clips viraux.
Branche de transformation du pipeline LACRIMAE original (visible sur `main`).
Pipeline héritier : F00-F02 nouveaux, F03-F06 pillés d'OMNIS-WATCH (monteur qui
marche déjà en production).

---

## Pipeline dev

```
[video longue + logos] ← fournis par le Magos dans SHARED/IN
         │
         ▼
[F00 INGEST]  ──► video_source.mp4 + d00_manifest.json      (yt-dlp ou fichier local)
         │
         ▼
[F01 SELECT]  ──► cutlist.json                               (modèle de vision OpenRouter —
         │                                                   regarde la vidéo comme un humain,
         │                                                   N séquences de 3-10s, ZÉRO transcript)
         │
         ▼
[F02 FORMAT]  ──► clips/clip_XXX.mp4 9:16 + codex.json       (profil blur-pad OU reframe)
         │
         ▼
[F03 PREVIEW] ──► codex.json validé                           (Vite + @remotion/player :
         │                                                   presets, titre statique, logo,
         │                                                   volume, coup brutal, validation)
         │
         ▼
[F04 RENDER]  ──► video_finale.mp4                            (Remotion — logo + titre + clip)
         │
         ▼
[F05 CAMOUFLAGE] ──► youtube_final.mp4                        (métadonnées + loudnorm -14 LUFS)
         │
         ▼
[F06 LUTHER]  ──► clean_final.mp4                             (stream copy — empreinte zéro)
```

## Frégates

| Frégate | Nom | Mission | Technologie |
|---------|-----|---------|-------------|
| F00 | INGEST | Collecte de la vidéo longue (URL YouTube ou fichier) | yt-dlp / FFmpeg |
| F01 | SELECT | Sélection des séquences par vision (comme un humain) | OpenRouter vision |
| F02 | FORMAT | Découpe + 9:16 (blur-pad optimisé ou reframe) + template codex | FFmpeg |
| F03 | PREVIEW | Aperçu temps réel, presets, titre, logo, volume, validation | Vite + @remotion/player |
| F04 | RENDER | Rendu final logo + titre statique + coup brutal 3s | Remotion |
| F05 | CAMOUFLAGE | Wipe métadonnées + loudnorm | FFmpeg |
| F06 | LUTHER | Effacement empreinte numérique (stream copy) | FFmpeg |
| — | LAC_CUSTOS | Validation inter-frégates | Python stdlib |

## Choix de conception (dev)

- **PAS de transcript** : la sélection se fait par un modèle de vision (OpenRouter),
  adapté aux vidéos sans sous-titres (stars, foot, extraits).
- **PAS de reframe par défaut** : blur-pad (duplique + flou) — la vidéo nette
  remplit la largeur, le fond est flouté/assombri/désaturé. Le profil `reframe`
  (crop central) existe en alternative.
- **PAS de SFX, PAS de sous-titres** : le titre est un texte statique (fade-in)
  positionné dans la zone safe (bandes floues), couleur et font au choix.
- **Coup brutal** : flash/impact toutes les 3s (90 frames) — réglable, 0 = désactivé.
- **Audio** : uniquement un réglage de volume (le Magos ajoute l'audio sur YouTube).

## Rites du Sang

1. **LOI D'ISOLEMENT** — chaque frégate lit son `IN/`, écrit son `OUT/`.
2. **RITE DE VALIDATION** — `LAC_CUSTOS.py` obligatoire avant chaque transit.
3. **TRANSIT MANUEL** — le Magos déplace les fichiers, jamais les scripts.
4. **PRÉVIEW AVANT RENDU** — aucun rendu sans `validated_by_magos: true` dans codex.json.
5. **DURÉE PAR LA CUTLIST** — la durée des clips est dictée par F01 (3-10s par séquence).

## Structure Drive

```
DRIVE_LACRIMAE_DEV/
├── SHARED/IN/          ← video longue + logos/
├── F00_INGEST/         IN→OUT
├── F01_SELECT/         IN→OUT (cutlist.json, frames/)
├── F02_FORMAT/         IN→OUT (clips/, codex.json)
├── F03_PREVIEW/        IN→OUT (codex.json validé)
├── F04_RENDER/         IN→OUT (video_finale.mp4)
├── F05_CAMOUFLAGE/     IN→OUT (youtube_final.mp4)
├── F06_LUTHER/         IN→OUT (clean_final.mp4)
├── LAC_CUSTOS.py
└── TRACKING/
```

## Démarrage rapide

```
1. Déposer la vidéo longue + logos dans SHARED/IN/
2. F00 : python lac_f00_ingest.py --file ... --output F00_INGEST/OUT/
3. F01 : python lac_f01_select.py --input F01_SELECT/IN/ --output F01_SELECT/OUT/ \
         --sequences 2 --oracle          (clé ORACLE_API_KEY requise)
4. LAC_CUSTOS --frigate F01 --mode check-out
5. F02 : python lac_f02_format.py --input F02_FORMAT/IN/ --output F02_FORMAT/OUT/ \
         --profile blur-pad
6. F03 : npm install + déposer clip + codex.json dans public/ → npm run dev → valider
7. F04 : npm install → npm run render
8. F05 → F06 : python lac_f05_camouflage.py ... ; python lac_f06_luther.py ...
9. Récupérer clean_final.mp4 dans F06/OUT/
```

> *LACRIMAE — Né des larmes de Sanguinius, forgé en or.*
> *Ad Victoriam.*
