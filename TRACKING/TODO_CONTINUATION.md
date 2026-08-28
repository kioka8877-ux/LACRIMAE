# LACRIMAE dev9 — TODO DE CONTINUATION

> Point d’entrée obligatoire après toute migration de sandbox.
> Dernière mise à jour : 2026-08-28.

## État confirmé

Le dépôt est `https://github.com/kioka8877-ux/LACRIMAE`, branche `dev9`, commit de référence `8b181fe` (`feat(dev9): implement ranking compilation workflow`). La branche distante `origin/dev9` existe. Le checkout local était propre au moment du contrôle.

Dev9 est dérivé de dev8 et ajoute le format **Ranking Compilation** : six entrées descendantes Top 6 → Top 1, manifeste produit par F00-F, liste persistante dans F03 Preview, transformations par clip, labels configurables, et SFX optionnels par rang. F00-E reste le préparateur des clips ; F00-F est une sous-fregate nouvelle et indépendante.

## Contrôles déjà passés

| Contrôle | Résultat |
|---|---|
| Compilation Python de `f00_ranking.py` et `f00_reveal.py` | OK |
| Contrat `public/ranking_manifest.json` | OK : `dev9.ranking.v1`, `ranking_compilation`, 6 entrées descendantes |
| Syntaxe JS F03/F04 Ranking | OK |
| `pytest -q F00_INGEST/tests/test_ranking.py F00_INGEST/tests/test_reveal.py F00_INGEST/tests/test_manifest.py` | 8 passed |

## Prochaine étape exacte

Le prochain travail n’est pas une refonte de code. Il faut exécuter le premier **test réel dev9 Ranking** avec six sources réelles :

```text
F00-E → F00-F → F00-MUSIC → F03 Preview Ranking → codex validé → F04 PICTOR → F05 → F06
```

Le premier gate à valider est la sortie F00-E. Ensuite, F00-F doit recevoir le manifeste des clips et un `ranking_request.json` contenant le titre, les labels, les rangs, les durées, les positions, les styles de texte et les SFX facultatifs. Ne pas lancer F04 avant validation visuelle de F03.

## Contrats à préserver

- `F03_PREVIEW/CODEBASE/public/ranking_manifest.json` : manifeste Ranking consommé par F03.
- `F00_INGEST/CODEBASE/f00_ranking.py` : normalisation F00-F, rangs maximum 10, scale limité à 10, rotation limitée à ±180°, styles et SFX.
- `F03_PREVIEW/CODEBASE/src/preview/rankingCompilation.js` et `F03_PICTOR/CODEBASE/src/rankingCompilation.js` : même logique de normalisation et mêmes transformations pour préserver la parité Preview/F04.
- Les textes configurables doivent être définis au début du workflow ; ils ne doivent pas être codés en dur dans le renderer.

## Règles de reprise

Toujours travailler sur `dev9`, vérifier `git status --short --branch`, puis lire ce fichier et `TRACKING/LACRIMAE_TRANSFER_LOG.md`. Ne pas mélanger les assets de dev8 avec le run Ranking. Chaque gate doit être journalisé avec son commit, son artifact ou son résultat. En cas de modification de code, tester F00-F, F03 et F04 avant le push.

## Migration sandbox

```bash
git clone https://github.com/kioka8877-ux/LACRIMAE.git
cd LACRIMAE
git fetch origin --prune
git checkout dev9
git pull origin dev9
cat TRACKING/TODO_CONTINUATION.md
```

Les assets volumineux ne doivent pas être ajoutés aveuglément à l’historique Git. Utiliser les artifacts ou une Release avec SHA-256 lorsque le test réel commence ; inscrire l’URL et le checksum dans le registre de transferts.
