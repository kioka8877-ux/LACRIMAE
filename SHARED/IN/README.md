# SHARED/IN — Entrées partagées (mode forge)

C'est ici que l'**opérateur** dépose ce qui ne vient PAS du pack Perturabo.

| Élément | Emplacement | Notes |
|---------|-------------|-------|
| **Vidéo source** | `SHARED/IN/video_source.mp4` | **Directement dans IN** — pas de sous-dossier `videos/`. Jamais commitée (gitignorée, max ~200 Mo). |
| **Fonds PNG** | `SHARED/IN/backgrounds/` | Faits **une fois pour toutes** → menu déroulant « FOND » de la preview |
| **Logo** | `SHARED/IN/logos/logo.png` | Optionnel, PNG fond transparent |

## La vidéo

### Petite vidéo (< 100 Mo) — en local, dans SHARED/IN

Dépose ta vidéo à découper **à la racine de ce dossier** :

```
SHARED/IN/video_source.mp4
```

- Nom exact attendu : `video_source.mp4`
- Le bridge (mode forge) et la porte G1 du workflow la lisent d'ici automatiquement
- Elle est **gitignorée** : tu peux la déposer sans risquer de la commiter

### Grosse vidéo (> 100 Mo → jusqu'à ~1 Go) — GitHub Releases

**Git refuse les fichiers > 100 Mo** (push) et > 25 Mo (upload web GitHub).
Pour ta vidéo (~200 Mo), elle ne passe ni par git ni par le web : elle se
dépose comme asset d'une **GitHub Release** (2 Go max par fichier, gratuit sur
repo public).

```
# Depuis la racine du repo, gh connecté :
sh _tools/lac_release_video.sh /chemin/vers/ta_video.mp4 [tag]
```

- L'asset est nommé automatiquement `video_source.mp4`
- La porte **G1** du workflow la télécharge toute seule depuis la release
  (dernière release par défaut, ou tag précis via l'input `release_tag`)
- Tag réutilisable : relance le script pour remplacer la vidéo (`--clobber`)

## Ce qui ne va PAS ici

- Les clips coupés (`F02_FORMAT/OUT/clips/`) — générés par la frégate
- Le pack Perturabo (`BRIDGE_PERTURABO/IN/production_pack.json`) — récupéré par l'Oracle
