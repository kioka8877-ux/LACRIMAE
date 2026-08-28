# F00 INGEST — dev4

F00 prépare la matière première du Fast Match Cut en deux sous-étapes déterministes. **F00-A SCOUT** identifie et classe les passages exploitables. **F00-B EXTRACT** matérialise ensuite les séquences retenues avec FFmpeg et vérifie qu’elles sont lisibles avant F03 Preview et PICTOR.

## Entrées

Placez la vidéo dans `IN/video_source.mp4` et renseignez `IN/production_request.json` :

```json
{
  "project_title": "Luxury Match Cut 01",
  "target_duration_seconds": 10,
  "cut_interval_frames": 7,
  "candidate_count": 172,
  "scout_sample_fps": 2,
  "min_mean_luma": 0.075,
  "min_luma_std": 0.025,
  "min_candidate_gap_seconds": 0.35
}
```

## Exécution

```bash
python3 CODEBASE/f00_scout.py \
  --source IN/video_source.mp4 \
  --request IN/production_request.json \
  --out OUT/scout

python3 CODEBASE/f00_extract.py \
  --source IN/video_source.mp4 \
  --plan OUT/scout/sequences_plan.json \
  --out OUT/materialized
cp OUT/materialized/sequences.json OUT/sequences.json
```

## Sorties

`OUT/scout/sequences_plan.json` est le contrat Oracle de F00-A. Il contient les candidats, leurs scores de visibilité et les positions de timeline.

`OUT/materialized/sequences.json` est le contrat validé de F00-B. Il référence les fichiers `OUT/materialized/sequences/seq_XXXX.mp4`. Chaque séquence est un petit fichier H.264 indépendant, contrôlé avec FFprobe et une mesure de luminosité sur l’ensemble des frames.

Le schéma matérialisé est `dev4.materialized-sequences.v1`. Pour une cible de 10 secondes à environ 60 FPS et 7 frames par cut, il contient environ 86 séquences. F03 et PICTOR utilisent ces fichiers locaux ; ils ne doivent plus chercher aléatoirement les frames dans la source longue lorsqu’un champ `file` est présent.

`f00_ingest.py` reste disponible pour la compatibilité avec les anciens manifestes virtuels `dev4.virtual-sequences.v1`, mais le flux direct dev4 utilise désormais F00-A puis F00-B.

## F00-C Motion Slow (optionnelle)

F00-C ne s’exécute que lorsqu’elle est demandée par l’opérateur. Elle ne modifie jamais les sorties normales de F00-B et écrit ses résultats dans un dossier parallèle.

```bash
# Mode normal : copie validée, aucun traitement d’interpolation
python3 CODEBASE/f00_motion_slow.py \\
  --source IN/video_source.mp4 \\
  --manifest OUT/materialized/sequences.json \\
  --out OUT/motion_slow \\
  --mode off

# Mode partiel : effet uniquement entre 3 et 7 secondes
python3 CODEBASE/f00_motion_slow.py \\
  --source IN/video_source.mp4 \\
  --manifest OUT/materialized/sequences.json \\
  --out OUT/motion_slow \\
  --mode partial \\
  --speed 0.5 \\
  --ranges 3-7

# Mode global : effet sur toutes les séquences
python3 CODEBASE/f00_motion_slow.py \\
  --source IN/video_source.mp4 \\
  --manifest OUT/materialized/sequences.json \\
  --out OUT/motion_slow \\
  --mode global \\
  --speed 0.5
```

Le moteur initial est FFmpeg `minterpolate`. Les vitesses supportées sont 0,75×, 0,5× et 0,25×. Le manifeste `OUT/motion_slow/motion_slow_manifest.json` conserve les séquences normales hors des plages demandées et référence les séquences interpolées dans les plages actives. La durée timeline est conservée à la durée cible du manifeste F00-B.

Le workflow isolé `.github/workflows/dev4_f00c.yml` récupère un artifact F00-B validé et accepte les paramètres `off`, `partial` ou `global`. Il s’arrête après l’artifact F00-C : F03, PICTOR, F05 et F06 ne sont pas lancées automatiquement.

RIFE ncnn Vulkan est réservé à une future comparaison qualité. Il n’est pas proposé comme moteur exécutable dans le premier workflow tant que son modèle et son runner ne sont pas validés.

## F00-D Hybrid Narrative / EGO (optionnelle)

F00-D s’exécute uniquement lorsque l’opérateur choisit le **Mode 2 — Hybrid Narrative**. Il ne relance ni F00-A, ni F00-B, ni F00-C et ne sélectionne aucune séquence. Il récupère un manifeste Match Cut déjà validé, matérialise une introduction image ou vidéo, puis produit un artifact autonome contenant la timeline `Intro → hard cut → Match Cut`.

Pour une image, `--intro-type image` et `--image-duration` créent un MP4 H.264 à la durée demandée. Pour une vidéo, `--intro-type video` permet de fournir `--intro-in` et `--intro-out` en secondes ; la portion est découpée avant d’être intégrée. L’introduction est fournie à F00-D via `--intro` en local ou par `intro_source_url` dans le workflow GitHub Actions.

Le texte **EGO** est un réglage de composition transmis dans `hybrid_manifest.json`. Il est strictement masqué pendant l’introduction et démarre au hard cut du Match Cut. Le contrat conserve le texte en majuscules, la police, la couleur, le scale borné de `1` à `10`, la rotation bornée de `-180°` à `180°` et le mode de durée `until_match_cut`, `until_end` ou `custom`. Le rendu typographique reste dans F03 Preview et PICTOR ; F00-D ne dessine pas le texte dans le média d’introduction.

Le calque **Intro Text** est une phrase fixe indépendante, par défaut `C’EST JUSTE UN JOUEUR`. Il ne fonctionne pas mot par mot. Il possède ses propres réglages de style et de durée ; son scale est borné de `0,2` à `10`, afin de permettre une taille cinq fois plus petite que la base. F00-D transporte ces paramètres dans le manifeste, tandis que F03 Preview et PICTOR rendent le calque au-dessus de l’introduction.

```bash
python3 CODEBASE/f00_hybrid.py \\
  --matchcut-manifest OUT/motion_slow/motion_slow_manifest.json \\
  --intro IN/HYBRID/intro.png --intro-type image --image-duration 2 \\
  --ego EGO --ego-font Impact --ego-color '#FFFFFF' \\
      --ego-scale 4 --ego-rotation 12 --ego-duration-mode until_match_cut \\
  --out OUT/hybrid
```

Le champ `intro_text` peut être ajouté au manifeste pour fournir la phrase fixe d’introduction. Les fichiers Match Cut matérialisés restent référencés par leur chemin `file` relatif, sans retomber sur un fallback unique lorsque le chemin existe.

Le résultat est `OUT/hybrid/hybrid_manifest.json`, accompagné de `intro/intro.mp4`, de `match_cut/sequences.json`, des séquences copiées et de `hybrid_report.json`. Le workflow isolé `.github/workflows/dev4_f00d.yml` publie uniquement cet artifact et s’arrête avant F03 Preview et PICTOR.

## F00-E Reveal Clip Prep (dev8)

F00-E reçoit directement une requête de trois à six sources avec les plages IN/OUT choisies par l’opérateur. Pour chaque source, il extrait le clip, applique le miroir horizontal éventuel après la découpe, puis normalise la sortie en 1080×1920 H.264 sans audio. Le mode `crop` remplit le cadre vertical ; le mode `blur` conserve l’image complète avec un fond agrandi et flouté.

F00-E écrit `clips/*.mp4`, `reveal_sources.json` et `reveal_report.json`. Il ne gère ni narration, ni boucle musicale, ni transitions, ni SFX. Ces décisions appartiennent à F03 Preview. Le dernier clip est identifié comme `final_reveal` dans le manifeste.

```bash
python3 CODEBASE/f00_reveal.py \\
  --request IN/reveal_request.example.json \\
  --out /tmp/reveal-f00e
```

Le flux dev8 est donc `F00-E → F00-MUSIC → F03 Preview → F04`. F00-C et F00-D restent optionnels et séparés.
