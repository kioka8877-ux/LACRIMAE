import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
data = json.loads((root / 'tools/fixtures/codex_meme_v2_valid.json').read_text())
clip = data['clips'][0]
assert data['sub_mode'] == 'meme_v2'
assert all(clip.get(k) for k in ('reaction_tweet', 'text_emotion'))
assert clip['source_post']['screenshot_png']
assert clip['meme']['source']
frames = clip['video']['total_frames']
assert round(frames * 0.15) == 36
assert round(frames * 0.33) == 79
assert round(frames * 0.41) == 98
assert 0 < round(frames * 0.15) < round(frames * 0.33) < round(frames * 0.41) < frames
print('MEME V2 contract OK: reaction -> source -> emotion -> meme')
