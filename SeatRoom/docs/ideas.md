# SeatRoom — Direction artistique V2

## Approche choisie — Salon Noir (Évolué)

### Design Movement

**Modern luxury editorial & Fluid interface** : conservation du noir profond et de l'or champagne, mais transition vers une interface plus douce et organique inspirée de la **Dynamic Island**.

### Core Principles

1. **Rondeur et Fluidité** : Suppression des angles vifs. Tous les conteneurs, boutons et éléments d'interface utilisent des rayons de courbure généreux (`border-radius: 1.5rem` ou plus).
2. **Avatars Ronds** : Toutes les photos de profil et indicateurs de personnes sont strictement circulaires.
3. **Composant SeatRoom** : Le bouton en haut à gauche est l'organe vivant de l'app, changeant de forme et de contenu selon le contexte (Live / Menu).
4. **Hiérarchie Opérationnelle** : Séparation claire entre l'espace **Organisation** (riche en données) et l'espace **Accueil** (minimaliste et focalisé sur le scan).

### Color Philosophy

Identique à la V1 : Noir `#080808`, Or Champagne `#C9A227`, Ivoire `#F4EFE5`. Le vert du mode "Live" est un vert émeraude profond `#3F9B68` pour rester dans l'univers luxe.

### Layout Paradigm

- **Organisation** : Rail latéral arrondi et cartes flottantes.
- **Accueil** : Interface mobile-first centrée sur le viseur de la caméra.
- **SeatRoom Live** : En haut à gauche, un îlot noir flottant avec voyant vert clignotant.

### Interaction Philosophy

Inspirée d'Apple : transitions fluides, expansions de composants ("morphing") et retours haptiques visuels. Le scan doit être instantané et gratifiant.

### Typography System

Cormorant Garamond (Titres) et Manrope (Données). Utilisation de graisses plus légères pour renforcer l'aspect premium malgré la rondeur.

### Wordmark & Logo

Le symbole SeatRoom conserve l'élégance de l'art déco mais s'inscrit dans un cercle ou une forme plus douce.

## Style Decisions

- **Global Radius** : `--radius: 1.6rem`.
- **Avatars** : `rounded-full`.
- **SeatRoom Button** : `rounded-full` ou `rounded-2xl` selon l'état.
- **Project Name** : SeatRoom uniquement.
- **Frégates** : F01 à F07 conservées pour l'isolation technique.
