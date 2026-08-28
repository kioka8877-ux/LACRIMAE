# Gatsby Backend

Backend FastAPI séparé du frontend React. Il constitue la première implémentation de `F03_EVENT_STORE` et de la surface critique `F01_CHECKIN`.

## Lancer localement

```bash
source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Vérifier

```bash
pytest -q
curl http://localhost:8000/health
```

## Routes MVP

| Route | Frégate | Fonction |
|---|---|---|
| `GET /health` | FLEET | État du service |
| `GET /api/guests` | F02_GUESTS | Recherche des invités |
| `POST /api/guests` | F02_GUESTS | Ajouter un invité |
| `POST /api/check-in/{guest_token}` | F01_CHECKIN | Valider ou refuser un QR |
| `GET /api/dashboard/stats` | F04_DASHBOARD | Statistiques de présence |
| `POST /api/import` | F06_IMPORT | Point d’entrée import CSV/Excel |

La base SQLite utilise WAL et une transaction `BEGIN IMMEDIATE` pour rendre le check-in atomique. Le QR code doit contenir l’identifiant secret de l’invité, jamais son nom ou sa table.

Le frontend `gatsby-app` reste indépendant et sera relié à ce backend via les contrats JSON de `CONTRACTS/`.
