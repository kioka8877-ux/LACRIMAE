import React from 'react';
import { Composition } from 'remotion';
import { OmniComposition } from '../preview/OmniComposition';
import codex from '../../public/codex.json';

const clip = codex.clips?.[0] || codex;
const video = clip.video || {};
const { width = 1080, height = 1920, fps = 30, total_frames = 300 } = video;

export const RemotionRoot = () => {
  return (
    <Composition
      id="LacrimaeShort"
      component={OmniComposition}
      durationInFrames={total_frames}
      fps={fps}
      width={width}
      height={height}
      defaultProps={{
        codex: clip,
        session: codex.session || {},
        videoSrc: './' + (video.source || 'clip_001.mp4'),
      }}
    />
  );
};
