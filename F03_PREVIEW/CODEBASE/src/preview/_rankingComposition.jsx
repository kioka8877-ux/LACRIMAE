/* ═══════════════════════════════════════════════════════════════════
   RankingCompilationComposition v4 — list-overlay format
   
   - Numbers PERMANENT (always visible)
   - Labels appear bottom-to-top
   - Clip full-screen with optional audio
   - SFX per transition
   - No background music
   ═══════════════════════════════════════════════════════════════════ */
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Sequence, Audio, Video, staticFile } from 'remotion';
import { normalizeRankingManifest, rankingActiveRows, rankingEntryAtFrame } from './rankingCompilation';

function ColoredWord({ word, size, bold = true }) {
  if (!word || !word.text) return null;
  return (
    <span style={{ color: word.color || '#FFFFFF', fontSize: size, fontWeight: bold ? 900 : 700 }}>
      {word.text}
    </span>
  );
}

function TitleWords({ words, size, xPct, yPct, align = 'center' }) {
  const active = (words || []).filter(w => w.text && w.text.trim());
  if (active.length === 0) return null;
  const count = active.length;
  const baseStyle = {
    position: 'absolute', left: `${xPct}%`, top: `${yPct}%`,
    transform: 'translateX(-50%)', textAlign: align,
    fontWeight: 900, textTransform: 'uppercase',
    textShadow: '0 3px 12px rgba(0,0,0,0.9)', lineHeight: 1.1, zIndex: 10,
  };
  if (count <= 2) {
    return (
      <div style={{ ...baseStyle, fontSize: size, display: 'flex', gap: size * 0.3, justifyContent: 'center' }}>
        {active.map((w, i) => <ColoredWord key={i} word={w} size={size} />)}
      </div>
    );
  }
  if (count === 3) {
    return (
      <div style={baseStyle}>
        <div style={{ fontSize: size, display: 'flex', gap: size * 0.3, justifyContent: 'center' }}>
          <ColoredWord word={active[0]} size={size} /><ColoredWord word={active[1]} size={size} />
        </div>
        <div style={{ fontSize: size, textAlign: 'center', marginTop: -2 }}><ColoredWord word={active[2]} size={size} /></div>
      </div>
    );
  }
  return (
    <div style={baseStyle}>
      <div style={{ fontSize: size, display: 'flex', gap: size * 0.3, justifyContent: 'center' }}>
        <ColoredWord word={active[0]} size={size} /><ColoredWord word={active[1]} size={size} />
      </div>
      <div style={{ fontSize: size, display: 'flex', gap: size * 0.3, justifyContent: 'center', marginTop: -2 }}>
        <ColoredWord word={active[2]} size={size} /><ColoredWord word={active[3]} size={size} />
      </div>
    </div>
  );
}

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
          <ColoredWord word={active[0]} size={size} /><ColoredWord word={active[1]} size={size} />
        </div>
        <div style={{ textAlign: 'center', marginTop: -2 }}><ColoredWord word={active[2]} size={size} /></div>
      </div>
    );
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: size * 0.25 }}>
        <ColoredWord word={active[0]} size={size} /><ColoredWord word={active[1]} size={size} />
      </div>
      <div style={{ display: 'flex', gap: size * 0.25, marginTop: -2 }}>
        <ColoredWord word={active[2]} size={size} /><ColoredWord word={active[3]} size={size} />
      </div>
    </div>
  );
}

export function RankingCompilationComposition({ session: sessionProp, rankingManifest }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const session = sessionProp || {};
  const manifest = normalizeRankingManifest(rankingManifest, fps, durationInFrames);
  const entry = rankingEntryAtFrame(manifest, frame);
  const rows = rankingActiveRows(manifest, frame);
  const gc = manifest.narrative?.global_controls || {};

  const videoUrl = entry?.clip_file ? staticFile(entry.clip_file.replace(/^\.\/?/, '')) : null;
  const clipAudio = gc.clip_audio !== false;
  const numberScale = gc.number_scale || 1;
  const labelScale = gc.label_scale || 1;
  const titleScale = gc.title_scale || 1;
  const listX = gc.list_x_pct ?? 5;
  const listY = gc.list_y_pct ?? 25;
  const spacing = gc.list_spacing ?? 2;

  const isFinalRevealed = rows.find(r => r.rank === 1 && r.label_revealed);
  const finalTimings = manifest.reveal_timings?.[1];
  const shakeLocal = isFinalRevealed && finalTimings ? frame - finalTimings.start_frame : -1;
  const shake = shakeLocal >= 0 && shakeLocal < 12 ? Math.sin(shakeLocal * 2.8) * 18 * Math.pow(1 - shakeLocal / 12, 1.7) : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: '#050505', overflow: 'hidden', fontFamily: manifest.narrative?.font_family || 'Arial Black, sans-serif' }}>

      {/* SFX per transition — each rank plays its sfx when its label appears */}
      {manifest.entries?.map((row) => {
        if (!row.sfx?.enabled || !row.sfx.file) return null;
        const t = manifest.reveal_timings?.[row.rank];
        if (!t) return null;
        return (
          <Sequence key={`sfx_${row.rank}`} from={t.start_frame} durationInFrames={Math.max(1, durationInFrames - t.start_frame)}>
            <Audio src={staticFile(row.sfx.file.replace(/^\.\/?/, ''))} volume={row.sfx.volume ?? 0.8} />
          </Sequence>
        );
      })}

      {/* Clips — each in its own Sequence to limit duration */}
      {manifest.entries?.map((row) => {
        const t = manifest.reveal_timings?.[row.rank];
        if (!t) return null;
        const clipUrl = row.clip_file ? staticFile(row.clip_file.replace(/^\.\/?/, '')) : null;
        if (!clipUrl) return null;
        const clipFrames = Math.max(1, Math.round(row.duration_seconds * fps));
        const isActive = entry?.rank === row.rank;
        return (
          <Sequence key={`clip_${row.rank}`} from={t.start_frame} durationInFrames={clipFrames}>
            <AbsoluteFill>
              <Video src={clipUrl} muted={!clipAudio}
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: isActive ? `translateY(${shake.toFixed(2)}px)` : 'none' }} />
              {clipAudio && <Audio src={clipUrl} startFrom={0} volume={1} />}
            </AbsoluteFill>
          </Sequence>
        );
      })}
      {/* Fallback if no clips */}
      {!manifest.entries?.length && (
        <div style={{ width: '100%', height: '100%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff8866', fontSize: 42 }}>
          CLIP MANQUANT
        </div>
      )}

      {/* Title — PERSISTENT */}
      <TitleWords words={manifest.narrative?.title_words} size={(gc.title_size || 42) * titleScale} xPct={gc.title_x_pct ?? 50} yPct={gc.title_y_pct ?? 5} />

      {/* Category subtitle */}
      {manifest.narrative?.category && (
        <div style={{
          position: 'absolute', left: `${gc.title_x_pct ?? 50}%`, top: `${(gc.title_y_pct ?? 5) + 7}%`,
          transform: 'translateX(-50%)', fontSize: (gc.title_size || 42) * titleScale * 0.55, fontWeight: 700,
          color: '#aaa', textTransform: 'uppercase', textShadow: '0 2px 8px rgba(0,0,0,0.8)', zIndex: 10,
        }}>
          {manifest.narrative.category}
        </div>
      )}

      {/* Rank list — NUMBERS PERMANENT, LABELS bottom-to-top */}
      <div style={{
        position: 'absolute', left: `${listX}%`, bottom: `${100 - listY}%`,
        transformOrigin: 'left bottom',
        display: 'flex', flexDirection: 'column-reverse', gap: `${spacing}px`,
        zIndex: 20, pointerEvents: 'none',
      }}>
        {rows.map((row) => {
          const isRowFinal = row.rank === 1;
          const labelOpacity = row.label_revealed ? 1 : 0;
          const labelSlide = row.justAppeared ? Math.max(0, 20 - (frame - (manifest.reveal_timings?.[row.rank]?.start_frame || 0)) * 6) : 0;

          return (
            <div key={row.rank} style={{
              display: 'flex', alignItems: 'baseline', gap: 4,
              minHeight: (row.number_size || 42) * 1.1,
            }}>
              {/* Number — PERMANENT */}
              <span style={{
                fontSize: (row.number_size || 42) * numberScale,
                fontWeight: 900, color: row.number_color || '#FF4444',
                textShadow: '0 2px 8px rgba(0,0,0,0.9)',
                minWidth: (row.number_size || 42) * numberScale * 0.6,
                textAlign: 'right',
              }}>
                {row.rank}.
              </span>

              {/* Label — appears bottom-to-top */}
              <div style={{
                opacity: labelOpacity,
                transform: `translateX(${labelSlide}px)`,
                transition: 'opacity 0.15s ease-out, transform 0.15s ease-out',
                fontSize: (row.label_size || 22) * labelScale,
                color: '#FFFFFF',
                textShadow: '0 2px 8px rgba(0,0,0,0.9)',
                ...(isRowFinal ? { filter: 'drop-shadow(0 0 12px rgba(255,212,0,0.5))' } : {}),
              }}>
                <LabelWords words={row.label_words} size={(row.label_size || 22) * labelScale} />
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
