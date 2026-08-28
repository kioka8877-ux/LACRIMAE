# Gatsby — Journal des transferts

Chaque transfert d’un artefact entre frégates doit être tracé. Pour un fichier, conserver une empreinte SHA-256. Pour une opération en base, conserver l’identifiant de transaction ou le `trace_id`.

| Timestamp UTC | Source | Destination | Artefact | Référence | Empreinte / Trace ID | Statut |
|---|---|---|---|---|---|---|
| — | — | — | — | — | — | `PENDING` |

## Exemple

```text
2026-08-21T18:10:00Z | F06_IMPORT | F03_EVENT_STORE | guests_batch_001 | event_demo | tx_001 | ACCEPTED
```
