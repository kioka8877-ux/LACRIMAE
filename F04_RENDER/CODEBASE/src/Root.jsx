import React from 'react';
import { Composition } from 'remotion';
import { OmniComposition } from './components/OmniComposition';
import { MemeComposition } from './components/MemeComposition';
import { MemeV2Composition } from './components/MemeV2Composition';
import { codex } from './codexData';

// Codex multi-clips : une Composition par clip — jusqu'à N Shorts par session.
// Deux modes de composition :
//   - mode "meme" : MemeComposition (split-screen : tweet + texte émotion +
//     meme horizontal + watermark @chaine + logo) — layout 04_MODE_MEME.md.
//   - sinon      : OmniComposition (vidéo-centrée, mode libre / forge stars).
// Chaque clip porte son propre block de contenu ; le bloc `session` (style
// global : fond, logo, textes, presets) est partagé par TOUS les clips (v4.0).
export const Root = () => {
  const clips = codex.clips && codex.clips.length > 0 ? codex.clips : [codex];
  const session = codex.session || {};
  const isMemeV2Mode = codex.mode === 'meme_v2' || codex.sub_mode === 'meme_v2' || (codex.mode === 'meme' && codex.version === 2);
  const isMemeMode = codex.mode === 'meme' || codex.sub_mode === 'meme';
  const Comp = isMemeV2Mode ? MemeV2Composition : (isMemeMode ? MemeComposition : OmniComposition);
  const masterClip = clips[0];

  return (
    <>
      {clips.map((clip) => {
        const fps = clip.video?.fps || 30;
        const totalFrames = clip.video?.total_frames || 300;
        const width = clip.video?.width || 1080;
        const height = clip.video?.height || 1920;
        const compId = (clip.id || 'clip_001').replace(/_/g, '-');
        return (
          <Composition
            key={compId}
            id={compId}
            component={Comp}
            durationInFrames={totalFrames}
            fps={fps}
            width={width}
            height={height}
            defaultProps={{
              codex: clip,
              session,
              masterClip,
            }}
          />
        );
      })}
    </>
  );
};
