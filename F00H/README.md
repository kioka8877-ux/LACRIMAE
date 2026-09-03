# F00H — HOOK (Background Mismatch Hook)

> *F00H est une frégate optionnelle qui ajoute un "hook" de 2 secondes au début de chaque clip.*

## Concept

Au lieu de commencer le clip normalement, F00H affiche un fond complètement
absurde (Backrooms, Konoha, Matrix, etc.) derrière le streamer masqué pendant
les 2 premières secondes, puis revient au fond original avec un SFX glitch.

**Pourquoi ça marche :** Le décalage visuel crée un "pattern interrupt" qui
force le spectateur à s'arrêter sur la vidéo. C'est le même mécanisme qu'un
bon thumbnail — la contradiction visuelle oblige le cerveau à prêter attention.

## Pipeline

```
F00-E (cut clips) → F00-G (valide) → [F00H (hook)] → F03 → F04 → F05/F06
                                   ↑ optionnel
```

## Structure

```
F00H/
├── IN/
│   ├── clips/          ← clips validés par F00G
│   ├── backgrounds/    ← bibliothèque de fonds absurdes (vidéos)
│   └── sfx/            ← fichiers SFX (glitch, whoosh)
├── OUT/
│   ├── clips_hooked/   ← clips avec le hook de 2s
│   ├── clips_clean/    ← clips originaux (backup)
│   └── control_frames/ ← frames de contrôle (0s, 2s, 3s)
└── CODEBASE/
    └── f00h.py         ← script principal (validation + gates)
```

## Usage

### Validation locale (CPU)
```bash
python3 F00H/CODEBASE/f00h.py \
  --clips-dir F00H/IN/clips \
  --out F00H/OUT \
  --preset random \
  --validate \
  --extract-frames
```

### Rendu GPU (Modal)
```bash
python3 modal/invoke_remote.py \
  --app lacrimae-dev10-video \
  --stage F00H_HOOK \
  --input-uri campaigns/test/clips/clip_01.mp4 \
  --output-uri campaigns/test/clips_hooked/clip_01.mp4 \
  --campaign-id test \
  --preset backrooms
```

### Orchestration complète
```bash
python3 ORACLE/universal_run.py \
  --campaign-id test \
  --source /chemin/clip.mp4 \
  --hook \
  --hook-preset backrooms
```

## Backgrounds disponibles

| Preset | Label | Tag |
|---|---|---|
| backrooms | Backrooms | horror |
| konoha | Konoha | anime |
| matrix | Matrix Code Rain | cyber |
| void | Void Espace Noir | minimal |
| underwater | Underwater Ocean | nature |
| volcanic | Volcanic Lave | danger |
| space | Space Galaxie | cosmic |
| retro_8bit | Retro 8-bit | gaming |
| static | TV Static Bruit | glitch |
| castle | Medieval Chateau | fantasy |

## Gates de validation

| Gate | Verification |
|---|---|
| H0 INPUT | Clip H.264, 1080x1920, durée >= 2s |
| H1 BACKGROUND | Preset valide dans hook_presets.json |
| H2 HOOK | Clip assez long (>= 60 frames) |
| H3 SFX | Fichier SFX configuré |
| H4 OUTPUT | Clip final = hook 2s + clip original intact |

## Dépendances Modal

- GPU : T4 (16 GB VRAM)
- Modèles : SAM 2 (sam2_hiera_large.pt)
- Volumes : lacrimae-dev10-video, lacrimae-dev10-models
