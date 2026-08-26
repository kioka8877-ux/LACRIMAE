export const AUDIO_SYNC_MODES = ['off', 'manual', 'assisted', 'beat_locked'];
export const AUDIO_TRANSITIONS = ['beat_cut', 'crossfade', 'beat_jump'];

export function normalizeMusicTimeline(value = {}, fps = 30, totalFrames = 300) {
  const music = value || {};
  const intro = music.intro || {};
  const matchCut = music.match_cut || {};
  const transition = music.transition || {};
  const beats = Array.isArray(music.beats) ? music.beats : [];
  const toFrame = (seconds) => Math.max(0, Math.round(Number(seconds || 0) * fps));
  const introIn = Math.max(0, Number(intro.in_seconds ?? music.loop_in ?? 0));
  const introOut = Math.max(introIn + 0.05, Number(intro.out_seconds ?? music.loop_out ?? introIn + 0.05));
  const loopCount = Math.max(1, Math.round(Number(intro.loop_count ?? music.loop_count ?? 1)));
  const introSpeed = Math.max(0.25, Number(intro.speed ?? music.intro_speed ?? 1));
  const matchIn = Math.max(0, Number(matchCut.in_seconds ?? music.match_cut_in ?? music.drop_time ?? 0));
  const matchOut = Math.max(matchIn + 0.05, Number(matchCut.out_seconds ?? music.match_cut_out ?? matchIn + 0.05));
  const matchSpeed = Math.max(0.25, Number(matchCut.speed ?? music.match_cut_speed ?? 1));
  const introDurationSeconds = ((introOut - introIn) * loopCount) / introSpeed;
  const matchCutDurationSeconds = (matchOut - matchIn) / matchSpeed;
  const climaxTime = music.climax_time == null ? introDurationSeconds : Math.max(0, Number(music.climax_time));
  const matchCutStart = toFrame(introDurationSeconds);
  return {
    enabled: music.enabled === true || !!music.audio_file || !!music.audio_src,
    audio_file: music.audio_file || '', audio_src: music.audio_src || '',
    duration_seconds: Math.max(0, Number(music.duration_seconds || 0)), sample_rate: Number(music.sample_rate || 48000),
    bpm: Number(music.bpm || 0), sync_mode: AUDIO_SYNC_MODES.includes(music.sync_mode) ? music.sync_mode : 'manual',
    offset_frames: Number(music.offset_frames || 0),
    beats: beats.map((beat, index) => ({ id: beat.id || `beat_${String(index + 1).padStart(4, '0')}`, time_seconds: Number(beat.time_seconds ?? beat.time ?? 0), frame: Number(beat.frame ?? toFrame(beat.time_seconds ?? beat.time ?? 0)), strength: Number(beat.strength ?? 1), kind: beat.kind || 'beat' })),
    intro: { in_seconds: introIn, out_seconds: introOut, loop_count: loopCount, speed: introSpeed, volume: Number(intro.volume ?? music.intro_volume ?? 1) },
    match_cut: { in_seconds: matchIn, out_seconds: matchOut, speed: matchSpeed, volume: Number(matchCut.volume ?? music.match_cut_volume ?? 1) },
    transition: { type: AUDIO_TRANSITIONS.includes(transition.type) ? transition.type : 'beat_cut', duration_ms: Math.max(0, Number(transition.duration_ms ?? 30)), alignment: transition.alignment || 'nearest_beat' },
    intro_in: introIn, intro_out: introOut, loop_in: introIn, loop_out: introOut, loop_count: loopCount, loop_enabled: music.loop_enabled !== false,
    match_cut_in: matchIn, match_cut_out: matchOut, intro_speed: introSpeed, match_cut_speed: matchSpeed,
    intro_duration_seconds: introDurationSeconds, match_cut_duration_seconds: matchCutDurationSeconds,
    climax_time: climaxTime, climax_frame: toFrame(climaxTime), match_cut_start_frame: matchCutStart,
    intro_volume: Number(intro.volume ?? music.intro_volume ?? 1), climax_volume: Number(music.climax_volume ?? 1), match_cut_volume: Number(matchCut.volume ?? music.match_cut_volume ?? 1),
    fade_in_frames: Math.max(0, Number(music.fade_in_frames || 0)), fade_out_frames: Math.max(0, Number(music.fade_out_frames || 0)), total_frames: totalFrames,
  };
}

export function audioSegmentAtFrame(timeline, frame, fps) {
  const music = normalizeMusicTimeline(timeline, fps, timeline?.total_frames);
  if (!music.enabled || !music.audio_src) return null;
  const localFrame = Math.max(0, frame + music.offset_frames);
  const introEnd = music.match_cut_start_frame;
  const introIn = Math.round(music.intro_in * fps);
  const introOut = Math.max(introIn + 1, Math.round(music.intro_out * fps));
  const loopLength = introOut - introIn;
  const sourceFrame = localFrame < introEnd && music.loop_enabled
    ? introIn + ((localFrame * music.intro_speed - introIn) % loopLength + loopLength) % loopLength
    : Math.min(Math.round(music.match_cut_out * fps), Math.round(music.match_cut_in * fps + (localFrame - introEnd) * music.match_cut_speed));
  return { sourceStart: sourceFrame / fps, volume: localFrame < introEnd ? music.intro_volume : music.match_cut_volume, sourceFrame };
}

export function musicWaveformPoints(beats = [], width = 600, height = 82) {
  if (!beats.length) return '';
  const max = Math.max(...beats.map((b) => Number(b.strength || 1)), 1); const step = width / Math.max(1, beats.length - 1);
  return beats.map((beat, index) => { const x = Math.round(index * step); const amp = Math.max(2, (Number(beat.strength || 1) / max) * (height / 2)); return `${x},${Math.round(height / 2 - amp)} ${x},${Math.round(height / 2 + amp)}`; }).join(' ');
}

export function buildAudioSegments(timeline, fps, totalFrames) {
  const music = normalizeMusicTimeline(timeline, fps, totalFrames);
  if (!music.enabled || !music.audio_src) return [];
  const introEnd = Math.min(totalFrames, music.match_cut_start_frame);
  const introIn = Math.round(music.intro_in * fps);
  const introOut = Math.max(introIn + 1, Math.round(music.intro_out * fps));
  const loopLength = introOut - introIn;
  const segments = []; let cursor = 0;
  while (cursor < totalFrames) {
    const isIntro = cursor < introEnd;
    const length = isIntro ? Math.min(loopLength, introEnd - cursor, totalFrames - cursor) : Math.min(totalFrames - cursor, Math.max(1, Math.round(music.match_cut_duration_seconds * fps)));
    const sourceFrame = isIntro
      ? introIn + ((Math.round(cursor * music.intro_speed) - introIn) % loopLength + loopLength) % loopLength
      : Math.round(music.match_cut_in * fps + (cursor - introEnd) * music.match_cut_speed);
    segments.push({ from: cursor, duration: Math.max(1, length), startFrom: sourceFrame, volume: isIntro ? music.intro_volume : music.match_cut_volume, transition: isIntro ? null : music.transition });
    cursor += Math.max(1, length);
  }
  const firstMatchIndex = segments.findIndex((segment) => segment.from >= introEnd);
  if (firstMatchIndex > 0 && music.transition.type === 'crossfade') {
    const fadeFrames = Math.min(60, Math.max(1, Math.round((music.transition.duration_ms / 1000) * fps)));
    segments[firstMatchIndex - 1].fade_out_frames = Math.min(fadeFrames, segments[firstMatchIndex - 1].duration);
    segments[firstMatchIndex].fade_in_frames = Math.min(fadeFrames, segments[firstMatchIndex].duration);
  }
  return segments;
}

export function musicTimelineManifest(music, fps, totalFrames) {
  return { schema_version: 'dev7.music-timeline.v2', fps, total_frames: totalFrames, ...normalizeMusicTimeline(music, fps, totalFrames) };
}

export function createEmptyMusicTimeline(fps = 30, totalFrames = 300) {
  return normalizeMusicTimeline({ enabled: false, sync_mode: 'off' }, fps, totalFrames);
}

export default normalizeMusicTimeline;
