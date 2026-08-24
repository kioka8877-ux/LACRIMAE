import React from 'react';
import { AbsoluteFill, Img, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { codex as codexData } from '../codexData';

const resolveAsset = (value, kind = 'generic') => {
  if (!value) return '';
  if (/^(https?:|data:|blob:|file:)/i.test(String(value))) return value;
  const normalized = String(value).replace(/^\.?\//, '').replace(/^public\//, '');
  const assetPath = kind === 'meme' && !normalized.includes('/') ? `memes/${normalized}` : normalized;
  return staticFile(assetPath);
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const appear = (frame, start, duration = 10) => {
  if (frame < start) return { opacity: 0, transform: 'translateY(18px)' };
  const p = interpolate(frame, [start, start + duration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return { opacity: p, transform: `translateY(${(1 - p) * 18}px)` };
};
const colorWithOpacity = (color, opacity = 1) => {
  const hex = String(color || '#FFFFFF').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return color || '#FFFFFF';
  return `rgba(${parseInt(hex.slice(0, 2), 16)}, ${parseInt(hex.slice(2, 4), 16)}, ${parseInt(hex.slice(4, 6), 16)}, ${clamp(opacity, 0, 1)})`;
};
const fitOneLine = (content, baseSize, maxChars = 34) => Math.round((baseSize || 40) * Math.max(0.62, String(content || '').trim().length > maxChars ? maxChars / String(content || '').trim().length : 1));

/** MEME V2 : Tweet réaction Lacrimae → capture source → émotion → clip MEME. */
export const MemeV2Composition = ({ codex: codexProp, session: sessionProp, videoSrc }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const codex = codexProp || codexData;
  const clip = codex?.clips?.[0] || codex;
  const session = sessionProp || codex?.session || {};
  const style = { font: 'Impact, Arial Black, sans-serif', size_paragraph: 40, color: '#FFFFFF', stroke_color: '#000000', stroke_width: 4, shadow: '2px 4px 8px rgba(0,0,0,0.9)', letter_spacing: '0em', ...(session.texts_style || {}) };
  const presets = { color_preset: 'punchy', color_css_filter: 'contrast(1.3) saturate(1.5) brightness(1.1)', contrast: 1.3, brightness: 1.1, vignette: 0, ...(session.presets || {}) };
  const baseFilter = presets.color_css_filter || '';
  const colorFilter = baseFilter.includes('contrast') ? baseFilter.replace(/contrast\([^)]*\)/g, `contrast(${presets.contrast ?? 1.3})`) : `contrast(${presets.contrast ?? 1.3}) ${baseFilter}`.trim();
  const fullFilter = (colorFilter.includes('brightness') ? colorFilter.replace(/brightness\([^)]*\)/g, `brightness(${presets.brightness ?? 1.1})`) : `${colorFilter} brightness(${presets.brightness ?? 1.1})`).trim();
  const tweetCard = session.tweet_card || {};
  const source = clip.source_post || {};
  const reaction = clip.reaction_tweet || clip.reaction?.text || clip.tweet?.text || '';
  const reactionPersona = clip.reaction_tweet_persona || clip.reaction?.persona || {};
  const emotion = clip.text_emotion || clip.texts?.emotion || '';
  const screenshotSrc = resolveAsset(source.screenshot_png);
  const memeSource = clip.meme?.source || videoSrc || clip.video?.source;
  const memeSrc = resolveAsset(memeSource, 'meme');
  const videoFrames = clip.meme?.total_frames || clip.video?.total_frames || durationInFrames;
  const timeline = clip.meme_v2?.timeline || {};
  const starts = { reaction: Math.round(durationInFrames * ((timeline.reaction_start_pct ?? 0) / 100)), source: Math.round(durationInFrames * ((timeline.source_start_pct ?? 15) / 100)), emotion: Math.round(durationInFrames * ((timeline.emotion_start_pct ?? 33) / 100)), clip: Math.round(durationInFrames * ((timeline.clip_start_pct ?? 41) / 100)) };
  const layout = clip.meme_v2?.layout || {};
  const reactionTop = layout.reaction_top_pct ?? 3.5;
  const sourceTop = layout.source_top_pct ?? 25;
  const sourceBottom = layout.source_bottom_pct ?? 38;
  const captureEnabled = layout.capture_enabled !== false;
  const captureWidth = layout.capture_width_pct ?? 98;
  const captureHeight = layout.capture_height_pct ?? 30;
  const captureTop = layout.capture_top_pct ?? 25;
  const captureFit = layout.capture_fit || 'contain';
  const emotionTop = layout.emotion_top_pct ?? 58;
  const clipHeight = layout.clip_height_pct ?? 36;
  const fontFamily = String(style.font).includes('Impact') ? 'Anton, Impact, Arial Black, sans-serif' : style.font;
  const persona = { name: reactionPersona.name || clip.reaction_author || 'Lacrimae', handle: reactionPersona.handle || clip.reaction_handle || '@lacrimae', avatar_color: reactionPersona.avatar_color || '#1DA1F2', verified: reactionPersona.verified !== false };
  const initials = persona.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const textScale = (clip.reaction_text_size || 17) / 17;
  const cardWidth = `${clip.reaction_width_pct || 88}%`;
  const sourceLabel = source.credit_display || (source.author ? `Source : ${source.author}` : 'Post source');

  return (
    <AbsoluteFill style={{ backgroundColor: session.background?.color || '#0a0a0a', overflow: 'hidden', fontFamily: 'Arial, sans-serif', filter: fullFilter || undefined }}>
      {session.background?.image ? <AbsoluteFill style={{ opacity: 0.34 }}><Img src={resolveAsset(session.background.image.includes('/') ? session.background.image : `backgrounds/${session.background.image}`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></AbsoluteFill> : null}

      {/* 1 — tweet publié par Lacrimae */}
      <AbsoluteFill style={{ top: `${reactionTop}%`, height: '20%', alignItems: 'center', justifyContent: 'flex-start', zIndex: 30, pointerEvents: 'none' }}>
        <div style={{ width: cardWidth, backgroundColor: colorWithOpacity(tweetCard.background_color || '#FFFFFF', tweetCard.background_opacity ?? 1), borderRadius: 16, padding: 18, boxSizing: 'border-box', boxShadow: '0 4px 18px rgba(0,0,0,0.4)', ...appear(frame, starts.reaction) }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 * textScale }}>
            <div style={{ width: 44 * textScale, height: 44 * textScale, borderRadius: '50%', backgroundColor: persona.avatar_color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 * textScale, fontWeight: 700, marginRight: 10 }}>{initials}</div>
            <div><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ fontWeight: 700, color: tweetCard.text_color || '#000', fontSize: 15 * textScale }}>{persona.name}</span>{persona.verified ? <span style={{ color: '#1DA1F2', fontSize: 14 * textScale }}>✓</span> : null}</div><div style={{ color: tweetCard.text_color || '#657786', fontSize: 13 * textScale }}>{persona.handle}</div></div>
          </div>
          <div style={{ color: tweetCard.text_color || '#0f1419', fontSize: 17 * textScale, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{reaction}</div>
        </div>
      </AbsoluteFill>

      {/* 2 — capture réelle du post auquel Lacrimae répond */}
      {captureEnabled && <AbsoluteFill style={{ top: `${captureTop}%`, height: `${captureHeight}%`, alignItems: 'center', justifyContent: 'center', zIndex: 25, pointerEvents: 'none' }}>
        <div style={{ width: `${captureWidth}%`, height: '100%', ...appear(frame, starts.source) }}>
          <div style={{ height: '100%', overflow: 'hidden', background: 'transparent' }}>{screenshotSrc ? <Img src={screenshotSrc} style={{ width: '100%', height: '100%', objectFit: captureFit, background: 'transparent' }} /> : null}</div>
        </div>
      </AbsoluteFill>}

      {/* 3 — text emotion : style MEME V1 Anton/Impact + contour + ombre */}
      <AbsoluteFill style={{ top: `${emotionTop}%`, height: '10%', alignItems: 'center', justifyContent: 'center', zIndex: 40, pointerEvents: 'none' }}>
        <div style={{ fontFamily, fontSize: `${fitOneLine(emotion, clip.text_emotion_size || style.size_paragraph)}px`, color: style.color, WebkitTextStroke: `${Math.max(1, (style.stroke_width || 4) - 1)}px ${style.stroke_color}`, textShadow: style.shadow, fontWeight: 700, textAlign: 'center', textTransform: 'uppercase', letterSpacing: style.letter_spacing, maxWidth: '88%', whiteSpace: 'nowrap', overflow: 'hidden', ...appear(frame, starts.emotion, 8) }}>{emotion}</div>
      </AbsoluteFill>

      {/* 4 — clip MEME en dernier */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${clipHeight}%`, zIndex: 10, overflow: 'hidden', opacity: 1 }}>
        {memeSrc ? <OffthreadVideo src={memeSrc} loop={videoFrames < durationInFrames} endAt={videoFrames < durationInFrames ? undefined : durationInFrames} style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000', transform: `scale(${Math.min(3, Math.max(1, clip.video?.scale || 1))})` }} /> : <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#fff', background: '#000' }}>CLIP MEME MANQUANT</div>}
      </div>
    </AbsoluteFill>
  );
};
export default MemeV2Composition;
