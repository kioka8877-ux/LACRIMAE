# Synthèse du Feedback Client — Projet SeatRoom

Ce document résume les points critiques identifiés suite aux retours textuels et audio du client. Il servira de base pour la mise à jour du PRD et du développement.

## 1. Identité et Nommage

Le projet doit être renommé de **Gatsby** vers **SeatRoom**. Toutes les mentions de "Gatsby", les identifiants techniques générés automatiquement (comme les suffixes de déploiement) et les logos doivent être remplacés ou adaptés pour refléter uniquement le nom **SeatRoom**.

## 2. Esthétique et Design (Inspiration Dynamic Island)

Le client juge l'interface actuelle "trop quadrillée" et "trop pointue". L'esthétique doit évoluer vers plus de douceur et de modernité, en s'inspirant de la **Dynamic Island d'Apple**.

| Élément | Modification demandée |
|---|---|
| **Coins et angles** | Remplacer tous les angles vifs par des coins arrondis (border-radius généreux). |
| **Photos de profil** | Toutes les photos et avatars (Élodie, Amélie, Thomas, etc.) doivent être **ronds**. |
| **Bouton SeatRoom** | Doit être l'élément central du design Dynamic Island, changeant d'état selon le mode. |
| **Thème général** | Moins de "carrés pointillés" ou de structures rigides ; plus de formes fluides et organiques. |

## 3. Fonctionnalités SeatRoom (Haut gauche)

Le bouton SeatRoom est le pivot de l'application. Son comportement dépend de l'état de l'événement.

### Mode "En Direct" (Live)
- **Indicateur** : Voyant vert clignotant avec mention "En direct".
- **Contenu** : Affiche les caractéristiques de l'événement en cours (thème, noms/photos des mariés, édition, lieu, date).
- **Statistiques** : Taux de remplissage en temps réel (ex: 145/200 arrivés, 72,5%).
- **Action** : Bouton dédié pour signaler un problème ou une anomalie.

### Mode "Hors Direct"
- **Indicateur** : Disparition du voyant vert et de la mention "En direct".
- **Fonction** : Devient le menu général de la plateforme.
- **Contenu** : Accès à l'historique des événements passés et à l'agenda des événements futurs.

## 4. Volet Opérationnel (Organisateur & Agent)

### Organisateur
- **Import** : Fichier `invites.csv` avec colonnes strictes (Nom, Prénom, Téléphone, Table).
- **Génération** : UUID unique par personne via Python, stockage SQLite, création des cartes/images QR codes.
- **Distribution** : Export pour envoi via WhatsApp, e-mail ou impression.

### Agent d'accueil (Le Scan)
- **Urgence** : Le client signale que le scan "ne marche pas" et ne demande pas l'autorisation de la caméra.
- **Action** : Implémenter un accès réel à l'appareil photo du smartphone pour valider les invitations individuellement.
- **Objectif** : Fluidité, rapidité et sérénité lors de l'accueil.

## 5. Prochaines étapes

Avant tout codage, nous devons valider cette synthèse et mettre à jour le PRD technique pour intégrer l'architecture "frégate" à ces nouveaux composants UI fluides.
