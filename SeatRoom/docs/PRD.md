# SeatRoom — Product Requirements Document

**Version:** 0.3 — Implémentation V2 en cours  
**Statut:** Validation fonctionnelle requise avant la prochaine itération  
**Périmètre:** Un seul événement actif  
**Produit:** Application web responsive de gestion d’invitations et d’émargement par QR code

## 1. Résumé du produit

SeatRoom est une application web destinée aux organisateurs de mariages, galas et séminaires d’entreprise. Elle permet de préparer une liste d’invités, de générer une invitation numérique contenant un QR code unique, puis de contrôler l’accès à l’entrée depuis un smartphone.

L’application est divisée en deux espaces. L’espace **Organisation** administre l’événement, les listes, les QR codes et les indicateurs. L’espace **Accueil** permet à un agent de scanner et de vérifier les invitations sans accéder aux fonctions d’administration.

SeatRoom doit permettre à l’agent de scanner une invitation, d’obtenir instantanément le résultat du contrôle, le nom et la table de l’invité, et de détecter un QR code invalide ou déjà utilisé. L’organisateur dispose d’un tableau de bord indiquant les présences, les invitations restantes et les anomalies.

Le MVP gère un seul événement actif afin de rester réalisable rapidement, tout en conservant une structure modulaire pour supporter plusieurs événements dans une version ultérieure.

## 2. Vision et positionnement

SeatRoom doit donner une impression de service haut de gamme, rare et maîtrisé, sans sacrifier la rapidité opérationnelle. L’expérience associe une identité visuelle noire et dorée à une interface de contrôle claire et plus fluide.

> **SeatRoom — L’élégance à chaque entrée.**

Le design de référence conserve le style Salon Noir : fond noir profond, surfaces noires contrastées, accents dorés mesurés, typographie éditoriale pour la marque et typographie moderne pour les tableaux et actions. Les composants utilisent des coins arrondis et les avatars sont circulaires afin d’éviter une interface trop rigide.

## 3. Problème à résoudre

Les événements utilisent souvent des listes papier, des confirmations dispersées, des invitations difficiles à vérifier et des contrôles manuels lents. Cette organisation expose l’événement aux doublons, aux falsifications, aux erreurs d’orientation et à l’absence de visibilité en temps réel.

SeatRoom doit centraliser la liste des invités, sécuriser l’invitation par un identifiant unique, séparer les responsabilités de l’organisation et de l’accueil, puis fournir une réponse immédiate à l’entrée.

## 4. Objectifs du MVP

| Objectif | Résultat attendu |
|---|---|
| Préparer un événement | L’organisateur importe une liste d’invités et vérifie les erreurs |
| Produire des invitations | SeatRoom génère un QR code secret par invité |
| Contrôler l’entrée | L’agent valide une invitation depuis la caméra de son téléphone |
| Éviter la fraude | Un QR code déjà utilisé ou inconnu est refusé |
| Orienter l’invité | Le nom et la table sont affichés après validation |
| Suivre l’accueil | Le tableau de bord présente les arrivées en temps réel |
| Séparer les responsabilités | L’espace Accueil ne peut pas administrer la liste |
| Résister aux erreurs | Une panne d’un module secondaire ne doit pas arrêter le check-in |

## 5. Utilisateurs et rôles

| Rôle | Besoin | Accès MVP |
|---|---|---|
| Organisateur | Préparer et superviser l’événement | Dashboard, invités, import, invitations, anomalies et configuration |
| Agent d’accueil | Contrôler les entrées rapidement | Scanner, recherche manuelle, statistiques utiles et signalement |
| Invité | Présenter son invitation | Aucun compte requis |

L’identité de connexion utilise le portail OAuth sécurisé disponible dans le template. L’utilisateur choisit ensuite son rôle SeatRoom, qui est conservé dans le profil applicatif. Le rôle SeatRoom ne remplace pas le rôle technique du compte système.

## 6. Périmètre fonctionnel inclus

Le MVP comprend la création d’un événement unique, l’authentification, le choix du profil Organisateur ou Agent d’accueil, l’import d’un fichier CSV ou Excel, la validation des colonnes, l’ajout et la modification d’un invité, la recherche par nom ou téléphone, la génération d’un identifiant QR unique, le téléchargement d’une invitation, le scan depuis un navigateur mobile, la demande d’accès à la caméra, la validation atomique du premier scan, le refus d’un double scan, le refus d’un code inconnu, l’affichage de la table, la recherche manuelle, les statistiques de présence, les notifications de suivi et les journaux d’audit.

Le shell doit rendre fonctionnels le menu hamburger, le centre de notifications, le menu de profil, la bascule Organisation/Accueil et le bouton SeatRoom.

## 7. Périmètre volontairement exclu

La première version ne comprend pas la gestion simultanée de plusieurs événements, l’application mobile native, le paiement, l’envoi automatisé par WhatsApp, la reconnaissance faciale, la billetterie complète, le plan de salle interactif, les statistiques marketing avancées et la synchronisation hors ligne complète.

Une authentification locale par mot de passe totalement indépendante du portail OAuth nécessiterait un flux de vérification d’e-mail et une gestion de secrets dédiée. Elle n’est pas ajoutée sans validation de l’infrastructure correspondante.

## 8. Frégates fonctionnelles

| Frégate | Responsabilité |
|---|---|
| `F01_CHECKIN` | Scan, validation, refus, horodatage et résultat du contrôle |
| `F02_GUESTS` | Fiches invités, recherche, ajout et modification |
| `F03_EVENT_STORE` | Base de données, modèles, migrations et transactions |
| `F04_DASHBOARD` | Statistiques, jauge de présence et derniers passages |
| `F05_QR_FORGE` | Identifiants secrets, QR codes et invitations |
| `F06_IMPORT` | Lecture CSV/Excel, normalisation et détection des erreurs |
| `F07_ADMIN_AUTH` | Session, protection de l’espace Organisation et permissions |
| `F08_SPACE_ACCESS` | Profil SeatRoom, rôle Organisateur/Agent et accès à l’espace |

Chaque frégate possède sa propre logique, ses tests et son journal de tracking. Aucune frégate ne doit importer directement la logique interne d’une autre.

## 9. Espaces applicatifs

### Espace Organisation

L’organisateur configure l’événement, importe `invites.csv`, vérifie les erreurs, génère les QR codes, distribue les invitations et consulte le suivi. Il voit le bouton SeatRoom en mode Live lorsque l’événement est actif. Le dashboard affiche le total attendu, les présents, les personnes restantes, le taux de présence et les anomalies.

### Espace Accueil

L’agent ouvre une interface simplifiée sur smartphone. Il autorise la caméra, scanne un QR code, reçoit un résultat lisible et communique la table. Il peut rechercher un invité manuellement lorsque le QR code est illisible, mais ne peut pas importer, supprimer ou modifier la liste.

## 10. Composant SeatRoom Live et hors Live

Lorsque l’événement est en direct, le bouton SeatRoom affiche un voyant vert clignotant et ouvre les caractéristiques de l’événement : thème, noms ou photos des mariés, édition, lieu et date. Il présente également les statistiques en temps réel, par exemple `145 / 200 invités arrivés` et `72,5 % de présence`, avec une action de signalement d’anomalie.

Lorsque l’événement n’est pas en direct, le voyant et la mention « En direct » disparaissent. Le bouton devient le menu général permettant d’accéder à l’historique des événements passés et à l’agenda des événements futurs.

## 11. Parcours principal

### Organisateur

L’organisateur se connecte, choisit l’espace Organisation, prépare l’événement, importe le fichier des invités, corrige les erreurs détectées, vérifie les tables, génère les invitations et partage les QR codes. Avant l’ouverture, il teste le scanner et vérifie que les statistiques sont à zéro.

### Agent d’accueil

L’agent se connecte ou accepte une invitation d’accès, choisit l’espace Accueil, ouvre le scanner sur son téléphone, autorise la caméra, scanne le QR code et lit le résultat. En cas de succès, il communique la table. En cas de refus, il consulte l’organisateur. Si le téléphone de l’invité est inutilisable, il recherche son nom ou son téléphone et demande une validation manuelle autorisée.

### Invité

L’invité présente son QR code sur téléphone ou sur papier. Il ne crée pas de compte et ne voit pas les données internes de SeatRoom.

## 12. Règles de validation

| Situation | Statut | Réponse |
|---|---|---|
| QR connu et jamais utilisé | `SUCCESS` | Nom, table et heure du passage |
| QR connu mais déjà utilisé | `ALREADY_SCANNED` | Refus et heure du premier scan |
| QR inexistant | `INVALID` | Invitation inconnue |
| Problème technique | `ERROR` | Message contrôlé et possibilité de réessayer |

La validation doit être atomique : deux scans simultanés ne peuvent pas tous les deux être acceptés comme premier passage.

## 13. Exigences UX et design

L’interface est mobile-first et responsive. Le scanner doit être utilisable avec une main et présenter un résultat lisible à distance. Le dashboard s’adapte aux téléphones, tablettes et ordinateurs.

La palette utilise le noir `#080808` comme fond principal, le noir `#121212` pour les panneaux, l’or `#C9A227` pour les accents, l’ivoire `#F4EFE5` pour les titres et le gris `#A7A29A` pour les informations secondaires. Les écrans de contrôle utilisent le vert profond pour la validation et le rouge profond pour les refus.

Les composants doivent privilégier des rayons généreux, des avatars circulaires, des transitions courtes et des zones tactiles suffisamment grandes. Les boutons, la cloche, le profil et le menu hamburger doivent être accessibles au clavier et au toucher.

## 14. Architecture technique

L’interface utilise React, HTML5, CSS3 et JavaScript moderne dans le projet web SeatRoom. Le backend applicatif utilise Express/tRPC avec la couche d’authentification et la base gérée par le template. Le scanner s’appuie sur `html5-qrcode` pour la caméra du navigateur.

La structure reprend le principe des frégates : contrats d’échange, responsabilités séparées, journalisation et possibilité de transformer les tâches d’import et de génération en workers relançables.

## 15. Données et comptes

Le compte système est fourni par le flux OAuth sécurisé. La table `seatroom_profiles` associe l’utilisateur à un rôle SeatRoom `organizer` ou `agent`, ainsi qu’à l’événement actif. Le profil est consulté par procédure protégée et ne peut pas être défini par un utilisateur non authentifié.

Le QR code ne contient pas le nom, le téléphone ou la table en clair. Il contient uniquement un identifiant aléatoire non devinable. Les fichiers importés sont validés avant écriture en base.

## 16. Résilience et isolation

Le parcours critique est indépendant du dashboard :

```text
QR → F01_CHECKIN → F03_EVENT_STORE → résultat
                         └──────────→ statistiques F04
```

Une erreur dans F04, F05 ou F06 ne doit pas empêcher F01 de traiter les invitations déjà préparées. Les exceptions doivent être interceptées au niveau des routes, journalisées et converties en réponses contrôlées. Les tâches longues d’import et de génération doivent être relançables sans remettre à zéro les scans existants.

## 17. Tracking et audit

Le tracking de SeatRoom comprend un journal global de l’événement, un journal par frégate, un journal des transferts, un journal d’erreurs, un journal de sécurité, un journal de déploiement, un manifeste et un runbook.

Les événements opérationnels sensibles doivent être enregistrés dans la base de données avec `event_id`, `guest_id`, `action`, `status`, `timestamp_utc`, `actor_id` et `trace_id`. Les fichiers Markdown servent à la documentation et à l’audit humain. Les données personnelles complètes ne doivent pas être copiées dans les logs techniques.

## 18. Sécurité

L’accès à l’espace Organisation et à l’espace Accueil est protégé par authentification. Les procédures backend vérifient le profil SeatRoom avant d’autoriser une action. Un agent ne peut pas modifier la liste des invités ni générer une nouvelle invitation.

Le QR code ne contient pas de données personnelles en clair. La remise à zéro d’un scan nécessite une confirmation et doit être auditée. L’authentification OAuth doit conserver sa protection anti-CSRF et son cookie de session sécurisé.

## 19. Critères d’acceptation du MVP

Le MVP est considéré comme prêt lorsque l’utilisateur peut ouvrir une session, choisir un rôle, accéder au bon espace, cliquer sur le menu hamburger, consulter les notifications, ouvrir son profil, importer une liste, générer les invitations, ouvrir le scanner sur un smartphone, autoriser la caméra, détecter un QR code, valider une invitation, refuser un double scan, refuser un QR inconnu, retrouver un invité manuellement et consulter les statistiques mises à jour.

La version est également considérée comme acceptable si le dashboard ou la génération d’un nouveau lot échoue sans interrompre le contrôle des QR codes déjà disponibles.

## 20. Évolutions futures

Les versions futures pourront gérer plusieurs événements par compte, plusieurs équipes d’accueil, des permissions détaillées, un fonctionnement hors ligne, des notifications avancées, des plans de table interactifs, des invitations personnalisées et une migration vers une infrastructure de données managée.

## 21. Références de conception

Le principe des frégates, des silos `IN → CODEBASE → OUT`, des contrats, des journaux par module, du journal de transfert et de la reprise par état est inspiré de l’analyse du dépôt PERTURABO fourni pour le brainstorming.
