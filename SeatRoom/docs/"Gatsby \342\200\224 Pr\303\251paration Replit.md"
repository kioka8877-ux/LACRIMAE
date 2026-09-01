# Gatsby — Préparation Replit

## Ce paquet contient

Le dossier `frontend/` contient l’interface React/Tailwind Gatsby. Le dossier `backend/` contient l’API FastAPI, SQLite, les routes d’invités, le check-in atomique, l’import CSV et la génération QR. Les dossiers `docs/`, `TRACKING/`, `CONTRACTS/` et `FLEET/` conservent le PRD, l’architecture et les journaux de traçabilité.

## Importer dans Replit

1. Créer un nouveau Repl à partir d’une archive ou importer le contenu de ce dossier dans un Repl privé.
2. Ouvrir le Shell Replit et vérifier la présence de `start-replit.sh` et `.replit` à la racine.
3. Installer les dépendances Python : `cd backend && pip install -r requirements.txt`.
4. Lancer le projet avec `bash start-replit.sh` ou avec le bouton **Run**.
5. Attendre la fin du build frontend. FastAPI servira ensuite le frontend et l’API sur le même port public.
6. Tester l’URL `/health`, puis ouvrir la racine `/` dans le navigateur.

## Variables Replit

| Variable | Valeur recommandée |
|---|---|
| `GATSBY_ALLOWED_ORIGINS` | Le domaine Replit du frontend, ou `*` uniquement pour un test temporaire |
| `GATSBY_DB_PATH` | `./data/gatsby.db` |
| `PYTHONUNBUFFERED` | `1` |

Le script utilise automatiquement la variable `PORT` fournie par Replit.

## Vérifications après import

```bash
curl https://VOTRE-DOMAINE-REPLIT/health
curl https://VOTRE-DOMAINE-REPLIT/api/dashboard/stats
```

Pour vérifier le frontend, ouvrir la racine et tester le menu, la recherche d’invités, les états du scanner, l’import simulé et l’aperçu d’invitation.

## Important

Ce paquet est préparé pour un test Replit, pas pour une mise en production définitive. La base SQLite convient au prototype et aux tests contrôlés, mais une base managée et un stockage persistant doivent être prévus avant un événement réel. L’architecture et les contrats sont conservés pour permettre cette évolution.

L’hébergement Replit est externe à Manus. Il peut nécessiter des ajustements de permissions, de stockage et de démarrage selon le type de Repl choisi.
