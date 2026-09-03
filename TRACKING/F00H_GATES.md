# LACRIMAE dev10 — F00H GATES DE VALIDATION

## Doctrine
F00H est une frégate optionnelle qui ajoute un "hook" de 2 secondes au début
de chaque clip. Un fond complètement absurde (Backrooms, Konoha, etc.) est
affiché derrière le streamer masqué (SAM 2), puis on revient au fond original
avec un SFX glitch.

## Gates

| Gate | Moment | Verification | Critere de passage |
|---|---|---|---|
| **H0 INPUT** | Avant traitement | Clip source existe et est lisible | H.264, 1080x1920, duree >= 2s |
| **H1 BACKGROUND** | Avant GPU | Fond alternatif dans la bibliotheque | Preset valide dans hook_presets.json |
| **H2 HOOK** | Avant GPU | Clip assez long pour le hook | Frames totales >= 60 (2s a 30fps) |
| **H3 SFX** | Avant GPU | Fichier SFX configure | Cle SFX presente dans hook_presets.json |
| **H4 OUTPUT** | Apres GPU | Clip hooked valide | Resolution identique, audio conserve, duree identique |

## Processus

1. **Local (CPU)** : F00H/CODEBASE/f00h.py valide H0-H3, extrait les frames de controle
2. **Modal (GPU)** : f00h_hook_worker.py applique SAM 2 + composition + SFX
3. **Local** : Verification H4 du clip final

## Decision

Si un gate echoue, le clip passe en `NEEDS_REVIEW` dans le ledger.
Le clip original (clean) est toujours conserve en backup.

## Politique d'echec

En cas d'echec du rendu GPU, le clip reste en `NEEDS_REVIEW`.
Une nouvelle tentative recoit un nouvel identifiant de campagne.
