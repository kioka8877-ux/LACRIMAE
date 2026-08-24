function normalizeHybridText(value, fallback, defaultScale) {
  const text = value || {};
  return {
    text: String(text.text || fallback).toUpperCase(),
    duration_mode: text.duration_mode || 'until_match_cut',
    start_frame: Math.max(0, Number(text.start_frame) || 0),
    duration_frames: Math.max(1, Number(text.duration_frames) || 1),
    font_family: text.font_family || 'Impact',
    color: text.color || '#FFFFFF',
    scale: Math.max(1, Math.min(10, Number(text.scale) || defaultScale)),
    rotation_deg: Number(text.rotation_deg) || 0,
    position_x: Number(text.position_x ?? 50),
    position_y: Number(text.position_y ?? 50),
    blur_frames: Math.max(0, Math.min(3, Number(text.blur_frames) || 0)),
  };
}

function durationForText(text, introFrames, totalFrames) {
  if (text.duration_mode === 'until_end') return Math.max(1, totalFrames - text.start_frame);
  if (text.duration_mode === 'custom') return Math.max(1, text.duration_frames);
  return Math.max(1, introFrames - text.start_frame);
}

export function normalizeHybridManifest(manifest, session = {}) {
  const base = manifest || {};
  const overrides = session.hybrid || {};
  const source = {
    ...base,
    ...overrides,
    intro: { ...(base.intro || {}), ...(overrides.intro || {}) },
    intro_text: { ...(base.intro_text || {}), ...(overrides.intro_text || {}) },
    ego: { ...(base.ego || {}), ...(overrides.ego || {}) },
    transition: { ...(base.transition || {}), ...(overrides.transition || {}) },
    match_cut: { ...(base.match_cut || {}), ...(overrides.match_cut || {}) },
  };
  const fps = Number(source.fps || 30);
  const intro = source.intro || {};
  const introFrames = Math.max(
    0,
    Number(intro.duration_frames) || Math.round(Number(intro.duration_seconds || 0) * fps),
  );
  const declaredTotalFrames = Number(source.total_frames) || 0;
  const declaredMatchCutFrames = Number(source.match_cut?.total_frames || source.match_cut_total_frames || 0);
  const matchCutFrames = Math.max(0, declaredMatchCutFrames || declaredTotalFrames - introFrames);
  const totalFrames = Math.max(introFrames + matchCutFrames, declaredTotalFrames);
  const introText = normalizeHybridText(source.intro_text, "C'EST JUSTE UN JOUEUR", 1);
  const egoBase = normalizeHybridText(source.ego, 'EGO', 2);
  const egoStartFrame = introFrames;
  const egoDuration = egoBase.duration_mode === 'until_end'
    ? Math.max(1, totalFrames - egoStartFrame)
    : egoBase.duration_mode === 'custom'
      ? Math.max(1, egoBase.duration_frames)
      : Math.max(1, matchCutFrames);
  const ego = { ...egoBase, start_frame: egoStartFrame, duration_frames: egoDuration };

  return {
    ...source,
    mode: source.mode || 'hybrid_narrative',
    fps,
    intro: { ...intro, duration_frames: introFrames },
    intro_text: {
      ...introText,
      duration_frames: durationForText(introText, introFrames, totalFrames),
    },
    ego: {
      ...ego,
      duration_frames: ego.duration_frames,
    },
    transition: { type: 'hard_cut', ...source.transition, match_cut_start_frame: introFrames },
    match_cut: { ...source.match_cut, total_frames: matchCutFrames },
    total_frames: totalFrames,
  };
}

export function hybridTimelineFrame(manifest, frame, session = {}) {
  const hybrid = normalizeHybridManifest(manifest, session);
  const introFrames = hybrid.intro.duration_frames || hybrid.transition.match_cut_start_frame || 0;
  const isIntro = frame < introFrames;
  const isActive = (text) => frame >= text.start_frame && frame < text.start_frame + text.duration_frames;
  const isTextActive = (text) => text.duration_mode === 'until_match_cut'
    ? isIntro && isActive(text)
    : isActive(text);
  return {
    hybrid,
    isIntro,
    matchCutFrame: frame - introFrames,
    isIntroText: isTextActive(hybrid.intro_text),
    isEgo: !isIntro && isActive(hybrid.ego),
  };
}

export function hybridTextStyle(text, frame) {
  const localFrame = frame - text.start_frame;
  const blur = localFrame < text.blur_frames ? (text.blur_frames - localFrame) * 1.5 : 0;
  return {
    position: 'absolute', zIndex: 20, left: `${text.position_x}%`, top: `${text.position_y}%`,
    transform: `translate(-50%, -50%) rotate(${text.rotation_deg}deg) scale(${text.scale})`,
    transformOrigin: 'center center', width: '92%', textAlign: 'center',
    fontFamily: text.font_family, fontSize: `${Math.min(220, 110 * text.scale)}px`,
    fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 0.95, color: text.color,
    WebkitTextStroke: '2px #000000', textShadow: '0 4px 18px rgba(0,0,0,0.9)',
    filter: blur ? `blur(${blur.toFixed(2)}px)` : 'none', textTransform: 'uppercase',
    whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', pointerEvents: 'none',
  };
}

export function hybridEgoStyle(manifest, frame, session = {}) {
  const { hybrid, isEgo } = hybridTimelineFrame(manifest, frame, session);
  return isEgo ? hybridTextStyle(hybrid.ego, frame) : null;
}
