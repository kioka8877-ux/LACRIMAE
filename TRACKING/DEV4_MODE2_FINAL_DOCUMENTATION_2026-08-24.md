# LACRIMAE dev4 — Documentation finale du Mode 2

## Statut

Le **Mode 2 — Hybrid Narrative** est intégré à la branche `dev4`. Le Mode 1 — Pure Match Cut — reste disponible et n’est pas remplacé.

Le pipeline validé est :

```text
F00-A / F00-B validés
        │
        ├── F00-C Motion Slow (optionnel)
        │
        ▼
F00-D Hybrid Narrative
        │  intro image ou vidéo + IN/OUT vidéo
        ▼
F03 Preview
        │  validation visuelle et réglages
        ▼
F04 Hybrid Render / PICTOR
        │
        ▼
lacrimae_hybrid_f04.mp4
```

Les fregates **Camouflage** et **Luther** ne sont pas relancées pour cette validation : elles restent des étapes de post-traitement distinctes.

## Contrat Hybrid

F00-D produit un artifact comprenant `hybrid_manifest.json`, `intro/` et `match_cut/`. Le manifeste Match Cut utilisé pour le rendu est `match_cut/sequences.json`. Chaque entrée conserve son champ `file`, par exemple `match_cut/sequences/seq_0001_normal.mp4`, et chaque fichier est un MP4 matérialisé indépendant.

La phrase fixe d’introduction `C’EST JUSTE UN JOUEUR` est un calque indépendant. Elle est rendue au-dessus de l’introduction et possède son propre scale, réglable de `0,2×` à `10×`, ainsi qu’un réglage vertical. Elle n’est pas découpée mot par mot.

EGO est un calque indépendant réservé à la partie Match Cut. Il est masqué pendant toute l’introduction et commence exactement à la frame du hard cut. Le réglage « jusqu’à la fin » signifie jusqu’à la dernière frame du Match Cut, et non pendant l’introduction.

## Parité Preview / PICTOR

F03 Preview et PICTOR utilisent les mêmes règles de timeline et de style. Les modifications EGO et Intro Text sont visibles immédiatement dans la Preview sans déplacer la tête de lecture. Les effets colorimétriques, le grain et la vignette commencent au Match Cut en Mode 2 ; l’introduction reste hors effet.

Le normaliseur PICTOR conserve le champ `file`. Le rendu PICTOR lit chaque fichier matérialisé avec `startFrom=0`. Le fallback `video_source.mp4` n’est utilisé que lorsqu’aucun fichier matérialisé n’est présent.

## Validation de rendu

Le diagnostic initial a identifié une répétition causée par l’utilisation du manifeste F00-A et la perte du champ `file`. Le correctif a été testé avec 86 chemins matérialisés et avec plusieurs frames PICTOR montrant des contenus différents.

Le run F04 Hybrid corrigé **#32780869991** a terminé avec succès. Le MP4 final est en 1080×1920, contient 719 frames et dure environ 12,05 secondes. Des échantillons aux instants 2,1 s, 3 s, 5 s et 9 s ont des images différentes, confirmant que le rendu utilise plusieurs séquences Fast Match Cut.

## Commits associés

| Élément | Commit ou run |
|---|---|
| PICTOR lit chaque fichier matérialisé | `8143fe0` |
| Normaliseur et manifeste F04 corrigés | `5f35a4f` |
| Workflow F04 sur `main` | `6fd0de2` |
| Run F04 Hybrid validé | `32780869991` |

## Règle opérationnelle

Ne pas lancer les fregates Camouflage ou Luther pour vérifier le Mode 2. La gate immédiate est : F00-D réussi, Preview validée, puis F04 Hybrid rendu avec PICTOR. Le fichier final peut ensuite être remis aux étapes de post-traitement lorsque l’opérateur le demande.
