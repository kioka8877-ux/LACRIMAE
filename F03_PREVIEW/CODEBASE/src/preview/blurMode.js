/* ═══════════════════════════════════════════════════════════════════
   blurMode.js — Config et helpers pour le Mode Blur PUR
   
   Source : PERTURABO ARCHIVUM/montage/patterns/style_blur.json
   Workflow :
     1. Dupliquer la clip (2 couches)
     2. Couche fond : zoom 2.25x + blur 30px
     3. Couche dessus : taille originale, centrée
     4. Anti-detection : breathing zoom, mirror, speed
   ═══════════════════════════════════════════════════════════════════ */

export const BLUR_DEFAULTS = {
  enabled: false,
  // Couche fond
  bg_zoom: 2.25,
  bg_blur_px: 30,
  bg_brightness: 0.45,
  // Couche dessus (clip centré)
  fg_fit: 'contain',       // 'contain' = ne coupe pas, 'cover' = remplit
  fg_scale: 1.0,
  fg_border_radius: 0,     // arrondi optionnel
  fg_offset_x: 0,          // décalage horizontal %
  fg_offset_y: 0,          // décalage vertical %
  // B-roll (optionnel, pour clips > 25s)
  broll_enabled: false,
  broll_opacity: 0.85,
  broll_fit: 'cover',
  broll_transition: 'crossfade', // 'crossfade' | 'cut'
  broll_transition_frames: 15,   // 0.5s à 30fps
};

/**
 * Génère le style CSS de la couche fond (clip zoomé + flou).
 */
export function blurBackgroundStyle(config = {}, frame, fps = 30) {
  const zoom = config.bg_zoom ?? BLUR_DEFAULTS.bg_zoom;
  const blurPx = config.bg_blur_px ?? BLUR_DEFAULTS.bg_blur_px;
  const brightness = config.bg_brightness ?? BLUR_DEFAULTS.bg_brightness;
  return {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: `scale(${zoom})`,
    transformOrigin: 'center center',
    filter: `blur(${blurPx}px) brightness(${brightness})`,
    pointerEvents: 'none',
  };
}

/**
 * Génère le style CSS de la couche dessus (clip centré, net).
 */
export function blurForegroundStyle(config = {}) {
  const fit = config.fg_fit ?? BLUR_DEFAULTS.fg_fit;
  const scale = config.fg_scale ?? BLUR_DEFAULTS.fg_scale;
  const radius = config.fg_border_radius ?? BLUR_DEFAULTS.fg_border_radius;
  const ox = config.fg_offset_x ?? BLUR_DEFAULTS.fg_offset_x;
  const oy = config.fg_offset_y ?? BLUR_DEFAULTS.fg_offset_y;
  return {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: fit,
    transform: `scale(${scale}) translate(${ox}%, ${oy}%)`,
    transformOrigin: 'center center',
    borderRadius: radius > 0 ? `${radius}px` : undefined,
    pointerEvents: 'none',
  };
}

/**
 * Génère le style CSS pour un B-roll overlay.
 */
export function brollStyle(config = {}, brollEntry) {
  const opacity = config.broll_opacity ?? BLUR_DEFAULTS.broll_opacity;
  const fit = config.broll_fit ?? BLUR_DEFAULTS.broll_fit;
  const transition = config.broll_transition ?? BLUR_DEFAULTS.broll_transition;
  const transFrames = config.broll_transition_frames ?? BLUR_DEFAULTS.broll_transition_frames;
  return {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: fit,
    opacity,
    transition: transition === 'crossfade' ? `opacity ${transFrames / 30}s ease-in-out` : 'none',
    pointerEvents: 'none',
  };
}

/**
 * Parse les paramètres blur depuis un codex/session.
 */
export function parseBlurConfig(codex = {}, session = {}) {
  const raw = session.blur || codex.blur || {};
  return {
    ...BLUR_DEFAULTS,
    ...raw,
    bg_zoom: Number(raw.bg_zoom ?? BLUR_DEFAULTS.bg_zoom),
    bg_blur_px: Number(raw.bg_blur_px ?? BLUR_DEFAULTS.bg_blur_px),
    bg_brightness: Number(raw.bg_brightness ?? BLUR_DEFAULTS.bg_brightness),
    fg_scale: Number(raw.fg_scale ?? BLUR_DEFAULTS.fg_scale),
  };
}
