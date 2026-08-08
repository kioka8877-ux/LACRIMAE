# F03 PREVIEW — Preview interactive du codex v4
> *"L'Œil. Voir avant de frapper. Valider avant de rendre."*

Outil de **preview / validation interactif** en navigateur (Vite + React + Remotion Player) pour
les `codex.json` v4 produits par la frégate F02. Il permet de régler **en direct** (session,
appliquée à tous les clips) le texte, le logo, la vidéo, les filtres, puis d'exporter le
`codex.json` final pour F03 PICTOR.

---

## Lancement direct (sandbox vierge)

```bash
cd F03_PREVIEW/CODEBASE
npm install
npm run dev
```

Le serveur écoute sur **http://localhost:5173** (`host: true`, `allowedHosts: .monkeycode-ai.live`).
Rien d'autre à faire : les assets (clip, logo, fonds, codex) sont déjà dans `public/`.

> Le preview ne dépend **d'aucune autre frégate** — il ne lit que `public/codex.json` + `public/`.

---

## Structure

```
F03_PREVIEW/
├── CODEBASE/               ← L'application Vite (source récupérée, fonctionnelle)
│   ├── src/App.jsx             ← UI (onglets, sliders, balise logo, export codex)
│   ├── src/preview/            ← Composition Remotion (rendu en direct)
│   ├── public/codex.json       ← Données v4 (session + clips)
│   ├── public/clip_001.mp4     ← Clip réel (1920x1080)
│   ├── public/logo.png
│   └── public/backgrounds/     ← 7 fonds PNG + manifest.json
├── tests/                   ← Tests E2E puppeteer (voir plus bas)
└── TRACKING.md              ← Historique : récupération du code, correctifs, vérifs
```

---

## Fonctionnalités (onglets)

| Onglet | Contenu |
|--------|---------|
| 📝 **Texte** | Titre / paragraphe, positions, style global, panneaux de fond |
| 🖼 **Fond & Logo** | Fond (PNG ou couleur), position logo (presets ou **double-clic**), taille (5–90 %), opacité |
| 🎬 **Vidéo** | Centrage vertical (`session.video.offset_y`, -20 à +20 %) |
| 🎨 **Effets** | Preset couleur, **Contraste** (0.5–2.0, défaut 1.30), **Luminosité** (0.5–2.0, défaut 1.10), volume, coup brutal, slow-mo, shake, Enhance 4K |
| 🔍 **Netteté** | Sharpening, débruitage, grain, vignette (calque global au-dessus de tout) |

### Balise logo (double-clic)
Double-clic sur la vidéo à l'endroit voulu → « Poser le logo ici ? » → Oui.
Le logo est posé en coordonnées % (`session.logo.position='custom'` + `x_pct`/`y_pct`).

### Export
« ⬇ Télécharger codex.json » → fusionne la session courante dans le codex multi-clips.

---

## Tests E2E (puppeteer)

```bash
# Prérequis : serveur lancé + puppeteer-core (NODE_PATH global) + chromium
npm install -g puppeteer-core
NODE_PATH=$(npm root -g) node tests/test_fix_balise.js    # balise logo
NODE_PATH=$(npm root -g) node tests/test_video_tab.js     # onglet Vidéo + offset
NODE_PATH=$(npm root -g) node tests/test_contrast.js      # slider contraste
NODE_PATH=$(npm root -g) node tests/test_brightness.js    # slider luminosité
```

---

## Points d'attention

- **Ratio** : `clip_001.mp4` est du **1920x1080 (16:9)** mais `codex.json` le déclare
  **1080x1920 (9:16)** → rendu `object-fit: cover` (recadré). Mapping clic→logo cohérent,
  mais le cadrage vidéo est à valider côté pipeline.
- **Zoom** : le logo est en % de la composition, il ne suit pas le zoom/pan (`zoom_keyframes`).
- Le logo ne suit pas la vidéo quand `session.video.offset_y` ≠ 0 (choix).

---

## Rites du Sang applicables

- **LOI D'ISOLEMENT** : ne lit que `public/` — aucun accès aux autres frégates.
- **SESSION = FLOTTE** : tout réglage en session s'applique à **tous les clips**.
- **RITE DE VALIDATION** : LAC_CUSTOS check-in avant tout transit vers F03.
