# LACRIMAE — DESIGN : LES 2 MODES + CALQUES
> *"La transformation ne s'arrête jamais."*
> **PROJET TERMINÉ 🏆 (2026-08-09)** — design appliqué et validé en réel (mode forge → `lac-clean`)

Document de conception figé le 2026-08-05. Source : analyse des repos réels
(LACRIMAE branche `dev`, PERTURABO `MONDES_FORGES/CLIPPING`, CRUSADER `F03_SIGISMUND`).

---

## 1. LES 2 MODES

| Mode | Fond | Cuts | Texte | F01 SELECT |
|------|------|------|-------|------------|
| **LIBRE** (existant) | L'opérateur décide tout | Vision OpenRouter → cutlist | Presets + titre statique | ✅ ACTIF |
| **FORGE PERTURABO** (nouveau) | Imposé par le pack : cuts validés, `on_screen_text`, `viral_paragraph`, logo campagne | Du pack (`cut_source: perturabo_validated`) | `title` + `viral_paragraph` + `on_screen_text` du pack | ❌ SAUTÉ |

- Le blur-pad et le reframe **ne disparaissent pas** : un 3ᵉ profil `background` est **ajouté** à F02.
- Clipping normal / timing JSON : **HORS SCOPE v1** (une autre pipeline s'en occupe).

## 2. ORDRE DES CALQUES (z-order, du plus bas au plus haut)

```
┌──────────────────────────────────────┐
│ 6. CALQUE PRESETS GLOBAL (enhance 4K,│  ← au-dessus de TOUT — s'applique
│    CSS, grain, vignette, sharpening) │     à la scène entière (plus seulement
├──────────────────────────────────────┤     la vidéo)
│ 5. LOGO (image transparente)         │  ← en bas du cadre visuellement
├──────────────────────────────────────┤
│ 4. PARAGRAPHE (4 lignes max)         │  ← en bas, sous le logo
├──────────────────────────────────────┤
│ 3. TITRE                             │  ← en haut
├──────────────────────────────────────┤
│ 2. CLIP VIDÉO                        │  ← au centre, agrandissable/réductible
├──────────────────────────────────────┤
│ 1. BACKGROUND (PNG fourni)           │  ← le plus derrière (cover + scale)
└──────────────────────────────────────┘
```

## 3. CE QUE LE VIEWER VOIT (layout écran)

```
┌──────────────────────────┐
│      TITRE               │  ← en haut
│  (espace ajustable)      │
│                          │
│      CLIP VIDÉO          │  ← au centre
│                          │
│      LOGO                │  ← après le clip
│      PARAGRAPHE /        │  ← tout en bas
│      SOUS-TITRES         │
└──────────────────────────┘
```

**Distinction capitale** : l'ordre des calques (rendu) ≠ le layout écran (ce que voit le viewer).
Le logo est au-dessus du titre/paragraphe en z-order, mais positionné **en bas du cadre**.

## 4. GESTION DU FOND PNG (modèle CRUSADER F03_SIGISMUND)

Repris de `gamma/F03_SIGISMUND/CODEBASE/src/components/Background.jsx` :
- `style.background_image` → `<Img src={staticFile(...)} objectFit="cover" transform={scale(style.background_scale)} />`
- Fallback **couleur unie** si pas d'image (`background_color`)
- Grain animé (SVG feTurbulence, seed change toutes les 3 frames) + vignette
- Polices locales woff2 embarquées (zéro réseau, zéro delayRender) — à reprendre aussi

## 5. FLUX MODE FORGE (bridge)

```
1. ORACLE AUTONOME → LAC_BRIDGE va chercher le pack SEUL dans
   PERTURABO/MONDES_FORGES/CLIPPING/EXPORT (production_pack_*.json, API GitHub,
   stdlib). Il ne prend RIEN d'autre (ni zip, ni vidéo, ni PNG).
   --pack-filter optionnel (substring du nom) ; défaut : pack dont le nom
   reflète le mode (logo).
2. CONTRÔLE CUSTOS (Contrôle 1 = v1) :
     - schéma cohérent + cut validés présents
     - vidéo locale déposée par l'opérateur (BRIDGE_PERTURABO/IN/ ou --video)
     - fonds PNG partagés présents (SHARED/IN/backgrounds/ — faits 1× pour toutes)
     - logo campagne présent (SHARED/IN/logos/logo.png, optionnel)
3. MAPPING pack → codex.json :
     videos[].cut.start_sec/end_sec → clips[]
     videos[].title                 → texts.title (haut)
     videos[].viral_paragraph       → texts.paragraph (bas)
     videos[].on_screen_text        → texte overlay
     logo_placement                 → logo (image transparente)
4. PREVIEW F03 : tout assemblé → ajustements (tailles, positions, presets) → validation
5. RENDER F04 → F05 CAMOUFLAGE → F06 LUTHER (inchangés)
```

## 6. PLAN D'IMPLÉMENTATION

| Phase | Contenu | Fichiers | Statut |
|-------|---------|----------|--------|
| **0** | Étendre `codex.json` : bloc `session` (style global : fond PNG, logo, textes, presets) + blocs `clips[]` (contenu) — rétro-compatible | F02 (template codex), CUSTOS, bridge | 🟢 FORGÉE |
| **1** | Réordonner `OmniComposition.jsx` en 6 calques + Background façon CRUSADER + presets global sur toute la scène | F03 + F04 `src/components/OmniComposition.jsx` (la même) | 🟢 FORGÉE |
| **2** | Preview F03 "tout ajustable" : contrôles taille/position par calque, mode texte titre / titre+paragraphe | F03 `src/App.jsx` | 🟢 FORGÉE |
| **3** | F02 : nouveau profil `--profile background` (découpe seule) — blur-pad/reframe intacts | `lac_f02_format.py` | 🟢 FORGÉE |
| **4** | Bridge forge : LAC_BRIDGE + Contrôle 1 CUSTOS + mapping pack→codex | `BRIDGE_PERTURABO/CODEBASE/lac_bridge_forge.py` + LAC_RUN + GHA | 🟢 FORGÉE |
| **5** | Validation : CUSTOS codex forge + test sur pack réel (Sandoval) | CUSTOS + tests | 🔵 TESTÉ (pack réel) |

**Verifications passées (2026-08-05)** : `py_compile` sur les 4 scripts Python ✅ ·
YAML workflow OK ✅ · esbuild JSX F03+F04 ✅ · bridge testé avec le pack réel
Sandoval (5 vidéos, cuts validés, mapping title/paragraph/on_screen_text) ✅ ·
CUSTOS codex forge v4.0 (session + 5 clips) ✅ · **3 bugs bloquants corrigés**
(GHA `--forge-codex` au lieu de `--texts` cassé + persistance bridge F01→F02 + re-transit
fond/logo à F04 ; F02 préserve la session du bridge ; `str(clip index)` pour les textes
par clip ; CUSTOS BRIDGE sans exigence de validation pré-Porte III ; `pack_mode` au
bridge) — flux forge complet retesté sur pack synthétique 2 vidéos ✅ ·
**ORACLE AUTONOME** : `LAC_RUN.py forge` sans `--pack` → le bridge va chercher le
pack SEUL dans PERTURABO/EXPORT (testé sur le vrai pack Sandoval : auto-fetch,
5 vidéos, session préservée par F02, CUSTOS BRIDGE check-out ✓) ✅

**Règles du chantier** :
- Rien de ce qui existe n'est supprimé : tout est **addition** (3ᵉ profil, nouveaux blocs optionnels).
- Le codex.json reste la source de vérité unique ; la preview exporte, F04 rend pareil.
- Rite de validation CUSTOS après chaque output (LOI D'ISOLEMENT respectée).

## 7. DÉCISIONS ACTÉES (2026-08-05)

1. **Logo** : ajustable en **taille** dans la preview, mais **pas déplaçable pour le moment** (le pack reste la référence de placement).
2. **Fond PNG** : les PNG sont déposés dans **un dossier dédié** (comme CRUSADER) + **menu déroulant de sélection dans la preview**.
3. **Textes en mode forge** : **ceux du pack, automatiquement** — LACRIMAE ne réfléchit pas, il crée ce que Perturabo lui dit de créer.

## 8. CODEX : UNE SESSION = N VIDÉOS

Le codex.json est édité sur **un seul clip** en preview, mais doit s'appliquer aux **N vidéos** du pack
(ex : pack Perturabo actuel = assets pour 5 vidéos). L'architecture multi-clips existe déjà
(`Root.jsx` → une Composition par clip). La précision apportée :

| Réglage | Décidé par | Portée |
|---------|-----------|--------|
| **Contenu par clip** (title, viral_paragraph, on_screen_text, cut) | Le **pack** | 1 clip précis |
| **Style global/session** (fond PNG choisi, taille logo, style titre/paragraphe, presets, positions) | L'**opérateur** en preview | **Tous les N clips** |

→ Structure codex : bloc `session` (style global, édité 1× en preview) + blocs `clips[]`
(contenu du pack). La preview édite `session`, le bridge remplit les clips.

## 9. DÉCISIONS EN SUSPENS

- [x] Logo : ajustable en taille, pas déplaçable (acté)
- [x] Fond PNG : dossier dédié + menu déroulant preview (acté)
- [x] Textes forge : ceux du pack, auto (acté) — *"LACRIMAE ne réfléchit pas, il crée"*
- [ ] (aucune décision bloquante restante)


---
*LACRIMAE — Né des larmes de Sanguinius, forgé en or.*
