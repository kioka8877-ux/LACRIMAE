import React from 'react';
import { Composition } from 'remotion';
import { OmniComposition } from '../preview/OmniComposition';
import codex from '../../public/codex.json';
import revealSources from '../../public/reveal_sources.json';
import { getCompositionConfig } from '../preview/compositionConfig';

const clip = codex.clips?.[0] || codex;
const composition = getCompositionConfig(codex, codex.session || {});

// Use reveal manifest for timing (it defines the actual video)
const fps = Number(revealSources.fps) || 30;
const totalFrames = Number(revealSources.total_frames) || 600;

// Build musicTimeline from reveal manifest
const musicTimeline = revealSources.audio_src ? {
  enabled: true,
  audio_src: revealSources.audio_src,
  volume: revealSources.audio_volume ?? 1,
  in_seconds: revealSources.audio_in ?? 0,
  out_seconds: revealSources.audio_out ?? 0,
} : {};

export const RemotionRoot = () => {
  return (
    <Composition
      id="LacrimaeShort"
      component={OmniComposition}
      durationInFrames={totalFrames}
      fps={fps}
      width={composition.width}
      height={composition.height}
      defaultProps={{
        codex: clip,
        session: codex.session || {},
        videoSrc: './' + (clip.video?.source || revealSources.sources?.[0]?.file || 'clip1.2.mp4'),
        sequences: {},
        revealManifest: revealSources,
        musicTimeline,
      }}
    />
  );
};
