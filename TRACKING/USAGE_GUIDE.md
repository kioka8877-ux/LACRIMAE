# LACRIMAE — GUIDE DE REPRISE ET D’UTILISATION

## Reprendre dans un nouveau sandbox

```bash
git clone https://github.com/kioka8877-ux/LACRIMAE.git
cd LACRIMAE
git fetch origin --prune
git checkout dev7
git pull origin dev7
cat TRACKING/TODO_CONTINUATION.md
```

Lire ensuite `BRANCH_STATUS.md`, le dernier `HANDOVER_*.md` et `TRANSFER_LOG.md`. Ne pas supposer qu’un MP4 ou un ZIP existe parce qu’il était présent dans le sandbox précédent.

## Règles d’exécution

La Preview doit toujours être vérifiée avant F04. Les gates sont exécutés une par une. Aucun workflow GitHub Actions ne doit être dispatché sans validation explicite de l’opérateur.

## Branches

- `dev7` : production Hybrid et Audio Timeline v2.
- `dev8` : Reveal Compilation, avec boucle musicale puis partie forte.
- `dev9` : Ranking, avec F00-F et labels par rang.

Les modifications propres à une branche doivent rester sur cette branche. Les assets de test doivent être associés à leur branche et à leur run.

## Preview locale

Pour une Preview, entrer dans le dossier F03 concerné, installer les dépendances à partir des lockfiles s’ils existent, puis utiliser le script npm documenté par son `package.json`. Les ports doivent être séparés pour ne pas perturber une autre Preview déjà ouverte.

## Reprise d’un artifact

1. Lire son URL dans `TRANSFER_LOG.md`.
2. Télécharger l’archive ou l’artifact dans un dossier temporaire.
3. Vérifier son SHA-256 avec `ASSET_MANIFEST.sha256`.
4. Placer uniquement les fichiers attendus dans le dossier IN de la fregate.
5. Exécuter le check-in de la fregate.
6. Ajouter le transfert au registre avant de passer à l’étape suivante.

## Ce qui ne doit pas être sauvegardé dans Git

Les dossiers `node_modules`, caches webpack/Remotion, binaires Chromium, logs de terminal et secrets sont reproductibles ou sensibles. Ils doivent rester ignorés. Les vidéos volumineuses doivent être stockées comme artifacts GitHub Actions ou assets de Release avec checksum.

## Checklist avant changement de sandbox

- [ ] Les documents TRACKING sont poussés sur GitHub.
- [ ] Le dernier commit de chaque branche est inscrit.
- [ ] Les travaux en cours et gates restants sont indiqués.
- [ ] Les artifacts locaux ont une URL et un checksum.
- [ ] Les secrets et caches sont exclus.
- [ ] Un clone propre peut lire la procédure et reprendre.
