import React from 'react';
import { Composition } from 'remotion';
import { OmniComposition } from '../preview/OmniComposition';
import codex from '../../public/codex.json';
import { getCompositionConfig } from '../preview/compositionConfig';

const isRanking = codex.review_mode === 'ranking_compilation' || codex.session?.review_mode === 'ranking_compilation';
const clip = codex.clips?.[0] || codex;
const video = clip.video || {};
const composition = getCompositionConfig(codex, codex.session || {});

let fps, totalFrames, videoSrc, previewFrames;

if (isRanking) {
  const rm = codex.ranking_manifest || codex.session?.ranking || {};
  fps = rm.fps || 30;
  totalFrames = rm.total_frames || 300;
  previewFrames = totalFrames;
  const firstEntry = rm.entries?.[0];
  videoSrc = firstEntry?.clip_file ? './' + firstEntry.clip_file.replace(/^\.\/?/, '') : '';
} else {
  fps = video.fps || 30;
  totalFrames = video.total_frames || 300;
  let sequences = {};
  try { sequences = require('../../public/sequences.json'); } catch (e) { sequences = { total_frames: totalFrames, source: video.source || 'clip_001.mp4' }; }
  previewFrames = Number(sequences.total_frames || totalFrames);
  videoSrc = './' + (video.source || sequences.source || 'clip_001.mp4');
}

export const RemotionRoot = () => {
  return (
    <Composition
      id="LacrimaeShort"
      component={OmniComposition}
      durationInFrames={previewFrames}
      fps={fps}
      width={composition.width}
      height={composition.height}
      defaultProps={{
        codex: clip,
        session: codex.session || {},
        videoSrc,
      }}
    />
  );
};
