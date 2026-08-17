import React from 'react';
import {
  AbsoluteFill,
  Img,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Video,
  staticFile,
} from 'remotion';

/* ═══════════════════════════════════════════════════════════════════════════
 * MemeComposition (F03 PREVIEW) — miroir de la compo meme F04 RENDER.
 *
 * Mêmes 7 calques (z-order bas → haut) que 04_MODE_MEME.md :
 *   L1 BACKGROUND → L2 TWEET → L3 TITRE (optionnel) → L4 TEXTE ÉMOTION →
 *   L5 MEME (loop net / trim) → L6 WATERMARK @chaine → L7 LOGO
 *
 * Props: codex (clip), videoSrc (meme), session (bloc session v4.1)
 * ═══════════════════════════════════════════════════════════════════════════ */

const SESSION_FALLBACK = {
  background: { image: null, color: '#0a0a0a', scale: 1.0 },
  logo: { src: 'logo.png', width_pct: 18, position: 'bottom_right', opacity: 1.0 },
  watermark: { text: '@lacrimae', opacity: 0.4, font_size: 36, position: 'bottom_left', color: '#FFFFFF' },
  texts_style: {
    font: 'Impact, Arial Black, sans-serif',
    size_title: 64,
    size_paragraph: 40,
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

export const MemeComposition = ({ codex, videoSrc, session: sessionProp }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  const clip = codex || {};
  const session = sessionProp || clip.session || SESSION_FALLBACK;
  const presets = { ...SESSION_FALLBACK.presets, ...(session.presets || {}) };
  const textsStyle = { ...SESSION_FALLBACK.texts_style, ...(session.texts_style || {}) };

  const src = videoSrc || (clip.video?.source ? './' + clip.video.source : './clip_001.mp4');
  const videoUrl = src.startsWith('./') ? staticFile(src.replace('./', '')) : src;

  const memeTotalFrames = clip.meme?.total_frames || clip.video?.total_frames || durationInFrames;
  const shouldLoop = memeTotalFrames < durationInFrames;

  if (!clip || !clip.video) {
    return (
      <AbsoluteFill style={{ backgroundColor: '#ff4400', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ color: 'white', fontSize: 64, fontWeight: 'bold' }}>CODEX MANQUANT</div>
      </AbsoluteFill>
    );
  }

  // ── Presets globaux (contraste/luminosité) ──
  const contrastValue = presets.contrast ?? 1.3;
  const baseFilter = presets.color_css_filter || '';
  const colorFilter = baseFilter.includes('contrast')
    ? baseFilter.replace(/contrast\([^)]*\)/g, `contrast(${contrastValue})`)
    : `contrast(${contrastValue}) ${baseFilter}`.trim();
  const brightnessValue = presets.brightness ?? 1.1;
  const fullFilter = (colorFilter.includes('brightness')
    ? colorFilter.replace(/brightness\([^)]*\)/g, `brightness(${brightnessValue})`)
    : `${colorFilter} brightness(${brightnessValue})`).trim();

  const texts = clip.texts || {};
  const title = texts.title || null;
  const emotionText = texts.emotion || clip.text_emotion || '';
  const memeHeightPct = clip.meme?.height_pct ?? 48;
  const emotionPositionPct = clip.text_emotion_position_pct ?? 43;
  const emotionFontSize = clip.text_emotion_size ?? textsStyle.size_paragraph ?? 40;

  return (
    <AbsoluteFill style={{ backgroundColor: session.background?.color || '#000' }}>
      <AbsoluteFill style={{ filter: fullFilter || undefined }}>
        {/* ── L1 BACKGROUND ── */}
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
                transform: `scale(${session.background.scale ?? 1})`,
                transformOrigin: 'center center',
              }}
            />
          </AbsoluteFill>
        ) : (
          <AbsoluteFill style={{ backgroundColor: session.background?.color || '#0a0a0a' }} />
        )}

        {/* ── L3 TITRE (haut, optionnel) ── */}
        {title ? (
          <TitleBlock content={title} style={textsStyle} offsetPct={texts.title_offset_pct ?? 4} />
        ) : null}

        {/* ── L2 TWEET (card type tweet) ── */}
        {clip.tweet?.text ? (
          <TweetCard tweet={clip.tweet} width={width} />
        ) : null}

        {/* ── L4 TEXTE ÉMOTION ── */}
        {emotionText ? (
          <EmotionText content={emotionText} style={textsStyle} totalFrames={durationInFrames} positionPct={emotionPositionPct} fontSize={emotionFontSize} />
        ) : null}

        {/* ── L5 MEME (moitié basse, contain) ── */}
        <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center' }}>
          <div style={{ width: '100%', height: `${memeHeightPct}%`, overflow: 'hidden', position: 'relative' }}>
            <Video
              src={videoUrl}
              loop={shouldLoop}
              endAt={shouldLoop ? undefined : durationInFrames}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
            {/* ── L6 WATERMARK @chaine ── */}
            {(session.watermark?.text || clip.watermark?.text) ? (
              <WatermarkLayer wm={clip.watermark || session.watermark} />
            ) : null}
            {/* ── L7 LOGO ── */}
            <LogoOverlay
              logos={session.logos?.length ? session.logos : (session.logo ? [session.logo] : (clip.logo ? [clip.logo] : []))}
              width={width}
            />
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

      {/* Grain + vignette (comme OmniComposition) */}
      {(presets.grain_intensity || 0) > 0 && (
        <AbsoluteFill style={{ opacity: presets.grain_intensity, pointerEvents: 'none', mixBlendMode: 'overlay' }}>
          <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
            <filter id="memeGrainFilter">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
              <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#memeGrainFilter)" />
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

/* ── L2 TWEET CARD : carte blanche (avatar + @handle + texte + stats) ── */
const TweetCard = ({ tweet, width }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  const persona = tweet.persona || {};
  const cardWidth = Math.round(width * ((tweet.width_pct || 82) / 100));
  const avatarColor = persona.avatar_color || '#1DA1F2';
  const initials = (persona.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const textScale = (tweet.text_size || 17) / 17;

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'center', paddingTop: '16%', pointerEvents: 'none' }}>
      <div style={{
        width: cardWidth,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 18,
        boxShadow: '0 4px 18px rgba(0,0,0,0.4)',
        opacity,
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

/* ── L3 TITRE (haut, optionnel) ── */
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
      <div style={{
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
        maxWidth: '88%',
        wordWrap: 'break-word',
        opacity,
      }}>{content}</div>
    </AbsoluteFill>
  );
};

/* ── L4 TEXTE ÉMOTION ── */
const EmotionText = ({ content, style, totalFrames, positionPct = 43, fontSize = 40 }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'center', paddingTop: `${positionPct}%`, pointerEvents: 'none' }}>
      <div style={{
        fontFamily: style.font,
        fontSize: `${fontSize}px`,
        color: style.color,
        WebkitTextStroke: `${Math.max(1, style.stroke_width - 1)}px ${style.stroke_color}`,
        textShadow: style.shadow,
        fontWeight: 700,
        textAlign: 'center',
        maxWidth: '88%',
        textTransform: 'uppercase',
        letterSpacing: style.letter_spacing,
        opacity,
      }}>
        {content}
      </div>
    </AbsoluteFill>
  );
};

/* ── L6 WATERMARK @chaine ── */
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

/* ── L7 LOGO (miroir du LogoOverlay de OmniComposition) ── */
const LogoOverlay = ({ logos, width }) => {
  if (!logos || !logos.length) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 50 }}>
      {logos.map((logo, index) => {
        const pos = getLogoPosition(logo);
        const logoWidth = Math.round(width * ((logo.width_pct || 20) / 100));
        return (
          <div key={index} style={{ position: 'absolute', ...pos, opacity: logo.opacity ?? 1 }}>
            <Img
              src={staticFile(
                logo.src && logo.src.includes('/')
                  ? logo.src
                  : (logo.src && logo.src !== 'logo.png' ? `logos/${logo.src}` : 'logo.png')
              )}
              style={{ width: logoWidth, height: 'auto', maxHeight: '12%' }}
            />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

function getLogoPosition(logo) {
  const base = { position: logo.position || 'bottom_right' };
  if (base.position === 'custom' && logo.x_pct != null && logo.y_pct != null) {
    return { left: `${logo.x_pct}%`, top: `${logo.y_pct}%`, transform: 'translate(-50%, -50%)' };
  }
  const positions = {
    top_center: { top: '4%', left: '50%', transform: 'translateX(-50%)' },
    top_left: { top: '4%', left: '4%' },
    top_right: { top: '4%', right: '4%' },
    center: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
    bottom_center: { bottom: '4%', left: '50%', transform: 'translateX(-50%)' },
    bottom_left: { bottom: '4%', left: '4%' },
    bottom_right: { bottom: '4%', right: '4%' },
  };
  return positions[base.position] || positions.bottom_right;
}
