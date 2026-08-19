#!/usr/bin/env python3
import argparse
import json
import sys
from pathlib import Path


def fail(message):
    print(f"F04 CODEX ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('codex', type=Path)
    args = parser.parse_args()
    data = json.loads(args.codex.read_text(encoding='utf-8'))
    clips = data.get('clips') or []
    if data.get('mode') != 'meme' and data.get('sub_mode') != 'meme':
        fail('mode meme absent')
    if data.get('validated_by_magos') is not True:
        fail('validated_by_magos doit être true')
    if len(clips) < 1 or len(clips) > 20:
        fail(f'nombre de clips hors limite: {len(clips)}')
    session = data.get('session') or {}
    background = session.get('background') or {}
    if background.get('image') != 'bg_paper_crumpled.png':
        fail(f"background validé absent: {background.get('image')!r}")
    required_session = {
        ('texts_style', 'font'),
        ('texts_style', 'size_title'),
        ('texts_style', 'size_paragraph'),
        ('presets', 'color_css_filter'),
        ('presets', 'vignette'),
        ('presets', 'grain_intensity'),
    }
    for block, key in required_session:
        if (session.get(block) or {}).get(key) is None:
            fail(f'paramètre session absent: {block}.{key}')
    master = clips[0]
    if (session.get('texts_style') or {}).get('size_title') != 55:
        fail(f"size_title maître inattendu: {(session.get('texts_style') or {}).get('size_title')!r} (attendu 55 après réduction de 40%)")
    expected = {
        'tweet.text_size': (master.get('tweet') or {}).get('text_size'),
        'text_emotion_position_pct': master.get('text_emotion_position_pct'),
        'text_emotion_size': master.get('text_emotion_size'),
    }
    for name, value in expected.items():
        if value is None:
            fail(f'paramètre maître absent: {name}')
    if expected['tweet.text_size'] != 51:
        fail(f"tweet.text_size maître inattendu: {expected['tweet.text_size']!r}")
    if expected['text_emotion_position_pct'] != 92:
        fail(f"position émotion maître inattendue: {expected['text_emotion_position_pct']!r}")
    if expected['text_emotion_size'] != 60:
        fail(f"taille émotion maître inattendue: {expected['text_emotion_size']!r} (attendu 60 après réduction de 40%)")
    for index, clip in enumerate(clips, 1):
        if not clip.get('sig'):
            fail(f'SIGNE absent sur clip {index:03d}')
        if (clip.get('tweet') or {}).get('text_size') != expected['tweet.text_size']:
            fail(f"tweet.text_size non hérité sur clip {index:03d}")
        if clip.get('text_emotion_position_pct') != expected['text_emotion_position_pct']:
            fail(f"position émotion non héritée sur clip {index:03d}")
        if clip.get('text_emotion_size') != expected['text_emotion_size']:
            fail(f"taille émotion non héritée sur clip {index:03d}")
    print(f"F04 CODEX OK: {len(clips)} clips, background validé, styles maître hérités, SIGNE présent")


if __name__ == '__main__':
    main()
