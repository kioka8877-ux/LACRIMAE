# 05 — NOTE TECHNIQUE POUR PERTURABO : FORMAT EXACT DU PACK MEME

> **À l'attention de PERTURABO.** Tu joues le rôle d'**OMNIS_WATCH** : tu écris la
> consigne de montage (le pack), LACRIMAE l'exécute de bout en bout — il ne
> réfléchit pas, il assemble ce que le pack lui dit d'assembler.
> Ce document est le **contrat d'entrée** : un pack conforme tourne, un pack non
> conforme est refusé (échec bloquant au bridge, CUSTOS).

---

## 1. Ce que LACRIMAE produit (le livrable)

À partir d'**un pack** `sub_mode: meme`, LACRIMAE sort **N vidéos meme finies**
9:16 (1080x1920) — une par angle du pack :

```
┌─────────────────────────┐
│ TITRE (optionnel)       │  ← pack
├─────────────────────────┤
│ CARD TWEET (split haut) │  ← texte du pack + persona/stats LACRIMAE
├─────────────────────────┤
│ TEXTE ÉMOTION           │  ← pack (au milieu)
├─────────────────────────┤
│ MEME (moitié basse)     │  ← SHARED/memes/meme_XXX.mp4 (contain)
│ watermark @chaine       │  ← LACRIMAE
│ logo (optionnel)        │  ← SHARED/logos
└─────────────────────────┘
```

Le viewer voit : **titre en haut, tweet, texte émotion, meme en bas (réaction)**
avec watermark @chaine et logo par-dessus le meme. **Aucune découpe** : les memes
sont déjà coupés et prêts dans la méméthèque.

---

## 2. Schéma du pack (`sub_mode: meme`) — version CONFORME

```json
{
  "pack_id": "MEME-<CAMPAGNE>-siege_YYYYMMDD_HHMMSS",
  "siege_id": "siege_YYYYMMDD_HHMMSS",
  "mode": "logo",
  "sub_mode": "meme",
  "montage_guide_ref": "GUIDE_UTILISATION/04_MODE_MEME.md",
  "clip_source_ref": { "source_type": "meme_keyword" },
  "videos": [
    {
      "video_index": 1,
      "angle_id": "A01",
      "title": "He quit the NBA for this",
      "meme": "meme_004",
      "tweet": {
        "text": "bro really retired for pottery class",
        "keywords_style": { "green": ["pottery"], "red": ["retired"] }
      },
      "text_emotion": "never thought i'd see this",
      "emotion": "poignant",
      "duration_sec": 6,
      "logo_placement": "Logo fourni par la campagne..."
    }
  ]
}
```

### Champs OBLIGATOIRES (échec bloquant si absent)

| Champ | Rôle |
|-------|------|
| `sub_mode` | doit être exactement `"meme"` |
| `montage_guide_ref` | `GUIDE_UTILISATION/04_MODE_MEME.md` (sinon refus de tourner) |
| `videos[]` | liste non vide |
| `videos[].meme` | **nom du fichier dans la méméthèque** : `meme_004` ou `meme_004.mp4`. S'il n'existe pas dans `SHARED/memes/` → échec bloquant |
| `videos[].tweet.text` | texte du post (Perturabo) — **pas `tweet_text`** |
| `videos[].text_emotion` | texte du milieu (réaction) — **pas `reaction_text`** |

### Champs OPTIONNELS (défauts sûrs)

| Champ | Défaut | Notes |
|-------|--------|-------|
| `title` | absent (pas de titre) | peut être `null` |
| `emotion` | - | libre, non validé |
| `duration_sec` | 6 s | validé dans la range 3-10 s. **La durée du pack pilote le rendu** (loop net si le meme est plus court, trim s'il est plus long) |
| `tweet.keywords_style` | `{}` | coloration de mots : `{"green": [...], "red": [...]}` |
| `logo_placement` | - | texte libre opérateur, pas de contrainte technique |
| `angle_id` / `video_index` | dérivés | cosmétiques |
| `identite.campaign_id` | - | propagé dans le codex |

---

## 3. Table de correspondance (ce que Perturabo émet → ce que LACRIMAE attend)

| Champ actuel de Perturabo | Champ attendu par LACRIMAE | Action |
|---------------------------|---------------------------|--------|
| `tweet_text` (string) | `tweet.text` (string) | **renommer / imbriquer** |
| `reaction_text` (string) | `text_emotion` (string) | **renommer** |
| `emotion` | `emotion` | OK, inchangé |
| `title` | `title` | OK, inchangé |
| `metadata.*`, `viral_paragraph`, `on_screen_text` | — | ignorés (conservables pour archivage) |
| `cut.{start_sec,end_sec,duration_sec}` | — | **inutile en mode meme** (aucune découpe) — peut rester en info |
| `duration_sec_range.{min,max}` | `duration_sec` | soit un `duration_sec` fixe par angle, soit omettre (défaut 6 s) |
| **ABSENT** | `meme` | **À AJOUTER obligatoirement** : référence `meme_XXX` vers `SHARED/memes/` |
| **ABSENT** | `montage_guide_ref` | **À AJOUTER** en tête de pack |
| **ABSENT** | `tweet.keywords_style` | optionnel (recommandé) — voir §4 |

---

## 4. Coloration des mots du tweet (`tweet.keywords_style`)

Le rendu colorie certains mots du tweet (vert = valeur positive, rouge = danger,
gras automatiquement). Pour que ça fonctionne, **le format et les mots doivent
respecter 2 règles strictes** :

### Règle 1 — format DICT (pas une liste)

```json
"tweet": {
  "text": "Took out $50K in student loans for a degree",
  "keywords_style": { "green": ["degree"], "red": ["loans", "interest"] }
}
```

- Objet avec les **clés en anglais** : `green` et `red` — **pas** `vert`/`rouge`.
- Chaque clé = **tableau de mots** (string). Une liste `[{word, color}]` ne
  coloriera **rien** (le rendu lit `.green` / `.red`).

### Règle 2 — mots SEULS, présents tel quel dans le tweet

Le rendu découpe le tweet sur les **espaces** et compare **mot par mot**
(minuscules, ponctuation ignorée : `loans,` == `loans`). Donc :

- ✅ `"loans"` colorie le mot `loans` du tweet.
- ❌ `"student loans"` (2 mots) ne matche **jamais** : `student` et `loans`
  sont deux tokens séparés, la phrase n'est comparée à aucun token.

**Contrainte opérateur** : chaque entrée doit être **un mot unique** présent
dans `tweet.text`. Éviter les phrases, les chiffres seuls (`$50K` → `50K` peut
être coloré, mais `$` est ignoré), et les mots trop courts/communs (risque de
sur-coloration : éviter `a`, `the`, `to`, `and`…).

> Si Perturabo veut colorer une **phrase multi-mots**, il faudra faire évoluer
> le rendu LACRIMAE (matching par sous-chaîne) — hors contrat actuel, à ne pas
> attendre.

---

## 5. Méméthèque : la règle d'or

- Les memes vivent dans `SHARED/memes/meme_001.mp4`, `meme_002.mp4`, … (nommage
  strict `meme_XXX`). **Perturabo ne les fournit PAS** — il les **nomme**.
- Le champ `videos[].meme` doit pointer un fichier **qui existe** dans la
  méméthèque au moment du run. Fichier inconnu → **échec bloquant**.
- Un meme peut être réutilisé sur plusieurs angles, mais éviter les doublons
  dans un même pack (SIGNE différencie fond/caméra/textes, pas la source).

## 6. Ce que Perturabo ne doit PAS fournir

- Les fichiers vidéo (mp4) — c'est la méméthèque / l'opérateur.
- La card tweet complète (persona, avatar, likes, partages) — **LACRIMAE la
  génère** (déterministe, seed pack_id + clip_id, 5 personas, zéro réseau).
- Les textes de watermark, le logo — config LACRIMAE.

## 7. Rappel du principe

> **Perturabo = OMNIS_WATCH** : il écrit. **LACRIMAE = exécuteur** : il rend.
> Le pack est la consigne ; la consigne conforme est la seule qui compte.
