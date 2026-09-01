# Analyse du tracking de PERTURABO et adaptation à Gatsby

## 1. Définition

Dans PERTURABO, le tracking n’est pas un simple fichier de logs. C’est une couche complète de suivi opérationnel, d’audit, de coordination et de mémoire du système.

Il remplit quatre fonctions : suivre l’exécution de chaque frégate, tracer les transferts entre frégates, suivre l’avancement global d’une campagne et conserver des données structurées permettant de reprendre ou comparer une opération.

## 2. Les différentes catégories observées

| Catégorie | Exemples PERTURABO | Fonction |
|---|---|---|
| Journal global | `IW_CAMPAIGN_LOG.md`, `CLIPPING_LOG.md` | Historique des grands jalons, déploiements et décisions |
| Journal par frégate | `F01_LOG.md`, `F02_LOG.md`, `F06_LOG.md` | Activité, rôle, résultats, erreurs et état d’un module |
| Journal des transferts | `IW_TRANSFER_LOG.md` | Trace des échanges entre modules, source, destination, empreinte et statut |
| Tracking de l’orchestrateur | `ORCHESTRATOR_LOG.md` | Étapes du pipeline, portes de validation, reprise et vérifications |
| Roadmap technique | `DEV_ROADMAP.md` | Progression de construction et tâches terminées |
| Données de baseline | `f00_baseline.json` | État quantitatif à un instant précis : score, fraîcheur, couverture et métriques |
| Index de tracking | `TRACKING/INDEX.md` | Point d’entrée unique vers les journaux, contrats, archives et manifestes |
| Archives | `ARCHIVUM/` | Mémoire durable : règles, campagnes, connaissances, modèles et résultats |

## 3. Ce que fait chaque niveau

### Journal de frégate

Le journal local décrit la mission d’une frégate, son codebase, son flux interne, son output et son dernier état connu. Il répond à la question : « Que s’est-il passé dans ce module ? ».

### Journal de transfert

Le journal de transfert sert à contrôler la circulation des artefacts entre les modules. Dans PERTURABO, le modèle prévoit une date, une source, une destination, une empreinte MD5 et un statut. L’idée importante est de pouvoir prouver quel résultat a été transmis, de quelle frégate il venait et si le transfert a été accepté.

### Journal de campagne

Le journal global conserve les grands événements : initialisation, déploiement, activation des frégates, règles en vigueur et décisions importantes. C’est une mémoire humaine et opérationnelle.

### Orchestrateur et reprise

Le tracking de l’orchestrateur suit les étapes d’un pipeline, les portes de validation et les commandes de reprise. Le système prévoit notamment un mode `resume`, qui reprend l’exécution à partir de l’état enregistré dans le registre de flotte. C’est une fonction essentielle pour Gatsby si une importation ou une génération est interrompue.

### Baseline structurée

Les fichiers JSON de baseline ne sont pas destinés à être lus comme un journal humain. Ils conservent un instantané structuré avec un identifiant de scan, une date et des métriques. Pour Gatsby, ce principe peut servir à enregistrer une photographie des statistiques de présence ou de l’état de l’événement.

## 4. Adaptation recommandée à Gatsby

Gatsby doit reprendre le modèle, mais avec des noms et des données adaptés à la gestion d’événements.

```text
GATSBY/
├── TRACKING/
│   ├── INDEX.md
│   ├── EVENT_LOG.md
│   ├── TRANSFER_LOG.md
│   ├── ERROR_LOG.md
│   ├── SECURITY_LOG.md
│   ├── DEPLOYMENT_LOG.md
│   ├── RUNBOOK.md
│   └── MANIFEST.md
│
├── F01_CHECKIN/TRACKING/
│   └── F01_CHECKIN_LOG.md
├── F02_GUESTS/TRACKING/
│   └── F02_GUESTS_LOG.md
├── F03_EVENT_STORE/TRACKING/
│   └── F03_EVENT_STORE_LOG.md
├── F04_DASHBOARD/TRACKING/
│   └── F04_DASHBOARD_LOG.md
├── F05_QR_FORGE/TRACKING/
│   └── F05_QR_FORGE_LOG.md
├── F06_IMPORT/TRACKING/
│   └── F06_IMPORT_LOG.md
└── F07_ADMIN_AUTH/TRACKING/
    └── F07_ADMIN_AUTH_LOG.md
```

## 5. Contenu proposé pour les fichiers Gatsby

| Fichier | Informations à enregistrer |
|---|---|
| `EVENT_LOG.md` | Création de l’événement, import terminé, scanner activé, clôture de l’accueil |
| `TRANSFER_LOG.md` | Fichier importé vers F06, invités validés vers F03, QR générés vers F05 |
| `ERROR_LOG.md` | Erreurs techniques, frégate concernée, gravité, heure, résolution et statut |
| `SECURITY_LOG.md` | Double scan, QR invalide, tentative d’accès admin, remise à zéro exceptionnelle |
| `DEPLOYMENT_LOG.md` | Version déployée, environnement, date, résultat des tests de santé |
| `F01_CHECKIN_LOG.md` | Nombre de scans, validations, refus, erreurs réseau et temps de réponse |
| `F03_EVENT_STORE_LOG.md` | Migrations, sauvegardes, verrous, erreurs transactionnelles et restaurations |
| `MANIFEST.md` | Liste des modules, fichiers, versions et statut de construction |
| `RUNBOOK.md` | Procédures de diagnostic et de reprise lors d’un incident |

## 6. Exemple de transfert Gatsby

```text
TIMESTAMP           SOURCE       DESTINATION       ARTEFACT              STATUS
2026-08-21 18:10    F06_IMPORT   F03_EVENT_STORE   guests_batch_001      ACCEPTED
2026-08-21 18:15    F03_STORE    F05_QR_FORGE      guest_ids_batch_001   ACCEPTED
2026-08-21 18:18    F05_QR_FORGE F04_DASHBOARD     invitations_ready     ACCEPTED
2026-08-21 19:03    F01_CHECKIN  F03_EVENT_STORE   checkin_guest_8f2     RECORDED
```

Pour les fichiers, une empreinte SHA-256 est préférable à MD5. Pour les événements de base de données, l’identifiant d’événement et l’identifiant de transaction sont plus utiles qu’une empreinte de fichier.

## 7. Ce qu’il faut absolument conserver

Le tracking ne doit pas enregistrer inutilement les données personnelles des invités. Les journaux doivent utiliser `guest_id`, `event_id` et, si nécessaire, un nom partiellement masqué. Le téléphone complet ne doit pas apparaître dans les logs techniques.

Chaque entrée importante doit contenir au minimum : un identifiant, une date UTC, la frégate concernée, l’action, le statut, la gravité éventuelle, la référence de l’événement et un message exploitable.

## 8. Recommandation finale

Il faut intégrer le tracking dans l’architecture de Gatsby dès le début, mais distinguer trois usages :

1. Les logs techniques automatiques pour diagnostiquer les erreurs.
2. Les journaux d’audit pour retracer les scans, corrections et actions sensibles.
3. Les documents de pilotage pour suivre l’avancement du développement et le déploiement.

Le modèle PERTURABO est donc pertinent pour Gatsby, à condition de ne pas transformer chaque petite action en fichier Markdown. En production, les événements opérationnels doivent être enregistrés dans des tables SQLite structurées, tandis que les documents Markdown servent aux journaux humains, à la roadmap et au runbook.

La meilleure combinaison pour Gatsby est : **base de données pour les événements fiables, fichiers Markdown pour la documentation et fichier JSON pour l’état de la flotte**.
