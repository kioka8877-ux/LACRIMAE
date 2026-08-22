# Guide d’utilisation Oracle / Champion — Production MEME

> **Mise à jour New York Bagel — 2026-08-22.** Le cycle PERTURABO New York Bagel a été exécuté sur `dev3` avec 10 clips. Le parcours correct pour un pack PERTURABO MEME est `F01 forge → F02 → F03 Preview → validation Champion → F04 Matrix → F05/F06`; F00 est réservé à une ingestion de vidéo source et ne doit pas être utilisé pour ce type de pack.

## Addendum opératoire — cycle New York Bagel

Le pack `LOGO-SIEGE-siege_20260821_223947` contient 10 clips MEME de 8 secondes, angles A01–A10. F01 doit résoudre les références logiques de méméthèque depuis les Releases : `M1` correspond à la Release `m1` et à l’asset Zoolander, qui est normalisé en `SHARED/memes/M1.mp4` avant le contrôle du Bridge.

F03 doit être utilisé pour vérifier visuellement le background papier froissé, Anton, SIGNE, le zoom vidéo, la Tweet Card et les textes. Le curseur vidéo autorise une échelle de `1.00×` à `3.00×`. La Tweet Card possède une couleur de fond, une couleur de texte et une opacité de fond réglable de `0%` à `100%`. Lorsque les couleurs automatiques sont désactivées, la couleur choisie s’applique uniformément au texte du tweet, au nom et au handle ; les couleurs vert/rouge ne doivent pas réapparaître dans les spans internes.

Les contrôles de F03 ne deviennent des réglages F04 qu’après export dans `F03_PREVIEW/IN/codex.json`. Toute modification de couleur, d’opacité ou de zoom doit donc être exportée, relue et validée avant F04. Le background final de ce cycle est `bg_paper_crumpled.png`, et non `bg_grid_dark.png`.

Le premier lancement F00 du cycle New York Bagel a échoué parce qu’il attendait une vidéo source ; cet incident ne doit pas être reproduit. F01 forge est la bonne entrée pour un pack PERTURABO déjà exporté. Le premier F01 a ensuite été corrigé pour résoudre `M1 → Release m1 → Zoolander`.

Le cycle validé a utilisé les preuves suivantes : F01 `32567824796`, F02 `32568111714`, F03 Preview local sandbox, F04 Matrix `32575412198`, puis F05/F06 `32575989931`. F04 a rendu 10 jobs et publié `lac-video-finale`; F05 a publié `lac-youtube`; F06 a publié `lac-clean`. Aucun F04 ne doit être lancé avec un codex non validé (`validated_by_magos: false`).

---


**Projet :** LACRIMAE  
**Branche de production de référence :** `dev3`  
**Mode couvert :** `MEME`  
**Public :** Oracle (exécution) et Champion (validation des portes)  
**Statut :** guide opératoire de production

> Ce guide décrit la procédure à suivre pour exécuter une production MEME de façon traçable. Un statut vert dans GitHub Actions ne suffit pas : chaque gate doit aussi confirmer que le contenu rendu correspond au codex et à la preview validés.

## 1. Règles non négociables

La production se déroule exclusivement sur GitHub Actions. Aucun rendu vidéo local ne constitue une validation de production. Le code, le codex, les assets, le commit et les artifacts doivent appartenir à la même branche de travail, normalement `dev3`.

L’Oracle exécute les frégates et collecte les preuves. Le Champion valide les portes et autorise la frégate suivante. L’Oracle ne doit pas contourner une porte refusée en relançant un workflow différent avec des entrées implicites.

La source de vérité visuelle est le `codex.json` exporté depuis la preview puis vérifié et committé dans `F03_PREVIEW/IN/`. Une preview affichée à l’écran n’est pas suffisante si ses réglages n’ont pas été exportés dans ce fichier.

| Règle | Contrôle obligatoire |
|---|---|
| Branche | `git branch --show-current` doit retourner `dev3` avant toute publication |
| Codex | Le fichier utilisé par F04 doit être le codex validé, pas un codex par défaut généré par F02 |
| Mode | Le codex doit déclarer le mode `MEME` et le nombre réel de clips |
| Police | Anton doit être présente, reconnue et chargée ; aucun fallback silencieux n’est accepté |
| Source F04 | Le `source_run_id` F02 doit être identifié avant le lancement |
| F04 | Les jobs `prepare`, `clip-001` à `clip-N` et `aggregate` doivent réussir |
| F05 | F05 doit consommer explicitement l’artifact du run F04 Matrix validé |
| Fermeture | `CLOSE` ne se lance qu’après F05 et F06 réussis |

## 2. Préparation de l’Oracle

Avant de lancer une frégate, l’Oracle vérifie l’état du dépôt et l’identité du pack.

```bash
gh repo view kioka8877-ux/LACRIMAE
git fetch origin
git status --short
git branch --show-current
git log -1 --oneline --decorate
```

La sortie doit confirmer `dev3`, un arbre de travail propre ou des modifications explicitement connues, et le dernier commit attendu. Il faut ensuite vérifier que les fichiers de la production correspondent au pack MEME demandé :

```bash
find F03_PREVIEW/IN -maxdepth 1 -type f -print
python3 tools/validate_f04_codex.py F03_PREVIEW/IN/codex.json
```

Si le validateur échoue, l’Oracle s’arrête et transmet au Champion le message d’erreur, le commit et le lien du dernier run. Il ne lance pas F04 pour « voir si cela passe ».

## 3. Parcours des frégates

### F00 et F01 — ingestion et sélection

F00 récupère le brief et la source. F01 sélectionne ou récupère le pack. En mode MEME, la source finale doit être le pack de memes attendu, avec ses identifiants, ses contenus et ses médias. Il faut vérifier que le pack n’a pas été remplacé par un pack d’un autre sujet.

Après F01, l’Oracle conserve le lien du run, le commit et le nom du pack. Le Champion valide la sélection avant F02.

### F02 — format et codex

F02 prépare les clips, les backgrounds et le `codex.json`. En mode MEME, le nombre de clips est celui déclaré par le codex, et non un nombre par défaut. L’Oracle contrôle :

```bash
python3 - <<'PY'
import json
from pathlib import Path
p = Path('F03_PREVIEW/IN/codex.json')
c = json.loads(p.read_text())
clips = c.get('clips') or []
print('mode =', c.get('mode'))
print('clips =', len(clips))
print('ids =', [x.get('id') for x in clips])
print('background =', c.get('background') or c.get('session', {}).get('background'))
PY
```

Le Champion vérifie les clips, ou le nombre réel du pack ; pour New York Bagel, il vérifie les **10 clips A01–A10** dans la preview. Tant que le codex exporté n’est pas exactement celui validé, F03 n’est pas validé.

### F03 — preview et export du codex

La preview sert à valider le rendu visuel global : background, proportions, clip maître, styles de tweet, émotion, titre, SIGNE, grain, flashes et mouvement du background. L’Oracle ne doit pas seulement prendre une capture d’écran ; il doit exporter le codex après la dernière modification.

Le contrôle correct est :

1. Ouvrir la preview de `dev3`.
2. Vérifier que les clips correspondent au pack MEME ; pour New York Bagel, contrôler les **10 clips**.
3. Vérifier le background validé, notamment `bg_paper_crumpled.png` lorsqu’il est demandé.
4. Vérifier Anton dans l’interface et dans les assets locaux.
5. Vérifier le clip maître et la propagation de ses réglages.
6. Vérifier les signatures SIGNE.
7. Exporter le codex.
8. Placer le codex exporté dans `F03_PREVIEW/IN/codex.json`.
9. Relire le fichier, le comparer à la preview, le committer et pousser sur `dev3`.
10. Demander le gate Champion.

> Règle essentielle : une modification faite dans l’état React de la preview mais jamais exportée dans `codex.json` ne sera pas utilisée par F04.

### F04 — Matrix de rendu

F04 Matrix rend un clip par job indépendant. La capacité autorisée est de vingt clips ; le workflow doit donc générer la matrix depuis le codex au lieu d’utiliser une liste fixe.

Le lancement utilise le workflow `lacrimae_f04_matrix.yml`, la branche `dev3`, le `source_run_id` F02 correct et, si nécessaire, un `resume_run_id` F04 précédent. L’Oracle ne choisit jamais un run uniquement parce qu’il est récent : il doit contenir l’artifact du pack MEME concerné.

Après le lancement, contrôler dans cet ordre :

| Contrôle | Attendu |
|---|---|
| `prepare` | Codex validé, Anton, assets et matrix confirmés |
| Jobs clips | Un job pour chaque ID du codex, sans clip ajouté ou supprimé |
| Téléchargements | Aucun 404 sur un asset ou un clip source |
| Remotion | Composition et bundle utilisent le codex copié par `prepare` |
| Aggregate | Tous les clips attendus sont réunis dans `lac-video-finale` |

Un job clip peut être repris indépendamment. En cas d’échec, l’Oracle conserve le run et le nom du clip fautif, corrige la source ou l’outil, puis utilise le mécanisme de reprise prévu. Il ne remplace pas silencieusement un clip par un défaut.

### F05 et F06 — publication et nettoyage

F05 doit recevoir explicitement :

```text
source_run_id = <ID du run F04 Matrix validé>
source_artifact = lac-video-finale
```

Le workflow dédié `f05-f06.yml` télécharge l’artifact du run précis avec `tools/download_artifact_run.py`. Il ne doit pas chercher l’ancien workflow séquentiel `f04-render.yml` ni accepter des artifacts absents.

F05 applique le camouflage, le nettoyage des métadonnées et la normalisation audio. L’artifact attendu est `lac-youtube`. F06 applique Luther et produit `lac-clean`. Les contrôles CUSTOS F05 et F06 doivent réussir avant CLOSE.

### CLOSE — fermeture

CLOSE est une frégate distincte du rendu. Elle ne se lance qu’après confirmation des artifacts `lac-youtube` et `lac-clean` et après le gate Champion.

```bash
gh workflow run lacrimae_orchestrator.yml --ref dev3 -f fregate=CLOSE
gh run list --workflow lacrimae_orchestrator.yml --branch dev3 --limit 1
gh run watch <CLOSE_RUN_ID>
```

La fermeture est réussie uniquement si `CLOSE - Fermeture` passe et si le ledger est committé.

## 4. Procédure d’incident

### `masterClip is not defined`

Le composant utilise une référence maître hors de son périmètre. Arrêter le run, corriger le composant pour recevoir ou résoudre explicitement `masterClip`, valider statiquement, pousser sur `dev3`, puis relancer F04. Ne pas neutraliser l’héritage maître par des valeurs par défaut.

### Background absent ou mauvais manifest

Vérifier le format du manifest et la présence du fichier dans `public/`. Le menu de preview peut proposer un background alors que le manifest F04 ne sait pas le résoudre. Corriger le contrat de manifest et vérifier le background dans le codex avant tout rerun.

### Artifact 404 sur un clip

Le run F04 a probablement utilisé un artifact source incomplet ou un mauvais `source_run_id`. Identifier l’artifact par son nom et son run, vérifier son contenu, puis utiliser la reprise ciblée. Ne pas poursuivre avec un pack partiel.

### Codex par défaut rendu à la place du codex validé

Comparer les copies : `F03_PREVIEW/IN/codex.json`, `F04_RENDER/IN/codex.json` et `public/codex.json`. Vérifier le commit qui a remplacé le codex. Le validateur doit bloquer F04 si le background, le tweet maître, l’émotion ou l’héritage divergent.

### Anton absente

Vérifier le fichier local, son chemin, ses métadonnées et le chargement navigateur. F04 doit échouer avant le rendu si Anton ne charge pas. Un rendu vert avec un fallback système n’est pas une réussite visuelle.

### Texte invisible ou trop grand

Ne pas réduire les tailles au hasard. Vérifier d’abord Anton et le poids utilisé, puis la géométrie du titre et de l’émotion. Le comportement attendu est deux lignes maximum et une réduction adaptative plafonnée à 20%, sans changer les tailles du codex lorsqu’elles tiennent dans le cadre.

## 5. Carte réflexe avant chaque gate

L’Oracle doit transmettre au Champion un message contenant :

```text
Pack : Marvel Doomsday / mode MEME
Branche : dev3
Commit : <sha>
Codex : <chemin et résultat du validateur>
F02 source_run_id : <id>
F04 run_id : <id>
F04 aggregate : success / artifact lac-video-finale
F05 run_id : <id> / artifact lac-youtube
F06 run_id : <id> / artifact lac-clean
CLOSE run_id : <id, si exécuté>
Décision demandée : <gate concerné>
```

## 6. Ce qui est interdit

Il est interdit de valider F04 à partir d’un rendu local, de mélanger les branches, d’utiliser un artifact d’un autre pack, de laisser un fallback de police silencieux, de lancer F05 sans `source_run_id`, ou de lancer CLOSE avant F05 et F06. Il est également interdit de considérer un workflow vert comme preuve suffisante si les images ou les textes ne correspondent pas à la preview validée.

## 7. Références internes

Les références d’exécution sont les workflows du dépôt, le codex `F03_PREVIEW/IN/codex.json`, le validateur `tools/validate_f04_codex.py`, le téléchargement strict `tools/download_artifact_run.py`, le handoff `TRACKING/HANDOFF_MEME_P6.md` et le diagnostic `TRACKING/DIAGNOSTIC_F04_GLOBAL_STYLES_2026-08-19.md`.
