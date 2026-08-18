import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
for rel in [
    Path('F03_PREVIEW/IN/codex.json'),
    Path('F03_PREVIEW/CODEBASE/public/codex.json'),
    Path('F04_RENDER/IN/codex.json'),
    Path('F04_RENDER/CODEBASE/public/codex.json'),
]:
    path = root / rel
    if not path.exists():
        continue
    data = json.loads(path.read_text(encoding='utf-8'))
    data['validated_by_magos'] = True
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'validated {path}')
