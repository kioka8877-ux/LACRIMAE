import React from 'react';
import {
  AbsoluteFill,
  Img,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  OffthreadVideo,
  staticFile,
} from 'remotion';
import { codex as codexData } from '../codexData';
import {
  SESSION_FALLBACK,
  TitleBlock,
  LogoOverlay,
  getTextAnim,
  fitOneLineFontSize,
} from './OmniComposition';

/* ═══════════════════════════════════════════════════════════════════════════
 * MemeComposition — Composition mode MEME (LACRIMAE v4.1)
 *
 * Layout écran (ce que le viewer voit) :
 *   ┌────────────────────────────┐
 *   │  TITRE (optionnel)         │  ← L3
 *   │  TWEET (card type tweet)   │  ← L2
 *   │  TEXTE ÉMOTION             │  ← L4
 *   │                            │
 *   │  MEME (vidéo horizontale)  │  ← L5 (loop net / trim)
 *   │    watermark @chaine (L6)  │
 *   │    logo (L7)               │
 *   └────────────────────────────┘
 *
 * Codex v4.1 (mode meme) : bloc `session` (fond, logo, textes, presets,
 * watermark) + `clips[]` (meme, tweet, emotion, titre, durée pack).
 *
 * Props:
 *   codex:   object — le clip en cours
 *   session: object — le bloc session global
 * ═══════════════════════════════════════════════════════════════════════════ */

export const MemeComposition = ({ codex: codexProp, session: sessionProp, masterClip: masterClipProp }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  const clip = codexProp || (codexData.clips?.[0] || codexData);
  const masterClip = masterClipProp || clip;
  const session = sessionProp || clip.session || codexData.session || SESSION_FALLBACK;
  const presets = { ...SESSION_FALLBACK.presets, ...(session.presets || {}) };
  const textsStyle = { ...SESSION_FALLBACK.texts_style, ...(session.texts_style || {}) };

  if (!clip) {
    return (
      <AbsoluteFill style={{ backgroundColor: '#ff4400', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ color: 'white', fontSize: 64, fontWeight: 'bold' }}>CODEX MANQUANT</div>
      </AbsoluteFill>
    );
  }

  const memeSrc = staticFile(clip.video?.source || clip.meme?.source || 'clip_001.mp4');
  const memeTotalFrames = clip.meme?.total_frames || clip.video?.total_frames || durationInFrames;
  const shouldLoop = memeTotalFrames < durationInFrames;

  // ── Presets globaux (réutilisés) ──
  const contrastValue = presets.contrast ?? 1.3;
  const baseFilter = presets.color_css_filter || '';
  const colorFilter = baseFilter.includes('contrast')
    ? baseFilter.replace(/contrast\([^)]*\)/g, `contrast(${contrastValue})`)
    : `contrast(${contrastValue}) ${baseFilter}`.trim();
  const brightnessValue = presets.brightness ?? 1.1;
  const fullFilter = (colorFilter.includes('brightness')
    ? colorFilter.replace(/brightness\([^)]*\)/g, `brightness(${brightnessValue})`)
    : `${colorFilter} brightness(${brightnessValue})`).trim();

  // ── SIGNE : grain + mouvement fond + flash (réutilisés) ──
  const sig = clip.sig || {};
  const grainIntensity = sig.grain?.intensity ?? presets.grain_intensity ?? 0;
  const grainSeed = sig.grain?.seed ?? 0;
  const grainId = 'grain-' + (clip.id || 'clip').replace(/_/g, '-');

  const bgBaseScale = sig.bg_motion?.base_scale ?? 1.0;
  const bgScale = (session.background?.scale ?? 1) * bgBaseScale;
  const bgProgress = frame / Math.max(1, durationInFrames);
  const bgX = Math.sin(bgProgress * Math.PI * 2 * (sig.bg_motion?.freq ?? 0) + (sig.bg_motion?.phase ?? 0)) * (sig.bg_motion?.amp_x ?? 0)
    + (sig.bg_motion?.drift_x ?? 0) * bgProgress;
  const bgY = Math.cos(bgProgress * Math.PI * 2 * (sig.bg_motion?.freq ?? 0) + (sig.bg_motion?.phase ?? 0)) * (sig.bg_motion?.amp_y ?? 0)
    + (sig.bg_motion?.drift_y ?? 0) * bgProgress;

  const mirrorFactor = sig.mirror ? '-1' : '1';
  const cam = sig.cam_drift || {};
  const camZoom = interpolate(frame, [0, durationInFrames],
    [cam.zoom_from ?? 1, cam.zoom_to ?? 1], { extrapolateRight: 'clamp' });

  const texts = clip.texts || {};
  const title = texts.title || null;
  const emotionText = texts.emotion || clip.text_emotion || '';
  const memeHeightPct = clip.meme?.height_pct ?? masterClip.meme?.height_pct ?? 48;
  const emotionPositionPct = clip.text_emotion_position_pct ?? masterClip.text_emotion_position_pct ?? 43;
  const emotionFontSize = clip.text_emotion_size ?? masterClip.text_emotion_size ?? textsStyle.size_paragraph ?? 40;

  return (
    <AbsoluteFill style={{ backgroundColor: session.background?.color || '#000' }}>
      <AbsoluteFill style={{ filter: fullFilter || undefined }}>
        {/* ── L1 BACKGROUND : PNG (cover + scale + motion SIGNE) ou couleur ── */}
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

        {/* ── L3 TITRE (haut, optionnel — null possible) ── */}
        {title ? (
          <TitleBlock
            content={title}
            style={textsStyle}
            box={textsStyle.title_box}
            fps={fps}
            totalFrames={durationInFrames}
            offsetPct={texts.title_offset_pct ?? 4}
            anim={sig.text_anim}
          />
        ) : null}

        {/* ── L2 TWEET (card type tweet, milieu-haut) ── */}
        {clip.tweet?.text ? (
          <TweetCard tweet={clip.tweet} width={width} anim={sig.text_anim} textSize={clip.tweet?.text_size ?? masterClip.tweet?.text_size} />
        ) : null}

        {/* ── L4 TEXTE ÉMOTION (milieu) ── */}
        {emotionText ? (
          <EmotionText
            content={emotionText}
            style={textsStyle}
            totalFrames={durationInFrames}
            anim={sig.text_anim}
            positionPct={emotionPositionPct}
            fontSize={emotionFontSize}
          />
        ) : null}

        {/* ── L5 MEME (vidéo horizontale, moitié basse, contain) ── */}
        <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', zIndex: 10 }}>
          <div style={{ width: '100%', height: `${memeHeightPct}%`, overflow: 'hidden', position: 'relative' }}>
            <OffthreadVideo
              src={memeSrc}
              loop={shouldLoop}
              endAt={shouldLoop ? undefined : durationInFrames}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                transform: `scaleX(${mirrorFactor}) scale(${camZoom})`,
              }}
            />
            {/* ── L6 WATERMARK @chaine (texte transparent sur le meme) ── */}
            {(session.watermark?.text || clip.watermark?.text) ? (
              <WatermarkLayer wm={clip.watermark || session.watermark} />
            ) : null}
            {/* ── L7 LOGO (sur le meme, toujours si fourni) ── */}
            <LogoOverlay
              logos={session.logos?.length ? session.logos : (session.logo ? [session.logo] : (clip.logo ? [clip.logo] : []))}
              width={width}
            />
          </div>
        </AbsoluteFill>

        {/* Flash SIGNE */}
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

      {/* Grain + vignette par-dessus tout (réutilisés) */}
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
 * L2 — TweetCard : carte blanche type tweet (avatar + @handle + texte + stats)
 * Persona + stats générés par le bridge (seed déterministe), texte du pack.
 * ═══════════════════════════════════════════════════════════════════════════ */
const TweetCard = ({ tweet, width, anim, textSize }) => {
  const frame = useCurrentFrame();
  const { transform: textTransform, opacity } = getTextAnim(frame, anim, 15);

  const persona = tweet.persona || {};
  const cardWidth = Math.round(width * ((tweet.width_pct || 82) / 100));
  const avatarColor = persona.avatar_color || '#1DA1F2';
  const initials = (persona.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const textScale = (textSize || 17) / 17;

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'center', paddingTop: '16%', pointerEvents: 'none', zIndex: 20 }}>
      <div style={{
        width: cardWidth,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 18,
        boxShadow: '0 4px 18px rgba(0,0,0,0.4)',
        opacity,
        transform: textTransform,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 * textScale }}>
          <div style={{
            width: 44 * textScale,
            height: 44 * textScale,
            borderRadius: '50%',
            backgroundColor: avatarColor,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18 * textScale,
            fontWeight: 700,
            marginRight: 10,
          }}>
            {initials}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontWeight: 700, color: '#000', fontSize: 15 * textScale }}>{persona.name || 'User'}</span>
              {persona.verified ? (
                <span style={{ color: '#1DA1F2', fontSize: 14 * textScale, lineHeight: 1 }}>✓</span>
              ) : null}
            </div>
            <div style={{ color: '#657786', fontSize: 13 * textScale }}>{persona.handle || '@user'}</div>
          </div>
        </div>
        <div style={{ color: '#0f1419', fontSize: 17 * textScale, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
          {renderTweetText(tweet.text, tweet.keywords_style)}
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 12, color: '#657786', fontSize: 14 * textScale }}>
          <span>Reply {formatCount(tweet.replies)}</span>
          <span>Repost {formatCount(tweet.reposts)}</span>
          <span>Likes {formatCount(tweet.likes)}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

function renderTweetText(text, keywordsStyle = {}) {
  if (!text) return null;
  const greenWords = (keywordsStyle.green || []).map((w) => w.toLowerCase());
  const redWords = (keywordsStyle.red || []).map((w) => w.toLowerCase());
  return text.split(/(\s+)/).map((word, i) => {
    const clean = word.toLowerCase().replace(/[^a-z0-9']/g, '');
    const color = greenWords.includes(clean) ? '#1a9e3f'
      : redWords.includes(clean) ? '#d93025' : '#0f1419';
    const weight = greenWords.includes(clean) || redWords.includes(clean) ? 700 : 400;
    return (
      <span key={i} style={{ color, fontWeight: weight }}>{word}</span>
    );
  });
}

function formatCount(n) {
  if (n == null) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * L4 — EmotionText : texte du milieu qui dit l'émotion du meme
 * ═══════════════════════════════════════════════════════════════════════════ */
const EmotionText = ({ content, style, totalFrames, anim, positionPct = 43, fontSize = 40 }) => {
  const frame = useCurrentFrame();
  const { transform: textTransform, opacity } = getTextAnim(frame, anim, 20);

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'center', paddingTop: `${positionPct}%`, pointerEvents: 'none', zIndex: 40 }}>
      <div style={{
        fontFamily: (style.font || '').includes('Impact') ? 'Anton, Impact, Arial Black, sans-serif' : style.font,
        fontSynthesis: 'weight',
        fontSize: `${fitOneLineFontSize(content, fontSize, 28)}px`,
        color: style.color,
        WebkitTextStroke: `${Math.max(1, style.stroke_width - 1)}px ${style.stroke_color}`,
        textShadow: style.shadow,
        fontWeight: 700,
        textAlign: 'center',
        maxWidth: '88%',
        display: 'block',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        overflowWrap: 'anywhere',
        textTransform: 'uppercase',
        letterSpacing: style.letter_spacing,
        opacity,
        transform: textTransform,
      }}>
        {content}
      </div>
    </AbsoluteFill>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
 * L6 — WatermarkLayer : texte transparent @chaine posé sur le meme
 * ═══════════════════════════════════════════════════════════════════════════ */
const WatermarkLayer = ({ wm }) => {
  const text = wm.text || '@LACRIMAE';
  const opacity = wm.opacity ?? 0.4;
  const fontSize = wm.font_size || 36;
  const position = wm.position || 'bottom_left';
  const posStyle = {
    bottom_left: { bottom: 14, left: 18 },
    bottom_right: { bottom: 14, right: 18 },
    top_left: { top: 14, left: 18 },
    top_right: { top: 14, right: 18 },
    bottom_center: { bottom: 14, left: '50%', transform: 'translateX(-50%)' },
  }[position] || { bottom: 14, left: 18 };

  return (
    <div style={{
      position: 'absolute',
      ...posStyle,
      color: wm.color || '#FFFFFF',
      fontSize,
      fontWeight: 700,
      opacity,
      textShadow: '1px 2px 4px rgba(0,0,0,0.8)',
      letterSpacing: '0.04em',
      pointerEvents: 'none',
      zIndex: 60,
    }}>
      {text}
    </div>
  );
};
