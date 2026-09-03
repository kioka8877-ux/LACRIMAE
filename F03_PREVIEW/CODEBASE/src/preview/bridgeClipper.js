/* ═══════════════════════════════════════════════════════════════════
   bridgeClipper.js — PERTURABO Mode PUR → LACRIMAE ranking_manifest
   
   Parses montage_instructions.json (from PERTURABO F06_DIRECTOR)
   and converts it into the ranking_manifest format that dev9/dev10
   RankingCompilationComposition understands.
   
   Also supports production_pack.json (from F05_PACKAGER) as input.
   
   PERTURABO outputs:
     montage_instructions.json → hook, body (cuts, zooms, text), outro
     production_pack.json → identite, source, angle, cut, style, text_payload
   
   LACRIMAE expects:
     ranking_manifest → entries[], narrative{}, total_frames, fps
   ═══════════════════════════════════════════════════════════════════ */

const clamp = (value, min, max, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};

/**
 * Parse a montage_instructions.json from PERTURABO F06_DIRECTOR
 * and return a ranking_manifest compatible with RankingCompilationComposition.
 *
 * @param {object} instructions - The montage_instructions.json content
 * @param {object} options - { fps: 30, clipFiles: ['clips/clip1.mp4', ...] }
 * @returns {object} ranking_manifest
 */
export function parseMontageInstructions(instructions, options = {}) {
  const fps = options.fps || 30;
  const clipFiles = options.clipFiles || [];

  if (!instructions || typeof instructions !== 'object') {
    return createEmptyManifest(fps);
  }

  const segment = instructions.segment || {};
  const hook = instructions.hook || {};
  const body = instructions.body || {};
  const outro = instructions.outro || {};
  const textPayload = instructions.text_payload || {};
  const style = instructions.style || {};
  const platformRules = instructions.platform_rules || {};

  // Calculate durations
  const hookDuration = hook.duration_sec || 3;
  const bodyDuration = body.duration_sec || (segment.duration_sec || 30) - hookDuration;
  const outroDuration = outro.duration_sec || 2;
  const totalDuration = hookDuration + bodyDuration + outroDuration;

  // Build entries from cuts (body cuts define the ranking segments)
  const cuts = body.cuts || [];
  const entries = cuts.map((cut, index) => {
    const rank = cuts.length - index; // countdown from N to 1
    const duration = cut.duration_sec || 3;
    const clipFile = clipFiles[index] || clipFiles[0] || '';

    // B-roll from body.text_overlays or body.zooms
    const broll = extractBrollForSegment(index, instructions);

    // Anti-detection settings
    const antiDetection = extractAntiDetection(instructions);

    return {
      rank,
      source_id: `pur_rank_${rank}`,
      clip_file: clipFile,
      duration_seconds: duration,
      label_words: extractLabelWords(textPayload, index, rank),
      label: extractLabelText(textPayload, index, rank),
      number_color: rank === 1 ? '#FFD400' : '#FF4444',
      number_size: rank === 1 ? 56 : 42,
      label_size: rank === 1 ? 28 : 22,
      sfx: extractSfx(index, instructions),
      broll: broll,
      anti_detection: antiDetection,
      role: rank === 1 ? 'final_rank' : 'rank_entry',
    };
  });

  // Build narrative from text_payload
  const narrative = {
    title_words: extractTitleWords(textPayload),
    category: style.pacing || '',
    final_label: textPayload.cta_text || '',
    global_controls: {
      title_scale: 1,
      number_scale: 1,
      label_scale: 1,
      clip_audio: true,
      list_x_pct: 5,
      list_y_pct: 25,
      list_spacing: 2,
      title_size: 42,
      title_x_pct: 50,
      title_y_pct: 5,
      title_align: 'center',
      // PUR mode additions
      layout: 'fullscreen', // 'fullscreen' or 'split'
      hook_duration: hookDuration,
      body_duration: bodyDuration,
      outro_duration: outroDuration,
      energy_level: style.energy_level || 'intense',
      cut_density: style.cut_density || 10,
    },
    font_family: 'Arial Black, sans-serif',
  };

  return {
    schema_version: 'dev10.pur.v1',
    mode: 'ranking_compilation',
    fps,
    narrative,
    entries,
    rank_count: entries.length,
    final_rank: entries.find(e => e.rank === 1) || null,
    total_frames: Math.round(totalDuration * fps),
    duration_seconds: totalDuration,
    // PUR-specific metadata
    pur: {
      source: segment.source_url || '',
      platform: platformRules.platform || 'youtube_shorts',
      hook: {
        type: hook.type || 'statement',
        template: hook.template || '',
        duration_sec: hookDuration,
        zoom: hook.zoom || {},
        text_overlay: hook.text_overlay || {},
      },
      energy_curve: body.energy_curve || [],
      transitions: body.transitions || [],
      compliance: instructions.compliance || {},
    },
  };
}

/**
 * Parse a production_pack.json from PERTURABO F05_PACKAGER
 * and return a ranking_manifest.
 *
 * @param {object} pack - The production_pack.json content
 * @param {object} options - { fps: 30, clipFiles: [...] }
 * @returns {object} ranking_manifest
 */
export function parseProductionPack(pack, options = {}) {
  const fps = options.fps || 30;
  const clipFiles = options.clipFiles || [];

  if (!pack || typeof pack !== 'object') {
    return createEmptyManifest(fps);
  }

  const source = pack.source || {};
  const cutDirectives = pack.cut_directives || {};
  const textPayload = pack.text_payload || {};
  const style = pack.reference_style || {};
  const angle = pack.angle || {};
  const segments = source.suggested_segments || [];

  // Build entries from suggested segments
  const entries = segments.map((seg, index) => {
    const rank = segments.length - index;
    const duration = (seg.end_sec || 30) - (seg.start_sec || 0);
    const clipFile = clipFiles[index] || clipFiles[0] || '';

    return {
      rank,
      source_id: `pack_rank_${rank}`,
      clip_file: clipFile,
      duration_seconds: Math.max(0.1, duration),
      label_words: extractLabelWords(textPayload, index, rank),
      label: extractLabelText(textPayload, index, rank),
      number_color: rank === 1 ? '#FFD400' : '#FF4444',
      number_size: rank === 1 ? 56 : 42,
      label_size: rank === 1 ? 28 : 22,
      sfx: { enabled: false, file: '', volume: 0.8 },
      broll: null,
      anti_detection: null,
      role: rank === 1 ? 'final_rank' : 'rank_entry',
    };
  });

  const totalDuration = entries.reduce((sum, e) => sum + e.duration_seconds, 0);

  return {
    schema_version: 'dev10.pur.v1',
    mode: 'ranking_compilation',
    fps,
    narrative: {
      title_words: extractTitleWords(textPayload),
      category: style.pacing || '',
      final_label: textPayload.cta_text || '',
      global_controls: {
        title_scale: 1,
        number_scale: 1,
        label_scale: 1,
        clip_audio: true,
        list_x_pct: 5,
        list_y_pct: 25,
        list_spacing: 2,
        title_size: 42,
        title_x_pct: 50,
        title_y_pct: 5,
        title_align: 'center',
        layout: 'fullscreen',
      },
      font_family: 'Arial Black, sans-serif',
    },
    entries,
    rank_count: entries.length,
    final_rank: entries.find(e => e.rank === 1) || null,
    total_frames: Math.round(totalDuration * fps),
    duration_seconds: totalDuration,
    pur: {
      source: source.video_url || '',
      platform: pack.cibles?.target_platform || 'youtube',
      angle_family: angle.angle_family || '',
      emotion_mode: angle.emotion_mode || '',
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────

function createEmptyManifest(fps) {
  return {
    schema_version: 'dev10.pur.v1',
    mode: 'ranking_compilation',
    fps,
    narrative: { title_words: [], category: '', final_label: '', global_controls: {}, font_family: 'Arial Black, sans-serif' },
    entries: [],
    rank_count: 0,
    final_rank: null,
    total_frames: 0,
    duration_seconds: 0,
    pur: {},
  };
}

function extractTitleWords(textPayload) {
  const titles = textPayload.titles || [];
  if (titles.length > 0) {
    const best = titles[0]; // rank 1 title
    const text = best.text || '';
    const words = text.trim().split(/\s+/).slice(0, 4);
    return words.map((w, i) => ({
      text: w,
      color: i === 0 ? '#FFD400' : '#FFFFFF',
    }));
  }
  // Fallback: use on_screen_text
  const ost = textPayload.on_screen_text || '';
  if (ost) {
    return ost.trim().split(/\s+/).slice(0, 4).map((w, i) => ({
      text: w,
      color: i === 0 ? '#FFD400' : '#FFFFFF',
    }));
  }
  return [{ text: 'TOP', color: '#FFD400' }, { text: 'MOMENTS', color: '#FFFFFF' }];
}

function extractLabelWords(textPayload, index, rank) {
  const titles = textPayload.titles || [];
  const title = titles[index] || titles[0] || {};
  const text = title.text || `Rank ${rank}`;
  const words = text.trim().split(/\s+/).slice(0, 4);
  return words.map(w => ({ text: w, color: '#FFFFFF' }));
}

function extractLabelText(textPayload, index, rank) {
  const titles = textPayload.titles || [];
  const title = titles[index] || titles[0] || {};
  return title.text || `Rank ${rank}`;
}

function extractSfx(index, instructions) {
  const body = instructions.body || {};
  const transitions = body.transitions || [];
  // Find a transition near this cut
  const transition = transitions[index] || transitions[0];
  if (transition) {
    return {
      enabled: true,
      file: transition.sound_effect?.type || 'whoosh.mp3',
      volume: 0.8,
    };
  }
  return { enabled: false, file: '', volume: 0.8 };
}

function extractBrollForSegment(index, instructions) {
  // In PERTURABO's format, B-roll is not explicitly in montage_instructions
  // but can be inferred from text_overlays or body content
  // For now, return null (no B-roll by default)
  return null;
}

function extractAntiDetection(instructions) {
  // PERTURABO's anti_detection is in the production_pack, not montage_instructions
  // Return default anti-detection settings
  return {
    mirror: false,
    zoom: { type: 'slow_push_in', start_pct: 100, end_pct: 108 },
    speed: 1.0,
    crop: { top_pct: 0, bottom_pct: 0, left_pct: 0, right_pct: 0 },
  };
}

export default parseMontageInstructions;
