# Méméthèque LACRIMAE — mode MEME

Dossier plat de la méméthèque. Les memes sont fournis par l'opérateur,
**déjà coupés et prêts à l'emploi** (pas de découpe F02 en mode meme).

## Convention de nommage

- Fichiers nommés `meme_001.mp4`, `meme_002.mp4`, ... (numérotation continue).
- Le numéro est la seule référence utilisée par le pack Perturabo :
  `"meme": "meme_004"` pour un angle donné.
- **Pas de sous-dossiers par émotion** : la méméthèque est plate.

## Contraintes techniques

- Format : **MP4** (H.264 + AAC, yuv420p, `-movflags +faststart`).
- Orientation : **horizontal** (le canvas final reste 9:16 1080x1920, le meme
  est posé en `contain` sur la moitié basse).
- Durée : non fixe — la composition Remotion boucle (`loop` net) si le meme
  est plus court que la durée cible du pack, et trime s'il est plus long.
  Une durée recommandée de 5-7 s est suffisante pour couvrir une cible 5-7 s.
- Pas de piste audio obligatoire (mode muet-compréhensible).

## Règles

1. Un meme absent de ce dossier = **échec bloquant** au bridge (Contrôle CUSTOS) :
   LACRIMAE refuse de tourner.
2. Le même meme peut apparaître dans plusieurs angles, mais il est recommandé
   d'éviter les doublons dans un même pack (SIGNE différencie fond/caméra/
   textes, pas la source brute du meme).
3. Déposer les memes dans ce dossier, ils sont commités et re-stagés par les
   workflows GHA vers `public/` des frégates F03/F04 à chaque run.

<!-- F00B-LISTING -->
## Méméthèque actuelle (généré par F00B)

- meme_001.mp4


## Méméthèque actuelle (généré par F00B)

- *(méméthèque vide — en attente de la récolte F00B)*

