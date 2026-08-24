export function normalizeHybridManifest(manifest, session = {}) {
  const source = manifest || session.hybrid || {};
  const intro = source.intro || {};
  const ego = source.ego || {};
  const fps = Number(source.fps || 30);
  const introFrames = Math.max(0, Number(intro.duration_frames) || Math.round(Number(intro.duration_seconds || 0) * fps));
  const matchCutFrames = Math.max(0, Number(source.match_cut?.total_frames || source.match_cut_total_frames || 0));
  const totalFrames = Math.max(introFrames + matchCutFrames, Number(source.total_frames) || 0);
  return {
    ...source,
    mode: source.mode || 'hybrid_narrative',
    fps,
    intro: { ...intro, duration_frames: introFrames },
    ego: {
      text: String(ego.text || 'EGO').toUpperCase(),
      duration_mode: ego.duration_mode || 'until_match_cut',
      start_frame: Number(ego.start_frame || 0),
      duration_frames: Number(ego.duration_frames || introFrames),
      font_family: ego.font_family || 'Impact',
      color: ego.color || '#FFFFFF',
      scale: Math.max(1, Math.min(10, Number(ego.scale) || 2)),
      rotation_deg: Number(ego.rotation_deg) || 0,
      position_x: Number(ego.position_x ?? 50),
      position_y: Number(ego.position_y ?? 50),
      blur_frames: Math.max(0, Math.min(3, Number(ego.blur_frames) || 0)),
    },
    transition: { type: 'hard_cut', ...(source.transition || {}), match_cut_start_frame: introFrames },
    total_frames: totalFrames,
  };
}

export function hybridTimelineFrame(manifest, frame) {
  const hybrid = normalizeHybridManifest(manifest);
  const introFrames = hybrid.intro.duration_frames;
  const matchCutFrame = frame - introFrames;
  return {
    hybrid,
    isIntro: frame < introFrames,
    matchCutFrame,
    isEgo: frame >= hybrid.ego.start_frame && frame < hybrid.ego.start_frame + hybrid.ego.duration_frames,
  };
}

export function hybridEgoStyle(manifest, frame) {
  const { hybrid, isEgo } = hybridTimelineFrame(manifest, frame);
  if (!isEgo) return null;
  const localFrame = frame - hybrid.ego.start_frame;
  const blur = localFrame < hybrid.ego.blur_frames ? (hybrid.ego.blur_frames - localFrame) * 1.5 : 0;
  return {
    position: 'absolute',
    left: `${hybrid.ego.position_x}%`,
    top: `${hybrid.ego.position_y}%`,
    transform: `translate(-50%, -50%) rotate(${hybrid.ego.rotation_deg}deg) scale(${hybrid.ego.scale})`,
    transformOrigin: 'center center',
    width: '92%',
    textAlign: 'center',
    fontFamily: hybrid.ego.font_family,
    fontSize: `${Math.min(220, 110 * hybrid.ego.scale)}px`,
    fontWeight: 900,
    letterSpacing: '-0.03em',
    lineHeight: 0.95,
    color: hybrid.ego.color,
    WebkitTextStroke: '2px #000000',
    textShadow: '0 4px 18px rgba(0,0,0,0.9)',
    filter: blur ? `blur(${blur.toFixed(2)}px)` : 'none',
    textTransform: 'uppercase',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    pointerEvents: 'none',
  };
}
