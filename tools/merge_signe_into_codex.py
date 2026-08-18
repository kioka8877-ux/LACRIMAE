import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
sig_path = root / 'F03_PREVIEW' / 'IN' / 'signatures.json'
signatures = json.loads(sig_path.read_text(encoding='utf-8'))

for rel in [
    Path('F03_PREVIEW/IN/codex.json'),
    Path('F03_PREVIEW/CODEBASE/public/codex.json'),
]:
    path = root / rel
    codex = json.loads(path.read_text(encoding='utf-8'))
    for clip in codex.get('clips', []):
        clip_id = clip.get('id')
        if clip_id in signatures:
            clip['sig'] = signatures[clip_id]
    codex['validated_by_magos'] = False
    path.write_text(json.dumps(codex, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'updated {path}')
