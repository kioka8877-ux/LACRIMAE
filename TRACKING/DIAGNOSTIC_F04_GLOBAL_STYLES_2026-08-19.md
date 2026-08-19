# Diagnostic F04 — divergence des styles globaux

Run audité : https://github.com/kioka8877-ux/LACRIMAE/actions/runs/32202328238

Le run GitHub Actions est techniquement réussi, mais le rendu utilise le codex présent à la tête `bf2544a` de `dev3`. Les fichiers `F03_PREVIEW/IN/codex.json`, `F04_RENDER/IN/codex.json` et `F04_RENDER/CODEBASE/public/codex.json` ont le même SHA-256 `cc71bfda50feaa5b2b28a3ea991f783730bd348c7d00c5ebb2bc2b6cccbf9e7b`.

Constat principal : le codex courant ne contient pas les réglages globaux validés dans le codex de référence du commit `dd492a6`. Le codex courant indique `session.background.image = bg_grid_dark.png`, tandis que `dd492a6` indiquait `bg_paper_crumpled.png`. Le codex courant ne contient pas, dans le clip maître, `tweet.text_size`, `text_emotion_position_pct`, `text_emotion_size` ni `meme.height_pct`; la résolution retombe donc sur les défauts du composant (`17`, `43`, `40`, `48`). Le commit `dd492a6` contenait au contraire `text_size = 51`, `text_emotion_position_pct = 92`, `text_emotion_size = 100` et une hauteur de meme propagée.

Le commit `156ddfb` n’a fait que passer `validated_by_magos` de `false` à `true`; il n’a pas restauré les styles. Le commit `6b1c519` a remplacé la copie du codex de preview par le codex généré par le bridge/F02 pour le pack Doomsday, ce qui a réintroduit `bg_grid_dark.png` et supprimé les styles validés précédemment.

La transmission Remotion elle-même est cohérente : `Root.jsx` charge `codexData`, crée `masterClip = clips[0]` et passe `codex`, `session` et `masterClip` à chaque composition. `MemeComposition.jsx` applique correctement les valeurs du clip ou du maître, mais utilise les défauts lorsque les champs ne sont pas présents. Le problème est donc en amont : mauvais snapshot de codex, pas un échec de la matrix ni de `masterClip`.

La correction locale a maintenant été appliquée sans rendu : les contenus, médias, identifiants et blocs SIGNE Doomsday ont été conservés, tandis que les paramètres visuels validés ont été restaurés dans les copies F03/F04 du codex. Le codex restauré passe `tools/validate_f04_codex.py` avec 8 clips, `bg_paper_crumpled.png`, tweet maître `51px`, émotion `92% / 100px` et héritage identique sur tous les clips.

Le workflow F04 appelle désormais ce validateur avant de construire la matrix. Une divergence future bloquera `prepare` avant tout rendu. Aucun rendu n’a encore été relancé après ce patch.

Prochaine étape : committer/pousser ce correctif, puis lancer une nouvelle validation F04 sur GitHub Actions.
