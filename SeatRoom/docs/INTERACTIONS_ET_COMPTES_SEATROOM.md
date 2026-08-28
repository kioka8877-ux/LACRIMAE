# Interactions et Comptes — Projet SeatRoom

Ce document définit les améliorations d'interactivité et le système de gestion des comptes pour SeatRoom.

## 1. Audit des interactions manquantes

Actuellement, plusieurs éléments du shell ne réagissent pas au clic.

| Élément | Interaction attendue |
|---|---|
| **Menu mobile (3 barres)** | Doit ouvrir le tiroir (drawer) latéral de navigation sur smartphone. |
| **Cloche de notification** | Doit ouvrir un panneau affichant les derniers scans et les anomalies récentes. |
| **Profil utilisateur (Haut droit)** | Doit ouvrir un menu déroulant : Mon compte, Paramètres, Déconnexion. |
| **Bouton SeatRoom** | Doit déclencher l'ouverture de l'îlot Live/Menu (déjà implémenté mais à vérifier). |
| **Recherche d'invités** | Doit filtrer la liste en temps réel (déjà implémenté mais à relier au backend). |

## 2. Gestion des Comptes et Rôles

Le système doit permettre l'inscription et la connexion avec deux profils distincts.

### Méthodes d'authentification
- **E-mail/Mot de passe** : Inscription classique avec validation d'e-mail.
- **Google Auth** : Connexion rapide via le compte Google.

### Types de profils
1. **Organisateur** : Crée l'événement, importe les listes, gère les données, supervise le direct.
2. **Agent d'accueil** : Invité par l'organisateur (via e-mail ou lien), n'a accès qu'à l'espace Accueil (scan et recherche).

## 3. Flux d'inscription

1. L'utilisateur arrive sur la page d'accueil SeatRoom.
2. Il choisit "Créer un compte" ou "Se connecter".
3. S'il s'inscrit comme Organisateur, il est dirigé vers la création de son premier événement.
4. S'il est invité comme Agent, il crée son compte et accède directement à l'espace Accueil de l'événement concerné.

## 4. Prochaines étapes techniques

- **Frontend** : Ajout des états React pour les menus et panneaux.
- **Backend** : Création des tables `users`, `sessions` et `roles` dans SQLite.
- **Sécurité** : Mise en place des routes protégées par token (JWT).
