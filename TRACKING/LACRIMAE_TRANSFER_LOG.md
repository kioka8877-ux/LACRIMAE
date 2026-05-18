# LACRIMAE — REGISTRE DES TRANSFERTS
> *"Aucun transit n'existe sans inscription dans ce registre."*
> Matrice de traçabilité des flux — Rempli par le Magos lors des transferts manuels

---

## MODE D'EMPLOI

1. Avant chaque transfert : lancer `python LAC_CUSTOS.py --frigate [SOURCE] --mode check-out`
2. Copier manuellement les fichiers vers la frégate destinataire sur Drive
3. Après chaque transfert : lancer `python LAC_CUSTOS.py --frigate [DEST] --mode check-in`
4. Inscrire le résultat dans le registre ci-dessous

---

## REGISTRE DES TRANSFERTS

| # | Date | Croisade | Source | Destination | Fichiers | Custos Out | Custos In | Statut |
|---|------|----------|--------|-------------|----------|------------|-----------|--------|
| — | — | — | — | — | — | — | — | ⬜ En attente |

---

## MATRICE DES FLUX STANDARD

| De → Vers | Fichiers transférés | Format |
|-----------|---------------------|--------|
| SHARED → F01 | `audio_clean.mp3` | .mp3 |
| SHARED → F02 | `images/*.jpg` | .jpg |
| SHARED → F03 | `audio_clean.mp3`, `images/*.jpg` | .mp3, .jpg |
| F01 → F02 | `timing.json` | .json |
| F01 → F03 | `timing.json` | .json |
| F01 → F04 | `timing.json` | .json |
| F02 → F03 | `creative_config.json` | .json |
| F03 → F04 | `short_final.mp4` | .mp4 |
| F04 → Magos | `short_master.mp4` | .mp4 |

**Légende** : ⬜ Non vérifié | ✅ Validé | ❌ Échoué

---

## ROUTING COMPLET

```
SHARED/audio_clean.mp3 ─────────────────────────────► F01, F03
SHARED/images/ ─────────────────────────────────────► F02, F03

F01 CANTOR ──► timing.json ─────────────────────────► F02, F03, F04

F02 VISIO ──► creative_config.json ─────────────────► F03

F03 PICTOR ──► short_final.mp4 ─────────────────────► F04

F04 SIGNUM ──► short_master.mp4 ────────────────────► MAGOS (téléchargement)
```

---

## FORMAT timing.json (OUT de F01)

```json
{
  "audio_duration_s": 42.5,
  "total_frames": 1275,
  "fps": 30,
  "words": [
    {
      "word": "L'amour",
      "start_s": 1.24,
      "end_s": 1.67,
      "start_frame": 37,
      "end_frame": 50,
      "is_strong": false
    },
    {
      "word": "silence",
      "start_s": 2.10,
      "end_s": 2.80,
      "start_frame": 63,
      "end_frame": 84,
      "is_strong": true
    }
  ]
}
```

---

## FORMAT creative_config.json (OUT de F02)

```json
{
  "fps": 30,
  "resolution": { "width": 1080, "height": 1920 },
  "cut_interval_frames": 7,
  "image_order": "sequential",
  "font_main": "Cinzel",
  "font_strong": "Playfair Display",
  "text_color": "#FFFFFF",
  "text_shadow": "0px 4px 12px rgba(0,0,0,0.9)",
  "letter_spacing": "0.12em",
  "grain_overlay_opacity": 0.30,
  "css_filters": "contrast(1.2) brightness(0.88) sepia(0.15)",
  "blend_mode": "screen",
  "word_animation": "fade",
  "validated_by_magos": true
}
```

---

## RÉFÉRENCES

- [Carnet de Campagne](./LACRIMAE_CAMPAIGN_LOG.md) — État des frégates
- [LAC_CUSTOS](../LAC_CUSTOS.py) — Script de validation logistique
- [README](../README.md) — Documentation principale
