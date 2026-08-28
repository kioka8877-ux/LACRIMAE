# SeatRoom — Gestion d'invitations et contrôle d'accès par QR code

**Version:** 0.3 — MVP en cours  
**Statut:** Validation fonctionnelle requise  
**Branche:** `dev9` (intégration dans LACRIMAE)

---

## 🎯 Vision

> **SeatRoom — L'élégance à chaque entrée.**

Application web responsive pour organisateurs de mariages, galas et séminaires. Elle permet de préparer une liste d'invités, générer des invitations numériques avec QR code unique, et contrôler l'accès à l'entrée depuis un smartphone.

---

## 🏗️ Architecture en Frégates

SeatRoom suit le principe des **frégates** (modules autonomes, contrats d'échange, journalisation) inspiré de PERTURABO/LACRIMAE.

| Frégate | Responsabilité | Statut |
|---------|----------------|--------|
| `F01_CHECKIN` | Scan, validation, refus, horodatage, résultat | ✅ Codebase |
| `F02_GUESTS` | Fiches invités, recherche, ajout, modification | 🟡 Schema |
| `F03_EVENT_STORE` | Base de données, modèles, migrations, transactions | ✅ Codebase |
| `F04_DASHBOARD` | Statistiques, jauge de présence, derniers passages | 🟡 Styles |
| `F05_QR_FORGE` | Identifiants secrets, QR codes, invitations | 🔴 À faire |
| `F06_IMPORT` | Lecture CSV/Excel, normalisation, détection erreurs | 🔴 À faire |
| `F07_ADMIN_AUTH` | Session, protection espace Organisation, permissions | ✅ Codebase |
| `F08_SPACE_ACCESS` | Profil SeatRoom, rôle Organisateur/Agent, accès espaces | ✅ Codebase |

---

## 👥 Utilisateurs et Rôles

| Rôle | Besoin | Accès MVP |
|------|--------|-----------|
| **Organisateur** | Préparer et superviser l'événement | Dashboard, invités, import, invitations, anomalies, config |
| **Agent d'accueil** | Contrôler les entrées rapidement | Scanner, recherche manuelle, stats utiles, signalement |
| **Invité** | Présenter son invitation | Aucun compte requis |

---

## 🔐 Authentification & Verrouillage des Rôles

- **Portail OAuth** (Manus) : E-mail/Mot de passe + Google Auth
- **Rôle SeatRoom** stocké dans `seatroom_profiles` (ne remplace pas le rôle système)
- **Verrouillage** : Un agent ne peut pas s'auto-proclamer organisateur
  - Inscription directe → `organizer` (autorisé)
  - Invitation pendante → rôle forcé selon l'invitation
  - Inscription comme agent → **Bloqué** (doit être invité)

---

## 📁 Structure du Projet

```
SeatRoom/
├── F01_CHECKIN/          # Scan & validation entrée
│   ├── CODEBASE/WelcomeSpace.tsx
│   ├── CODEBASE/checkin.response.schema.json
│   └── OUT/F01_CHECKIN_LOG.md
├── F02_GUESTS/           # Gestion fiches invités
│   └── CODEBASE/guest.schema.json
├── F03_EVENT_STORE/      # Base de données & modèles
│   ├── CODEBASE/db.ts
│   ├── CODEBASE/schema.ts
│   ├── CODEBASE/seed-db.mjs
│   └── IN/*.sql
├── F04_DASHBOARD/        # Statistiques & monitoring
│   └── CODEBASE/index.css
├── F05_QR_FORGE/         # Génération QR codes
├── F06_IMPORT/           # Import CSV/Excel
├── F07_ADMIN_AUTH/       # Authentification & sessions
│   ├── CODEBASE/useAuth.ts
│   ├── CODEBASE/const.ts
│   ├── CODEBASE/routers.ts
│   └── CODEBASE/trpc.ts
├── F08_SPACE_ACCESS/     # Rôles & espaces applicatifs
│   ├── CODEBASE/SeatRoomControl.tsx
│   ├── CODEBASE/routers.seatroom.ts
│   └── CODEBASE/seatroom.roles.test.ts
├── SHARED/               # Ressources partagées
│   ├── App.tsx, index.html, index.css
│   ├── main.py, tsconfig.json, requirements.txt
├── TRACKING/             # Journaux d'audit
│   ├── DEPLOYMENT_LOG.md, ERROR_LOG.md, EVENT_LOG.md
│   ├── SECURITY_LOG.md, TRANSFER_LOG.md, F01_CHECKIN_LOG.md
├── docs/                 # Documentation
│   ├── PRD.md, plans d'implémentation, corrections
│   ├── INTERACTIONS_ET_COMPTES_SEATROOM.md
│   └── ...
├── _tools/               # Scripts utilitaires
│   ├── start-replit.sh, seed-db.mjs
└── .replit               # Config Replit
```

---

## 🚀 Parcours Principal

### Organisateur
1. Arrive sur la page de garde → **"Créer mon événement"**
2. OAuth (e-mail/Google) → rôle `organizer` auto-assigné
3. Espace **Organisation** : import CSV, génération QR, dashboard temps réel

### Agent d'accueil
1. Reçoit invitation par e-mail → **"Je suis invité · Me connecter"**
2. OAuth → claim invitation → rôle `agent` auto-assigné
3. Espace **Accueil** : scanner caméra, résultat instantané (Vert/Rouge), table

### Invité
- Présente QR code (téléphone/papier) — aucun compte, aucune donnée interne visible

---

## 🎨 Design — Salon Noir V2

- **Fond** : `#080808` (noir profond)
- **Panneaux** : `#121212`
- **Accent Or** : `#C9A227`
- **Ivoire** : `#F4EFE5` (titres)
- **Gris** : `#A7A29A` (secondaire)
- **Succès** : Vert profond `#3F9B68`
- **Danger** : Rouge profond `#B94A48`
- **Rayons généreux**, avatars circulaires, transitions courtes, zones tactiles larges

---

## ⚙️ Stack Technique

- **Frontend** : React 18, TypeScript, Vite, Tailwind CSS, `html5-qrcode`
- **Backend** : FastAPI (Python) / tRPC (Node), Drizzle ORM, MySQL
- **Auth** : Manus OAuth (portail sécurisé, cookie `__Host-` + nonce)
- **Temps réel** : Polling / WebSocket (stats dashboard)
- **Déploiement** : Replit (script `start-replit.sh`)

---

## 📋 Critères d'Acceptation MVP

Le MVP est prêt quand l'utilisateur peut :
- [ ] Ouvrir une session, choisir un rôle, accéder au bon espace
- [ ] Cliquer menu hamburger (collapse desktop / drawer mobile)
- [ ] Consulter notifications, ouvrir profil
- [ ] Importer liste, générer invitations
- [ ] Ouvrir scanner smartphone, autoriser caméra
- [ ] Détecter QR, valider invitation, refuser double scan, refuser QR inconnu
- [ ] Retrouver invité manuellement, consulter stats mises à jour

---

## 📊 Suivi & Audit

- **Journaux Markdown** : `TRACKING/` (humain)
- **Base de données** : `event_id`, `guest_id`, `action`, `status`, `timestamp_utc`, `actor_id`, `trace_id`
- **Données personnelles** : Jamais copiées dans les logs techniques

---

## 🔒 Sécurité

- Espaces protégés par authentification + vérification profil SeatRoom
- Agent ne peut pas modifier liste ni générer invitations
- QR code = UUID aléatoire non devinable (pas de PII en clair)
- Remise à zéro scan = confirmation + audit
- OAuth : protection CSRF, cookie `Secure`, `SameSite=None`

---

## 🔮 Évolutions Futures (Post-MVP)

- Multi-événements par compte
- Équipes d'accueil multiples + permissions granulaires
- Mode hors ligne complet
- Notifications avancées (push, WhatsApp)
- Plans de table interactifs
- Invitations personnalisées (design, champs)
- Migration infrastructure données managée

---

## 📝 Références

- Principe frégates, silos `IN → CODEBASE → OUT`, contrats, journaux : **PERTURABO** / **LACRIMAE**
- Feedback client & corrections : `docs/CORRECTIONS_PARCOURS_ET_ROLES.md`
- PRD complet : `docs/PRD.md`

---

*SeatRoom — Fait avec rigueur pour l'élégance.*