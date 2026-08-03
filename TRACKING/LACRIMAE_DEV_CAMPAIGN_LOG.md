# LACRIMAE — DEV : CARNET DE CAMPAGNE (branche dev)
> *"La transformation ne s'arrête jamais."*

## ÉTAT DE LA FLOTTE DEV

| Frégate | Nom | Statut | Date |
|---------|-----|--------|------|
| F00 | INGEST | 🟢 FORGÉE | 2026-08-03 |
| F01 | SELECT | 🟡 EN FORGE | 2026-08-03 |
| F02 | FORMAT | 🟡 EN FORGE | 2026-08-03 |
| F03 | PREVIEW | 🟢 PILLÉE (OMNIS F02_PREVIEW) | 2026-08-03 |
| F04 | RENDER | 🟢 PILLÉE (OMNIS F03A_REMOTION) | 2026-08-03 |
| F05 | CAMOUFLAGE | 🟢 PILLÉE (OMNIS F04) | 2026-08-03 |
| F06 | LUTHER | 🟢 PILLÉE (OMNIS F05) | 2026-08-03 |
| — | LAC_CUSTOS | 🟢 ADAPTÉ | 2026-08-03 |

**Légende :** ⚪ En attente | 🟡 En forge | 🔵 En test | 🟢 SCELLÉE | 🔴 BLOQUÉE

## FIL D'ARIANE

| Date | Frégate | Phase | Action | Validation |
|------|---------|-------|--------|------------|
| 2026-08-03 | FLOTTE | DEV | Branche dev créée — pipeline transformé (meme 9:16) | ✅ |
| 2026-08-03 | F00 | FORGE | INGEST pillé d'OMNIS delta F00 — yt-dlp/fichier | ✅ |
| 2026-08-03 | F01 | FORGE | SELECT vision OpenRouter — ZÉRO transcript (stars/foot) | 🔵 à tester |
| 2026-08-03 | F02 | FORGE | FORMAT blur-pad optimisé (160px→boxblur→upscale) + reframe + template codex | 🔵 à tester |
| 2026-08-03 | F03 | FORGE | PREVIEW pillée d'OMNIS beta F02_PREVIEW — adaptations logo/coup/volume à confirmer | 🔵 à tester |
| 2026-08-03 | F04 | FORGE | RENDER pillé d'OMNIS beta F03A_REMOTION — logo + titre + coup brutal à confirmer | 🔵 à tester |
| 2026-08-03 | F05/F06 | FORGE | CAMOUFLAGE + LUTHER pillés (omnis_f04/f05) — I/O renommés | 🔵 à tester |
| 2026-08-03 | CUSTOS | FORGE | Manifeste 7 frégates + validations JSON (cutlist, codex, manifest) | ✅ |

## DÉCISIONS DE FORGE

- Sélection par **vision OpenRouter** (modèle gratuit par défaut), pas de transcript.
- Blur-pad : fond = dupliqué flouté **+ assombri + désaturé**, blur fait sur
  downscale 160px (rapidité) — correction de l'ancien test où tout était flou.
- Deux profils F02 : `blur-pad` (défaut) / `reframe` (crop central).
- Titre statique (fade_in) en zone safe, logo en calque permanent, coup brutal
  toutes les 3s (90 frames), volume seul réglage audio.
- PAS de SFX, PAS de sous-titres, PAS de voix off.

## PROCHAINES ÉTAPES

- [ ] Tester F00→F01 sur une vraie vidéo (clé OpenRouter vision)
- [ ] Tester F02 blur-pad (comparer netteté centre vs test précédent)
- [ ] Valider F03/F04 : logo + titre + coup brutal sur un clip réel
- [ ] Chaîne complète jusqu'à clean_final.mp4
- [ ] Décider l'infra (Colab / GitHub Actions / local)
