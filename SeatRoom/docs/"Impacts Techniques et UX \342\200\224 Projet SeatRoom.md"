# Impacts Techniques et UX — Projet SeatRoom

L'évolution de Gatsby vers **SeatRoom** nécessite des ajustements structurels tout en conservant l'isolation par frégates.

## 1. UX & Design (Frégate F04_DASHBOARD)
- **Transition vers l'arrondi** : Modification globale des variables CSS (`--radius`) pour passer d'un style "art déco pointu" à un style "Dynamic Island" fluide.
- **Composant SeatRoom** : Création d'un composant intelligent en haut à gauche capable de muter entre le mode "Live" (stats, anomalie) et le mode "Menu" (historique, agenda).
- **Avatars ronds** : Mise à jour systématique des styles de bordure pour les photos de profil.

## 2. Données & Backend (Frégate F03_EVENT_STORE & F02_GUESTS)
- **Renommage des schémas** : Mise à jour des contrats pour refléter le nom SeatRoom.
- **Gestion du Direct** : Ajout d'un flag `is_live` sur l'entité Événement pour piloter l'interface.
- **UUID & QR** : La frégate `F05_QR_FORGE` doit être finalisée pour générer des images QR réelles basées sur l'UUID généré lors de l'import `F06_IMPORT`.

## 3. Scanner & Caméra (Frégate F01_CHECKIN)
- **Accès Matériel** : Remplacer la simulation de scan par une intégration réelle utilisant l'API `getUserMedia` ou une bibliothèque comme `html5-qrcode`.
- **Gestion des Permissions** : Implémenter le flux de demande d'autorisation caméra, point critique relevé par le client.
- **Temps Réel** : Le scan doit déclencher une mise à jour immédiate des statistiques du composant SeatRoom (via WebSockets ou polling court).

## 4. Nommage & Déploiement
- **Nettoyage des traces "Gatsby"** : Suppression de toute référence à l'ancien nom dans le code, les logs et les URL de déploiement.
- **Replit** : Le script de démarrage `start-replit.sh` doit être mis à jour pour refléter le nouveau nom du projet.

## 5. Synthèse des risques
Le risque principal est la performance du scan sur les navigateurs mobiles variés. L'isolation en frégates permettra de tester le module `F01_CHECKIN` séparément du reste de l'interface SeatRoom.
