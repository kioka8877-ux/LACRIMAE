# Guide de fonctionnement technique — Pipeline MEME

> **Mise à jour technique New York Bagel — 2026-08-22.** Le cycle validé sur `dev3` couvre 10 clips MEME et ajoute les contrats persistants de zoom vidéo, de style Tweet Card et de résolution des assets par tag de Release.

## Addendum technique — contrats ajoutés

Pour un pack PERTURABO MEME, F01 forge résout les références logiques de méméthèque. Le tag `M1` est associé à la Release GitHub `m1`, puis l’asset Zoolander est copié sous le nom interne `SHARED/memes/M1.mp4`. F04 ne doit pas supposer que la valeur logique `M1` est le nom physique de l’asset distant.

Le zoom vidéo MEME est stocké dans `clip.video.scale` et borné entre `1.0` et `3.0`. Le renderer calcule `camZoom × video.scale`, afin de conserver les mouvements SIGNE tout en permettant l’agrandissement réglable. Le clip maître reste la source de repli selon la priorité locale → masterClip → session → défaut.

Le bloc global `session.tweet_card` expose désormais :

```json
{
  "background_color": "#FFFFFF",
  "background_opacity": 1,
  "text_color": "#0F1419",
  "keyword_colors_enabled": false
}
```

L’opacité est appliquée au seul fond par conversion de couleur en RGBA ; elle ne doit jamais être appliquée à l’opacité du conteneur, car cela rendrait le nom, le handle et le texte transparents eux aussi. Lorsque `keyword_colors_enabled` est faux, le renderer retourne un bloc de texte uniforme avec `text_color`. Lorsqu’il est vrai, la coloration rouge/verte des mots-clés est explicitement autorisée. Le nom et le handle utilisent la même `text_color`; le badge vérifié peut conserver sa couleur bleue dédiée.

Ces réglages sont implémentés dans les deux miroirs : `F03_PREVIEW/CODEBASE/src/preview/MemeComposition.jsx` et `F04_RENDER/CODEBASE/src/components/MemeComposition.jsx`, avec les contrôles correspondants dans `F03_PREVIEW/CODEBASE/src/App.jsx`. Ils ne sont reproductibles par F04 qu’après export dans `F03_PREVIEW/IN/codex.json`.

Le background validé du cycle est `bg_paper_crumpled.png`. Le menu peut également afficher `bg_grid_dark.png`, mais ce fichier ne doit pas remplacer silencieusement le choix du Champion dans le codex.

---


**Projet :** LACRIMAE  
**Branche de référence :** `dev3`  
**Mode :** `MEME`  
**Périmètre :** F03 Preview, F04 Matrix, F05 Camouflage, F06 Luther et CLOSE  
**Document de référence technique :** Oracle et mainteneurs du pipeline

> Le pipeline sépare la décision visuelle, la donnée de rendu, le rendu vidéo et la publication. La stabilité dépend moins d’un workflow vert que du respect des contrats entre ces couches.

## 1. Modèle d’architecture

Le mode MEME transforme un pack source en plusieurs compositions vidéo. F02 prépare les médias et le codex. F03 expose le résultat visuel et permet la validation. F04 consomme le codex validé et rend un clip par job. F05 transforme l’output de rendu en fichiers destinés à la publication. F06 réalise la copie finale sans réencodage. CLOSE ferme le ledger.

```text
Pack MEME
   │
   ▼
F02 FORMAT ──► clips source + codex.json + manifest/assets
   │
   ▼
F03 PREVIEW ──► validation visuelle + export du codex validé
   │
   ▼
F04 MATRIX ──► prepare ──► clip-001 ... clip-N ──► aggregate
   │                                                    │
   │                                                    └── lac-video-finale
   ▼
F05 CAMOUFLAGE ──► lac-youtube
   │
   ▼
F06 LUTHER ──► lac-clean
   │
   ▼
CLOSE ──► ledger fermé
```

Le workflow F04 Matrix est indépendant du workflow orchestrateur historique. Il publie `lac-video-finale` sous `lacrimae_f04_matrix.yml`. F05 doit donc recevoir le `run_id` précis de F04 Matrix ; une recherche automatique dans l’ancien workflow peut sélectionner le mauvais artifact ou ne rien trouver.

## 2. Contrat de données du codex

Le fichier `F03_PREVIEW/IN/codex.json` est la source de vérité de la composition validée. Il doit conserver le contenu propre au pack MEME et les réglages visuels approuvés.

| Bloc | Rôle | Contrôle |
|---|---|---|
| `mode` | Identifie le mode `MEME` | Le mode ne doit pas retomber sur `stars` |
| `clips` | Liste des compositions | Le nombre de jobs F04 provient de cette liste |
| `id` | Identifiant stable du clip | Doit rester identique de F02 à F04 |
| `video.source` | Média source | Doit correspondre à l’artifact F02 du même pack |
| `background` / session background | Background global | Le fichier doit exister dans le bundle |
| `masterClip` / clip maître | Réglages hérités | Les clips doivent recevoir les mêmes valeurs validées |
| `tweet` | Taille, largeur et style du tweet | Aucun remplacement par une valeur par défaut non validée |
| `emotion` | Taille, position et style de l’émotion | Doit rester dans la zone de sécurité |
| `signe` | Mouvement, flashes et grain déterministes | Doit être présent et synchronisé avec `codexData.js` |

La génération de `F04_RENDER/CODEBASE/src/codexData.js` doit être dérivée du codex validé. Une copie ancienne ou un codex généré à nouveau par F02 peut contenir les bons clips mais les mauvais styles. C’est exactement le type de divergence qui a produit un F04 techniquement vert mais visuellement incorrect.

Le validateur `tools/validate_f04_codex.py` doit être exécuté avant la construction de la matrix. Il vérifie notamment le nombre réel de clips du pack, le background `bg_paper_crumpled.png`, les styles maître et l’héritage des réglages. Les valeurs « huit clips Doomsday » et « tweet à 51px » sont historiques et ne doivent pas être appliquées au pack New York Bagel.

## 3. F03 Preview : fonctionnement et export

La preview utilise le codex comme données d’affichage, mais les contrôles interactifs peuvent modifier un état React temporaire. Cet état n’est pas automatiquement une donnée de production.

Le flux correct est :

```text
contrôle dans la preview
        │
        ▼
export explicite du codex
        │
        ▼
F03_PREVIEW/IN/codex.json
        │
        ▼
validation statique + commit
        │
        ▼
F04 consomme le même snapshot
```

Le bouton d’export doit être considéré comme la frontière entre « réglage vu dans l’interface » et « réglage reproductible ». La preview et F04 doivent afficher le même background, le même clip maître et les mêmes tailles. Si le codex exporté ne contient pas un champ, le composant F04 peut légitimement appliquer son fallback ; le problème est alors un problème de snapshot, pas de Remotion.

## 4. Héritage `masterClip`

Le clip maître fournit les réglages globaux hérités par les autres clips. La résolution doit suivre une priorité explicite :

```text
valeur locale du clip
    sinon valeur du masterClip
        sinon valeur globale de session
            sinon défaut technique documenté
```

Les défauts techniques ne doivent jamais masquer une absence de champ validé. Pour les valeurs critiques, le validateur doit exiger leur présence dans le codex avant F04.

L’incident `ReferenceError: masterClip is not defined` venait d’une référence utilisée dans `TweetCard` sans variable disponible dans son périmètre. La correction correcte consiste à résoudre `masterClip` au niveau de la composition et à passer la valeur au composant, pas à supprimer l’héritage ni à remplacer la taille par un nombre arbitraire.

## 5. SIGNE

SIGNE est une technique déterministe appliquée aux mouvements, flashes et grains. Elle ne doit pas dépendre d’un hasard non initialisé ou d’un état local de la preview.

Le workflow et les composants doivent conserver :

| Signature | Exigence technique |
|---|---|
| Mouvement background | Déterministe, faible amplitude et reproductible |
| Flash blanc | Déclenchement déterministe à partir du codex et du temps |
| Grain | Signature stable, sans modifier le contenu du pack |
| Clip maître | Les paramètres SIGNE validés sont hérités selon le contrat |

Lors d’un incident, il faut distinguer une variation SIGNE attendue d’une divergence de codex. Une différence de background, de taille de tweet ou de position émotionnelle ne doit pas être attribuée à SIGNE sans comparaison des données.

## 6. Backgrounds et manifests

Le background sélectionné dans l’interface doit être résolvable par le manifest consommé par F04. Le fichier image doit être copié dans `public/` ou dans le chemin attendu du bundle, avec un nom identique au nom du codex.

L’incident du manifest venait d’un écart entre la structure attendue par le composant et la structure fournie par le fichier de configuration. La correction durable est de normaliser le contrat et d’ajouter une validation de chemin avant le rendu.

Pour le background papier froissé, les trois contrôles sont nécessaires :

```text
codex -> nom bg_paper_crumpled.png
manifest -> entrée résolvable
bundle -> fichier effectivement copié
```

La présence du fichier ne doit pas entraîner une validation automatique du choix visuel : le background doit aussi être celui approuvé par le Champion.

## 7. Anton et la typographie

Anton est un asset local, pas une dépendance distante. F04 doit vérifier le fichier, ses métadonnées et son chargement navigateur avant le rendu. Le chargeur strict ne doit pas attraper l’erreur pour appeler `continueRender()` avec un fallback.

La séquence recommandée est :

```text
fichier présent
   │
   ▼
identification font reconnue comme Anton
   │
   ▼
document.fonts.load('400 64px Anton')
   │
   ▼
loaded.length > 0 et document.fonts.check(...)
   │
   ▼
autorisation du rendu
```

Les composants peuvent demander les poids visuels `700` ou `900`, alors que le fichier local est `Anton-Regular.ttf`. Il faut éviter une substitution silencieuse de famille et stabiliser la synthèse de poids avec `fontSynthesis`. L’existence d’un fichier Anton ne suffit pas à prouver que le navigateur l’a utilisé dans la frame rendue ; c’est pourquoi F04 doit être strict.

Quand un texte est invisible, le diagnostic suit cet ordre : police, famille, poids, largeur du bloc, position, hauteur utile, puis contenu. Il ne faut pas commencer par réduire les tailles du codex.

## 8. Layout du titre et de l’émotion

Le titre et le texte émotion doivent accepter au maximum deux lignes. Pour les textes longs, la taille est adaptative mais la réduction est limitée à 20%. Les tailles validées restent inchangées si le texte tient dans le cadre.

Le comportement attendu est :

```text
taille validée
   │
   ├── le texte tient sur 1 ou 2 lignes -> conserver la taille
   │
   └── dépassement -> réduire progressivement
                         │
                         └── plafond : -20%
```

Le clamp de deux lignes ne doit pas cacher systématiquement un texte valide. Il doit être accompagné d’un contrôle de géométrie qui vérifie que le bloc reste dans le cadre. Une émotion positionnée à `92%` avec une taille de `100px` est particulièrement sensible aux métriques de police et à la hauteur disponible.

## 9. F04 Matrix

Le workflow Matrix suit quatre responsabilités :

1. `prepare` récupère les clips et le codex, vérifie les assets et produit la matrix dynamique.
2. Les jobs de clip rendent indépendamment, avec une concurrence plafonnée à vingt.
3. Chaque job publie son artifact clip.
4. `aggregate` récupère les clips attendus, vérifie leur présence et publie `lac-video-finale`.

Le téléchargement strict doit échouer sur un asset absent. Dans l’ancien rendu séquentiel, un 404 sur `clip-006` arrêtait toute la chaîne après plusieurs clips déjà réussis. La Matrix réduit la surface de reprise : un clip défaillant est isolé, tandis que les autres artifacts restent disponibles.

Le `resume_run_id` sert à réutiliser des clips déjà réussis lorsque la source et le codex sont compatibles. Il ne doit pas être utilisé pour mélanger deux packs ou deux snapshots de codex.

## 10. F05 et F06 : contrats d’artifacts

F04 Matrix publie :

```text
lac-video-finale
```

Le workflow F05/F06 dédié reçoit le run source :

```text
source_run_id=<run F04 Matrix>
source_artifact=lac-video-finale
```

Il télécharge l’artifact avec `tools/download_artifact_run.py`, vérifie qu’un MP4 existe, puis produit `lac-youtube`. F06 lit l’output F05, fait le stream copy et publie `lac-clean`.

La première version du workflow F05 recherchait les artifacts du workflow historique `f04-render.yml`. Cela créait une incohérence avec la Matrix. La correction consiste à rendre le run source explicite et à refuser un artifact absent au lieu de traiter silencieusement un dossier vide.

## 11. CUSTOS et ledger

CUSTOS doit être placé au bon niveau : les contrôles globaux de préparation et d’agrégation sont exécutés une fois, tandis que les contrôles spécifiques à un artifact restent dans le job concerné. Des contrôles concurrents du même ledger peuvent produire des conflits ou masquer le vrai point de panne.

Les étapes ledger doivent être exécutées après la frégate correspondante, avec un commit traçable et le lien du run. CLOSE ne doit pas être considéré comme un simple message : il écrit la fermeture dans le ledger et pousse cette modification.

## 12. Matrice des incidents résolus

| Incident | Cause | Correctif durable |
|---|---|---|
| `masterClip is not defined` | Référence hors périmètre dans `TweetCard` | Résolution explicite et passage du clip maître |
| Background non visible | Manifest incompatible ou mauvais fichier | Contrat manifest + vérification du bundle |
| F04 rendu avec valeurs par défaut | Codex Doomsday différent du snapshot preview | Fusion contrôlée des styles + validateur de codex |
| Échec à `clip-006` | Artifact source incomplet et pipeline séquentiel | Matrix indépendante + téléchargement strict |
| Anton absente | Fallback silencieux du chargeur | FontGate strict et préflight de métadonnées |
| Texte invisible | Métriques fallback et dépassement du cadre | Anton stricte + clamp deux lignes + adaptation -20% |
| F05 introuvable | F05 cherchait l’ancien workflow F04 | `source_run_id` et `source_artifact` explicites |
| CLOSE prématuré | Frégates aval non confirmées | Gate F05/F06 obligatoire avant CLOSE |

## 13. Contrats de reproductibilité

Une exécution reproductible doit conserver les éléments suivants :

| Élément | Valeur à conserver |
|---|---|
| Branche | `dev3` |
| Commit | SHA du code rendu |
| Codex | Snapshot validé et chemin |
| F02 run | `source_run_id` ayant produit les clips |
| F04 run | Run Matrix et artifact final |
| F05 run | Run Camouflage et `lac-youtube` |
| F06 run | Run Luther et `lac-clean` |
| CLOSE run | Run de fermeture du ledger |
| Validation | Résultat CUSTOS et contrôles de police/layout |

## 14. Checklist technique avant publication

Avant de considérer le pack MEME publiable, vérifier que le codex, le bundle et les artifacts racontent la même histoire : mêmes clips, mêmes identifiants, mêmes contenus, même background, mêmes styles, même masterClip et mêmes signatures SIGNE. Une réussite de workflow qui ne satisfait pas cette phrase est une réussite technique incomplète.

Les fichiers de contrôle principaux sont :

```text
F03_PREVIEW/IN/codex.json
F04_RENDER/IN/codex.json
tools/validate_f04_codex.py
tools/f04_prepare_matrix.py
tools/f04_aggregate.py
tools/download_artifact_run.py
.github/workflows/lacrimae_f04_matrix.yml
.github/workflows/f05-f06.yml
TRACKING/HANDOFF_MEME_P6.md
TRACKING/DIAGNOSTIC_F04_GLOBAL_STYLES_2026-08-19.md
```

## 15. Références internes

Ce guide est fondé sur les workflows du dépôt, les composants F04, le codex validé, les scripts de validation et de téléchargement strict, le handoff MEME P6, le diagnostic des styles globaux et l’historique Git de la branche `dev3`. Les liens de run doivent toujours être ajoutés au handoff de la production concernée.
