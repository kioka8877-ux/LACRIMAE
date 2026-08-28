# LACRIMAE — TODO CONTINUATION

> Point de départ obligatoire pour reprendre LACRIMAE dans un nouveau sandbox.
> Dernière mise à jour : 2026-08-28.

## 1. Connexion et branche active

Dépôt : `https://github.com/kioka8877-ux/LACRIMAE`

La branche de production actuellement active est `dev7` pour le pipeline Hybrid. Les branches `dev8` et `dev9` sont des évolutions séparées et ne doivent pas être mélangées avec les assets locaux de dev7.

```bash
git clone https://github.com/kioka8877-ux/LACRIMAE.git
cd LACRIMAE
git fetch origin --prune
git checkout dev7
git pull origin dev7
```

## 2. État au transfert

| Branche | Dernier commit distant | Rôle | Prochaine étape |
|---|---|---|---|
| `main` | `6fd0de2` | Base historique stable | Ne pas modifier pour reprendre les tests |
| `dev4` | `5c7d7a0` | Pipeline historique et normalisation YouTube | Référence historique |
| `dev7` | `c6f110d` | Production Hybrid et Audio Timeline v2 | Tester ou poursuivre le run réel après lecture de ce fichier |
| `dev8` | `159f264` | Reveal Compilation | Premier test réel avec six clips |
| `dev9` | `8b181fe` | Ranking | Premier test réel avec six rangs |

## 3. Travail déjà effectué

Dev7 contient le pipeline F00–F06 stabilisé pour le mode Hybrid Narrative, avec Audio Timeline v2, intro en boucle, zone Match Cut indépendante, DROP/FIN, transitions audio, Preview F03 et parité PICTOR/F04. Les assets locaux de test Stan Lee et Avengers utilisés pour la production réelle sont maintenant commités sur dev7 avec leur inventaire SHA-256 ; vérifier le manifest avant réutilisation.

Dev8 a été créé depuis dev7 pour le format Reveal Compilation. Dev9 a été créé depuis dev8 pour le format Ranking. Ces branches sont déjà poussées sur GitHub et possèdent leurs propres documents de référence.

## 4. État actuel à respecter

- F00-E reste le préparateur des clips du format Reveal.
- F00-F appartient uniquement à dev9 et prépare les entrées Ranking.
- F03 Preview reste la source de vérité visuelle avant tout rendu.
- F04 rend le codex validé et ne doit pas réinterpréter les choix de la Preview.
- Aucun run GitHub Actions ne doit être lancé sans validation explicite de l’opérateur.
- Toujours valider une fregate avant de passer à la suivante.

## 5. Prochaines actions

1. Vérifier le commit distant dev7 et lire `TRACKING/BRANCH_STATUS.md`.
2. Vérifier les checksums dans `TRACKING/ASSET_MANIFEST.sha256`.
3. Restaurer les artifacts dev7 nécessaires directement depuis le checkout GitHub et vérifier `TRACKING/ASSET_MANIFEST.sha256`.
4. Lancer uniquement la Preview ou le gate demandé par l’opérateur.
5. Pour dev8 : F00-E → F00-MUSIC → F03 → codex → F04.
6. Pour dev9 : F00-E → F00-F → F00-MUSIC → F03 Ranking → codex → F04.
7. Mettre à jour `TRACKING/TRANSFER_LOG.md`, `TRACKING/CAMPAIGN_LOG.md` et ce fichier après chaque gate.

## 6. Règles de récupération

Ne pas transférer `node_modules`, caches, binaires Chromium, logs temporaires ou secrets. Les vidéos et ZIP volumineux déjà présents sur dev7 sont couverts par le manifest et restent volontairement vérifiables par checksum ; les futurs fichiers volumineux devront plutôt être publiés comme artifacts GitHub Actions ou assets de Release.

## 7. Fichiers clés

- `F00_INGEST/CODEBASE/` : scripts F00 et contrats d’entrée.
- `F03_PREVIEW/` : Preview Vite et tracking de F03.
- `F03_PICTOR/` : moteur de rendu final et contrat PICTOR.
- `AUDIO_INTEGRATION_TEST.md` : vérifications audio.
- `TRACKING/HANDOVER_*.md` : dernière passation datée.
- `TRACKING/TRANSFER_LOG.md` : registre des transferts entre fregates.
- `TRACKING/ASSET_MANIFEST.sha256` : inventaire des artifacts hors Git.
