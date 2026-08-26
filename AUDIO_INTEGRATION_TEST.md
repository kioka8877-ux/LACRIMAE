# Dev7 — Test Audio Integration

## Exécution F00-MUSIC

Le fichier fourni Sia — *Elastic Heart* a été copié dans `F03_PREVIEW/CODEBASE/public/audio/sia_elastic_heart.mp3` et analysé par `F00_INGEST/CODEBASE/f00_music.py`.

| Paramètre | Valeur |
|---|---:|
| BPM détecté | 134.7 |
| Marqueurs de beat | 599 |
| Boucle d’introduction | 0.00 s → 4.00 s |
| Climax de test | 2.50 s |
| Début Match Cut | frame 63 à 25 fps |
| Volume intro | 75 % |
| Volume Match Cut | 100 % |
| Mode | Assisté |

Le pic automatique détecté à 15,25 s est conservé dans l’analyse brute comme suggestion, mais le timeline de test utilise volontairement 2,50 s afin de faire coïncider le climax avec la sortie de l’introduction Hybrid et le début du Match Cut.

## Vérification Preview locale

La Preview F03 de dev7 charge correctement `codex.json`, affiche le mode `Mode 2 — Hybrid / EGO`, montre la vidéo Derrick Rose et affiche le panneau `Audio Sync` avec la forme d’onde Sia. Le panneau confirme : `sia_elastic_heart.mp3`, boucle `0.00s → 4.00s`, climax `2.50s`, volume intro `75%`, volume Match Cut `100%`.

La source absente `public/video_source.mp4` a été restaurée à partir de `match_cut/sequences/seq_0001_normal.mp4` pour permettre la Preview locale. Cette source est un fallback de test ; les séquences virtuelles restent celles du codex validé.

## Lien de Preview

Serveur local temporairement exposé : https://4174-i0vc9ejneyprmwpqxyskk-4123c77f.us4.manus.computer/

Le navigateur bloque initialement l’audio avec autoplay ; il faut cliquer sur `Unmute sound` pour écouter Sia. La tête de lecture reste dans l’introduction avant 2,50 s, puis le moteur doit basculer au Match Cut et rendre EGO selon le codex.

## Correction de la waveform

La waveform F03 affiche désormais une zone verte correspondant à `loop_in → loop_out`, deux poignées `IN` et `OUT` déplaçables, ainsi qu’une poignée rouge `CLIMAX` pour le point de bascule Match Cut/EGO. Les champs numériques restent disponibles comme méthode de précision. La Preview a été rechargée avec succès après compilation Vite (`45 modules transformed`, build réussi).

Le contrôle DOM confirme la présence de 3 groupes interactifs (`IN`, `OUT`, `CLIMAX`) dans la waveform, avec une durée audio affichée de 255,2 s. Le build de production a réussi sans erreur.

## Preview relancée

La Preview accessible sur le serveur local dev7 a été rechargée après la correction. Le panneau Audio Sync montre les repères `IN`, `OUT` et `CLIMAX`; la vidéo Hybrid arrive bien au moment EGO/Match Cut à 2,50 s dans l’état actuel. Le build F03 reste valide après la modification de `normalizeMusicTimeline`.

## Timeline audio v2 implémentée

Le panneau Audio Sync comporte désormais :

- `Intro IN` et `Intro OUT` pour sélectionner la portion à répéter ;
- `Nombre de boucles` de 1 à 20 ;
- durée de l’introduction calculée automatiquement ;
- `Match Cut IN / Drop` et `Match Cut OUT / Fin` choisis séparément ;
- durée du Match Cut calculée automatiquement ;
- vitesse Intro et vitesse Match Cut ;
- transition audio `Cut sur le beat`, `Crossfade court` ou `Beat jump` ;
- alignement `Beat le plus proche` ou `Position exacte` ;
- zone verte Intro et zone rouge Match Cut sur la waveform.

La logique de segments et les enveloppes de transition sont partagées par F03 Preview et F03 PICTOR. Le commit publié est `6594e20` sur `origin/dev7`.

Configuration de test publiée : Intro `0–1 s`, 4 boucles, Match Cut `42,5–50,5 s`, transition `beat_cut`, 30 ms technique, vitesses `1,00×`.
