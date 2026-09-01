# Gatsby — Architecture en frégates

## 1. Principe général

Gatsby est organisé en modules spécialisés appelés « frégates ». Chaque frégate possède une responsabilité principale, ses services, ses schémas de données, ses tests et ses contrats d’échange. Les modules ne doivent pas importer directement la logique interne d’un autre module.

Le MVP gère un seul événement actif. Le scanner d’émargement constitue le parcours critique et doit continuer à fonctionner même si l’importation, la génération des invitations ou le tableau de bord rencontrent une erreur.

## 2. Arborescence recommandée

```text
gatsby/
├── README.md
├── .env.example
├── .gitignore
├── requirements.txt
├── Procfile
├── main.py
│
├── app/
│   ├── __init__.py
│   ├── config.py
│   ├── logging_config.py
│   ├── errors.py
│   └── dependencies.py
│
├── FLEET/
│   ├── fleet_status.json
│   ├── event_bus.py
│   ├── contracts.py
│   └── health.py
│
├── F01_CHECKIN/
│   ├── IN/
│   │   └── .gitkeep
│   ├── OUT/
│   │   └── .gitkeep
│   ├── CODEBASE/
│   │   ├── __init__.py
│   │   ├── router.py
│   │   ├── service.py
│   │   ├── repository.py
│   │   ├── schemas.py
│   │   └── errors.py
│   ├── TESTS/
│   │   ├── test_checkin_valid.py
│   │   ├── test_checkin_duplicate.py
│   │   └── test_checkin_invalid.py
│   └── README.md
│
├── F02_GUESTS/
│   ├── IN/
│   │   └── .gitkeep
│   ├── OUT/
│   │   └── .gitkeep
│   ├── CODEBASE/
│   │   ├── __init__.py
│   │   ├── router.py
│   │   ├── service.py
│   │   ├── repository.py
│   │   ├── schemas.py
│   │   └── validators.py
│   ├── TESTS/
│   │   ├── test_guest_search.py
│   │   ├── test_guest_create.py
│   │   └── test_guest_update.py
│   └── README.md
│
├── F03_EVENT_STORE/
│   ├── CODEBASE/
│   │   ├── __init__.py
│   │   ├── database.py
│   │   ├── migrations.py
│   │   ├── models.py
│   │   ├── transaction.py
│   │   └── repositories.py
│   ├── DATA/
│   │   ├── .gitkeep
│   │   └── schema.sql
│   ├── TESTS/
│   │   ├── test_database.py
│   │   └── test_atomic_checkin.py
│   └── README.md
│
├── F04_DASHBOARD/
│   ├── IN/
│   │   └── .gitkeep
│   ├── OUT/
│   │   └── .gitkeep
│   ├── CODEBASE/
│   │   ├── __init__.py
│   │   ├── router.py
│   │   ├── service.py
│   │   ├── schemas.py
│   │   └── statistics.py
│   ├── TESTS/
│   │   └── test_statistics.py
│   └── README.md
│
├── F05_QR_FORGE/
│   ├── IN/
│   │   └── .gitkeep
│   ├── OUT/
│   │   └── .gitkeep
│   ├── CODEBASE/
│   │   ├── __init__.py
│   │   ├── router.py
│   │   ├── service.py
│   │   ├── qr_generator.py
│   │   ├── invitation_renderer.py
│   │   └── schemas.py
│   ├── TESTS/
│   │   └── test_qr_generation.py
│   └── README.md
│
├── F06_IMPORT/
│   ├── IN/
│   │   └── .gitkeep
│   ├── OUT/
│   │   └── .gitkeep
│   ├── CODEBASE/
│   │   ├── __init__.py
│   │   ├── router.py
│   │   ├── service.py
│   │   ├── csv_reader.py
│   │   ├── excel_reader.py
│   │   ├── normalizer.py
│   │   └── schemas.py
│   ├── TESTS/
│   │   ├── test_csv_import.py
│   │   └── test_invalid_rows.py
│   └── README.md
│
├── F07_ADMIN_AUTH/
│   ├── CODEBASE/
│   │   ├── __init__.py
│   │   ├── router.py
│   │   ├── service.py
│   │   ├── security.py
│   │   └── schemas.py
│   ├── TESTS/
│   │   └── test_auth.py
│   └── README.md
│
├── FRONTEND/
│   ├── index.html
│   ├── scanner.html
│   ├── dashboard.html
│   ├── guests.html
│   ├── import.html
│   ├── invitations.html
│   ├── login.html
│   ├── assets/
│   │   ├── css/
│   │   │   ├── tokens.css
│   │   │   ├── base.css
│   │   │   ├── components.css
│   │   │   ├── scanner.css
│   │   │   └── responsive.css
│   │   ├── js/
│   │   │   ├── api.js
│   │   │   ├── auth.js
│   │   │   ├── scanner.js
│   │   │   ├── dashboard.js
│   │   │   ├── guests.js
│   │   │   ├── import.js
│   │   │   └── notifications.js
│   │   └── img/
│   │       ├── logo.svg
│   │       └── favicon.svg
│   └── components/
│       ├── header.html
│       ├── sidebar.html
│       ├── status-card.html
│       └── result-panel.html
│
├── CONTRACTS/
│   ├── guest.schema.json
│   ├── checkin.request.schema.json
│   ├── checkin.response.schema.json
│   ├── import.result.schema.json
│   ├── dashboard.stats.schema.json
│   └── error.schema.json
│
├── MIGRATIONS/
│   ├── 001_initial_schema.sql
│   └── 002_checkin_indexes.sql
│
├── SCRIPTS/
│   ├── seed_demo.py
│   ├── reset_event.py
│   ├── backup_database.py
│   └── health_check.py
│
├── TESTS/
│   ├── test_api_health.py
│   ├── test_fleet_isolation.py
│   └── test_end_to_end.py
│
├── LOGS/
│   ├── .gitkeep
│   └── README.md
│
└── docs/
    ├── PRD.md
    ├── ARCHITECTURE.md
    ├── API.md
    ├── DEPLOYMENT.md
    └── RUNBOOK.md
```

## 3. Rôle des principaux dossiers

### `app/`

Le dossier `app/` contient le noyau technique partagé : configuration, journalisation, gestion standardisée des erreurs et dépendances communes. Il ne doit pas contenir la logique métier des frégates.

### `FLEET/`

`FLEET/` joue le rôle de registre et de contrat général. `fleet_status.json` indique l’état de chaque frégate, `contracts.py` définit les structures de données partagées, `health.py` expose les contrôles de santé et `event_bus.py` permet de publier des événements internes sans créer de dépendances circulaires.

### `F01_CHECKIN/`

F01 est la frégate critique. Elle reçoit un identifiant QR, vérifie l’invitation, applique la règle anti-double scan, enregistre l’heure du passage et retourne un résultat contrôlé. `service.py` contient la logique métier, `repository.py` communique avec la base et `router.py` expose les routes HTTP.

### `F02_GUESTS/`

F02 gère les fiches invités : recherche par nom ou téléphone, création, modification et consultation. Elle ne valide pas elle-même un scan ; elle fournit uniquement les données nécessaires aux opérations administratives.

### `F03_EVENT_STORE/`

F03 centralise l’accès à SQLite. Il contient les modèles, les migrations, les transactions et les repositories. C’est le seul endroit autorisé à gérer les connexions et les transactions de la base de données.

### `F04_DASHBOARD/`

F04 calcule et expose les statistiques : invités enregistrés, présents, restants, taux de présence et derniers passages. Le scanner ne dépend jamais de cette frégate.

### `F05_QR_FORGE/`

F05 crée les identifiants secrets, génère les QR codes et produit les invitations numériques. Une erreur dans cette frégate doit seulement interrompre la génération en cours, pas le contrôle d’accès.

### `F06_IMPORT/`

F06 lit les fichiers CSV ou Excel, normalise les colonnes, détecte les erreurs et prépare l’import. Les fichiers volumineux ou invalides doivent être traités dans une tâche séparée lorsque cela sera nécessaire.

### `F07_ADMIN_AUTH/`

F07 protège l’accès à l’espace organisateur. La partie scanner peut recevoir un accès opérationnel distinct, afin de ne pas donner aux hôtesses les droits de modification de la base.

### `FRONTEND/`

`FRONTEND/` contient les pages HTML, les styles CSS et les scripts JavaScript. Les styles sont séparés entre tokens visuels, base, composants, scanner et responsive. La palette noir et or doit être centralisée dans `tokens.css`.

### `CONTRACTS/`

Les contrats décrivent le format des entrées et des sorties. Ils empêchent une frégate de produire une structure inattendue pour une autre frégate. Par exemple, `checkin.response.schema.json` définit les réponses `SUCCESS`, `ALREADY_SCANNED`, `INVALID` et `ERROR`.

### `SCRIPTS/`, `TESTS/` et `docs/`

Les scripts servent à préparer les données, effectuer des sauvegardes et vérifier l’état du système. Les tests sont organisés par frégate puis au niveau global. La documentation contient le PRD, l’architecture, les routes API, le déploiement et le guide d’intervention en cas de panne.

## 4. Règle de dépendance

La règle de dépendance du MVP est la suivante :

```text
FRONTEND → ROUTERS DES FRÉGATES → SERVICES → F03_EVENT_STORE
                                      ↓
                           CONTRACTS / APP / FLEET
```

Une frégate peut utiliser `app/`, `FLEET/`, `CONTRACTS/` et `F03_EVENT_STORE` selon son besoin, mais elle ne doit jamais importer directement le `service.py` ou le `repository.py` d’une autre frégate.

## 5. Priorité de développement

Le premier ordre de construction recommandé est : `F03_EVENT_STORE`, `F01_CHECKIN`, `F02_GUESTS`, `F06_IMPORT`, `F05_QR_FORGE`, `F04_DASHBOARD`, `F07_ADMIN_AUTH`, puis `FRONTEND`. Cette séquence garantit que le parcours critique de contrôle d’entrée peut être testé avant les fonctionnalités secondaires.

## 6. Niveau d’isolation recommandé

Pour le sprint initial, Gatsby peut fonctionner dans une même application FastAPI avec des modules séparés et des tests indépendants. F06_IMPORT et F05_QR_FORGE doivent toutefois être conçues comme des workers relançables. En production, le serveur peut être lancé avec plusieurs workers ou plusieurs services afin qu’une erreur d’exécution dans un module secondaire ne bloque pas toute l’application.

Le scanner F01 doit rester le service prioritaire. Le dashboard et les tâches de génération peuvent être temporairement indisponibles sans empêcher une validation d’invitation déjà préparée.
