# SeatRoom — Corrections de parcours et de rôles

## 1. Page de garde publique

L’écran initial de SeatRoom ne doit plus demander un rôle avant d’être connecté. Il doit présenter une page de garde luxueuse avec deux options claires :
- **S’inscrire** : Réservé aux nouveaux organisateurs qui souhaitent créer leur premier événement.
- **Se connecter** : Pour les organisateurs existants et les agents déjà invités.

L’écran de connexion inclura l’option **"Rester connecté"** (persistante via le cookie de session OAuth).

## 2. Verrouillage des rôles

Afin d’éviter qu’un agent ne s’inscrive comme organisateur ou vice-versa, la logique suivante est appliquée :

| Action | Rôle attribué | Condition |
|---|---|---|
| Inscription directe | `organizer` | Autorisé pour tout nouvel e-mail sans invitation pendante. |
| Connexion (première fois) | `agent` | Automatique si une invitation par e-mail existe en base. |
| Inscription comme agent | **Bloqué** | Un agent ne peut pas s’auto-proclamer ; il doit être invité par un organisateur. |

## 3. Navigation et Sidebar

Le bouton hamburger à trois barres doit agir comme une commande de réduction/extension de la barre latérale sur desktop, et comme un menu ouvrant sur mobile.
- **Desktop** : Clique sur hamburger → la sidebar passe de 260px à 82px (icônes uniquement).
- **Mobile** : Clique sur hamburger → la sidebar s’ouvre en plein écran par-dessus le contenu.

## 4. Impacts techniques

- **Frontend** : Refonte de `AccountGate` pour séparer Inscription/Connexion. Ajout d’un état local pour `sidebarCollapsed`.
- **Backend** : La procédure `setRole` doit vérifier si l’utilisateur a une invitation pendante avant de permettre un choix libre. Si une invitation existe, le rôle est forcé à celui de l’invitation.
- **Sécurité** : Suppression du choix de rôle libre sur l’écran de garde pour les nouveaux comptes, sauf pour le rôle `organizer` par défaut.
