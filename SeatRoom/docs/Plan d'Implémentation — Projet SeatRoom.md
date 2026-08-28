# Plan d'Implémentation — Projet SeatRoom

Ce plan détaille les étapes nécessaires pour transformer l'application actuelle en **SeatRoom**, en respectant le feedback client tout en conservant le design de référence actuel.

## Étape 1 : Renommage et Identité

Il s'agit de la base de la transition. Toutes les mentions de "Gatsby" doivent être remplacées par **SeatRoom**. Cela inclut le logo dans le frontend, les titres de pages, les contrats JSON, les schémas de base de données et les fichiers de configuration de déploiement (Replit).

## Étape 2 : Le Composant SeatRoom (Live & Menu)

Cette étape concerne le bouton en haut à gauche. Nous allons implémenter un état global `is_live`.

| Mode | Comportement |
|---|---|
| **En Direct** | Voyant vert clignotant, affichage des noms/photos des mariés, lieu, date et statistiques de remplissage en temps réel. Ajout du bouton de signalement d'anomalie. |
| **Menu Général** | Transformation en menu de navigation pour accéder à l'historique et à l'agenda futur. |

## Étape 3 : Organisateur & Génération QR (Frégates F05, F06)

Le flux de données doit devenir réel et sécurisé.
1. **Import** : Finaliser le parseur `invites.csv` dans le backend FastAPI.
2. **UUID** : Génération systématique d'un identifiant unique secret par invité lors de l'import.
3. **QR Forge** : Production des images QR codes contenant uniquement l'UUID.
4. **Export** : Préparer les fichiers pour une distribution facile (WhatsApp, email, impression).

## Étape 4 : Agent d'accueil & Vrai Scan (Frégate F01)

C'est le point le plus critique du retour client.
1. **Caméra** : Intégrer `html5-qrcode` dans le frontend React.
2. **Permissions** : Gérer correctement la demande d'accès à la caméra sur smartphone.
3. **Validation** : Relier le scan au backend pour vérifier l'UUID, marquer l'invité comme présent et empêcher le double scan.
4. **Retour Visuel** : Afficher instantanément le résultat (Vert/Rouge) avec le nom et la table.

## Étape 5 : Résilience et Tracking

Conformément à la doctrine PERTURABO, nous allons renforcer le suivi.
1. **Journaux** : Chaque scan et chaque anomalie signalée via le bouton SeatRoom doit être enregistré dans `SECURITY_LOG.md` et `EVENT_LOG.md`.
2. **Temps Réel** : Mettre en place un mécanisme de rafraîchissement des statistiques du dashboard dès qu'un scan est validé.

## Étape 6 : Livraison et Tests

Le projet sera livré sous forme d'une nouvelle archive Replit prête à l'emploi. Le client pourra alors effectuer un test réel avec sa caméra pour valider que SeatRoom est désormais pleinement opérationnel.
