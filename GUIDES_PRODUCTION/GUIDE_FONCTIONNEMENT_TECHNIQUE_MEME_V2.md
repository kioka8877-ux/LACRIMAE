# Fonctionnement technique — MEME V2

## 1. Architecture

MEME V2 est un mode distinct de MEME V1. Le routage se fait dans F03 et F04 lorsque `sub_mode === "meme_v2"`, ou lorsque le codex déclare explicitement `mode === "meme_v2"`. Le renderer F04 est `MemeV2Composition.jsx` ; le preview F03 utilise son miroir dans `src/preview/`.

Le bridge ne fabrique pas de réaction, de capture, de texte émotion ou de persona. Il mappe les champs éditoriaux du pack vers le codex et transite les captures locales vers `public/source_posts/`. Le meme reste référencé par `meme.source` et continue d’utiliser le staging F02 de la méméthèque existante.

## 2. Codex produit

Chaque clip V2 contient au minimum `video.source`, `meme.source`, `reaction_tweet`, `source_post.screenshot_png` et `text_emotion`. Le champ `meme_v2.timeline` conserve les paramètres de synchronisation par pourcentage : `0`, `15`, `33` et `41` par défaut.

La session reste compatible avec les fonds globaux. Les éléments V2 sont empilés dans une composition verticale : la réaction en haut, la capture au-dessous, le texte émotion ensuite, et le clip MEME en partie basse.

## 3. Timeline Remotion

Les seuils sont calculés à partir de `durationInFrames` afin de fonctionner pour des durées comprises entre 3 et 10 secondes. Les entrées utilisent une interpolation courte d’opacité et de translation verticale. Avant chaque seuil, la couche est absente ; après son entrée, elle reste affichée jusqu’à la dernière frame.

```text
reaction_start = 0 %
source_start   = 15 %
emotion_start  = 33 %
clip_start     = 41 %
```

Pour `240` frames, la timeline attendue est `0`, `36`, `79` et `98` frames. La vidéo peut être chargée dès le début par Remotion, mais son conteneur reste invisible jusqu’au seuil `clip_start` ; ainsi, le spectateur ne voit jamais le clip avant la fin de la séquence éditoriale.

## 4. Validation

`BRIDGE_PERTURABO/CODEBASE/lac_bridge_forge.py` rejette les angles incomplets et vérifie l’existence du meme dans `SHARED/memes/`. `LAC_CUSTOS.py` applique les contrôles du codex V2 sans exiger les champs générés propres à V1, notamment la Tweet Card et le watermark historique. `tools/validate_f04_codex.py` contrôle le mode, la validation Magos et les quatre champs du contrat V2.

Le test `tools/test_meme_v2_contract.py` vérifie la présence des champs et l’ordre strict des seuils. La fixture `tools/fixtures/codex_meme_v2_valid.json` fournit un cas minimal validé.

## 5. Risques connus et garde-fous

Les chemins de capture relatifs sont résolus depuis le dossier du pack ; les chemins PERTURABO sous `MONDES_FORGES/CLIPPING/EXPORT/` sont téléchargés vers `public/source_posts/` par le bridge. Les memes référencés par un tag de Release, par exemple `M7`, sont résolus via la Release GitHub correspondante puis normalisés en `SHARED/memes/M7.mp4`. Une Release doit fournir exactement un asset MP4 pour éviter toute ambiguïté.

Le mode V1 reste routé vers `MemeComposition`. Aucun changement de style ou de comportement V1 ne doit être déduit d’un patch V2. Le renderer ne doit pas ajouter de texte de substitution dans un codex validé ; les libellés d’erreur visibles servent uniquement à rendre l’absence diagnostiquable pendant le développement.

## 6. Vérification avant production

```bash
python3 -m py_compile LAC_CUSTOS.py BRIDGE_PERTURABO/CODEBASE/lac_bridge_forge.py tools/validate_f04_codex.py
python3 tools/test_meme_v2_contract.py
python3 tools/validate_f04_codex.py tools/fixtures/codex_meme_v2_valid.json
cd F03_PREVIEW/CODEBASE && npm run build
```

La production F04, F05 et F06 est ensuite exécutée exclusivement via les workflows GitHub Actions après validation Champion.

## Références

[1]: ../GUIDES_PRODUCTION/GUIDE_UTILISATION_MEME_V2.md "Guide opérateur MEME V2"
[2]: ../GUIDE_UTILISATION/04_MODE_MEME.md "Mode MEME historique"
[3]: ../TRACKING/HANDOFF_NEXT_DEV.md "Handoff de reprise"
