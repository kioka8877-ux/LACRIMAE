# Gatsby — Product Requirements Document

**Version:** 0.2 — Pré-développement  
**Statut:** À valider avant implémentation  
**Périmètre:** Un seul événement actif  
**Produit:** Application web responsive de gestion d’invitations et d’émargement par QR code

## 1. Résumé du produit

Gatsby est une application web destinée aux organisateurs de mariages, galas et séminaires d’entreprise. Elle permet de préparer une liste d’invités, de générer une invitation numérique contenant un QR code unique, puis de contrôler l’accès à l’entrée depuis un smartphone.

L’application doit permettre à l’hôtesse de scanner une invitation, d’obtenir instantanément le nom et la table de l’invité, et de détecter un QR code invalide ou déjà utilisé. L’organisateur dispose d’un tableau de bord indiquant les présences, les invitations restantes et les anomalies.

Le MVP gère un seul événement actif afin de rester réalisable rapidement, tout en conservant une structure suffisamment modulaire pour supporter plusieurs événements dans une version ultérieure.

## 2. Vision et positionnement

Gatsby doit donner une impression de service haut de gamme, rare et maîtrisé, sans sacrifier la rapidité opérationnelle. L’expérience associe une identité visuelle noire et dorée à une interface de contrôle très claire.

> **Gatsby — L’élégance à chaque entrée.**

L’univers visuel repose sur un fond noir profond, des surfaces noires légèrement contrastées, une typographie éditoriale pour le nom de l’application et les slogans, et une typographie moderne pour les tableaux, champs et actions.

## 3. Problème à résoudre

Les événements utilisent souvent des listes papier, des confirmations dispersées, des invitations difficiles à vérifier et des contrôles manuels lents. Cette organisation expose l’événement aux doublons, aux falsifications, aux erreurs d’orientation et à l’absence de visibilité en temps réel.

Gatsby doit centraliser la liste des invités, sécuriser l’invitation par un identifiant unique et donner une réponse immédiate à l’entrée.

## 4. Objectifs du MVP

| Objectif | Résultat attendu |
|---|---|
| Préparer un événement | L’organisateur importe une liste d’invités et vérifie les erreurs |
| Produire des invitations | Gatsby génère un QR code secret par invité |
| Contrôler l’entrée | L’hôtesse valide une invitation depuis la caméra de son téléphone |
| Éviter la fraude | Un QR code déjà utilisé ou inconnu est refusé |
| Orienter l’invité | Le nom et la table sont affichés après validation |
| Suivre l’accueil | Le tableau de bord présente les arrivées en temps réel |
| Résister aux erreurs | Une panne d’un module secondaire ne doit pas arrêter le check-in |

## 5. Utilisateurs et rôles

| Rôle | Besoin | Accès MVP |
|---|---|---|
| Organisateur | Préparer et superviser l’événement | Dashboard, invités, import, invitations, anomalies |
| Hôtesse | Contrôler les entrées rapidement | Scanner, recherche manuelle et résultat du contrôle |
| Invité | Présenter son invitation | Aucun compte requis |

## 6. Périmètre fonctionnel inclus

Le MVP comprend la création d’un événement unique, l’import d’un fichier CSV ou Excel, la validation des colonnes, l’ajout et la modification d’un invité, la recherche par nom ou téléphone, la génération d’un identifiant QR unique, le téléchargement d’une invitation, le scan depuis un navigateur mobile, la validation atomique du premier scan, le refus d’un double scan, le refus d’un code inconnu, l’affichage de la table, la recherche manuelle, les statistiques de présence et les journaux d’audit.

## 7. Périmètre volontairement exclu

La première version ne comprend pas la gestion simultanée de plusieurs événements, l’application mobile native, le paiement, l’envoi automatisé par WhatsApp, la reconnaissance faciale, la billetterie complète, le plan de salle interactif, les statistiques marketing avancées et la synchronisation hors ligne complète.

## 8. Frégates fonctionnelles

| Frégate | Responsabilité |
|---|---|
| `F01_CHECKIN` | Scan, validation, refus, horodatage et résultat du contrôle |
| `F02_GUESTS` | Fiches invités, recherche, ajout et modification |
| `F03_EVENT_STORE` | Base de données, modèles, migrations et transactions |
| `F04_DASHBOARD` | Statistiques, jauge de présence et derniers passages |
| `F05_QR_FORGE` | Identifiants secrets, QR codes et invitations |
| `F06_IMPORT` | Lecture CSV/Excel, normalisation et détection des erreurs |
| `F07_ADMIN_AUTH` | Protection de l’espace organisateur et permissions |

Chaque frégate possède sa propre logique, ses tests et son journal de tracking. Aucune frégate ne doit importer directement la logique interne d’une autre.

## 9. Parcours principal

### Organisateur

L’organisateur ouvre Gatsby, prépare l’événement, importe le fichier des invités, corrige les erreurs détectées, vérifie les tables, génère les invitations et partage les QR codes. Avant l’ouverture, il teste le scanner et vérifie que les statistiques sont à zéro.

### Hôtesse

L’hôtesse ouvre le scanner sur son téléphone, autorise la caméra, scanne le QR code et lit le résultat. En cas de succès, elle communique la table. En cas de refus, elle consulte l’organisateur. Si le téléphone de l’invité est inutilisable, elle recherche son nom ou son téléphone et demande une validation manuelle autorisée.

### Invité

L’invité présente son QR code sur téléphone ou sur papier. Il ne crée pas de compte et ne voit pas les données internes de Gatsby.

## 10. Règles de validation

| Situation | Statut | Réponse |
|---|---|---|
| QR connu et jamais utilisé | `SUCCESS` | Nom, table et heure du passage |
| QR connu mais déjà utilisé | `ALREADY_SCANNED` | Refus et heure du premier scan |
| QR inexistant | `INVALID` | Invitation inconnue |
| Problème technique | `ERROR` | Message contrôlé et possibilité de réessayer |

La validation doit être atomique : deux scans simultanés ne peuvent pas tous les deux être acceptés comme premier passage.

## 11. Exigences UX et design

L’interface est mobile-first et responsive. Le scanner doit être utilisable avec une main et présenter un résultat lisible à distance. Le dashboard s’adapte aux téléphones, tablettes et ordinateurs.

La palette utilise le noir `#080808` comme fond principal, le noir `#121212` pour les panneaux, l’or `#C9A227` pour les accents, l’ivoire `#F4EFE5` pour les titres et le gris `#A7A29A` pour les informations secondaires. Les écrans de contrôle utilisent le vert profond pour la validation et le rouge profond pour les refus.

Les titres de marque peuvent utiliser une police éditoriale telle que Cormorant Garamond ou Playfair Display. Les tableaux, boutons et messages opérationnels doivent utiliser une police moderne et lisible telle qu’Inter ou Manrope.

## 12. Architecture technique

L’interface utilise HTML5, CSS3 et JavaScript moderne. Le backend utilise Python avec FastAPI. SQLite est utilisé pour le MVP, avec une couche d’accès centralisée dans `F03_EVENT_STORE`. Le scan s’appuie sur une bibliothèque JavaScript compatible avec la caméra du navigateur.

La structure reprend le principe des frégates : contrats d’échange, responsabilités séparées, journalisation et possibilité de transformer les tâches d’import et de génération en workers relançables.

## 13. Résilience et isolation

Le parcours critique est indépendant du dashboard :

```text
QR → F01_CHECKIN → F03_EVENT_STORE → résultat
                         └──────────→ statistiques F04
```

Une erreur dans F04, F05 ou F06 ne doit pas empêcher F01 de traiter les invitations déjà préparées. Les exceptions doivent être interceptées au niveau des routes, journalisées et converties en réponses contrôlées. Les tâches longues d’import et de génération doivent être relançables sans remettre à zéro les scans existants.

## 14. Tracking et audit

Le tracking de Gatsby comprend un journal global de l’événement, un journal par frégate, un journal des transferts, un journal d’erreurs, un journal de sécurité, un journal de déploiement, un manifeste et un runbook.

Les événements opérationnels sensibles doivent être enregistrés dans la base de données avec `event_id`, `guest_id`, `action`, `status`, `timestamp_utc`, `actor_id` et `trace_id`. Les fichiers Markdown servent à la documentation et à l’audit humain. Les données personnelles complètes ne doivent pas être copiées dans les logs techniques.

## 15. Sécurité

Le QR code ne contient pas le nom, le téléphone ou la table en clair. Il contient uniquement un identifiant aléatoire non devinable. L’accès administrateur est protégé. Les fichiers importés sont validés avant écriture en base. La remise à zéro d’un scan nécessite une confirmation et doit être auditée.

## 16. Critères d’acceptation du MVP

Le MVP est considéré comme prêt lorsque l’organisateur peut importer une liste valide, corriger une ligne invalide, générer les invitations, ouvrir le scanner sur un smartphone, valider une invitation, refuser un double scan, refuser un QR inconnu, retrouver un invité manuellement et consulter les statistiques mises à jour.

La version est également considérée comme acceptable si le dashboard ou la génération d’un nouveau lot échoue sans interrompre le contrôle des QR codes déjà disponibles.

## 17. Évolutions futures

Les versions futures pourront gérer plusieurs événements par compte, plusieurs équipes d’accueil, des permissions détaillées, un fonctionnement hors ligne, des notifications, des plans de table interactifs, des invitations personnalisées et une migration vers PostgreSQL ou un service managé.

## 18. Références de conception

Le principe des frégates, des silos `IN → CODEBASE → OUT`, des contrats, des journaux par module, du journal de transfert et de la reprise par état est inspiré de l’analyse du dépôt PERTURABO fourni pour le brainstorming.
