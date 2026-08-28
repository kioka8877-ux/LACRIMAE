# DEV8 — Support de clips variables (3 à 6)

## Date
2026-08-28

## Objectif
Rendre le nombre de clips flexibles (3 à 6) au lieu de 6 fixes, tout en conservant la logique "Others vs This One" où le dernier clip est toujours le "reveal".

## Changements

### 1. F00_INGEST/CODEBASE/f00_reveal.py

| Avant | Après |
|-------|-------|
| "jusqu'à six clips" | "de trois à six clips" |
| Pas de minimum | `len(rows) < 3` → erreur |
| `index == 6` pour le reveal | `index == len(rows)` pour le reveal |

**Logique :** Le dernier clip est automatiquement marqué `final_reveal`. Le champ explicite `final_reveal: true` est toujours supporté.

### 2. DEV8_REVEAL_COMPILATION.md

| Avant | Après |
|-------|-------|
| "six sources vidéo" | "trois à six sources vidéo" |
| "les cinq premières... la sixième" | "les clips précédents... le dernier" |
| "une à six sources" | "trois à six sources" |
| "Le sixième clip" | "Le dernier clip" |
| "F03 affiche les six sources" | "F03 affiche toutes les sources (3 à 6)" |

### 3. F00_INGEST/README.md

| Avant | Après |
|-------|-------|
| "une à six sources" | "trois à six sources" |
| "Le sixième clip" | "Le dernier clip" |

### 4. revealCompilation.js (React) — Aucun changement nécessaire

Le normalizer gère déjà le cas dynamique :
```javascript
const isFinal = Boolean(scene.final_reveal || source.role === 'final_reveal' || index === sourceRows.length - 1);
```

## Exemple de requête (4 clips)

```json
{
  "format": "reveal_compilation",
  "sources": [
    {"id": "reveal_01", "source": "sources/clip1.mp4", "in_seconds": 0, "out_seconds": 5, "mirror": false, "fit_mode": "crop"},
    {"id": "reveal_02", "source": "sources/clip2.mp4", "in_seconds": 0, "out_seconds": 5, "mirror": true, "fit_mode": "crop"},
    {"id": "reveal_03", "source": "sources/clip3.mp4", "in_seconds": 0, "out_seconds": 5, "mirror": false, "fit_mode": "crop"},
    {"id": "reveal_04", "source": "sources/clip4.mp4", "in_seconds": 0, "out_seconds": 8, "mirror": false, "fit_mode": "blur"}
  ]
}
```

**Résultat :** `reveal_04` sera automatiquement `final_reveal` car c'est le dernier clip.

## Validation

| Test | Résultat attendu |
|------|-----------------|
| 3 clips | ✅ OK - clip 3 = reveal |
| 4 clips | ✅ OK - clip 4 = reveal |
| 5 clips | ✅ OK - clip 5 = reveal |
| 6 clips | ✅ OK - clip 6 = reveal (comportement initial) |
| 2 clips | ❌ Erreur "minimum trois sources" |
| 7 clips | ❌ Erreur "maximum six sources" |

## Impact

- **Rétrocompatible** : Les requêtes existantes avec 6 clips fonctionnent identiquement
- **Nouveau** : Supporte 3, 4 ou 5 clips avec le même comportement reveal
- **Aucun changement** : Le normalizer React et le rendu PICTOR gèrent déjà le cas dynamique
