import React from 'react';
import { Composition } from 'remotion';
import { OmniComposition } from '../preview/OmniComposition';
import codex from '../../public/codex.json';
import sequences from '../../public/sequences.json';

const clip = codex.clips?.[0] || codex;
const video = clip.video || {};
const { width = 1080, height = 1920, fps = 30, total_frames = 300 } = video;
const previewFrames = Number(sequences.total_frames || total_frames);

export const RemotionRoot = () => {
  return (
    <Composition
      id="LacrimaeShort"
      component={OmniComposition}
      durationInFrames={previewFrames}
      fps={fps}
      width={width}
      height={height}
      defaultProps={{
        codex: clip,
        session: codex.session || {},
        videoSrc: './' + (video.source || sequences.source || 'clip_001.mp4'),
        sequences,
      }}
    />
  );
};
