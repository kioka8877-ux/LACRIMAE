import React from 'react';
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';
import { codex as codexData } from '../codexData';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const resolveAsset = (value, fallback = '') => {
  if (!value) return fallback;
  if (/^(https?:|data:|blob:|file:)/i.test(String(value))) return value;
  const clean = String(value).replace(/^\.?\//, '');
  if (clean.startsWith('public/')) return staticFile(clean.slice('public/'.length));
  if (clean.startsWith('ARCHIVUM/')) return staticFile(clean);
  return staticFile(clean);
};

const readSourcePost = (clip, codex) => clip.source_post || clip.meme_v2?.source_post || codex.meme_v2?.source_post || {};

const appear = (frame, start, duration = 10) => {
  if (frame < start) return { opacity: 0, transform: 'translateY(18px) scale(0.985)' };
  const progress = interpolate(frame, [start, start + duration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return {
    opacity: progress,
    transform: `translateY(${(1 - progress) * 18}px) scale(${0.985 + progress * 0.015})`,
  };
};

const textBox = {
  background: 'rgba(10, 10, 10, 0.84)',
  border: '1px solid rgba(255,255,255,0.22)',
  borderRadius: 14,
  color: '#fff',
  padding: '14px 18px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
};

/**
 * MEME V2 renderer.
 * The pack is already prepared upstream. This component only consumes:
 * reaction_tweet, source_post.screenshot_png, text_emotion and clip_id/video.source.
 * Timeline: reaction first, source capture second, emotion third, meme clip last.
 */
export const MemeV2Composition = ({ codex: codexProp, session: sessionProp }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const codex = codexProp || codexData;
  const clip = codex?.clips?.[0] || codex;
  const session = sessionProp || codex?.session || {};
  const sourcePost = readSourcePost(clip, codex);
  const reaction = clip.reaction_tweet || clip.tweet?.text || clip.texts?.reaction || '';
  const emotion = clip.text_emotion || clip.texts?.emotion || '';
  const screenshot = sourcePost.screenshot_png || clip.source_post?.screenshot_png || '';
  const videoRef = clip.video?.source || clip.clip_source_ref || clip.meme?.source || '';
  const backgroundImage = session.background?.image || codex?.meme_v2?.background_image || '';
  const backgroundColor = session.background?.color || '#111';

  const reactionStart = 0;
  const sourceStart = Math.round(durationInFrames * 0.15);
  const emotionStart = Math.round(durationInFrames * 0.33);
  const clipStart = Math.round(durationInFrames * 0.41);
  const reactionStyle = appear(frame, reactionStart);
  const sourceStyle = appear(frame, sourceStart);
  const emotionStyle = appear(frame, emotionStart, 8);
  const clipStyle = appear(frame, clipStart, 8);
  const sourceHeight = Math.round(height * 0.30);
  const reactionHeight = Math.round(height * 0.17);
  const emotionHeight = Math.round(height * 0.10);
  const videoHeight = Math.max(1, height - sourceHeight - reactionHeight - emotionHeight);
  const sourceSrc = resolveAsset(screenshot);
  const memeSrc = resolveAsset(videoRef);
  const videoTotalFrames = clip.video?.total_frames || durationInFrames;

  return (
    <AbsoluteFill style={{ backgroundColor, overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>
      {backgroundImage ? (
        <AbsoluteFill style={{ opacity: 0.32 }}>
          <Img src={resolveAsset(backgroundImage)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </AbsoluteFill>
      ) : null}

      <AbsoluteFill style={{ zIndex: 20, padding: `${Math.round(height * 0.025)}px ${Math.round(width * 0.045)}px 0`, boxSizing: 'border-box' }}>
        <div style={{ ...textBox, height: reactionHeight, boxSizing: 'border-box', display: 'flex', alignItems: 'center', ...reactionStyle }}>
          <div style={{ fontSize: clamp(Math.round(width * 0.041), 24, 48), lineHeight: 1.12, fontWeight: 800, width: '100%', maxHeight: '100%', overflow: 'hidden' }}>
            {reaction || 'REACTION MANQUANTE'}
          </div>
        </div>

        <div style={{ marginTop: Math.round(height * 0.018), height: sourceHeight, borderRadius: 14, overflow: 'hidden', background: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.35)', ...sourceStyle }}>
          {sourceSrc ? (
            <Img src={sourceSrc} style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#fff' }} />
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#222', fontSize: 28 }}>CAPTURE SOURCE MANQUANTE</div>
          )}
        </div>

        <div style={{ marginTop: Math.round(height * 0.018), minHeight: emotionHeight, ...textBox, boxSizing: 'border-box', display: 'flex', alignItems: 'center', ...emotionStyle }}>
          <div style={{ fontSize: clamp(Math.round(width * 0.034), 20, 38), lineHeight: 1.1, fontWeight: 700, width: '100%', maxHeight: '100%', overflow: 'hidden' }}>
            {emotion || 'TEXT_EMOTION MANQUANT'}
          </div>
        </div>
      </AbsoluteFill>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: videoHeight, zIndex: 10, overflow: 'hidden', ...clipStyle }}>
        {memeSrc ? (
          <OffthreadVideo
            src={memeSrc}
            loop={videoTotalFrames < durationInFrames}
            endAt={videoTotalFrames < durationInFrames ? undefined : durationInFrames}
            style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
          />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: '#000', fontSize: 30 }}>CLIP MEME MANQUANT</div>
        )}
      </div>
    </AbsoluteFill>
  );
};

export default MemeV2Composition;
