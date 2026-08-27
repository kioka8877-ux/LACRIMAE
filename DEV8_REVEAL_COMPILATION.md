# dev8 — Reveal Compilation

## Objectif

La branche `dev8` ajoute le format narratif **Others vs This One** sans modifier le flux de production stable de `dev7`. Une compilation utilise jusqu’à six sources vidéo : les cinq premières alimentent la comparaison `OTHERS`, et la sixième constitue le `THIS ONE` / `Final Reveal`.

## Flux officiel

```text
F00-E Reveal Clip Prep
        ↓
F00-MUSIC audio analysis
        ↓
F03 Preview — sélection et montage opérateur
        ↓
F04 Signum / Pictor — rendu déterministe
```

F00-E extrait et prépare les clips. F00-MUSIC analyse l’audio. F03 est la seule Preview de montage et conserve la décision de la boucle musicale. F04 rend le MP4 à partir du codex exporté.

## F00-E

Entrée : un fichier JSON contenant une liste de une à six sources. Chaque source définit `id`, `source`, `in_seconds`, `out_seconds`, `mirror` et `fit_mode` (`crop` ou `blur`). La sixième source est marquée `role: final_reveal`.

Pour chaque source, l’ordre des opérations est : source originale, découpe IN/OUT opérateur, extraction muette du clip, miroir horizontal éventuel, préparation verticale et validation. Le miroir est une inversion gauche-droite et s’applique au clip vidéo uniquement ; les textes de F03 ne sont jamais inversés.

Sorties : `clips/*.mp4`, `reveal_sources.json` et `reveal_report.json`. Les clips sont encodés en H.264, 1080×1920, pixels `yuv420p`, fréquence par défaut 30 fps et sans audio. La musique est ajoutée dans F03.

Commande de référence :

```bash
python3 F00_INGEST/CODEBASE/f00_reveal.py \
  --request F00_INGEST/IN/reveal_request.example.json \
  --out /tmp/lacrimae-reveal-f00e
```

## F00-MUSIC

F00-MUSIC produit les informations techniques de la piste : durée, fréquence d’échantillonnage, BPM, beats et climax indicatif. Il ne décide pas de l’edit. Dans F03, l’opérateur choisit une portion courte, par exemple trois secondes, qui est répétée indépendamment pour couvrir la durée de chaque scène.

Une scène de cinq secondes reçoit `3 + 2` secondes, une scène de sept secondes reçoit `3 + 3 + 1` seconde et une scène de neuf secondes reçoit trois répétitions complètes. La partie forte est sélectionnée séparément et commence au reveal final.

## F03 Preview

F03 charge `reveal_sources.json` lorsqu’il est présent et propose un onglet `Reveal`. Les textes globaux sont modifiables dans la Preview : thème, label `OTHERS`, label `THIS ONE`, texte de transition et texte final.

Chaque scène expose sa durée, son type de transition et son mouvement. Le miroir est affiché comme une préparation F00-E déjà appliquée. Les deux transitions sont `with_sfx` et `silent`, avec alternance recommandée. Un click peut être utilisé au début, tandis que le reveal final reçoit l’impact principal et le shake vertical.

Le bouton d’export ajoute `review_mode: reveal_compilation` et `reveal_manifest` au `codex.json`. Une chaîne vide est conservée pour permettre la suppression réelle d’un texte.

## F04

F04 reçoit le codex validé, le manifeste Reveal, les clips préparés et la piste audio. Il ne re-sélectionne aucune source et ne réinterprète aucun réglage. La Preview et PICTOR utilisent le même normaliseur `revealCompilation.js` pour conserver les durées, les rôles, les mouvements et le shake final.

## Gates

| Gate | Vérification |
|---|---|
| A | F00-E accepte au maximum six sources et rejette les plages IN/OUT invalides |
| B | Chaque clip est H.264, 1080×1920, 30 fps par défaut et lisible |
| C | F00-MUSIC produit une timeline exploitable sans déplacer la décision de boucle hors de F03 |
| D | F03 affiche les six sources, conserve les textes vides et recalcule les durées |
| E | La boucle audio est plus courte que chaque scène et couvre sa durée sans redémarrage global |
| F | Les transitions alternent SFX/silence et le click reste limité au démarrage |
| G | F04 rend le même ordre, les mêmes durées et le même reveal que la Preview |

## Périmètre volontairement exclu

F00-C Slow Motion et F00-D Hybrid/EGO restent séparés. Aucun asset de production réel n’est versionné dans la base de dev8. Les essais locaux doivent utiliser un dossier de run externe ou un artefact CI.
