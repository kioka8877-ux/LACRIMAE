/* ═══════════════════════════════════════════════════════════════════
   RankingCompilationComposition — list-overlay format
   
   - Clip plays full-screen behind everything
   - Title is persistent (visible from frame 0 to end)
   - Ranks stack bottom-up, revealed in random order (rank #1 always last)
   - Each word in title/label has its own color
   - Number has its own color per rank
   ═══════════════════════════════════════════════════════════════════ */
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Sequence, Audio, Video, Img, staticFile } from 'remotion';
import { normalizeMusicTimeline, buildAudioSegments } from './audioTimeline';
import { normalizeRankingManifest, rankingActiveRows, rankingEntryAtFrame } from './rankingCompilation';

/* Render a word with its color */
function ColoredWord({ word, size, bold = true }) {
  if (!word || !word.text) return null;
  return (
    <span style={{ color: word.color || '#FFFFFF', fontSize: size, fontWeight: bold ? 900 : 700 }}>
      {word.text}
    </span>
  );
}

/* Render title words with layout rules:
   2 words = same line, 3 words = 3rd below centered, 4 words = 2+2 stacked */
function TitleWords({ words, size, xPct, yPct, align = 'center' }) {
  const active = (words || []).filter(w => w.text && w.text.trim());
  if (active.length === 0) return null;
  const count = active.length;
  
  const baseStyle = {
    position: 'absolute',
    left: align === 'center' ? `${xPct}%` : align === 'right' ? 'auto' : `${xPct}%`,
    right: align === 'right' ? `${100 - xPct}%` : 'auto',
    top: `${yPct}%`,
    transform: align === 'center' ? 'translateX(-50%)' : 'none',
    textAlign: align,
    fontWeight: 900,
    textTransform: 'uppercase',
    textShadow: '0 3px 12px rgba(0,0,0,0.9)',
    lineHeight: 1.1,
    zIndex: 10,
  };

  if (count <= 2) {
    // 1-2 words: single line
    return (
      <div style={{ ...baseStyle, fontSize: size, display: 'flex', gap: size * 0.3, justifyContent: align === 'center' ? 'center' : 'flex-start' }}>
        {active.map((w, i) => <ColoredWord key={i} word={w} size={size} />)}
      </div>
    );
  }
  if (count === 3) {
    // 3 words: 2 on first line, 3rd centered below
    return (
      <div style={baseStyle}>
        <div style={{ fontSize: size, display: 'flex', gap: size * 0.3, justifyContent: align === 'center' ? 'center' : 'flex-start' }}>
          <ColoredWord word={active[0]} size={size} />
          <ColoredWord word={active[1]} size={size} />
        </div>
        <div style={{ fontSize: size, textAlign: 'center', marginTop: -2 }}>
          <ColoredWord word={active[2]} size={size} />
        </div>
      </div>
    );
  }
  // 4 words: 2+2 stacked
  return (
    <div style={baseStyle}>
      <div style={{ fontSize: size, display: 'flex', gap: size * 0.3, justifyContent: align === 'center' ? 'center' : 'flex-start' }}>
        <ColoredWord word={active[0]} size={size} />
        <ColoredWord word={active[1]} size={size} />
      </div>
      <div style={{ fontSize: size, display: 'flex', gap: size * 0.3, justifyContent: align === 'center' ? 'center' : 'flex-start', marginTop: -2 }}>
        <ColoredWord word={active[2]} size={size} />
        <ColoredWord word={active[3]} size={size} />
      </div>
    </div>
  );
}

/* Render label words with same layout rules as title */
function LabelWords({ words, size }) {
  const active = (words || []).filter(w => w.text && w.text.trim());
  if (active.length === 0) return null;
  const count = active.length;

  if (count <= 2) {
    return (
      <div style={{ display: 'flex', gap: size * 0.25, flexWrap: 'wrap' }}>
        {active.map((w, i) => <ColoredWord key={i} word={w} size={size} />)}
      </div>
    );
  }
  if (count === 3) {
    return (
      <div>
        <div style={{ display: 'flex', gap: size * 0.25 }}>
          <ColoredWord word={active[0]} size={size} />
          <ColoredWord word={active[1]} size={size} />
        </div>
        <div style={{ textAlign: 'center', marginTop: -2 }}>
          <ColoredWord word={active[2]} size={size} />
        </div>
      </div>
    );
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: size * 0.25 }}>
        <ColoredWord word={active[0]} size={size} />
        <ColoredWord word={active[1]} size={size} />
      </div>
      <div style={{ display: 'flex', gap: size * 0.25, marginTop: -2 }}>
        <ColoredWord word={active[2]} size={size} />
        <ColoredWord word={active[3]} size={size} />
      </div>
    </div>
  );
}

export function RankingCompilationComposition({ session: sessionProp, rankingManifest, musicTimeline }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const session = sessionProp || {};
  const manifest = normalizeRankingManifest(rankingManifest, fps, durationInFrames);
  const entry = rankingEntryAtFrame(manifest, frame);
  const rows = rankingActiveRows(manifest, frame);
  const gc = manifest.narrative?.global_controls || {};

  // Music
  const music = normalizeMusicTimeline(musicTimeline || session.music || {}, fps, durationInFrames);
  const musicUrl = music.audio_src ? staticFile(music.audio_src.replace(/^\.\/?/, '')) : null;
  const audioSegments = musicUrl ? buildAudioSegments({ ...music, audio_src: musicUrl }, fps, durationInFrames) : [];

  // Current clip (full-screen)
  const videoUrl = entry?.clip_file ? staticFile(entry.clip_file.replace(/^\.\/?/, '')) : null;

  // Scale applied to entire list
  const listScale = gc.list_scale || 1;
  const listX = gc.list_x_pct ?? 5;
  const listY = gc.list_y_pct ?? 25;
  const spacing = gc.list_spacing ?? 2;

  // Final rank shake effect
  const isFinalRevealed = rows.find(r => r.rank === 1 && r.revealed);
  const finalTimings = manifest.reveal_timings?.[1];
  const shakeLocal = isFinalRevealed && finalTimings ? frame - finalTimings.start_frame : -1;
  const shake = shakeLocal >= 0 && shakeLocal < 12 ? Math.sin(shakeLocal * 2.8) * 18 * Math.pow(1 - shakeLocal / 12, 1.7) : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: '#050505', overflow: 'hidden', fontFamily: manifest.narrative?.font_family || 'Arial Black, sans-serif' }}>
      {/* Music */}
      {musicUrl && audioSegments.map((segment, index) => (
        <Sequence key={`ranking_music_${index}`} from={segment.from} durationInFrames={segment.duration}>
          <Audio src={musicUrl} startFrom={segment.startFrom} volume={segment.volume} />
        </Sequence>
      ))}

      {/* Clip — FULL SCREEN */}
      <AbsoluteFill>
        {videoUrl ? (
          <Video
            src={videoUrl}
            startFrom={Math.max(0, frame - (finalTimings && isFinalRevealed ? finalTimings.start_frame : 0))}
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `translateY(${shake.toFixed(2)}px)`,
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff8866', fontSize: 42 }}>
            CLIP MANQUANT
          </div>
        )}
      </AbsoluteFill>

      {/* Title — PERSISTENT, word-by-word colored */}
      <TitleWords
        words={manifest.narrative?.title_words}
        size={gc.title_size || 42}
        xPct={gc.title_x_pct ?? 50}
        yPct={gc.title_y_pct ?? 5}
        align={gc.title_align || 'center'}
      />

      {/* Category subtitle */}
      {manifest.narrative?.category && (
        <div style={{
          position: 'absolute',
          left: `${gc.title_x_pct ?? 50}%`,
          top: `${(gc.title_y_pct ?? 5) + 7}%`,
          transform: 'translateX(-50%)',
          fontSize: (gc.title_size || 42) * 0.55,
          fontWeight: 700,
          color: '#aaa',
          textTransform: 'uppercase',
          textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          zIndex: 10,
        }}>
          {manifest.narrative.category}
        </div>
      )}

      {/* Rank list — BOTTOM-UP, all revealed ranks visible */}
      <div style={{
        position: 'absolute',
        left: `${listX}%`,
        bottom: `${100 - listY}%`,
        transform: `scale(${listScale})`,
        transformOrigin: 'left bottom',
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: `${spacing}px`,
        zIndex: 20,
        pointerEvents: 'none',
      }}>
        {rows.filter(r => r.revealed).map((row) => {
          const isRowFinal = row.rank === 1;
          const opacity = row.justAppeared ? Math.min(1, (frame - (manifest.reveal_timings?.[row.rank]?.start_frame || 0)) / 4) : 1;
          return (
            <div key={row.rank} style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: row.number_size * 0.2,
              opacity,
              transform: row.justAppeared ? `translateX(${Math.max(0, 30 - (frame - (manifest.reveal_timings?.[row.rank]?.start_frame || 0)) * 8)}px)` : 'none',
              transition: 'transform 0.15s ease-out',
            }}>
              {/* Number */}
              <span style={{
                fontSize: row.number_size || 42,
                fontWeight: 900,
                color: row.number_color || '#FF4444',
                textShadow: '0 2px 8px rgba(0,0,0,0.9)',
                minWidth: row.number_size * 0.7,
                textAlign: 'right',
              }}>
                {row.rank}.
              </span>
              {/* Label words */}
              <div style={{
                fontSize: row.label_size || 22,
                color: '#FFFFFF',
                textShadow: '0 2px 8px rgba(0,0,0,0.9)',
                ...(isRowFinal ? { filter: 'drop-shadow(0 0 12px rgba(255,212,0,0.5))' } : {}),
              }}>
                <LabelWords words={row.label_words} size={row.label_size || 22} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Dark overlay for final rank */}
      {isFinalRevealed && (
        <AbsoluteFill style={{
          background: `rgba(0,0,0,${Math.max(0, Math.min(0.9, shakeLocal < 12 ? 0.35 : 0.2))})`,
          pointerEvents: 'none',
        }} />
      )}
    </AbsoluteFill>
  );
}

export default RankingCompilationComposition;
