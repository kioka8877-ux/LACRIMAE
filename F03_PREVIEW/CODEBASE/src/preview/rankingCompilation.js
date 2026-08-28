const DEFAULT_NARRATIVE = {
  title: 'RANKING',
  category: '',
  header_label: '',
  final_label: '',
  font_family: 'Arial Black',
  title_style: { font_size: 62, color: '#FFFFFF', accent_color: '#FFD400', x_pct: 8, y_pct: 8, align: 'left' },
};

const DEFAULT_POSITION = { x_pct: 50, y_pct: 50, scale: 1, rotation: 0 };
const DEFAULT_TEXT = { font_family: 'Arial Black', font_size: 54, color: '#FFFFFF', accent_color: '#FFD400', x_pct: 8, y_pct: 34, align: 'left' };

const clamp = (value, min, max, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
};

export function normalizeRankingManifest(value = {}, fps = 30, totalFrames = 300) {
  const ranking = value || {};
  const rawEntries = Array.isArray(ranking.entries) ? ranking.entries : [];
  const narrative = {
    ...DEFAULT_NARRATIVE,
    ...(ranking.narrative || {}),
    title_style: { ...DEFAULT_NARRATIVE.title_style, ...(ranking.narrative?.title_style || {}) },
  };
  let cursor = 0;
  const entries = rawEntries.map((raw, index) => {
    const durationSeconds = Math.max(0.1, clamp(raw.duration_seconds, 0.1, 60, 3));
    const position = { ...DEFAULT_POSITION, ...(raw.position || {}) };
    position.x_pct = clamp(position.x_pct, -100, 200, 50);
    position.y_pct = clamp(position.y_pct, -100, 200, 50);
    position.scale = clamp(position.scale, 0.05, 10, 1);
    position.rotation = clamp(position.rotation, -180, 180, 0);
    const textStyle = { ...DEFAULT_TEXT, ...(raw.text_style || {}) };
    textStyle.font_size = clamp(textStyle.font_size, 8, 400, 54);
    textStyle.x_pct = clamp(textStyle.x_pct, 0, 100, 8);
    textStyle.y_pct = clamp(textStyle.y_pct, 0, 100, 34);
    const durationFrames = Math.max(1, Math.round(durationSeconds * fps));
    const rank = Number(raw.rank ?? index + 1);
    const normalized = {
      ...raw,
      rank: Number.isFinite(rank) ? rank : index + 1,
      source_id: raw.source_id || raw.id || `rank_${index + 1}`,
      clip_file: raw.clip_file || raw.file || '',
      duration_seconds: durationSeconds,
      duration_frames: durationFrames,
      start_frame: cursor,
      end_frame: cursor + durationFrames,
      position,
      label: String(raw.label ?? ''),
      text_style: textStyle,
      sfx: { enabled: Boolean(raw.sfx?.enabled), file: raw.sfx?.file || '', offset_seconds: Number(raw.sfx?.offset_seconds || 0), volume: Number(raw.sfx?.volume ?? 1) },
      role: raw.role || (rank === 1 ? 'final_rank' : 'rank_entry'),
    };
    cursor += durationFrames;
    return normalized;
  }).sort((a, b) => b.rank - a.rank);
  const finalRank = entries.find((entry) => entry.rank === 1) || entries[entries.length - 1] || null;
  return {
    ...ranking,
    schema_version: ranking.schema_version || 'dev9.ranking.v1',
    mode: 'ranking_compilation',
    fps,
    narrative,
    entries,
    rank_count: entries.length,
    final_rank: finalRank,
    total_frames: Math.max(1, cursor || totalFrames),
    duration_seconds: Math.max(1 / fps, (cursor || totalFrames) / fps),
  };
}

export function rankingEntryAtFrame(manifest, frame) {
  return manifest?.entries?.find((entry) => frame >= entry.start_frame && frame < entry.end_frame) || manifest?.entries?.[manifest.entries.length - 1] || null;
}

export function rankingActiveRows(manifest, frame) {
  const active = rankingEntryAtFrame(manifest, frame);
  return (manifest?.entries || []).map((entry) => ({ ...entry, active: entry.rank === active?.rank, revealed: entry.start_frame <= frame }));
}

export function rankingMotionTransform(entry, frame, fps) {
  const position = entry?.position || DEFAULT_POSITION;
  const local = Math.max(0, frame - Number(entry?.start_frame || 0));
  const phase = local / Math.max(1, Number(entry?.duration_frames || fps * 3));
  const drift = entry?.motion?.preset || 'none';
  const intensity = clamp(entry?.motion?.intensity, 0, 1, 0.25) * 2;
  const dx = drift === 'drift_left' ? -phase * intensity : drift === 'drift_right' ? phase * intensity : 0;
  const dy = drift === 'drift_up' ? -phase * intensity : drift === 'drift_down' ? phase * intensity : 0;
  return `translate(${(position.x_pct + dx).toFixed(3)}%, ${(position.y_pct + dy).toFixed(3)}%) translate(-50%, -50%) rotate(${position.rotation}deg) scale(${position.scale})`;
}

export default normalizeRankingManifest;
