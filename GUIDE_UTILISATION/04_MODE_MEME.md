# 04 — MODE MEME : Guide de montage (contrat OMNIS_WATCH)

> Ce guide est le **contrat** du mode MEME. Un pack `sub_mode: meme` sans ce
> guide = refus de tourner (échec bloquant au bridge).

## 1. Principe

Le mode MEME transforme un pack Perturabo en **N vidéos meme 9:16 finies**
(1080x1920). Contrairement au mode stars (découpe d'une vidéo source), ici
**aucune découpe** : les memes sont déjà coupés et prêts dans la méméthèque
(`SHARED/memes/meme_XXX.mp4`), le pack **nomme explicitement** le meme de
chaque angle.

Le pipeline ne réfléchit pas : il assemble ce que le pack lui dit d'assembler.

## 2. Les 7 calques (empilement, z-order bas → haut)

| # | Calque | Fourni par | Rendu |
|---|--------|-----------|-------|
| 1 | **Background** (PNG/couleur) | SHARED (défaut) / pack | Fond, réutilisé du mode stars |
| 2 | **Tweet** (card type tweet) | Pack = texte ; persona/stats = seed LACRIMAE | Carte blanche : avatar + @handle + texte + likes/partages |
| 3 | **Titre** (optionnel, peut être `null`) | Pack | En haut, réutilisé du mode stars |
| 4 | **Texte émotion** | Pack | Au milieu, dit l'émotion du meme |
| 5 | **Meme** (vidéo horizontale) | Méméthèque (`SHARED/memes/`) | Moitié basse, `contain`, **loop net** si trop court, trim si trop long |
| 6 | **Watermark @chaine** | LACRIMAE (config) | Texte transparent **sur le meme** |
| 7 | **Logo** (image transparente) | SHARED/logos (optionnel) | Sur le meme, toujours présent si fourni |

**Ce que le viewer voit** (layout écran, pas l'ordre de rendu) :
titre en haut · tweet au milieu · texte émotion · meme en bas (avec watermark
@chaine par-dessus et logo par-dessus le meme).

## 3. Format du pack (`sub_mode: meme`)

```json
{
  "pack_id": "MEME-<CAMPAGNE>-siege_YYYYMMDD_HHMMSS",
  "mode": "logo",
  "sub_mode": "meme",
  "montage_guide_ref": "GUIDE_UTILISATION/04_MODE_MEME.md",
  "videos": [
    {
      "video_index": 1,
      "angle_id": "A01",
      "title": "He quit the NBA for this",
      "tweet": {
        "text": "bro really retired for pottery class",
        "keywords_style": { "green": ["pottery"], "red": ["retired"] }
      },
      "text_emotion": "never thought i'd see this",
      "emotion": "poignant",
      "meme": "meme_004",
      "duration_sec": 6,
      "logo_placement": "Logo fourni par la campagne..."
    }
  ]
}
```

Champs par angle :
- `meme` **obligatoire** : nom du fichier dans `SHARED/memes/` (ex `meme_004`).
  Absent de la méméthèque → échec bloquant.
- `tweet.text` **obligatoire** : le texte du post (créé par PERTURABO).
- `text_emotion` **obligatoire** : le texte du milieu.
- `title` optionnel (`null` autorisé).
- `duration_sec` optionnel (défaut 5-7 s, sinon `duration_range_sec`).
- `logo_placement` : texte libre pour l'opérateur, pas de contrainte technique
  (le placement est décidé dans la preview, comme le mode stars).

## 4. Tweet : ce que LACRIMAE génère (pas PERTURABO)

PERTURABO fournit **uniquement le texte**. La **card tweet** (apparence,
crédibilité) est générée par LACRIMAE, de façon déterministe :

- **5 personas** (nom, @handle, couleur d'avatar) tirés **aléatoirement par
  clip** (seed dérivé du `pack_id` + id du clip, comme SIGNE).
- **Likes / partages** tirés aléatoirement dans des fourchettes crédibles.
- Même pack → mêmes personas/stats au re-render (déterminisme).
- Rendu **natif Remotion** (aucune API externe, zéro réseau, zéro coût) :
  fond blanc + avatar + @handle + texte + stats.

## 5. Règles d'assemblage (respectées par vidéo)

- Durée cible : `duration_sec` du pack (défaut 5-7 s) — **la durée du pack
  pilote**, pas le probe du meme.
- Une seule bascule visuelle : le meme est **un seul objet en mouvement**.
- **Loop net** : si le meme est plus court que la durée cible, il boucle sans
  fondu ; s'il est plus long, il est trimé à la durée cible.
- Ratio final 9:16 (1080x1920) ; le meme horizontal est posé en `contain`.
- **Pas de SFX** (règle LACRIMAE conservée), muet-compréhensible.
- Logo : jamais couvert à plus de 50 % par les textes.

## 6. Sorties

- Un `.mp4` par angle (A01 → A05), via le pipeline F04 → F05 → F06 existant.
- Log par vidéo (bonus, phase ultérieure) : memes utilisés, timestamp du
  pivot, durée réelle.
- Preview F03 : parcours de la méméthèque + validation avant rendu.

## 7. Échec bloquant (on ne tourne pas)

- `04_MODE_MEME.md` absent.
- `meme` nommé absent de `SHARED/memes/`.
- `tweet.text` ou `text_emotion` manquant.
- Durée hors de la range autorisée.
