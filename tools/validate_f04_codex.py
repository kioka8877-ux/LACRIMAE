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
    is_v2 = data.get('sub_mode') == 'meme_v2' or data.get('mode') == 'meme_v2'
    if not is_v2 and data.get('mode') != 'meme' and data.get('sub_mode') != 'meme':
        fail('mode meme absent')
    if data.get('validated_by_magos') is not True:
        fail('validated_by_magos doit être true')
    if len(clips) < 1 or len(clips) > 20:
        fail(f'nombre de clips hors limite: {len(clips)}')
    session = data.get('session') or {}
    background = session.get('background') or {}
    if is_v2:
        for index, clip in enumerate(clips, 1):
            if not clip.get('reaction_tweet'):
                fail(f'reaction_tweet absent sur clip {index:03d}')
            if not (clip.get('source_post') or {}).get('screenshot_png'):
                fail(f'source_post.screenshot_png absent sur clip {index:03d}')
            if not clip.get('text_emotion'):
                fail(f'text_emotion absent sur clip {index:03d}')
            if not (clip.get('meme') or {}).get('source'):
                fail(f'meme.source absent sur clip {index:03d}')
            v2 = clip.get('meme_v2') or {}
            timeline = v2.get('timeline') or {}
            points = [timeline.get(k, default) for k, default in (("reaction_start_pct", 0), ("source_start_pct", 15), ("emotion_start_pct", 33), ("clip_start_pct", 41))]
            if not all(0 <= value <= 100 for value in points) or points != sorted(points) or len(set(points)) != len(points):
                fail(f'timeline MEME V2 invalide sur clip {index:03d}: {points!r}')
            layout = v2.get('layout') or {}
            bounds = {
                'reaction_width_pct': (layout.get('reaction_width_pct', clip.get('reaction_width_pct', 88)), 40, 100),
                'reaction_text_size': (layout.get('reaction_text_size', clip.get('reaction_text_size', 17)), 12, 120),
                'capture_width_pct': (layout.get('capture_width_pct', 88), 40, 100),
                'capture_height_pct': (layout.get('capture_height_pct', 30), 12, 45),
                'capture_top_pct': (layout.get('capture_top_pct', 25), 0, 80),
            }
            for name, (value, lower, upper) in bounds.items():
                if not isinstance(value, (int, float)) or not lower <= value <= upper:
                    fail(f'{name} hors bornes sur clip {index:03d}: {value!r}')
            if layout.get('capture_fit', 'contain') not in ('contain', 'cover'):
                fail(f'capture_fit invalide sur clip {index:03d}')
        print(f'F04 CODEX MEME V2 OK: {len(clips)} clips, séquence réaction → source → émotion → meme')
        return
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
    if expected['text_emotion_position_pct'] != 84:
        fail(f"position émotion maître inattendue: {expected['text_emotion_position_pct']!r} (attendu 84% après remontée)")
    if expected['text_emotion_size'] != 72:
        fail(f"taille émotion maître inattendue: {expected['text_emotion_size']!r} (attendu 72 après hausse de 20%)")
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
