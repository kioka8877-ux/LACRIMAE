import React from 'react';
import { Composition } from 'remotion';
import { OmniComposition } from './components/OmniComposition';
import { codex } from './codexData';

// Codex multi-clips : une Composition par clip — jusqu'à N Shorts par vidéo longue.
// Chaque clip porte son propre block de réglages (titre, volume, couleurs...).
export const Root = () => {
  const clips = codex.clips && codex.clips.length > 0 ? codex.clips : [codex];

  return (
    <>
      {clips.map((clip) => {
        const fps = clip.video?.fps || 30;
        const totalFrames = clip.video?.total_frames || 300;
        const width = clip.video?.width || 1080;
        const height = clip.video?.height || 1920;
        return (
          <Composition
            key={clip.id || 'clip_001'}
            id={clip.id || 'clip_001'}
            component={OmniComposition}
            durationInFrames={totalFrames}
            fps={fps}
            width={width}
            height={height}
            props={{
              codex: clip,
            }}
          />
        );
      })}
    </>
  );
};
