export const AUDIO_SYNC_MODES = ['off', 'manual', 'assisted', 'beat_locked'];

export function normalizeMusicTimeline(value = {}, fps = 30, totalFrames = 300) {
  const music = value || {};
  const beats = Array.isArray(music.beats) ? music.beats : [];
  const toFrame = (seconds) => Math.max(0, Math.round(Number(seconds || 0) * fps));
  const loopIn = Math.max(0, Number(music.loop_in ?? 0));
  const loopOut = Math.max(loopIn, Number(music.loop_out ?? loopIn));
  const climaxTime = music.climax_time == null ? null : Math.max(0, Number(music.climax_time));
  return {
    enabled: music.enabled === true || !!music.audio_file || !!music.audio_src,
    audio_file: music.audio_file || '', audio_src: music.audio_src || '',
    duration_seconds: Math.max(0, Number(music.duration_seconds || 0)), sample_rate: Number(music.sample_rate || 48000),
    bpm: Number(music.bpm || 0), sync_mode: AUDIO_SYNC_MODES.includes(music.sync_mode) ? music.sync_mode : 'manual',
    offset_frames: Number(music.offset_frames || 0),
    beats: beats.map((beat, index) => ({ id: beat.id || `beat_${String(index + 1).padStart(4, '0')}`, time_seconds: Number(beat.time_seconds ?? beat.time ?? 0), frame: Number(beat.frame ?? toFrame(beat.time_seconds ?? beat.time ?? 0)), strength: Number(beat.strength ?? 1), kind: beat.kind || 'beat' })),
    loop_in: loopIn, loop_out: loopOut, loop_count: music.loop_count == null ? 'auto' : Number(music.loop_count), loop_enabled: music.loop_enabled !== false,
    climax_time: climaxTime, climax_frame: climaxTime == null ? null : toFrame(climaxTime),
    match_cut_start_frame: Math.max(0, Number(music.match_cut_start_frame ?? 0)),
    intro_volume: Number(music.intro_volume ?? 1), climax_volume: Number(music.climax_volume ?? 1), match_cut_volume: Number(music.match_cut_volume ?? 1),
    fade_in_frames: Math.max(0, Number(music.fade_in_frames || 0)), fade_out_frames: Math.max(0, Number(music.fade_out_frames || 0)), total_frames: totalFrames,
  };
}

export function audioSegmentAtFrame(timeline, frame, fps) {
  const music = normalizeMusicTimeline(timeline, fps, timeline?.total_frames);
  if (!music.enabled || !music.audio_src) return null;
  const localFrame = Math.max(0, frame + music.offset_frames);
  const loopIn = Math.round(music.loop_in * fps); const loopOut = Math.max(loopIn + 1, Math.round(music.loop_out * fps)); const loopLength = loopOut - loopIn;
  const introEnd = music.match_cut_start_frame || music.climax_frame || 0;
  const sourceFrame = music.loop_enabled && localFrame < introEnd ? loopIn + ((localFrame - loopIn) % loopLength + loopLength) % loopLength : localFrame;
  return { sourceStart: sourceFrame / fps, volume: Math.max(0, localFrame < introEnd ? music.intro_volume : music.match_cut_volume), sourceFrame };
}

export function musicWaveformPoints(beats = [], width = 600, height = 54) {
  if (!beats.length) return '';
  const max = Math.max(...beats.map((b) => Number(b.strength || 1)), 1); const step = width / Math.max(1, beats.length - 1);
  return beats.map((beat, index) => { const x = Math.round(index * step); const amp = Math.max(2, (Number(beat.strength || 1) / max) * (height / 2)); return `${x},${Math.round(height / 2 - amp)} ${x},${Math.round(height / 2 + amp)}`; }).join(' ');
}

export function buildAudioSegments(timeline, fps, totalFrames) {
  const music = normalizeMusicTimeline(timeline, fps, totalFrames);
  if (!music.enabled || !music.audio_src) return [];
  const introEnd = Math.min(totalFrames, music.match_cut_start_frame || music.climax_frame || totalFrames);
  const loopIn = Math.round(music.loop_in * fps); const loopOut = Math.max(loopIn + 1, Math.round(music.loop_out * fps)); const loopLength = loopOut - loopIn;
  const segments = []; let cursor = 0;
  while (cursor < totalFrames) {
    const length = Math.min(loopLength, totalFrames - cursor, cursor < introEnd ? introEnd - cursor : totalFrames - cursor);
    const sourceFrame = cursor < introEnd && music.loop_enabled ? loopIn + ((cursor - loopIn) % loopLength + loopLength) % loopLength : cursor;
    segments.push({ from: cursor, duration: Math.max(1, length), startFrom: sourceFrame, volume: cursor < introEnd ? music.intro_volume : music.match_cut_volume });
    cursor += Math.max(1, length);
  }
  return segments;
}

export default normalizeMusicTimeline;
