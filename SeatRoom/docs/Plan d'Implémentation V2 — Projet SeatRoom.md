# Plan d'Implémentation V2 — Projet SeatRoom

Ce plan remplace la version précédente pour intégrer la séparation en deux espaces distincts : **Organisation** et **Accueil**.

## Étape 1 : Identité et Fondations
- Renommer le projet en **SeatRoom** (code, logo, URL).
- Geler le design de référence actuel (noir et or).
- Mettre à jour les schémas de base de données pour inclure les métadonnées de l'événement (mariés, photo, lieu, date).

## Étape 2 : Espace Organisation (Administration)
- Création du dashboard administrateur.
- Finalisation de l'import CSV (`invites.csv`) avec génération d'UUID uniques par Python.
- Implémentation de la forge QR codes (`F05_QR_FORGE`) pour générer les images d'invitation.
- Ajout du bouton intelligent **SeatRoom** (Haut gauche) avec mode Live (stats réelles) et mode Menu (historique/agenda).

## Étape 3 : Espace Accueil (Contrôle d'entrée)
- Création de l'interface simplifiée pour l'agent d'accueil.
- Intégration réelle de la caméra via `html5-qrcode` avec gestion des permissions.
- Implémentation de la recherche manuelle rapide pour les cas sans QR code.
- Affichage instantané du résultat du scan (Vert/Rouge) avec table assignée.

## Étape 4 : Backend et Synchronisation
- Centralisation des deux espaces sur le même backend FastAPI.
- Mise en place du mécanisme de mise à jour des statistiques en temps réel (polling ou WebSocket).
- Sécurisation des routes : l'espace Accueil ne peut pas modifier la liste des invités.

## Étape 5 : Résilience et Audit
- Journalisation de chaque scan et chaque anomalie signalée dans `SECURITY_LOG.md` et `EVENT_LOG.md`.
- Mise à jour du `FLEET_STATUS` après chaque test de module.

## Étape 6 : Livraison et Validation
- Préparation de l'archive Replit avec le script `start-replit.sh` mis à jour.
- Smoke test complet : import admin -> génération QR -> scan agent -> validation stats admin.
