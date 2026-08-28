# Gatsby — Journal de déploiement

| Timestamp UTC | Version | Environnement | Frégates concernées | Health check | Résultat | Rollback |
|---|---|---|---|---|---|---|
| — | `0.1.0-dev` | `development` | Structure initiale | `PENDING` | — | — |

## Règle

Aucun déploiement de production ne doit être considéré comme terminé avant la vérification de `F01_CHECKIN`, de la base de données, du scanner et de la disponibilité des journaux.
