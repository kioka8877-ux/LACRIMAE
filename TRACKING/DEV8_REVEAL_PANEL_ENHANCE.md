# DEV8 — Enhancement du panneau Reveal F03 Preview

## Date
2026-08-28

## Objectif
Ajouter des contrôles visuels complets dans le panneau Reveal de F03 Preview :
- Style par champ texte (taille, position, couleur)
- Vitesse globale de lecture
- Paramètres Rotation/Échelle/Position par clip
- Panneau Watermark

## Changements

### 1. revealCompilation.js

| Changement | Détail |
|-----------|--------|
| `DEFAULT_TEXT_STYLE` | Nouveau — scale, pos_v, pos_h, color_1, color_2, dual_color |
| `DEFAULT_WATERMARK` | Nouveau — text, scale, pos_v, pos_h, opacity |
| `DEFAULT_NARRATIVE` | Ajout : speed, theme_style, others_style, this_one_style, transition_style, final_style, watermark |
| `normalizeRevealManifest` | Scenes normalisées avec rotation_deg, video_scale, pos_h, pos_v |

### 2. App.jsx — Panneau texte reveal

Pour **chaque** champ (Thème, OTHERS, THIS ONE, Transition, Final) :

| Paramètre | Type | Plage | Default |
|-----------|------|-------|---------|
| Taille (scale) | Slider | 0.5x → 5x | 1x |
| Position V | Slider | 0% → 100% | 50% |
| Position H | Slider | 0% → 100% | 50% |
| Couleur 1 | Color picker | `#ffffff` | `#ffffff` |
| Couleur 2 (optionnel) | Toggle + Color picker | `#ffffff` | inactive |

**Logique 2 couleurs :** Le toggle "2 couleurs" affiche un 2e color picker. Si le texte contient 2 mots (ex: "THIS ONE"), chaque mot prend une couleur différente.

### 3. App.jsx — Vitesse globale

| Paramètre | Type | Plage | Default |
|-----------|------|-------|---------|
| Vitesse | Slider | 0.50x → 4x, step 0.05 | 1x |

Chemin : `narrative.speed`

### 4. App.jsx — Per-clip params

Dans chaque bloc clip (SOURCES ET SCÈNES) :

| Paramètre | Type | Plage | Default |
|-----------|------|-------|---------|
| Rotation | Slider | -180° → 180° | 0° |
| Échelle | Slider | 0.2x → 3x | 1x |
| Position H | Slider | 0% → 100% | 50% |
| Position V | Slider | 0% → 100% | 50% |

### 5. App.jsx — Panneau Watermark

| Paramètre | Type | Plage | Default |
|-----------|------|-------|---------|
| Texte | Input | — | `""` |
| Taille (scale) | Slider | 0.3x → 3x | 1x |
| Position V | Slider | 0% → 100% | 90% |
| Position H | Slider | 0% → 100% | 50% |
| Opacité | Slider | 0% → 100% | 30% |

## Fonction helper ajoutée

```javascript
const updateRevealNarrativeStyle = (styleKey, prop, value) => {
  const current = revealManifest?.narrative?.[styleKey] || {};
  updateReveal({ narrative: { ...(revealManifest?.narrative || {}), [styleKey]: { ...current, [prop]: value } } });
};
```

Permet de modifier les propriétés imbriquées dans les objets style sans écraser les autres champs.

## Codex exporté (nouvelles clés)

```json
{
  "narrative": {
    "speed": 1.0,
    "theme_style": { "scale": 1.0, "pos_v": 50, "pos_h": 50, "color_1": "#ffffff", "color_2": null, "dual_color": false },
    "others_style": { "scale": 1.0, "pos_v": 50, "pos_h": 50, "color_1": "#ffffff", "color_2": null, "dual_color": false },
    "this_one_style": { "scale": 1.0, "pos_v": 50, "pos_h": 50, "color_1": "#ffffff", "color_2": null, "dual_color": false },
    "transition_style": { "scale": 1.0, "pos_v": 50, "pos_h": 50, "color_1": "#ffffff", "color_2": null, "dual_color": false },
    "final_style": { "scale": 1.0, "pos_v": 50, "pos_h": 50, "color_1": "#ffffff", "color_2": null, "dual_color": false },
    "watermark": { "text": "", "scale": 1.0, "pos_v": 90, "pos_h": 50, "opacity": 0.3 }
  },
  "scenes": [
    { "rotation_deg": 0, "video_scale": 1.0, "pos_h": 50, "pos_v": 50 }
  ]
}
```
