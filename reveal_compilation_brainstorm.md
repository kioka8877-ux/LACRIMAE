# Brainstorming — format Reveal Compilation

## Concept
Branche séparée destinée aux compilations narratives de type « OTHERS VS THIS ONE ». Une vidéo regroupe six sources distinctes. L’opérateur sélectionne une séquence représentative dans chaque source, puis positionne ces six scènes dans une timeline éditoriale.

## Structure proposée
1. Accroche narrative : « OTHERS ... ».
2. Sources 1 à 5 : une scène par source, avec durée courte et rythme régulier.
3. Transitions et SFX entre les cinq premières scènes.
4. Rupture textuelle : « THIS ONE ».
5. Sixième source : reveal final sombre, avec traitement visuel et shake vertical puissant.

## Langage de mouvement
Chaque scène peut recevoir un micro-zoom, un léger drift horizontal/vertical ou un tracking doux. Ces mouvements doivent rester subtils sur les cinq premières scènes afin de garder la lisibilité. Le reveal final peut utiliser une amplitude et une accélération nettement supérieures.

## Questions à valider avant implémentation
- La sixième source est-elle toujours réservée au reveal final ?
- L’opérateur choisit-il une séquence ou un intervalle IN/OUT par source ?
- Les transitions sont-elles choisies individuellement ou via un preset ?
- Le shake final doit-il être un effet vertical de caméra, un déplacement de composition ou les deux ?
- Le texte est-il fixe pendant chaque scène ou animé entre les scènes ?

## Recommandation de workflow
Le workflow devrait distinguer clairement les six rôles : Source 1 à Source 5 pour la comparaison « OTHERS », puis Source 6 pour « THIS ONE ». Pour chaque source, l’opérateur devrait pouvoir visualiser la vidéo, choisir un extrait IN/OUT ou une séquence déjà extraite, puis voir immédiatement sa place dans la timeline. Le système ne doit pas déduire automatiquement que la meilleure scène est la dernière : le statut de reveal final doit être une décision éditoriale explicite.

## Recommandation de rythme
Les cinq premières scènes peuvent suivre une grille régulière, par exemple 2 à 4 secondes chacune. La sixième peut être légèrement plus longue, précédée d’une micro-suspension ou d’un impact sonore court. La régularité crée l’attente ; la rupture finale produit l’effet « THIS ONE ».

## Recommandation de transitions et SFX
Les transitions ordinaires doivent rester courtes et organiques : hard cut avec whoosh discret, whip léger, impact sec ou petit glitch selon le contenu. Les SFX ne doivent pas être identiques entre chaque scène, sinon le format semblera mécanique. Le reveal final doit avoir une signature différente : silence ou aspiration très brève, impact grave, puis shake vertical.

## Recommandation pour le shake final
Le shake doit être un mouvement de caméra/composition vertical, avec une montée rapide d’amplitude, un pic très court et une décélération. Il doit être synchronisé au premier frame ou au premier impact du reveal, et non appliqué uniformément à toute la sixième scène. Un léger zoom et un déplacement latéral peuvent l’accompagner, mais le mouvement vertical doit rester la signature principale.
