/* ═══════════════════════════════════════════════════════════════════
   reframingMode.js — Config et helpers pour le Mode Reframing PUR
   
   Source : PERTURABO ARCHIVUM/montage/patterns/style_reframing.json
   
   Le reframing agrandit une vidéo pour remplir le cadre 9:16
   sans blur. C'est le mode le plus simple : fit=cover + zoom
   + positionnement sujet + slow push in.
   
   Pas de composant séparé — on réutilise OmniComposition avec
   des paramètres spécifiques.
   ═══════════════════════════════════════════════════════════════════ */

export const REFRAMING_DEFAULTS = {
  enabled: false,
  // Zoom de base pour remplir 9:16 (dépend du ratio source)
  // 16:9 → ~1.78, 4:3 → ~1.33, 1:1 → ~1.0
  base_zoom: 1.3,
  // Positionnement du sujet (% du centre)
  subject_x: 0,     // -50 à +50 (gauche à droite)
  subject_y: 0,     // -50 à +50 (haut à bas)
  // Slow push in (anti-detection)
  slow_push_in: {
    enabled: true,
    from_scale: 1.02,
    to_scale: 1.08,
  },
  // Crop micro-décalage (anti-detection)
  crop_offset_x: 0,
  crop_offset_y: 0,
};

/**
 * Calcule le scale interpolé pour le slow push in.
 * Progression linéaire de from_scale à to_scale sur toute la durée.
 */
export function reframingPushInScale(config, frame, durationInFrames) {
  const pushIn = config?.slow_push_in || REFRAMING_DEFAULTS.slow_push_in;
  if (!pushIn.enabled) return config?.base_zoom || REFRAMING_DEFAULTS.base_zoom;
  const fromS = pushIn.from_scale ?? 1.02;
  const toS = pushIn.to_scale ?? 1.08;
  const progress = Math.min(1, Math.max(0, frame / Math.max(1, durationInFrames - 1)));
  const pushScale = fromS + (toS - fromS) * progress;
  const baseZoom = config?.base_zoom || REFRAMING_DEFAULTS.base_zoom;
  return baseZoom * pushScale;
}

/**
 * Retourne le style CSS pour la couche vidéo reframée.
 */
export function reframingVideoStyle(config, frame, durationInFrames) {
  const scale = reframingPushInScale(config, frame, durationInFrames);
  const sx = config?.subject_x || 0;
  const sy = config?.subject_y || 0;
  const cropX = config?.crop_offset_x || 0;
  const cropY = config?.crop_offset_y || 0;
  const tx = sx + cropX;
  const ty = sy + cropY;
  return {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: `scale(${scale}) translate(${tx}%, ${ty}%)`,
    transformOrigin: 'center center',
  };
}

/**
 * Parse les paramètres reframing depuis un codex/session.
 */
export function parseReframingConfig(codex = {}, session = {}) {
  const raw = session.reframing || codex?.reframing || {};
  return {
    ...REFRAMING_DEFAULTS,
    ...raw,
    base_zoom: Number(raw.base_zoom ?? REFRAMING_DEFAULTS.base_zoom),
    subject_x: Number(raw.subject_x ?? REFRAMING_DEFAULTS.subject_x),
    subject_y: Number(raw.subject_y ?? REFRAMING_DEFAULTS.subject_y),
    slow_push_in: {
      ...REFRAMING_DEFAULTS.slow_push_in,
      ...(raw.slow_push_in || {}),
      from_scale: Number(raw.slow_push_in?.from_scale ?? REFRAMING_DEFAULTS.slow_push_in.from_scale),
      to_scale: Number(raw.slow_push_in?.to_scale ?? REFRAMING_DEFAULTS.slow_push_in.to_scale),
    },
  };
}
