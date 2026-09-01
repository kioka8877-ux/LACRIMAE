# Gatsby — Index du tracking

Le dossier `TRACKING/` est le point d’entrée de la traçabilité de Gatsby. Il regroupe les journaux humains, les procédures opérationnelles, les manifestes et les règles d’audit.

## Journaux centraux

| Fichier | Rôle |
|---|---|
| `EVENT_LOG.md` | Jalons et événements importants de l’événement |
| `TRANSFER_LOG.md` | Transferts d’artefacts entre frégates |
| `ERROR_LOG.md` | Erreurs techniques et actions correctives |
| `SECURITY_LOG.md` | Doubles scans, QR invalides et actions sensibles |
| `DEPLOYMENT_LOG.md` | Versions, environnements et résultats de déploiement |
| `MANIFEST.md` | État des modules et fichiers de la flotte |
| `RUNBOOK.md` | Procédures de diagnostic, reprise et sauvegarde |

## Journaux par frégate

Chaque frégate conserve son propre fichier `<FREGATE>_LOG.md` dans son dossier `TRACKING/`. Ces journaux décrivent les changements de configuration, les opérations importantes, les erreurs locales et les résultats de tests.

## Règles

Les entrées opérationnelles doivent contenir une date UTC, un identifiant d’événement, la frégate concernée, l’action, le statut et une référence de traçage. Les données personnelles complètes ne doivent pas être copiées dans les journaux techniques. Utiliser `guest_id` et `event_id` plutôt que le téléphone ou le nom complet.

Les événements critiques de production doivent également être conservés dans la base de données. Les fichiers Markdown servent à la compréhension humaine, à la documentation et à l’audit.
