/* ═══════════════════════════════════════════════════════════════════
   rankingCompilation.js — dev9 list-overlay ranking engine v3
   
   - Numbers are PERMANENT (always visible from frame 0)
   - Labels appear bottom-to-top (rank N → N-1 → ... → 1)
   - Rank #1 always last
   - Compound words (Spider-Man) stay as one word
   ═══════════════════════════════════════════════════════════════════ */

const DEFAULT_GLOBAL_CONTROLS = {
  number_scale: 1,
  label_scale: 1,
  list_x_pct: 5,
  list_y_pct: 25,
  list_spacing: 2,
  title_size: 42,
  title_x_pct: 50,
  title_y_pct: 5,
  title_align: 'center',
};

const clamp = (value, min, max, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};

function normalizeWord(raw) {
  if (typeof raw === 'string') return { text: raw, color: '#FFFFFF' };
  return { text: String(raw?.text ?? ''), color: raw?.color || '#FFFFFF' };
}

function ensureWordCount(words, maxWords = 4) {
  const result = [];
  for (let i = 0; i < maxWords; i++) {
    result.push(normalizeWord(words?.[i]));
  }
  return result;
}

/**
 * Split a string into words, but keep compound words together.
 * "SPIDER-MAN RANKING" → ["SPIDER-MAN", "Ranking"]
 * "Time to go home" → ["Time", "to", "go", "home"]
 */
function splitIntoWords(str) {
  if (!str || !str.trim()) return [];
  // Split on spaces, but keep hyphenated words together
  return str.trim().split(/\s+/).filter(w => w.length > 0);
}

export function normalizeRankingManifest(value = {}, fps = 30, totalFrames = 300) {
  const ranking = value || {};
  const rawEntries = Array.isArray(ranking.entries) ? ranking.entries : [];
  const rawNarrative = ranking.narrative || {};
  const gc = { ...DEFAULT_GLOBAL_CONTROLS, ...(rawNarrative.global_controls || {}) };
  gc.number_scale = clamp(gc.number_scale, 0.3, 3, 1);
  gc.label_scale = clamp(gc.label_scale, 0.3, 3, 1);
  gc.list_x_pct = clamp(gc.list_x_pct, -50, 100, 5);
  gc.list_y_pct = clamp(gc.list_y_pct, -50, 100, 25);
  gc.list_spacing = clamp(gc.list_spacing, -10, 40, 2);
  gc.title_size = clamp(gc.title_size, 20, 120, 42);
  gc.title_x_pct = clamp(gc.title_x_pct, 0, 100, 50);
  gc.title_y_pct = clamp(gc.title_y_pct, 0, 100, 5);

  const titleWords = ensureWordCount(rawNarrative.title_words || [], 4);
  const hasTitleWords = titleWords.some(w => w.text.trim().length > 0);
  let finalTitleWords = titleWords;
  if (!hasTitleWords && rawNarrative.title) {
    const parts = splitIntoWords(rawNarrative.title).slice(0, 4);
    finalTitleWords = ensureWordCount(parts.map((t, i) => ({ text: t, color: i === 1 ? '#FFD400' : '#FFFFFF' })), 4);
  }

  const narrative = {
    title_words: finalTitleWords,
    category: rawNarrative.category || '',
    final_label: rawNarrative.final_label || '',
    global_controls: gc,
    font_family: rawNarrative.font_family || 'Arial Black, sans-serif',
  };

  const totalClips = rawEntries.length;
  let cursor = 0;
  const entries = rawEntries.map((raw, index) => {
    const rank = Number(raw.rank ?? (totalClips - index));
    const durationSeconds = Math.max(0.1, clamp(raw.duration_seconds, 0.1, 60, 3));
    const durationFrames = Math.max(1, Math.round(durationSeconds * fps));
    const rawLabelWords = raw.label_words || [];
    const hasLabelWords = rawLabelWords.some(w => (typeof w === 'string' ? w : w?.text || '').trim().length > 0);
    let labelWords;
    if (hasLabelWords) {
      labelWords = ensureWordCount(rawLabelWords, 4);
    } else if (raw.label) {
      const parts = splitIntoWords(raw.label).slice(0, 4);
      labelWords = ensureWordCount(parts.map(t => ({ text: t, color: '#FFFFFF' })), 4);
    } else {
      labelWords = ensureWordCount([], 4);
    }
    const isFinal = rank === 1;
    return {
      rank,
      source_id: raw.source_id || raw.id || 'rank_' + (index + 1),
      clip_file: raw.clip_file || raw.file || '',
      duration_seconds: durationSeconds,
      duration_frames: durationFrames,
      start_frame: cursor,
      end_frame: cursor + durationFrames,
      label_words: labelWords,
      label: raw.label || labelWords.map(w => w.text).join(' '),
      number_color: raw.number_color || (isFinal ? '#FFD400' : '#FF4444'),
      number_size: clamp(raw.number_size, 12, 100, isFinal ? 56 : 42),
      label_size: clamp(raw.label_size, 8, 80, isFinal ? 28 : 22),
      label_y_top: clamp(raw.label_y_top, 0, 100, 0),
      label_y_bottom: clamp(raw.label_y_bottom, 0, 100, 50),
      role: isFinal ? 'final_rank' : 'rank_entry',
      sfx: { enabled: Boolean(raw.sfx?.enabled), file: raw.sfx?.file || '', volume: Number(raw.sfx?.volume ?? 1) },
    };
  }).sort((a, b) => b.rank - a.rank);

  // Bottom-to-top reveal: rank N first, then N-1, ..., then 1
  const sortedByRank = [...entries].sort((a, b) => b.rank - a.rank);
  let timeCursor = 0;
  const revealTimings = {};
  for (const entry of sortedByRank) {
    const dur = entry.duration_frames;
    revealTimings[entry.rank] = { start_frame: timeCursor, end_frame: timeCursor + dur };
    timeCursor += dur;
  }

  const finalRank = entries.find(e => e.rank === 1) || null;
  return {
    ...ranking,
    schema_version: 'dev9.ranking.v3',
    mode: 'ranking_compilation',
    fps,
    narrative,
    entries,
    rank_count: entries.length,
    final_rank: finalRank,
    reveal_timings: revealTimings,
    total_frames: Math.max(1, timeCursor || totalFrames),
    duration_seconds: Math.max(1 / fps, (timeCursor || totalFrames) / fps),
  };
}

/**
 * Numbers are ALWAYS revealed. Labels follow bottom-to-top timing.
 */
export function rankingActiveRows(manifest, frame) {
  if (!manifest?.entries) return [];
  const timings = manifest.reveal_timings || {};
  return manifest.entries
    .slice()
    .sort((a, b) => b.rank - a.rank)
    .map(entry => {
      const t = timings[entry.rank];
      const labelRevealed = t ? frame >= t.start_frame : false;
      const justAppeared = t ? frame >= t.start_frame && frame < t.start_frame + 6 : false;
      return { ...entry, number_revealed: true, label_revealed: labelRevealed, justAppeared, display_start: t?.start_frame ?? 0 };
    });
}

export function rankingEntryAtFrame(manifest, frame) {
  if (!manifest?.entries) return null;
  const timings = manifest.reveal_timings || {};
  for (const entry of manifest.entries) {
    const t = timings[entry.rank];
    if (t && frame >= t.start_frame && frame < t.end_frame) return entry;
  }
  return manifest.final_rank || manifest.entries[manifest.entries.length - 1] || null;
}

export function rankingMotionTransform() {
  return 'none';
}

export default normalizeRankingManifest;
