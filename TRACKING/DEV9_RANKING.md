# DEV9 RANKING — Historique d'implémentation

## Date : 29 août 2026

## Résumé

dev9 introduit le mode **Ranking Compilation** : des clips vidéo classés par rang avec numéros permanents, labels bottom-to-top, et SFX par transition.

## Timeline des fixes

### 2026-08-28 — Initial dev9 (feat)
- Création de la branche dev9 depuis dev8
- F00-F Ranking Prep ajouté (f00_ranking.py)
- Workflow dev9_spiderman_ranking.yml
- Workflow dev9_spiderman_render.yml

### 2026-08-29 — Ranking Preview
- Panneau Ranking dans App.jsx (controls globaux, titre word-by-word, par rang)
- _rankingComposition.jsx : clip plein écran, liste bottom-to-top, titre persistant
- rankingCompilation.js : normalizeRankingManifest, rankingActiveRows, rankingEntryAtFrame
- Sliders Taille numéros / Taille écritures (2 sliders globaux)
- Labels bottom-to-top (plus d'ordre aléatoire)
- Mots composés (SPIDER-MAN = 1 bloc)
- Numéros permanents (pas "#", juste "4.")

### 2026-08-29 — Audio
- SFX par transition (impact.mp3 + king_reveal.mp3 pour rang #1)
- Toggle son des clips (clip_audio on/off)
- Musique de fond dev8 supprimée

### 2026-08-29 — Render fixes

#### Fix 1 : durationInFrames = 300 au lieu de 600
- **Problème** : Root.jsx utilisait sequences.json (vide) → fallback 300 frames
- **Fix** : Root.jsx calcule total_frames depuis les durées réelles des entries
- **Commit** : 61d4cdc

#### Fix 2 : startFrom global vs local
- **Problème** : clips commençaient au mauvais frame
- **Fix** : startFrom utilise le frame local du clip
- **Commit** : b97b517

#### Fix 3 : Sequence durationInFrames
- **Problème** : `<Video>` jouait tout le fichier clip, pas juste la durée du rang
- **Fix** : Chaque clip dans son propre `<Sequence durationInFrames>`
- **Commit** : c0170bf

#### Fix 4 : Durées mismatch (session stale)
- **Problème** : `codex.session.ranking` avait durées 2s/2s/2s/4s au lieu de 6s/4s/7s/3s
- **Cause** : OmniComposition passait `sessionProp?.ranking` (stale) au lieu de `codex.ranking_manifest` (correct)
- **Fix** : OmniComposition.jsx ligne 123 — priorité à `codex.ranking_manifest`
- **Commit** : 2fb1399

#### Fix 5 : codex.json nettoyé
- **Problème** : session.ranking.entries synced avec les bonnes durées
- **Fix** : codex.json — session.ranking entrées mises à jour
- **Commit** : 2fb1399

### 2026-08-29 — Audio clips
- **Problème** : clips sans son dans le rendu
- **Cause** : F00-E utilisait `-an` (supprime l'audio) dans la commande FFmpeg
- **Statut** : Identifié, fix en attente

## Bugs connus

| Bug | Statut | Fix |
|-----|--------|-----|
| Clips sans audio | Identifié | Retirer `-an` de f00_reveal.py |
| Dernier clip freeze | Fixé (c0170bf) | Sequence durationInFrames |
| Durées mismatch | Fixé (2fb1399) | codex.ranking_manifest prioritaire |

## Architecture

```text
_rankingComposition.jsx  → Composition Remotion (clip + liste + titre + SFX)
rankingCompilation.js    → normalizeRankingManifest, rankingActiveRows, rankingEntryAtFrame
App.jsx                  → Panneau Ranking (controls globaux, titre, par rang)
Root.jsx                 → Détection ranking_compilation, calcul durationInFrames
OmniComposition.jsx      → Route vers RankingCompilationComposition
codex.json               → Données (ranking_manifest + session)
```
