# DEV4 — Hybrid Narrative Mode 2

**Date :** 24 août 2026  
**Branche :** `dev4`  
**Statut :** implémentation prête pour validation Champion

## Objectif

Le Mode 2 ajoute une introduction image ou vidéo avant le Fast Match Cut, sans supprimer le Mode 1 Pure Match Cut. La timeline finale est `Intro → transition hard cut → Match Cut`.

## Implémentation

| Élément | Emplacement | Résultat |
|---|---|---|
| Matérialisation intro | `F00_INGEST/CODEBASE/f00_hybrid.py` | Image convertie en MP4 à durée cible ; vidéo découpée par IN/OUT |
| Contrat hybride | `OUT/hybrid/hybrid_manifest.json` | Durée totale, offset Match Cut, EGO, preset et validation |
| Contrôles Preview | `F03_PREVIEW/CODEBASE/src/App.jsx` | Mode 1/2, intro, EGO, style et durée |
| Timeline Preview | `F03_PREVIEW/CODEBASE/src/preview/OmniComposition.jsx` | Intro puis Match Cut avec EGO |
| Normalisation partagée | `F03_PREVIEW/CODEBASE/src/preview/hybridNarrative.js` | Timeline et styles EGO |
| Composition PICTOR | `F03_PICTOR/CODEBASE/src/OmniComposition.jsx` | Parité de rendu avec Preview |
| Durée PICTOR | `F03_PICTOR/CODEBASE/src/Root.jsx` | Sélection du total hybride seulement en Mode 2 |
| Workflow isolé | `.github/workflows/dev4_f00d.yml` | F00-D seul, artifact autonome, gate manuelle |

## Contrat EGO

Le texte est normalisé en majuscules. La police, couleur, position, angle, scale `1–10×`, durée et mode `until_match_cut`, `until_end` ou `custom` sont conservés dans le manifeste. F00-D transporte le contrat ; F03 et PICTOR assurent l’affichage et le rendu.

## Tests locaux

Les tests synthétiques ont couvert deux introductions à `30 FPS` avec un Match Cut d’une seconde :

| Cas | Paramètres | Résultat |
|---|---|---|
| Image | Image, durée 2 s, EGO scale 4, rotation 12° | Manifeste validé, intro 60 frames, total 90 frames |
| Vidéo | IN 0,5 s, OUT 2,5 s, EGO jusqu’à la fin | Manifeste validé, intro 60 frames, total 90 frames |

Le build Vite de F03 Preview réussit. Le contrôle Remotion de PICTOR expose `LacrimaeShort` à `59.940061080 FPS`, `1920×1080`, `599 frames` dans le fixture actuel.

## Gate suivante

L’opérateur doit lancer manuellement `DEV4 — F00-D Hybrid EGO`, fournir l’ID d’un run F00-C validé et une URL publique d’introduction, puis vérifier l’artifact F00-D. Après validation, l’artifact hybride peut être copié dans les données de Preview pour la revue visuelle et le rendu PICTOR.
