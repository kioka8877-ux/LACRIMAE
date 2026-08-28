# Plan d’implémentation — dev8 / reveal-compilation

## Principe de branche
Créer `dev8` à partir de `origin/dev7`, avec le libellé fonctionnel `reveal-compilation`. La branche doit reprendre le code, les contrats et les corrections validés de dev7, mais aucun asset de production ou bundle de test Avengers/Stan Lee ne doit être copié dans le nouveau run.

Le premier commit de dev8 sera un commit de base propre, avant toute fonctionnalité. Les assets de test seront fournis séparément par l’opérateur et resteront hors Git si leur taille ou leur statut le justifie. Les fichiers de configuration d’exemple doivent être neutres et ne contenir aucune référence Derrick Rose, Stan Lee ou Avengers.

## Étape 0 — Base propre

1. Actualiser `origin/dev7`.
2. Créer `dev8` directement depuis `origin/dev7`, et non depuis le worktree local détaché contenant des assets non suivis.
3. Vérifier que le code audio v2, les corrections Hybrid, la Preview et la parité PICTOR sont bien présents.
4. Purger uniquement les assets et manifestes de production du nouveau run, sans supprimer les composants génériques nécessaires.
5. Ajouter une documentation de branche expliquant que dev8 est consacré aux compilations narratives Reveal.

## Étape 1 — Contrat d’entrée Reveal

Créer un contrat de configuration spécifique au format, séparé du codex Hybrid. Il contiendra l’identité de la compilation, les textes narratifs et six slots de sources.

Champs globaux recommandés : titre ou thème, texte OTHERS, texte THIS ONE, catégorie ou mot-clé, texte de transition, texte final optionnel, durée cible et preset visuel.

Chaque slot source contiendra : identifiant, fichier source, label, rôle, séquence ou extrait sélectionné, IN, OUT, position dans la timeline, miroir horizontal, recadrage, vitesse, micro-mouvement, tracking et preset de transition sortante.

Le slot 6 sera marqué explicitement `final_reveal: true`. Cette propriété empêchera de confondre une source ordinaire avec la punchline finale.

## Étape 2 — Workflow F00 spécialisé

Le workflow recevra six sources et produira six lots de séquences candidates. L’opérateur choisira une séquence ou un extrait par source. Les cinq premiers slots formeront la comparaison OTHERS ; le sixième sera réservé au reveal THIS ONE.

Le système devra valider que les six sources existent, que chaque slot possède une sélection exploitable et que la source 6 est bien identifiée comme reveal. Il devra produire un manifeste neutre et déterministe, sans décider automatiquement quelle scène est la meilleure.

## Étape 3 — Preview dédiée

Créer une Preview propre à dev8 avec trois zones principales : configuration narrative, cartes des six sources et timeline finale. Les textes seront saisis au début du workflow, tandis que la Preview permettra de voir leur rendu et de les corriger si nécessaire.

Chaque carte source affichera miniature, séquence, IN/OUT, durée, miroir horizontal, recadrage, mouvement et transition. Une case `Miroir horizontal` sera indépendante pour chaque source. Un bouton global pourra appliquer le miroir à toutes les sources, mais chaque carte devra rester éditable individuellement.

La Preview devra montrer la différence entre les cinq scènes OTHERS et la sixième scène THIS ONE, avec une zone dédiée au reveal final. Les changements devront rester immédiats et la tête de lecture ne devra pas revenir au début lorsqu’un paramètre est modifié.

## Étape 4 — Montage et audio

Les cinq premières scènes utiliseront une grille de durée régulière ou semi-régulière, avec une transition et un SFX entre chaque scène. Le système audio devra permettre un beat de référence, un impact de rupture avant THIS ONE et un impact final synchronisé au reveal.

Les SFX seront paramétrables par transition : whoosh, hit, riser, silence court ou glitch discret. Le niveau sonore devra être normalisé pour éviter que les transitions couvrent la musique principale.

## Étape 5 — Mouvement organique

Après miroir et recadrage, chaque source pourra recevoir un micro-zoom, une dérive horizontale ou verticale, une rotation très légère et, si nécessaire, un tracking de composition. Les cinq premières scènes resteront subtiles.

Le reveal final bénéficiera d’un traitement distinct : ambiance sombre, contraste renforcé, mouvement plus agressif et shake vertical. Le shake aura une montée rapide, un pic de quelques frames et une décélération. Il sera déclenché sur un impact précis et ne secouera pas toute la scène de manière continue.

## Étape 6 — Rendu final et parité

Le moteur Preview et le moteur PICTOR utiliseront le même manifeste Reveal et les mêmes fonctions de normalisation. Le miroir, les positions, les transitions, les textes et le shake final devront être identiques entre l’aperçu et le MP4 final.

Le codex exporté depuis la Preview deviendra l’entrée officielle du rendu. Aucun réglage implicite ou valeur par défaut cachée ne devra modifier le résultat entre F03 et F04.

## Gates de validation

Gate A : branche dev8 créée depuis dev7 proprement, sans assets de production.

Gate B : contrat Reveal validé avec six sources et textes configurables.

Gate C : une séquence sélectionnée et visible pour chaque source.

Gate D : miroir indépendant vérifié sur au moins deux sources.

Gate E : transitions, SFX et mouvement organique visibles dans la Preview.

Gate F : reveal final sombre avec shake vertical validé.

Gate G : codex exporté, rendu PICTOR effectué et comparaison Preview/MP4 validée.

Aucun développement ne commencera avant validation du contrat d’entrée et du comportement attendu de la source 6.

## Ajout brainstorming — musique et formats d’image

La musique doit être un axe de narration, pas seulement une bande sonore. Elle sera organisée en deux zones : une intro musicale bouclable pour les sources 1 à 5, puis une zone de drop/partie forte pour la révélation de la source finale. L’opérateur choisira IN/OUT de la boucle, nombre de boucles, début du drop et fin du segment fort. F03 recevra ensuite une timeline audio normalisée et des marqueurs de transition.

Pour les vidéos horizontales, deux stratégies doivent être proposées dans F00 spécialisé : recadrage intelligent vers le format vertical, ou conservation de l’image complète avec fond de remplissage. Le recadrage peut utiliser un point focal ou un suivi de sujet ; le fond peut être un blur agrandi de la même source, avec assombrissement et éventuellement légère teinte. Le choix doit être enregistré par source, car une même compilation peut mélanger des vidéos verticales et horizontales.

F00 spécialisé doit produire des fichiers prêts à lire pour F03, accompagnés d’un manifeste indiquant le format original, la stratégie appliquée, le point focal, le miroir, le recadrage, les dimensions de sortie et les éventuels paramètres de blur. F03 ne devrait pas refaire la préparation lourde : elle doit surtout sélectionner, ordonner, synchroniser et prévisualiser.
