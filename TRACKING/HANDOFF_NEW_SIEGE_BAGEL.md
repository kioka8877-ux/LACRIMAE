# HANDOFF — New Siege / New York Bagel

> **Mise à jour : 2026-08-22 — cycle MEME terminé sur `dev3`.** Ce fichier est la source de vérité pour reprendre la production sans mélanger les anciens packs.

## État final

Le pack PERTURABO **New York Bagel** a été traité sur la branche `dev3` avec 10 vidéos MEME de 8 secondes, angles A01–A10. La chaîne GitHub Actions est terminée : F01, F02, F03 Preview, F04 Matrix, F05 Camouflage et F06 Luther ont été exécutés selon le protocole Oracle/Champion.

| Frégate | Statut | Preuve |
|---|---|---|
| F00 | Échec historique, à ne pas reproduire | `32565891585` — F00 attendait une vidéo source |
| F01 forge | Validée | `32567824796` |
| F02 format | Validée | `32568111714` |
| F03 Preview | Validée localement dans le sandbox | preview F03 avec codex exporté |
| F04 Matrix | Validée, 10 jobs | `32575412198` |
| F05 camouflage | Validée | `32575989931` |
| F06 Luther | Validée | `32575989931` |
| CLOSE | Non lancé dans ce cycle | À exécuter seulement si fermeture demandée |

## Source et identifiants

- Dépôt source : `kioka8877-ux/PERTURABO`
- Export : `MONDES_FORGES/CLIPPING/EXPORT/production_pack_meme_new_york_bagel.json`
- Pack ID : `LOGO-SIEGE-siege_20260821_223947`
- Siege ID : `siege_20260821_223947`
- Sujet source : `@Zdak` — New York Bagel
- Nombre : `10` clips, `8` secondes chacun, angles `A01–A10`
- Source F02 : `32568111714`
- Source F04 : `32575412198`
- Artifact F04 : `lac-video-finale`
- Artifact F05 : `lac-youtube`
- Artifact F06 : `lac-clean`

## Corrections MEME conservées

Le mapping de méméthèque est `M1 → Release m1 → asset Zoolander`, normalisé en `SHARED/memes/M1.mp4`. Le background approuvé est `bg_paper_crumpled.png`. Anton est chargée strictement et ne doit pas être remplacée silencieusement par un fallback.

Le zoom vidéo est stocké dans `clip.video.scale` et borné de `1.00×` à `3.00×`; le renderer combine ce facteur avec le mouvement caméra SIGNE. La Tweet Card possède `background_color`, `background_opacity`, `text_color` et `keyword_colors_enabled`. Lorsque les couleurs automatiques sont désactivées, le texte du tweet, le nom et le handle utilisent la même couleur personnalisée. L’opacité modifie seulement le fond de la carte, jamais l’opacité du texte.

Les miroirs F03/F04 concernés sont :

```text
F03_PREVIEW/CODEBASE/src/App.jsx
F03_PREVIEW/CODEBASE/src/preview/MemeComposition.jsx
F04_RENDER/CODEBASE/src/components/MemeComposition.jsx
```

## Commits importants

| Commit | Contenu |
|---|---|
| `bc7d7d4` | Pack New York Bagel préparé pour le Bridge |
| `00c306c` | Résolution `M1` vers l’asset Zoolander de la Release `m1` |
| `4526e55` | Zoom vidéo jusqu’à 3× et panneaux texte |
| `c5e769a` | Validation Champion du codex |
| `efa81a1` | Normalisation du codex et background papier froissé pour F04 |
| `current worktree` | Couleurs Tweet Card, couleur nom/handle et opacité du fond, à synchroniser |

## Artifacts finaux

Les vidéos finales sont dans l’artifact `lac-clean` du run F05/F06 `32575989931`. Le téléchargement via l’API GitHub exige une authentification ; utiliser une session GitHub authentifiée ou récupérer l’artifact avec `gh run download`.

## Reprise recommandée

Avant toute nouvelle frégate, vérifier la branche, le codex et le statut Git. Ne pas relancer F00 pour ce pack. Ne pas relancer F04 sans un codex exporté et validé. Le prochain geste autorisé après synchronisation documentaire est soit `CLOSE` si le Champion demande la fermeture du cycle, soit une nouvelle production explicitement définie.

## Documents associés

- `GUIDES_PRODUCTION/GUIDE_UTILISATION_ORACLE_CHAMPION_MEME.md`
- `GUIDES_PRODUCTION/GUIDE_FONCTIONNEMENT_TECHNIQUE_MEME.md`
- `TRACKING/HANDOFF_MEME_P6.md`
- `F03_PREVIEW/IN/codex.json`
- `.github/workflows/lacrimae_f04_matrix.yml`
- `.github/workflows/f05-f06.yml`

**Statut de reprise :** cycle New York Bagel terminé côté F01–F06 ; les modifications locales Tweet Card doivent être committées et poussées avant toute nouvelle session.

*Mise à jour : 2026-08-22 — Manus AI.*

---

## Historique

Le pack initial a été préparé dans `BRIDGE_PERTURABO/IN/` avec une copie archivale nommée et un résumé éditorial. Le premier essai F00 a été conservé comme incident documenté pour rappeler que les packs PERTURABO MEME déjà exportés commencent par F01 forge, puis F02 et F03.
