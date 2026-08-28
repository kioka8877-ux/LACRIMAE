# LACRIMAE dev9 — Ranking Compilation

## Périmètre

`dev9` est une copie de `dev8` dédiée aux compilations de classement de type **Ranking Compilation**. La sous-fregate **F00-E reste inchangée** : elle fournit les clips découpés et leurs métadonnées. La nouvelle sous-fregate **F00-F** prépare les entrées éditoriales du classement.

Le flux est séquentiel :

> **F00-E → F00-F → F00-MUSIC → F03 Preview → F04 PICTOR**

F00-E prépare les clips. F00-F prépare les rangs, les textes, les positions et les SFX optionnels. F00-MUSIC prépare les informations audio. F03 permet à l’opérateur de visualiser et corriger la compilation. F04 rend le codex validé sans réinterprétation créative.

## F00-F

Le script se trouve dans `F00_INGEST/CODEBASE/f00_ranking.py`.

```bash
python3 F00_INGEST/CODEBASE/f00_ranking.py \
  --clips-manifest artifacts/f00e/reveal_sources.json \
  --request F00_INGEST/IN/ranking_request.example.json \
  --out artifacts/f00f
```

F00-F accepte jusqu’à dix rangs, valide les références de clips, normalise les durées, la position, l’échelle, la rotation, la police, la taille du texte, les couleurs et le SFX optionnel. Il produit `ranking_manifest.json` et `ranking_report.json`. Le rang `1` est automatiquement marqué `final_rank`.

## Contrat d’un rang

Chaque entrée comporte `rank`, `source_id`, `clip_file`, `duration_seconds`, `position`, `label`, `text_style`, `sfx` et `role`. Les positions sont exprimées en pourcentage du cadre. L’échelle est bornée entre `0.05` et `10`. Les SFX sont facultatifs ; lorsqu’ils sont activés, F00-F copie le fichier dans le dossier de sortie et inscrit son chemin relatif dans le manifeste.

## F03 Preview

Lorsque `session.review_mode` vaut `ranking_compilation`, F03 charge `ranking_manifest.json` et affiche l’onglet **Ranking**. L’opérateur peut modifier le titre, la catégorie, le libellé final, la durée de chaque rang, les positions X/Y, l’échelle du clip, la taille du texte, la couleur et l’activation du SFX.

La Preview affiche les rangs dans une liste persistante à droite. Les rangs déjà révélés sont visibles, le rang actif est accentué et le rang 1 reçoit le traitement final sombre avec un shake vertical court. Les modifications sont exportées dans `ranking_manifest` et dans le codex final.

## F04 PICTOR

PICTOR utilise le même `rankingCompilation.js` et la même logique d’entrée. Le codex doit contenir `session.review_mode: "ranking_compilation"` et `ranking_manifest` ou `session.ranking`. Le rendu final doit reprendre exactement l’ordre, les durées, les textes, les positions, les couleurs, les SFX et le traitement du rang 1 visibles dans F03.

## Gates de test

Le premier test doit valider séparément F00-E, F00-F, F00-MUSIC, F03 et F04. Un test F00-F minimal doit contenir des rangs 6, 3 et 1, un rang silencieux et un rang final. Un test réel doit ajouter une vidéo horizontale, un miroir, un label long, une couleur personnalisée et un SFX activé.

## État

La base Ranking, le contrat F00-F, la Preview F03, le renderer PICTOR et le workflow GitHub `dev9_f00f_ranking.yml` sont présents. Les tests unitaires F00-F passent. Les assets de production ne sont pas inclus dans la branche.
