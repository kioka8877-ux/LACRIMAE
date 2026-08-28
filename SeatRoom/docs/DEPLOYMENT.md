# Gatsby Backend — Déploiement et reprise

## Développement

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Production

Le backend doit être lancé derrière HTTPS avec plusieurs workers lorsque la plateforme le permet :

```bash
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2
```

SQLite est configuré en mode WAL. Les écritures critiques du check-in utilisent une transaction immédiate afin d’éviter qu’un double scan simultané ne soit accepté deux fois.

## Variables

| Variable | Rôle | Valeur par défaut |
|---|---|---|
| `GATSBY_DB_PATH` | Chemin de la base SQLite | `./data/gatsby.db` |
| `GATSBY_ALLOWED_ORIGINS` | Origines frontend autorisées | `*` en développement |
| `PORT` | Port HTTP | `8000` |

En production, remplacer `*` par le domaine exact du frontend.

## Reprise

Une erreur dans l’import ou la génération QR ne doit pas supprimer les invités déjà importés ni remettre les scans à zéro. Conserver la base, examiner `ERROR_LOG.md`, vérifier `/health`, puis relancer uniquement la tâche concernée.

La remise à zéro d’un scan n’est pas encore exposée dans le MVP. Elle devra être protégée par authentification et enregistrée dans `SECURITY_LOG.md` avant d’être ajoutée.
