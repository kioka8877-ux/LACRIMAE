# LACRIMAE — DESIGN F00B « RÉCOLTE DES MEMES »

## STATUT (2026-08-16)

- **Codé + poussé** : script `F00B/CODEBASE/lac_f00b_harvest.py`, fiche design,
  `F00B/cuts.txt`, workflow `.github/workflows/f00b-harvest.yml`.
- **Test local OK** : py_compile, harvest + miniatures + validation, publish,
  anti-écrasement (exit 1), numérotation continue.
- **Test GHA réel OK (2 phases, branche dev3)** :
  - Phase 1 harvest : run `31979725659` → artifact `f00b-harvest` (meme_001/002/007.mp4 + jpg + manifest, all_validated).
  - Phase 2 publish : run `31979785462` → commit `63d37fb` (memes dans `SHARED/memes/` + listing README).
- **Vidéo source de test** : Release GitHub `f00b-test-01` (asset `video_source.mp4`, testsrc synthétique 30 s).

> Le run réel F00B nécessite un asset `video_source.mp4` dans une GitHub Release
> (`_tools/lac_release_video.sh`) + le fichier `F00B/cuts.txt` commité.

---


> F00B est la frégate qui produit les memes de la méméthèque (`SHARED/memes/`).
> L'opérateur regarde une vidéo source, donne des découpes (début/fin), F00B
> coupe, nomme `meme_00X.mp4`, range dans `F00B/OUT/` pour vérification, et
> pousse vers `SHARED/memes/` **seulement après validation** de l'opérateur.
> F00 (brief + ingest vidéo) reste inchangée — F00B est additive, branche `dev3`.

---

## 1. PRINCIPE (3 étapes, zéro commande ffmpeg pour l'opérateur)

1. **Découpes** : l'opérateur édite `F00B/cuts.txt` (fichier **tracké**, éditable
   dans l'UI GitHub comme la cutlist de F01 — 1 coupe par ligne) :
   ```
   # start end   # commentaire optionnel
   12.5 18.0
   45.0 52.5 # meme_007   <- force le numéro, sinon numérotation auto
   ```
   Ou passe `--ranges "12.5-18,45-52.5"` en ligne de commande (usage local).
2. **Harvest** : F00B découpe la vidéo source avec ffmpeg, produit
   `meme_00X.mp4` (H.264+AAC, yuv420p, `+faststart`) + une miniature
   `meme_00X.jpg` par clip dans `F00B/OUT/`. Chaque clip est validé (ffprobe) →
   manifest `memes_manifest.json`.
3. **Publish** : après vérification de l'opérateur, `--publish` copie les clips
   validés vers `SHARED/memes/`, numérotés à partir du max existant
   (jamais d'écrasement). Là, le run meme réel (P6) les utilise.

## 2. ENTRÉES / SORTIES

| Élément | Chemin | Rôle |
|---------|--------|------|
| Vidéo source | `F00B/IN/source.mp4` (local) **ou** asset `video_source.mp4` d'une GitHub Release (GHA) | la vidéo à couper |
| Découpes | `F00B/cuts.txt` (tracké) | `start end` par ligne, `#` = commentaire, `# meme_XXX` force le numéro |
| Clips | `F00B/OUT/meme_00X.mp4` | morceaux à vérifier |
| Miniatures | `F00B/OUT/meme_00X.jpg` | aperçu rapide dans l'UI GitHub |
| Manifest | `F00B/OUT/memes_manifest.json` | mapping clip → coupe + métadonnées ffprobe + statut validé |

`F00B/IN/` et `F00B/OUT/` sont gitignorés (données transitoires). Seuls
`SHARED/memes/*.mp4` sont commités (méméthèque finale).

## 3. CONTRAT DE COUPE (`cuts.txt`)

- Chaque ligne : `START END` (secondes, décimales autorisées), optionnel `# meme_XXX`.
- Ligne sans numéro → numérotation automatique `meme_001`, `meme_002`, … (ordre du fichier).
- Ligne avec `# meme_007` → numéro forcé (l'ordre du fichier reste celui de la coupe).
- Commentaire pleine ligne : commence par `#`.
- `START >= 0`, `END > START`, `END <= durée vidéo` — sinon erreur bloquante.
- Fichier vide → erreur bloquante (aucune découpe).

## 4. VALIDATION AVANT PUBLISH (Contrôle F00B)

Chaque clip `meme_00X.mp4` doit passer :
- ffprobe : un stream vidéo H.264 + un stream audio AAC (audio optionnel, accepté muet).
- `pix_fmt` yuv420p (compatibilité web/preview).
- durée > 0.2 s.
- Le manifest ne passe `"validated": true` que si toutes les coupes sont bonnes.
- **`--publish` refuse de copier si au moins un clip est invalide.**

## 5. PUBLISH (vers la méméthèque)

- Numérotation : max des `meme_*.mp4` existants dans `SHARED/memes/` + 1, puis
  ordre du fichier de coupes (les numéros forcés sont respectés).
- **Jamais d'écrasement** : si `meme_007.mp4` existe déjà et qu'une coupe le
  demande, erreur bloquante (l'opérateur choisit un autre numéro ou supprime).
- Publish écrit aussi `SHARED/memes/README.md` (listing à jour, généré).

## 6. USAGES

```bash
# Local — vidéo fichier + découpes dans un fichier
python3 F00B/CODEBASE/lac_f00b_harvest.py --video F00B/IN/source.mp4 --cuts F00B/cuts.txt

# Local — découpes directes en argument
python3 F00B/CODEBASE/lac_f00b_harvest.py --video F00B/IN/source.mp4 --ranges "12.5-18,45-52.5"

# Local — validation OK puis publication vers SHARED/memes/
python3 F00B/CODEBASE/lac_f00b_harvest.py --video F00B/IN/source.mp4 --cuts F00B/cuts.txt --publish

# GHA — f00b-harvest.yml (inputs : source_tag, cuts_file, publish)
```

La racine du repo est détectée automatiquement depuis le script : `--out` défaut =
`F00B/OUT/`, méméthèque = `SHARED/memes/` (peu importe le cwd d'exécution).

## 7. DÉPENDANCES

- `ffmpeg` / `ffprobe` : préinstallés sur les runners ubuntu-latest (GHA),
  `apt-get install -y ffmpeg` en local.
- Téléchargement vidéo GHA : `_tools/download_release_video.py` (asset `video_source.mp4`).
- Aucun changement à F00, à l'orchestrateur, ni aux workflows P6 déjà poussés.
