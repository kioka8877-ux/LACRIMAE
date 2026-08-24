# Guide d’utilisation — MEME V2

> **Objectif.** MEME V2 transforme un pack éditorial préparé en amont en une vidéo de réaction sociale séquentielle. LACRIMAE ne crée ni l’angle, ni le texte, ni la capture source : il rend exclusivement les éléments fournis dans le pack.

## 1. Contrat du pack

Le pack doit déclarer `sub_mode: "meme_v2"` et contenir une liste `videos` non vide. Chaque angle doit fournir `reaction_tweet`, `source_post.screenshot_png`, `text_emotion` et `meme`. La capture et le texte sont éditoriaux ; ils ne doivent pas être générés ou remplacés par le renderer.

```json
{
  "mode": "meme",
  "sub_mode": "meme_v2",
  "videos": [{
    "angle_id": "A01",
    "reaction_tweet": "Texte original de la réaction",
    "source_post": {
      "platform": "x",
      "post_url": "https://…",
      "screenshot_png": "captures/post_001.png"
    },
    "text_emotion": "QUAND TU VOIS ÇA",
    "meme": "meme_001",
    "duration_sec": 8
  }]
}
```

Le meme doit exister dans `SHARED/memes/`. Une capture locale est recherchée relativement au dossier du pack puis transité vers `public/source_posts/` par le bridge. Une URL distante peut être conservée comme référence, mais une capture locale reste recommandée pour garantir un rendu reproductible.

## 2. Séquence de rendu

L’apparition est strictement ordonnée. Une couche reste visible après son entrée.

| Élément | Début par défaut | Rôle |
|---|---:|---|
| Réaction Lacrimae | 0 % | Angle original fourni par le pack |
| Capture source | 15 % | Preuve visuelle du post social |
| `text_emotion` | 33 % | Lecture émotionnelle préparée par l’éditorial |
| Clip MEME | 41 % | Réaction visuelle finale |

Pour un clip de 8 secondes à 30 fps, les débuts sont respectivement les frames `0`, `36`, `79` et `98`. Il ne faut pas utiliser une composition MEME V1 pour un pack V2.

## 3. Parcours Oracle / Champion

L’Oracle vérifie la branche, le pack, les assets et le contrat avant tout lancement. Il utilise le bridge pour produire le codex, puis vérifie que `sub_mode` est resté `meme_v2` et que chaque capture a été transité. Le Champion ouvre la preview F03, vérifie l’ordre des quatre couches, la lisibilité et la correspondance entre capture, texte émotion et meme. Après validation, le codex peut recevoir `validated_by_magos: true` et suivre le parcours F04, F05 et F06 sur GitHub Actions.

> Aucun rendu local ne remplace la validation de production GitHub Actions. Aucun workflow ne doit être lancé avant la validation du Champion.

## 4. Contrôles de rejet

Le pack est bloqué si une réaction, une capture, un texte émotion ou un meme manque. Le rendu est également bloqué si la capture n’est pas lisible, si l’ordre d’apparition est inversé ou si le clip MEME devient visible avant 41 % de la timeline.

## 5. Commandes de vérification

```bash
git branch --show-current
python3 -m py_compile BRIDGE_PERTURABO/CODEBASE/lac_bridge_forge.py LAC_CUSTOS.py tools/validate_f04_codex.py
python3 tools/test_meme_v2_contract.py
cd F03_PREVIEW/CODEBASE && npm run build
```

Le lancement GitHub Actions reste une étape séparée, explicitement autorisée par le Champion après la gate F03.

## Références

[1]: ../GUIDE_UTILISATION/04_MODE_MEME.md "Contrat opérationnel MEME V1"
[2]: ../GUIDES_PRODUCTION/GUIDE_FONCTIONNEMENT_TECHNIQUE_MEME.md "Fonctionnement technique MEME"
[3]: ../TRACKING/HANDOFF_NEXT_DEV.md "Handoff courant du projet"
