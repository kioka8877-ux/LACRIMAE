# SHARED/IN — Entrées partagées (mode forge)

C'est ici que l'**opérateur** dépose ce qui ne vient PAS du pack Perturabo.

| Élément | Emplacement | Notes |
|---------|-------------|-------|
| **Vidéo source** | `SHARED/IN/video_source.mp4` | **Directement dans IN** — pas de sous-dossier `videos/`. Jamais commitée (gitignorée, max ~200 Mo). |
| **Fonds PNG** | `SHARED/IN/backgrounds/` | Faits **une fois pour toutes** → menu déroulant « FOND » de la preview |
| **Logo** | `SHARED/IN/logos/logo.png` | Optionnel, PNG fond transparent |

## La vidéo

Dépose ta vidéo à découper **à la racine de ce dossier** :

```
SHARED/IN/video_source.mp4
```

- Nom exact attendu : `video_source.mp4`
- Le bridge (mode forge) et la porte G1 du workflow la lisent d'ici automatiquement
- Le workflow la copie vers `F02_FORMAT/IN/` puis découpe les clips selon les
  timestamps du pack Perturabo — la vidéo brute n'est jamais chargée par la preview
- Elle est **gitignorée** : tu peux la déposer sans risquer de la commiter

## Ce qui ne va PAS ici

- Les clips coupés (`F02_FORMAT/OUT/clips/`) — générés par la frégate
- Le pack Perturabo (`BRIDGE_PERTURABO/IN/production_pack.json`) — récupéré par l'Oracle
