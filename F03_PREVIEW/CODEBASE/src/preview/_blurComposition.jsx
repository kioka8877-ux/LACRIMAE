/* ═══════════════════════════════════════════════════════════════════
   BlurComposition v1 — Mode Blur PUR (PERTURABO)
   
   Layout : 2 couches superposées
     - Fond : clip zoomé 2.25x + blur 30px + brightness réduit
     - Dessus : clip original centré (contain/cover)
     + Titre hook (BloomText) en haut
     + Captions word-by-word en bas
     + Anti-detection : breathing zoom, mirror, speed
   
   Source : PERTURABO ARCHIVUM/montage/patterns/style_blur.json
   ═══════════════════════════════════════════════════════════════════ */
import React, { useMemo } from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, Video, Audio } from 'remotion';
import { darkLuxuryNoirFilter, darkLuxuryNoirOverlayStyle } from './darkLuxuryNoir';
import { sciFiNeonHdrFilter, sciFiNeonHdrOverlayStyle } from './sciFiNeonHdr';
import { BLUR_DEFAULTS } from './blurMode';
import { antiDetectionTransform, antiDetectionSpeed } from './antiDetection';

/* ─── Hook renderer (3 premières secondes) ─── */
function HookOverlay({ title, globalControls, fps, frame }) {
  if (!title?.words?.length) return null;
  const hookFrames = Math.min(fps * 3, 90);
  const titlePos = globalControls?.title_position || 'top';
  return (
    <Sequence from={0} durationInFrames={hookFrames}>
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: titlePos === 'top' ? 'flex-start' : 'flex-end',
          padding: '12% 6% 6%',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 6, justifyContent: 'center' }}>
          {(title.words || []).map((word, i) => (
            <span
              key={`hook_${i}`}
              style={{
                color: word.color || '#fff',
                fontSize: `${(title.scale || 72)}px`,
                fontWeight: 900,
                textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                whiteSpace: 'nowrap',
              }}
            >
              {word.text}
            </span>
          ))}
        </div>
      </AbsoluteFill>
    </Sequence>
  );
}

/* ─── Captions renderer (word-by-word, bas de vidéo) ─── */
function CaptionsOverlay({ captions, fps, startFrame = 0 }) {
  if (!captions?.words?.length) return null;
  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        padding: '0 6% 14%',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', maxWidth: '90%' }}>
        {(captions.words || []).map((word, i) => (
          <span
            key={`cap_${i}`}
            style={{
              color: word.color || '#fff',
              fontSize: `${(captions.scale || 36)}px`,
              fontWeight: 700,
              textShadow: '0 1px 6px rgba(0,0,0,0.7)',
              whiteSpace: 'nowrap',
            }}
          >
            {word.text}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
}

/* ─── Main Composition ─── */
export function BlurComposition({ session, codex }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  const sessionProp = session || {};
  const blurCfg = sessionProp.blur || codex?.blur || {};
  const presets = sessionProp.presets || {};
  const narrative = sessionProp.narrative || codex?.narrative || {};
  const globalControls = narrative.global_controls || {};
  const antiCfg = sessionProp.anti_detection || codex?.anti_detection || {};

  // Source video
  const sourceUrl = sessionProp.source_url || codex?.source_url;
  const localFrame = Math.max(0, frame);

  // Blur params
  const bgZoom = Number(blurCfg.bg_zoom ?? BLUR_DEFAULTS.bg_zoom);
  const bgBlur = Number(blurCfg.bg_blur_px ?? BLUR_DEFAULTS.bg_blur_px);
  const bgBright = Number(blurCfg.bg_brightness ?? BLUR_DEFAULTS.bg_brightness);
  const fgFit = blurCfg.fg_fit || BLUR_DEFAULTS.fg_fit;
  const fgScale = Number(blurCfg.fg_scale ?? BLUR_DEFAULTS.fg_scale);

  // Anti-detection
  const antiTransform = antiDetectionTransform(antiCfg, frame, fps);
  const playbackRate = antiDetectionSpeed(antiCfg);

  // Filtres
  const baseFilter = presets.color_css_filter || '';
  const darkLuxury = presets.dark_luxury_noir || {};
  const dlFilter = darkLuxury.enabled ? darkLuxuryNoirFilter(darkLuxury.intensity) : '';
  const dlOverlay = darkLuxury.enabled ? darkLuxuryNoirOverlayStyle(darkLuxury.intensity) : null;
  const sciFi = presets.scifi_neon_hdr || {};
  const sfFilter = sciFi.enabled ? sciFiNeonHdrFilter(sciFi.intensity) : '';
  const sfOverlay = sciFi.enabled ? sciFiNeonHdrOverlayStyle(sciFi.intensity) : null;
  const fullFilter = `${baseFilter} ${dlFilter} ${sfFilter}`.trim();

  // Titre hook
  const title = narrative.title || {};
  const titleWords = title.words || [];

  // Captions
  const captions = narrative.captions || {};

  // Background color
  const bgColor = sessionProp.background?.color || '#0a0a0a';

  // Zoom global (comme les autres compositions)
  const zoomConfig = sessionProp.zoom || {};
  const zoomScale = Number(zoomConfig.scale ?? 1);
  const zoomX = Number(zoomConfig.x ?? 0);
  const zoomY = Number(zoomConfig.y ?? 0);
  const globalTransform = `scale(${zoomScale}) translate(${zoomX}%, ${zoomY}%)`;

  // Build combined transform
  const layerTransform = [globalTransform, antiTransform].filter(Boolean).join(' ');

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      {/* Anti-detection wrapper (breathing zoom sur tout) */}
      <AbsoluteFill
        style={{
          transform: layerTransform || undefined,
          transformOrigin: 'center center',
          filter: fullFilter || undefined,
        }}
      >
        {/* COUCHE FOND : clip zoomé + blur */}
        {sourceUrl && (
          <AbsoluteFill>
            <Video
              src={sourceUrl}
              startFrom={localFrame}
              muted
              playbackRate={playbackRate}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: `scale(${bgZoom})`,
                transformOrigin: 'center center',
                filter: `blur(${bgBlur}px) brightness(${bgBright})`,
              }}
            />
          </AbsoluteFill>
        )}

        {/* COUCHE DESSUS : clip centré, net */}
        {sourceUrl && (
          <AbsoluteFill style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Video
              src={sourceUrl}
              startFrom={localFrame}
              muted
              playbackRate={playbackRate}
              style={{
                width: '100%',
                height: '100%',
                objectFit: fgFit,
                transform: `scale(${fgScale})`,
                transformOrigin: 'center center',
                pointerEvents: 'none',
              }}
            />
          </AbsoluteFill>
        )}

        {/* Fallback si pas de source */}
        {!sourceUrl && (
          <AbsoluteFill
            style={{
              backgroundColor: '#111',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              color: '#555',
              fontSize: 28,
              fontFamily: 'monospace',
            }}
          >
            Aucune source vidéo
          </AbsoluteFill>
        )}
      </AbsoluteFill>

      {/* TITRE HOOK (3 premières secondes) */}
      {titleWords.length > 0 && (
        <HookOverlay
          title={title}
          globalControls={globalControls}
          fps={fps}
          frame={frame}
        />
      )}

      {/* CAPTIONS (en bas) */}
      {captions.words?.length > 0 && (
        <CaptionsOverlay captions={captions} fps={fps} startFrame={0} />
      )}

      {/* Overlays filtres */}
      {dlOverlay && <AbsoluteFill style={dlOverlay} />}
      {sfOverlay && <AbsoluteFill style={sfOverlay} />}

      {/* Audio clip (si présent) */}
      {sessionProp.clip_audio_url && (
        <Audio src={sessionProp.clip_audio_url} volume={sessionProp.clip_audio_volume ?? 1} />
      )}
    </AbsoluteFill>
  );
}

export default BlurComposition;
