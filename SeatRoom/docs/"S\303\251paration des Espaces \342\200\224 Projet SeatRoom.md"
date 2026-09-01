# Séparation des Espaces — Projet SeatRoom

Pour répondre aux besoins de sécurité et de clarté opérationnelle, SeatRoom est divisé en deux environnements distincts.

## 1. Espace Organisation (L'Administrateur)

Cet espace est destiné à la préparation et à la supervision de l'événement.

| Responsabilité | Actions clés |
|---|---|
| **Gestion des données** | Import du fichier `invites.csv`, modification manuelle des invités, suppression. |
| **Génération QR** | Lancement de la forge des QR codes et téléchargement des cartes d'invitation. |
| **Supervision Live** | Consultation du tableau de bord global, statistiques de remplissage, gestion des anomalies. |
| **Configuration** | Paramétrage de l'événement (nom, date, lieu, mode Live/Hors Direct). |

## 2. Espace Accueil (L'Agent)

Cet espace est une version simplifiée et sécurisée, optimisée pour une utilisation sur smartphone à l'entrée.

| Responsabilité | Actions clés |
|---|---|
| **Contrôle d'accès** | Ouverture de la caméra, scan des QR codes, validation instantanée. |
| **Recherche manuelle** | Recherche rapide d'un invité par nom ou téléphone en cas de QR code illisible. |
| **Statistiques locales** | Affichage du taux de remplissage pour informer l'agent de la progression. |
| **Signalement** | Bouton rapide pour signaler un problème à l'organisation sans quitter l'écran de scan. |

## 3. Données Partagées et Sécurité

Bien que les interfaces soient différentes, elles communiquent avec le même backend FastAPI.

- **Contrat F01_CHECKIN** : L'agent envoie un UUID, le serveur renvoie le statut (Valide, Déjà scanné, Inconnu).
- **Permissions** : L'espace Accueil ne doit pas permettre de modifier la table d'un invité ou d'importer une nouvelle liste.
- **Synchronisation** : Dès qu'un agent valide une entrée, l'espace Organisation voit les statistiques se mettre à jour en temps réel.
- **Audit** : Toutes les actions de l'agent sont enregistrées dans le journal central sous l'identifiant de sa frégate.
