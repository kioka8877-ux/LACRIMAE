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
import { codex as codexData } from '../codexData';
import { loadFont } from '@remotion/google-fonts/Anton';

const { fontFamily: antonFont } = loadFont();

/* ═══════════════════════════════════════════════════════════════════════════
 * OmniComposition — Composition principale LACRIMAE (dev) — v2 calques
 *
 * Stack des 6 calques (z-order, du plus bas au plus haut) :
 *   L1 BACKGROUND  — fond PNG (fourni par l'opérateur) OU couleur unie,
 *                    façon CRUSADER (cover + scale + fallback couleur)
 *   L2 CLIP VIDÉO  — clip coupé, au centre, zoom/slow-mo/shake
 *   L3 TITRE       — en haut
 *   L4 PARAGRAPHE  — en bas (4 lignes max)
 *   L5 LOGO        — image transparente (campagne), en bas du cadre
 *   L6 PRESETS     — calque d'ambiance GLOBAL : colorimétrie + enhance 4K +
 *                    sharpening appliqués à TOUTE la scène, grain + vignette
 *                    par-dessus.
 *
 * Codex v4.0 : bloc `session` (style global des N clips) + `clips[]`.
 * Props:
 *   codex:   object — le clip en cours (ou le codex entier si clips absent)
 *   session: object — le bloc session global (optionnel, fallback codex.session)
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
    contrast: 1.3,
    brightness: 1.1,
    enhance_4k: false,
    sharpening: 0,
    denoising: 0,
    vignette: 0.25,
    grain_intensity: 0.15,
  },
};

export const OmniComposition = ({ codex: codexProp, session: sessionProp }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  // Codex : clip passé en props, ou codex importé (fallback)
  const clip = codexProp || (codexData.clips?.[0] || codexData);

  // Session : props (préférence) → codex.session → défauts
  const session = sessionProp || clip.session || codexData.session || SESSION_FALLBACK;
  const presets = { ...SESSION_FALLBACK.presets, ...(session.presets || {}) };
  const textsStyle = { ...SESSION_FALLBACK.texts_style, ...(session.texts_style || {}) };

  // Video source
  const videoSrc = staticFile(clip.video?.source || 'clip_001.mp4');

  if (!clip) {
    return (
      <AbsoluteFill style={{ backgroundColor: '#ff4400', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ color: 'white', fontSize: 64, fontWeight: 'bold' }}>CODEX MANQUANT</div>
      </AbsoluteFill>
    );
  }

  // ── Zoom / slow-mo / shake / coup brutal (calculés, logique inchangée) ──
  const currentZoom = getCurrentZoom(frame, clip.zoom_keyframes || []);
  // Le slider Contraste (session) pilote le contrast() du filtre global.
  const contrastValue = presets.contrast ?? 1.3;
  const baseFilter = presets.color_css_filter || '';
  const colorFilter = baseFilter.includes('contrast')
    ? baseFilter.replace(/contrast\([^)]*\)/g, `contrast(${contrastValue})`)
    : `contrast(${contrastValue}) ${baseFilter}`.trim();
  // Le slider Luminosité (session) pilote le brightness() du filtre global.
  const brightnessValue = presets.brightness ?? 1.1;
  const brightnessFilter = colorFilter.includes('brightness')
    ? colorFilter.replace(/brightness\([^)]*\)/g, `brightness(${brightnessValue})`)
    : `${colorFilter} brightness(${brightnessValue})`.trim();
  const enhanceFilter = presets.enhance_4k
    ? ' contrast(1.15) saturate(1.2) brightness(1.08)'
    : '';
  const sharpening = presets.sharpening || 0;
  let sharpFilter = '';
  if (sharpening > 0) {
    const s = sharpening / 100;
    sharpFilter = ` contrast(${1 + s * 0.15}) drop-shadow(0 0 ${s * 0.5}px rgba(255,255,255,${s * 0.15}))`;
  }
  // CALQUE 6 : le filtre global s'applique à la SCÈNE ENTIÈRE (plus seulement la vidéo)
  const fullFilter = (brightnessFilter + enhanceFilter + sharpFilter).trim();

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

  // ── Textes : mode titre / titre+paragraphe (L3 + L4) ──
  const texts = clip.texts || {};
  const textMode = texts.mode || (texts.title ? 'title' : 'none');

  // ═══ F04b SIGNE : signature anti-doublon par clip (déterministe) ═══
  const sig = clip.sig || {};
  const grainIntensity = sig.grain?.intensity ?? presets.grain_intensity ?? 0;
  const grainSeed = sig.grain?.seed ?? 0;
  const grainId = 'grain-' + (clip.id || 'clip').replace(/_/g, '-');

  // Mouvement unique du fond PNG (L1) — caméra fixe, seul le fond dérive
  const bgBaseScale = sig.bg_motion?.base_scale ?? 1.0;
  const bgScale = (session.background?.scale ?? 1) * bgBaseScale;
  const bgProgress = frame / Math.max(1, durationInFrames);
  const bgAmpX = sig.bg_motion?.amp_x ?? 0;
  const bgAmpY = sig.bg_motion?.amp_y ?? 0;
  const bgFreq = sig.bg_motion?.freq ?? 0;
  const bgPhase = sig.bg_motion?.phase ?? 0;
  const bgDriftX = sig.bg_motion?.drift_x ?? 0;
  const bgDriftY = sig.bg_motion?.drift_y ?? 0;
  const bgX = Math.sin(bgProgress * Math.PI * 2 * bgFreq + bgPhase) * bgAmpX
    + bgDriftX * bgProgress;
  const bgY = Math.cos(bgProgress * Math.PI * 2 * bgFreq + bgPhase) * bgAmpY
    + bgDriftY * bgProgress;

  // Miroir (L2) : flip horizontal de la VIDÉO uniquement — texte jamais flippé
  const mirrorFactor = sig.mirror ? '-1' : '1';

  // Micro dérive caméra (L2) : zoom lent + léger pan, à peine perceptible
  const cam = sig.cam_drift || {};
  const camZoom = interpolate(frame, [0, durationInFrames],
    [cam.zoom_from ?? 1, cam.zoom_to ?? 1], { extrapolateRight: 'clamp' });
  const camProgress = frame / Math.max(1, durationInFrames);
  const camDx = (cam.dx ?? 0) * camProgress;
  const camDy = (cam.dy ?? 0) * camProgress;
  const camDriftTransform = `scale(${camZoom}) translate(${camDx}px, ${camDy}px)`;

  return (
    <AbsoluteFill style={{ backgroundColor: session.background?.color || '#000' }}>
      {/* Audio (volume réglé par le Magos) */}
      {clip.audio_enabled !== false && (
        <Audio src={videoSrc} volume={clip.volume ?? 1} />
      )}

      {/* ═══ CALQUE 6 (wrapper) : presets globaux sur TOUTE la scène ═══ */}
      <AbsoluteFill style={{ filter: fullFilter || undefined }}>
        {/* ── L1 BACKGROUND : PNG façon CRUSADER (cover + scale) OU couleur ── */}
        {session.background?.image ? (
          <AbsoluteFill style={{ overflow: 'hidden' }}>
            <Img
              src={staticFile(
                session.background.image.includes('/')
                  ? session.background.image
                  : `backgrounds/${session.background.image}`
              )}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: `scale(${bgScale}) translate(${bgX}px, ${bgY}px)`,
                transformOrigin: 'center center',
              }}
            />
          </AbsoluteFill>
        ) : (
          <AbsoluteFill style={{ backgroundColor: session.background?.color || '#0a0a0a' }} />
        )}

        {/* ── L2 CLIP VIDÉO : zoom + slow-mo + shake (sans filtre couleur) ── */}
        <AbsoluteFill>
          <OffthreadVideo
            src={videoSrc}
            style={{
              width: '100%',
              height: '100%',
              objectFit: session.profile === 'background' ? 'contain' : 'cover',
              transform: `scaleX(${mirrorFactor}) ${zoomTransform} ${camDriftTransform} translate(${shakeX}px, ${shakeY}px) translateY(${
                session.video?.offset_y || 0
              }%)`,
            }}
            playbackRate={playbackRate}
          />
        </AbsoluteFill>

        {/* ── L3 TITRE (en haut, sur le fond) ── */}
        {(textMode === 'title' || textMode === 'title+paragraph') && texts.title ? (
          <TitleBlock
            content={texts.title}
            style={textsStyle}
            box={textsStyle.title_box}
            fps={fps}
            totalFrames={durationInFrames}
            offsetPct={texts.title_offset_pct ?? 8}
            anim={sig.text_anim}
          />
        ) : null}

        {/* ── L4 PARAGRAPHE (en bas, sur le fond) ── */}
        {textMode === 'title+paragraph' && texts.paragraph ? (
          <ParagraphBlock
            content={texts.paragraph}
            style={textsStyle}
            box={textsStyle.paragraph_box}
            totalFrames={durationInFrames}
            offsetPct={texts.paragraph_offset_pct ?? 8}
            anim={sig.text_anim}
          />
        ) : null}

        {/* ── L5 LOGO : en bas du cadre, calque permanent ── */}
        <LogoOverlay logo={session.logo || clip.logo} width={width} />

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
              fontFamily: antonFont,
              letterSpacing: '0.1em',
            }}>
              SLOW MOTION
            </div>
          </AbsoluteFill>
        )}

        {/* Text overlays rétro-compat — masqués quand les textes v4 sont actifs (doublon) */}
        {(textMode === 'none' || !texts.title) &&
          (clip.text_overlays || []).map((overlay, index) => {
            const startFrame = overlay.start_frame || 0;
            const endFrame = overlay.end_frame || durationInFrames;
            if (frame < startFrame || frame > endFrame) return null;
            return (
              <Sequence
                key={overlay.id || index}
                from={startFrame}
                durationInFrames={endFrame - startFrame + 1}
              >
                <TextOverlay overlay={overlay} frame={frame - startFrame} fps={fps} />
              </Sequence>
            );
          })}

        {/* Flash du coup brutal */}
        {brutalFlash > 0 && (
          <AbsoluteFill style={{ backgroundColor: '#fff', opacity: brutalFlash, pointerEvents: 'none' }} />
        )}

        {/* F04b SIGNE : flash blanc subtil en début de clip (anti-doublon) */}
        {(() => {
          const flashFrame = sig.flash?.frame;
          if (flashFrame == null) return null;
          const d = frame - flashFrame;
          if (d < 0 || d > 5) return null;
          return (
            <AbsoluteFill style={{
              backgroundColor: '#fff',
              opacity: (sig.flash.opacity ?? 0.1) * (1 - d / 6),
              pointerEvents: 'none',
            }} />
          );
        })()}
      </AbsoluteFill>

      {/* ── L6 (finitions) : grain (seed unique par clip) + vignette PAR-DESSUS tout ── */}
      {(grainIntensity || 0) > 0 && (
        <AbsoluteFill style={{
          opacity: grainIntensity * (0.9 + 0.1 * Math.sin(frame * 0.7)),
          pointerEvents: 'none',
          mixBlendMode: 'overlay',
        }}>
          <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
            <filter id={grainId}>
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.9"
                numOctaves="2"
                stitchTiles="stitch"
                seed={grainSeed}
              />
              <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0" />
            </filter>
            <rect width="100%" height="100%" filter={`url(#${grainId})`} />
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

/* ═══════════════════════════════════════════════════════════════════════════
 * L3 — TitleBlock : titre en haut, fade-in, style du session.texts_style
 * ═══════════════════════════════════════════════════════════════════════════ */
const TitleBlock = ({ content, style, box, fps, totalFrames, offsetPct, anim }) => {
  const frame = useCurrentFrame();
  const { transform: textTransform, opacity } = getTextAnim(frame, anim, 15);

  const boxEnabled = box && box.enabled;
  const textStyle = boxEnabled
    ? {
        fontFamily: style.font,
        fontSize: `${style.size_title}px`,
        color: box.text_color || style.color,
        fontWeight: 900,
        textTransform: 'uppercase',
        lineHeight: 1.1,
        textAlign: 'center',
        backgroundColor: box.color || 'rgba(0,0,0,0.7)',
        border: (box.border_width || 0) > 0
          ? `${box.border_width}px solid ${box.border_color || '#FFFFFF'}`
          : 'none',
        borderRadius: `${box.radius || 0}px`,
        padding: `${box.padding || 12}px ${(box.padding || 12) * 1.6}px`,
        maxWidth: '88%',
        wordWrap: 'break-word',
      }
    : {
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
      };

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: `${offsetPct}%`,
        pointerEvents: 'none',
      }}
    >
      <div style={{ ...textStyle, opacity, transform: textTransform }}>{content}</div>
    </AbsoluteFill>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
 * L4 — ParagraphBlock : paragraphe en bas (max ~4 lignes)
 * ═══════════════════════════════════════════════════════════════════════════ */
const ParagraphBlock = ({ content, style, box, totalFrames, offsetPct, anim }) => {
  const frame = useCurrentFrame();
  const { transform: textTransform, opacity } = getTextAnim(frame, anim, 25);

  const boxEnabled = box && box.enabled;
  const textStyle = boxEnabled
    ? {
        fontFamily: style.font,
        fontSize: `${style.size_paragraph}px`,
        color: box.text_color || style.color,
        fontWeight: 700,
        lineHeight: 1.25,
        textAlign: 'center',
        backgroundColor: box.color || 'rgba(0,0,0,0.7)',
        border: (box.border_width || 0) > 0
          ? `${box.border_width}px solid ${box.border_color || '#FFFFFF'}`
          : 'none',
        borderRadius: `${box.radius || 0}px`,
        padding: `${box.padding || 12}px ${(box.padding || 12) * 1.6}px`,
        maxWidth: '88%',
        maxHeight: '22%',
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 4,
        WebkitBoxOrient: 'vertical',
        wordWrap: 'break-word',
      }
    : {
        fontFamily: style.font,
        fontSize: `${style.size_paragraph}px`,
        color: style.color,
        WebkitTextStroke: `${Math.max(1, style.stroke_width - 1)}px ${style.stroke_color}`,
        textShadow: style.shadow,
        letterSpacing: style.letter_spacing,
        fontWeight: 700,
        lineHeight: 1.25,
        textAlign: 'center',
        maxWidth: '88%',
        maxHeight: '22%',
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 4,
        WebkitBoxOrient: 'vertical',
        wordWrap: 'break-word',
      };

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: `${offsetPct}%`,
        pointerEvents: 'none',
      }}
    >
      <div style={{ ...textStyle, opacity, transform: textTransform }}>{content}</div>
    </AbsoluteFill>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
 * L5 — LogoOverlay : logo calque permanent, EN BAS du cadre
 * - width_pct: largeur en % de l'écran (ajustable dans la preview)
 * - position: bottom_left (défaut) — le pack interdit de le déplacer en forge
 * ═══════════════════════════════════════════════════════════════════════════ */
const LogoOverlay = ({ logo, width }) => {
  if (!logo || !logo.src) return null;
  const logoWidth = Math.round(width * ((logo.width_pct || 20) / 100));
  const pos = getLogoPosition(logo);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', ...pos, opacity: logo.opacity ?? 1 }}>
        <Img src={staticFile(logo.src)} style={{ width: logoWidth, height: 'auto' }} />
      </div>
    </AbsoluteFill>
  );
};
function getLogoPosition(logo) {
  const position = logo.position || 'bottom_left';
  const pad = 40;
  if (position === 'custom') {
    return {
      left: `${logo.x_pct ?? 50}%`,
      top: `${logo.y_pct ?? 50}%`,
      transform: 'translate(-50%, -50%)',
    };
  }
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

/* ═══════════════════════════════════════════════════════════════════════════
 * TextOverlay — rétro-compat text_overlays v3 (animations mot par mot etc.)
 * ═══════════════════════════════════════════════════════════════════════════ */
const TextOverlay = ({ overlay, frame, fps }) => {
  const {
    content,
    animation = 'word_by_word',
    font = antonFont,
    size = 96,
    color = '#FFFFFF',
    stroke_color = '#000000',
    stroke_width = 4,
    shadow = '2px 4px 8px rgba(0,0,0,0.9)',
    position = 'center',
    letter_spacing = '0em',
    glow_intensity = 0,
    depth_3d = 0,
    start_frame = 0,
  } = overlay;

  const localFrame = frame;
  const words = content.split(' ');
  const totalDuration = (overlay.end_frame || 300) - start_frame;
  const wordFadeFrames = 8;
  let wordsPerFrame;

  if (animation === 'word_by_word') {
    const revealDuration = Math.max(totalDuration * 0.6, words.length * 8);
    wordsPerFrame = revealDuration / words.length;
  } else {
    wordsPerFrame = 0;
  }

  const glowLayers = [];
  if (glow_intensity > 0) {
    const intensity = glow_intensity / 100;
    const layers = Math.round(intensity * 4);
    const glowSizes = [3, 6, 12, 20];
    for (let i = 0; i < layers; i++) {
      glowLayers.push(`0 0 ${glowSizes[i]}px ${color}`);
    }
    glowLayers.push(shadow);
  } else {
    glowLayers.push(shadow);
  }
  const textShadowStr = glowLayers.join(', ');

  const strokeStr = stroke_width > 0 ? `${stroke_width}px ${stroke_color}` : '0px transparent';

  const baseTextStyle = {
    fontFamily: font,
    fontSize: `${size}px`,
    color: color,
    WebkitTextStroke: strokeStr,
    textShadow: textShadowStr,
    letterSpacing: letter_spacing,
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
    blockOpacity = interpolate(localFrame, [0, 6], [0, 1], { extrapolateRight: 'clamp' });
    blockScale = interpolate(localFrame, [0, 6], [0.8, 1], { extrapolateRight: 'clamp' });
  } else if (animation === 'fade_in') {
    blockOpacity = interpolate(localFrame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  } else if (animation === 'fade_in_slow') {
    blockOpacity = interpolate(localFrame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
  }

  if (animation === 'word_by_word') {
    return (
      <div style={positionStyle}>
        <div style={{ ...baseTextStyle, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
          {words.map((word, i) => {
            const wordStartFrame = i * wordsPerFrame;
            const wordLocalFrame = localFrame - wordStartFrame;
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

/* ═══════════════════════════════════════════════════════════════════════════
 * Helper: Zoom interpolation
 * ═══════════════════════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════════════════════
 * Helper: animation d'apparition des textes (F04b SIGNE)
 * - sans anim (ou direction 'none') : fade-in classique
 * - sinon : slide horizontal/vertical avec easing, puis le texte se fige
 * ═══════════════════════════════════════════════════════════════════════════ */
function getTextAnim(frame, anim, defaultFadeFrames) {
  if (!anim || !anim.direction || anim.direction === 'none') {
    const opacity = interpolate(frame, [0, defaultFadeFrames], [0, 1], {
      extrapolateRight: 'clamp',
    });
    return { transform: 'none', opacity };
  }
  const dur = anim.duration_frames || 30;
  const p = Math.min(1, frame / dur);
  const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  const off = (1 - eased) * 90;
  let transform = 'none';
  if (anim.direction === 'ltr') transform = `translateX(${-off}px)`;
  else if (anim.direction === 'rtl') transform = `translateX(${off}px)`;
  else if (anim.direction === 'up') transform = `translateY(${off}px)`;
  else if (anim.direction === 'down') transform = `translateY(${-off}px)`;
  const opacity = Math.min(1, p * 1.4);
  return { transform, opacity };
}
