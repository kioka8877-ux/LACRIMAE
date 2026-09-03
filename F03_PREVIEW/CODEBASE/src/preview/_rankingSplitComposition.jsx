/* ═══════════════════════════════════════════════════════════════════
   RankingSplitComposition v1 — PUR mode split layout
   
   Layout split : ranking clips + labels en haut, élément variable en bas
   - Haut : clips ranking (comme dev9) + labels + numbers
   - Bas : image / GIF / vidéo qui change à chaque numéro de rang (B-roll)
   - Titre hook en haut de la zone haute
   - Si B-roll = vidéo : couvre toute la zone sauf le titre
   ═══════════════════════════════════════════════════════════════════ */
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Sequence, Audio, Video, Img, staticFile } from 'remotion';
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
    textShadow: '0 3px 12px rgba(0,0,0,0.9)', lineHeight: 1.1, zIndex: 30,
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

/**
 * B-roll renderer — renders image, GIF, or video in the bottom zone.
 * If B-roll is a video, it covers the full split area except the title.
 */
function BrollRenderer({ broll, rank, isActive }) {
  if (!broll) return null;
  const src = broll.file || broll.src || '';
  if (!src) return null;

  const isVideo = src.endsWith('.mp4') || src.endsWith('.webm') || src.endsWith('.mov');
  const isGif = src.endsWith('.gif');
  const isImage = !isVideo && !isGif;

  const baseStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    ...(isActive && isVideo ? {} : {}),
  };

  if (isVideo) {
    return (
      <Video
        src={staticFile(src.replace(/^\.?\//, ''))}
        style={baseStyle}
        muted={!broll.audio}
        loop={broll.loop !== false}
      />
    );
  }
  if (isGif || isImage) {
    return (
      <Img
        src={staticFile(src.replace(/^\.?\//, ''))}
        style={baseStyle}
      />
    );
  }
  return null;
}

export function RankingSplitComposition({ session: sessionProp, rankingManifest }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const session = sessionProp || {};
  const manifest = normalizeRankingManifest(rankingManifest, fps, durationInFrames);
  const entry = rankingEntryAtFrame(manifest, frame);
  const rows = rankingActiveRows(manifest, frame);
  const gc = manifest.narrative?.global_controls || {};

  const videoUrl = entry?.clip_file ? staticFile(entry.clip_file.replace(/^\.?\//, '')) : null;
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

  // Split layout: 55% top (ranking clips), 45% bottom (broll element)
  const TOP_HEIGHT = '55%';
  const BOTTOM_HEIGHT = '45%';

  // Current active broll for the current rank
  const activeBroll = entry?.broll || null;
  const brollIsVideo = activeBroll?.file && (activeBroll.file.endsWith('.mp4') || activeBroll.file.endsWith('.webm'));

  return (
    <AbsoluteFill style={{ backgroundColor: '#050505', overflow: 'hidden', fontFamily: manifest.narrative?.font_family || 'Arial Black, sans-serif' }}>

      {/* SFX per transition */}
      {manifest.entries?.map((row) => {
        if (!row.sfx?.enabled || !row.sfx.file) return null;
        const t = manifest.reveal_timings?.[row.rank];
        if (!t) return null;
        return (
          <Sequence key={`sfx_${row.rank}`} from={t.start_frame} durationInFrames={Math.max(1, durationInFrames - t.start_frame)}>
            <Audio src={staticFile(row.sfx.file.replace(/^\.?\//, ''))} volume={row.sfx.volume ?? 0.8} />
          </Sequence>
        );
      })}

      {/* ═══ ZONE HAUTE : Clips ranking (55%) ═══ */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: TOP_HEIGHT, overflow: 'hidden' }}>
        {/* Clips — each in its own Sequence */}
        {manifest.entries?.map((row) => {
          const t = manifest.reveal_timings?.[row.rank];
          if (!t) return null;
          const clipUrl = row.clip_file ? staticFile(row.clip_file.replace(/^\.?\//, '')) : null;
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

        {/* Title — PERSISTENT (top of zone haute) */}
        <TitleWords words={manifest.narrative?.title_words} size={(gc.title_size || 42) * titleScale} xPct={gc.title_x_pct ?? 50} yPct={gc.title_y_pct ?? 5} />

        {/* Category subtitle */}
        {manifest.narrative?.category && (
          <div style={{
            position: 'absolute', left: `${gc.title_x_pct ?? 50}%`, top: `${(gc.title_y_pct ?? 5) + 7}%`,
            transform: 'translateX(-50%)', fontSize: (gc.title_size || 42) * titleScale * 0.55, fontWeight: 700,
            color: '#aaa', textTransform: 'uppercase', textShadow: '0 2px 8px rgba(0,0,0,0.8)', zIndex: 30,
          }}>
            {manifest.narrative.category}
          </div>
        )}

        {/* Rank list — NUMBERS PERMANENT, LABELS bottom-to-top */}
        <div style={{
          position: 'absolute', left: `${listX}%`, bottom: `${100 - listY}%`,
          transformOrigin: 'left bottom',
          display: 'flex', flexDirection: 'column-reverse', gap: `${spacing}px`,
          zIndex: 35, pointerEvents: 'none',
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
      </div>

      {/* ═══ ZONE BASSE : Élément variable B-roll (45%) ═══ */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: BOTTOM_HEIGHT, overflow: 'hidden', background: '#0a0a0a' }}>
        {activeBroll ? (
          <BrollRenderer broll={activeBroll} rank={entry?.rank} isActive={true} />
        ) : (
          /* Default: solid dark with rank indicator */
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(180deg, #111 0%, #0a0a0a 100%)',
          }}>
            <span style={{
              fontSize: 72, fontWeight: 900, color: entry?.rank === 1 ? '#FFD400' : '#FF4444',
              textShadow: '0 4px 20px rgba(0,0,0,0.8)',
            }}>
              #{entry?.rank || '?'}
            </span>
          </div>
        )}
      </div>

      {/* Separator line between zones */}
      <div style={{
        position: 'absolute', top: TOP_HEIGHT, left: '5%', width: '90%',
        height: 2, background: 'rgba(255,255,255,0.15)',
        zIndex: 40,
      }} />
    </AbsoluteFill>
  );
}

export default RankingSplitComposition;
