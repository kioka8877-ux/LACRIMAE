# Vérification Mode 2 — 2026-08-24

La preview publique F03 a été relancée après le correctif de timeline EGO.

- À 0:00, l’image d’introduction affiche la phrase fixe « C’EST JUSTE UN JOUEUR » et EGO est absent.
- Après lecture au-delà de l’introduction, vers 0:09, une séquence Fast Match Cut est visible et EGO apparaît sur la partie Match Cut.
- Le manifeste contient 86 séquences et les 86 fichiers média sont présents dans `F03_PREVIEW/CODEBASE/public/match_cut/sequences/`.
- Le premier fichier référencé est `match_cut/sequences/seq_0001_normal.mp4`.
- Le point restant à corriger est la borne UI du scale de la phrase fixe : le helper accepte déjà 0,2×, mais le curseur de l’interface commence encore à 1×.
