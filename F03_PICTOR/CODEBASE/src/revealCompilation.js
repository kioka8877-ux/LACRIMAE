const DEFAULT_NARRATIVE = {
  theme: 'REVEAL COMPILATION',
  others_label: 'OTHERS',
  this_one_label: 'THIS ONE',
  transition_text: '',
  final_text: '',
};

const DEFAULT_REVEAL = {
  enabled: true,
  darkness: 0.72,
  shake_power: 85,
  shake_duration_frames: 12,
  impact_frame_offset: 0,
};

export function normalizeRevealManifest(value = {}, fps = 30, totalFrames = 300) {
  const reveal = value || {};
  const sourceRows = Array.isArray(reveal.sources) ? reveal.sources : [];
  const narrative = { ...DEFAULT_NARRATIVE, ...(reveal.narrative || {}) };
  const revealSettings = { ...DEFAULT_REVEAL, ...(reveal.reveal || {}) };
  const fallbackDuration = Math.max(1, Math.round(totalFrames / Math.max(1, fps)));
  const scenes = Array.isArray(reveal.scenes) && reveal.scenes.length
    ? reveal.scenes
    : sourceRows.map((source, index) => ({
        source_id: source.id || `reveal_${String(index + 1).padStart(2, '0')}`,
        duration_seconds: Number(source.duration_seconds || fallbackDuration / Math.max(1, sourceRows.length)),
        transition: index % 2 === 0 ? 'with_sfx' : 'silent',
        motion: { preset: index % 2 === 0 ? 'drift_left' : 'drift_right', intensity: 0.35 },
      }));
  let cursor = 0;
  const normalizedScenes = scenes.map((scene, index) => {
    const sourceId = scene.source_id || sourceRows[index]?.id || `reveal_${String(index + 1).padStart(2, '0')}`;
    const source = sourceRows.find((row) => row.id === sourceId) || sourceRows[index] || {};
    const durationSeconds = Math.max(0.1, Number(scene.duration_seconds ?? source.duration_seconds ?? 1));
    const durationFrames = Math.max(1, Math.round(durationSeconds * fps));
    const isFinal = Boolean(scene.final_reveal || source.role === 'final_reveal' || index === sourceRows.length - 1);
    const normalized = {
      ...scene,
      source_id: sourceId,
      duration_seconds: durationSeconds,
      duration_frames: durationFrames,
      start_frame: cursor,
      end_frame: cursor + durationFrames,
      transition: scene.transition === 'silent' ? 'silent' : 'with_sfx',
      final_reveal: isFinal,
      motion: { preset: 'none', intensity: 0.25, ...(scene.motion || {}) },
    };
    cursor += durationFrames;
    return normalized;
  });
  const normalizedSources = sourceRows.map((source, index) => ({
    id: source.id || `reveal_${String(index + 1).padStart(2, '0')}`,
    file: source.file || source.source || '',
    duration_seconds: Number(source.duration_seconds || 0),
    duration_frames: Number(source.duration_frames || 0),
    role: source.role || (index === sourceRows.length - 1 ? 'final_reveal' : 'other'),
    mirror: Boolean(source.mirror),
    fit_mode: source.fit_mode || 'crop',
    focal_x: Number(source.focal_x ?? 50),
    focal_y: Number(source.focal_y ?? 50),
  }));
  const finalScene = normalizedScenes.find((scene) => scene.final_reveal) || normalizedScenes[normalizedScenes.length - 1];
  const finalStart = finalScene?.start_frame ?? Math.max(0, cursor - Math.round(fps * 2));
  return {
    ...reveal,
    schema_version: reveal.schema_version || 'dev8.reveal-compilation.v1',
    mode: 'reveal_compilation',
    fps,
    narrative,
    reveal: revealSettings,
    sources: normalizedSources,
    scenes: normalizedScenes,
    total_frames: Math.max(1, cursor || totalFrames),
    duration_seconds: Math.max(1 / fps, (cursor || totalFrames) / fps),
    final_scene_id: finalScene?.source_id || null,
    final_start_frame: finalStart,
  };
}

export function revealSceneAtFrame(manifest, frame) {
  const scenes = manifest?.scenes || [];
  return scenes.find((scene) => frame >= scene.start_frame && frame < scene.end_frame) || scenes[scenes.length - 1] || null;
}

export function revealSourceForScene(manifest, scene) {
  return manifest?.sources?.find((source) => source.id === scene?.source_id) || null;
}

export function revealMotionTransform(scene, frame, fps) {
  const motion = scene?.motion || {};
  const intensity = Math.max(0, Math.min(1, Number(motion.intensity ?? 0.25)));
  const local = Math.max(0, frame - Number(scene?.start_frame || 0));
  const progress = Math.max(0, Math.min(1, local / Math.max(1, Number(scene?.duration_frames || 1))));
  const drift = (progress - 0.5) * intensity * 8;
  const zoom = 1 + Math.sin(progress * Math.PI) * intensity * 0.045;
  const preset = motion.preset || 'none';
  const x = preset === 'drift_left' ? -drift : preset === 'drift_right' ? drift : 0;
  const y = preset === 'drift_up' ? -drift : preset === 'drift_down' ? drift : 0;
  return `translate(${x.toFixed(3)}%, ${y.toFixed(3)}%) scale(${zoom.toFixed(4)})`;
}

export default normalizeRevealManifest;
