import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  OffthreadVideo,
  Sequence,
  staticFile,
} from 'remotion';

/* ═══════════════════════════════════════════════════════════════════════════
 * OmniComposition (F03 PREVIEW) — mêmes 6 calques que F04 RENDER :
 *   L1 BACKGROUND → L2 CLIP → L3 TITRE → L4 PARAGRAPHE → L5 LOGO → L6 PRESETS
 * Props: codex (clip), videoSrc, session (bloc session v4)
 * ═══════════════════════════════════════════════════════════════════════════ */

const SESSION_FALLBACK = {
  background: { image: null, color: '#0a0a0a', scale: 1.0 },
  logo: { src: 'logo.png', width_pct: 20, position: 'bottom_left', opacity: 1.0 },
  texts_style: {
    font: 'Impact, Arial Black, sans-serif',
    size_title: 96,
    size_paragraph: 44,
    color: '#FFFFFF',
    stroke_color: '#000000',
    stroke_width: 4,
    shadow: '2px 4px 8px rgba(0,0,0,0.9)',
    glow_intensity: 0,
    letter_spacing: '0em',
  },
  presets: {
    color_preset: 'punchy',
    color_css_filter: 'contrast(1.3) saturate(1.5) brightness(1.1)',
    enhance_4k: false,
    sharpening: 0,
    denoising: 0,
    vignette: 0.25,
    grain_intensity: 0.15,
  },
};

export const OmniComposition = ({ codex, videoSrc, session: sessionProp }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  const clip = codex || {};
  const session = sessionProp || clip.session || SESSION_FALLBACK;
  const presets = { ...SESSION_FALLBACK.presets, ...(session.presets || {}) };
  const textsStyle = { ...SESSION_FALLBACK.texts_style, ...(session.texts_style || {}) };

  const src = videoSrc || (clip.video?.source ? './' + clip.video.source : './clip_001.mp4');
  const videoUrl = src.startsWith('./') ? staticFile(src.replace('./', '')) : src;

  if (!clip || !clip.video) {
    return (
      <AbsoluteFill style={{ backgroundColor: '#ff4400', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ color: 'white', fontSize: 64, fontWeight: 'bold' }}>CODEX MANQUANT</div>
      </AbsoluteFill>
    );
  }

  // ── Zoom / slow-mo / shake / coup brutal ──
  const currentZoom = getCurrentZoom(frame, clip.zoom_keyframes || []);
  const colorFilter = presets.color_css_filter || '';
  const enhanceFilter = presets.enhance_4k
    ? ' contrast(1.15) saturate(1.2) brightness(1.08)'
    : '';
  const sharpening = presets.sharpening || 0;
  let sharpFilter = '';
  if (sharpening > 0) {
    const s = sharpening / 100;
    sharpFilter = ` contrast(${1 + s * 0.15}) drop-shadow(0 0 ${s * 0.5}px rgba(255,255,255,${s * 0.15}))`;
  }
  const fullFilter = (colorFilter + enhanceFilter + sharpFilter).trim();

  const slowmoStart = clip.slowmo_start_frame || 0;
  const slowmoSpeed = clip.slowmo_speed || 1.0;
  const isSlowmo = frame >= slowmoStart && slowmoSpeed < 1.0;
  const playbackRate = isSlowmo ? slowmoSpeed : 1.0;

  const shakePower = clip.shake_power || 0;
  const shakeFrame = slowmoStart;
  const shakeDuration = 20;
  const isShaking = shakePower > 0 && frame >= shakeFrame && frame < shakeFrame + shakeDuration;
  let shakeX = 0, shakeY = 0;
  if (isShaking) {
    const shakeProgress = (frame - shakeFrame) / shakeDuration;
    const decay = Math.pow(1 - shakeProgress, 2);
    const amp = (shakePower / 100) * decay * 20;
    shakeY = Math.sin((frame - shakeFrame) * 0.8) * amp;
  }

  const brutalInterval = clip.brutal_cut_interval_frames || 0;
  const frameInBrutal = brutalInterval > 0 ? frame % brutalInterval : 999;
  const isBrutalCut = brutalInterval > 0 && frameInBrutal < 5;
  const brutalFlash = isBrutalCut ? 0.45 * (1 - frameInBrutal / 5) : 0;
  const brutalScale = isBrutalCut ? 1.04 : 1;

  const zoomTransform = `scale(${currentZoom.scale * brutalScale}) translate(${
    (0.5 - currentZoom.target_x) * 100
  }%, ${(0.5 - currentZoom.target_y) * 100}%)`;

  const texts = clip.texts || {};
  const textMode = texts.mode || (texts.title ? 'title' : 'none');

  return (
    <AbsoluteFill style={{ backgroundColor: session.background?.color || '#000' }}>
      {/* Audio */}
      {clip.audio_enabled !== false && (
        <Audio src={videoUrl} volume={clip.volume ?? 1} />
      )}

      {/* CALQUE 6 wrapper : presets globaux sur toute la scène */}
      <AbsoluteFill style={{ filter: fullFilter || undefined }}>
        {/* L1 BACKGROUND */}
        {session.background?.image ? (
          <AbsoluteFill style={{ overflow: 'hidden' }}>
            <Img
              src={staticFile(session.background.image)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: `scale(${session.background.scale ?? 1})`,
                transformOrigin: 'center center',
              }}
            />
          </AbsoluteFill>
        ) : (
          <AbsoluteFill style={{ backgroundColor: session.background?.color || '#0a0a0a' }} />
        )}

        {/* L2 CLIP VIDÉO */}
        <AbsoluteFill>
          <OffthreadVideo
            src={videoUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `${zoomTransform} translate(${shakeX}px, ${shakeY}px)`,
            }}
            playbackRate={playbackRate}
          />
        </AbsoluteFill>

        {/* L3 TITRE */}
        {(textMode === 'title' || textMode === 'title+paragraph') && texts.title ? (
          <TitleBlock
            content={texts.title}
            style={textsStyle}
            offsetPct={texts.title_offset_pct ?? 8}
          />
        ) : null}

        {/* L4 PARAGRAPHE */}
        {textMode === 'title+paragraph' && texts.paragraph ? (
          <ParagraphBlock
            content={texts.paragraph}
            style={textsStyle}
            offsetPct={texts.paragraph_offset_pct ?? 8}
          />
        ) : null}

        {/* L5 LOGO */}
        <LogoOverlay logo={clip.logo || session.logo} width={width} />

        {/* Badge SLOW MOTION */}
        {isSlowmo && (
          <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'flex-end', padding: 40 }}>
            <div style={{
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: '#FF4444',
              fontSize: 32,
              fontWeight: 'bold',
              padding: '8px 20px',
              borderRadius: 8,
              letterSpacing: '0.1em',
            }}>
              SLOW MOTION
            </div>
          </AbsoluteFill>
        )}

        {/* Text overlays rétro-compat */}
        {(clip.text_overlays || []).map((overlay, index) => {
          const startFrame = overlay.start_frame || 0;
          const endFrame = overlay.end_frame || durationInFrames;
          if (frame < startFrame || frame > endFrame) return null;
          return (
            <Sequence key={overlay.id || index} from={startFrame} durationInFrames={endFrame - startFrame + 1}>
              <TextOverlay overlay={overlay} frame={frame - startFrame} fps={fps} />
            </Sequence>
          );
        })}

        {/* Flash coup brutal */}
        {brutalFlash > 0 && (
          <AbsoluteFill style={{ backgroundColor: '#fff', opacity: brutalFlash, pointerEvents: 'none' }} />
        )}
      </AbsoluteFill>

      {/* Finitions : grain + vignette au-dessus de tout */}
      {(presets.grain_intensity || 0) > 0 && (
        <AbsoluteFill style={{ opacity: presets.grain_intensity, pointerEvents: 'none', mixBlendMode: 'overlay' }}>
          <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
            <filter id="grainFilter">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
              <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#grainFilter)" />
          </svg>
        </AbsoluteFill>
      )}
      {(presets.vignette || 0) > 0 && (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${presets.vignette}) 100%)`,
            pointerEvents: 'none',
          }}
        />
      )}
    </AbsoluteFill>
  );
};

/* ── L3 TITRE ── */
const TitleBlock = ({ content, style, offsetPct }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: `${offsetPct}%`,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          fontFamily: style.font,
          fontSize: `${style.size_title}px`,
          color: style.color,
          WebkitTextStroke: `${style.stroke_width}px ${style.stroke_color}`,
          textShadow: style.shadow,
          letterSpacing: style.letter_spacing,
          fontWeight: 900,
          textTransform: 'uppercase',
          lineHeight: 1.1,
          textAlign: 'center',
          opacity,
          maxWidth: '88%',
          wordWrap: 'break-word',
        }}
      >
        {content}
      </div>
    </AbsoluteFill>
  );
};

/* ── L4 PARAGRAPHE ── */
const ParagraphBlock = ({ content, style, offsetPct }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: `${offsetPct}%`,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          fontFamily: style.font,
          fontSize: `${style.size_paragraph}px`,
          color: style.color,
          WebkitTextStroke: `${Math.max(1, style.stroke_width - 1)}px ${style.stroke_color}`,
          textShadow: style.shadow,
          letterSpacing: style.letter_spacing,
          fontWeight: 700,
          lineHeight: 1.25,
          textAlign: 'center',
          opacity,
          maxWidth: '88%',
          maxHeight: '22%',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical',
          wordWrap: 'break-word',
        }}
      >
        {content}
      </div>
    </AbsoluteFill>
  );
};

/* ── L5 LOGO ── */
const LogoOverlay = ({ logo, width }) => {
  if (!logo || !logo.src) return null;
  const logoWidth = Math.round(width * ((logo.width_pct || 20) / 100));
  const pos = getLogoPosition(logo.position || 'bottom_left');
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', ...pos, opacity: logo.opacity ?? 1 }}>
        <Img src={staticFile(logo.src)} style={{ width: logoWidth, height: 'auto' }} />
      </div>
    </AbsoluteFill>
  );
};

function getLogoPosition(position) {
  const pad = 40;
  switch (position) {
    case 'top_center':
      return { top: pad, left: '50%', transform: 'translateX(-50%)' };
    case 'top_right':
      return { top: pad, right: pad };
    case 'bottom_center':
      return { bottom: pad, left: '50%', transform: 'translateX(-50%)' };
    case 'bottom_right':
      return { bottom: pad, right: pad };
    case 'top_left':
      return { top: pad, left: pad };
    case 'bottom_left':
    default:
      return { bottom: pad, left: pad };
  }
}

/* ── TextOverlay rétro-compat v3 ── */
const TextOverlay = ({ overlay, frame, fps }) => {
  const {
    content,
    animation = 'word_by_word',
    font = 'Impact, Arial Black, sans-serif',
    size = 96,
    color = '#FFFFFF',
    stroke_color = '#000000',
    stroke_width = 4,
    shadow = '2px 4px 8px rgba(0,0,0,0.9)',
    position = 'center',
    letter_spacing = '0em',
    glow_intensity = 0,
    start_frame = 0,
  } = overlay;

  const words = content.split(' ');
  const totalDuration = (overlay.end_frame || 300) - start_frame;
  const wordFadeFrames = 8;
  let wordsPerFrame = 0;
  if (animation === 'word_by_word') {
    const revealDuration = Math.max(totalDuration * 0.6, words.length * 8);
    wordsPerFrame = revealDuration / words.length;
  }

  const glowLayers = [];
  if (glow_intensity > 0) {
    const layers = Math.round((glow_intensity / 100) * 4);
    const glowSizes = [3, 6, 12, 20];
    for (let i = 0; i < layers; i++) glowLayers.push(`0 0 ${glowSizes[i]}px ${color}`);
    glowLayers.push(shadow);
  } else {
    glowLayers.push(shadow);
  }
  const textShadowStr = glowLayers.join(', ');
  const strokeStr = stroke_width > 0 ? `${stroke_width}px ${stroke_color}` : '0px transparent';

  const baseTextStyle = {
    fontFamily: font,
    fontSize: `${size}px`,
    color,
    WebkitTextStroke: strokeStr,
    textShadow: textShadowStr,
    letterSpacing,
    fontWeight: 900,
    textTransform: 'uppercase',
    lineHeight: 1.1,
    textAlign: 'center',
    pointerEvents: 'none',
    display: 'inline',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    maxWidth: '85%',
  };

  const positionStyle = getPositionStyle(position);

  let blockOpacity = 1;
  let blockScale = 1;
  if (animation === 'pop') {
    blockOpacity = interpolate(frame, [0, 6], [0, 1], { extrapolateRight: 'clamp' });
    blockScale = interpolate(frame, [0, 6], [0.8, 1], { extrapolateRight: 'clamp' });
  } else if (animation === 'fade_in') {
    blockOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  } else if (animation === 'fade_in_slow') {
    blockOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
  }

  if (animation === 'word_by_word') {
    return (
      <div style={positionStyle}>
        <div style={{ ...baseTextStyle, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
          {words.map((word, i) => {
            const wordLocalFrame = frame - i * wordsPerFrame;
            const wordOpacity = interpolate(wordLocalFrame, [0, wordFadeFrames], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            });
            const wordScale = interpolate(wordLocalFrame, [0, wordFadeFrames], [0.92, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            });
            return (
              <span key={i} style={{ opacity: wordOpacity, transform: `scale(${wordScale})`, display: 'inline-block', transition: 'none' }}>
                {word}
                {i < words.length - 1 ? '\u00A0' : ''}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={positionStyle}>
      <div style={{ ...baseTextStyle, opacity: blockOpacity, transform: `scale(${blockScale})` }}>
        {content}
      </div>
    </div>
  );
};

function getPositionStyle(position) {
  switch (position) {
    case 'center':
      return { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '90%' };
    case 'top':
      return { position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '90%' };
    case 'center_bottom':
      return { position: 'absolute', bottom: '15%', left: '50%', transform: 'translateX(-50%)', width: '90%' };
    case 'bottom':
      return { position: 'absolute', bottom: '8%', left: '50%', transform: 'translateX(-50%)', width: '90%' };
    case 'center_left':
      return { position: 'absolute', top: '45%', left: '10%', width: '80%' };
    default:
      return { position: 'absolute', bottom: '15%', left: '50%', transform: 'translateX(-50%)', width: '90%' };
  }
}

function getCurrentZoom(frame, keyframes) {
  if (!keyframes || keyframes.length === 0) {
    return { scale: 1.0, target_x: 0.5, target_y: 0.5 };
  }
  if (frame <= keyframes[0].frame) {
    return { scale: keyframes[0].scale, target_x: keyframes[0].target_x, target_y: keyframes[0].target_y };
  }
  if (frame >= keyframes[keyframes.length - 1].frame) {
    const last = keyframes[keyframes.length - 1];
    return { scale: last.scale, target_x: last.target_x, target_y: last.target_y };
  }
  for (let i = 0; i < keyframes.length - 1; i++) {
    const k1 = keyframes[i];
    const k2 = keyframes[i + 1];
    if (frame >= k1.frame && frame <= k2.frame) {
      const t = (frame - k1.frame) / (k2.frame - k1.frame);
      const easedT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      return {
        scale: k1.scale + (k2.scale - k1.scale) * easedT,
        target_x: k1.target_x + (k2.target_x - k1.target_x) * easedT,
        target_y: k1.target_y + (k2.target_y - k1.target_y) * easedT,
      };
    }
  }
  return { scale: 1.0, target_x: 0.5, target_y: 0.5 };
}
