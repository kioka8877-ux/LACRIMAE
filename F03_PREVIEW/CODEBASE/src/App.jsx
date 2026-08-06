import React, { useState, useEffect, useRef } from 'react';
import { Player } from '@remotion/player';
import { OmniComposition } from './preview/OmniComposition';

/**
 * App — F03 PREVIEW (v4.0 — session + clips)
 *
 * Charge le codex.json (bloc session + clips) et le clip 9:16 depuis public/,
 * rend la composition en temps réel via @remotion/player.
 *
 * L'opérateur ajuste la SESSION (style global appliqué aux N clips) :
 *  - Fond : menu déroulant des PNG déposés dans public/backgrounds/ (dossier
 *    dédié, comme CRUSADER) ou couleur unie + échelle
 *  - Logo : taille (pas déplaçable — le pack impose le placement)
 *  - Textes : mode titre seul / titre+paragraphe (titre haut, paragraphe bas)
 *  - Presets : couleurs, 4K, netteté, grain, vignette, volume, coup brutal
 *  - Export codex.json validé (validated_by_magos: true)
 */

export default function App() {
  const [codex, setCodex] = useState(null);        // codex complet (session + clips)
  const [clip, setClip] = useState(null);          // clip en cours d'édition
  const [session, setSession] = useState(null);    // session (style global)
  const [videoSrc, setVideoSrc] = useState('');
  const [backgrounds, setBackgrounds] = useState([]); // liste des fonds PNG
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [validated, setValidated] = useState(false);
  const [activeTab, setActiveTab] = useState('text');
  const playerRef = useRef(null);

  // Charger le codex.json (v4 : session + clips), la vidéo et les fonds
  useEffect(() => {
    async function loadAssets() {
      try {
        const codexResp = await fetch('./codex.json');
        if (!codexResp.ok) throw new Error('codex.json non trouvé dans public/');
        const full = await codexResp.json();
        const clipFirst = full.clips?.[0] || full;
        setCodex(full);
        setClip(clipFirst);
        setSession(full.session || {});
        setVideoSrc(clipFirst.video?.source ? './' + clipFirst.video.source : './clip_001.mp4');
        // Liste des fonds PNG (écrite par le transit F02 / bridge)
        try {
          const bgResp = await fetch('./backgrounds/manifest.json');
          if (bgResp.ok) {
            const bg = await bgResp.json();
            setBackgrounds(Array.isArray(bg) ? bg : (bg.files || []));
          }
        } catch (e) {
          setBackgrounds([]); // pas de dossier fonds — menu vide
        }
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }
    loadAssets();
  }, []);

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳ Chargement...</div>
        <div style={{ fontSize: '14px', color: '#666' }}>Lecture du codex.json, du clip et des fonds</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.loading}>
        <div style={{ fontSize: '24px', color: '#ff4444', marginBottom: '10px' }}>❌ Erreur</div>
        <div style={{ fontSize: '14px', color: '#888' }}>{error}</div>
        <div style={{ marginTop: '20px', fontSize: '13px', color: '#666', textAlign: 'left' }}>
          <strong>Setup requis:</strong>
          <br />1. Placez <code>codex.json</code> dans <code>public/</code>
          <br />2. Placez <code>clip_001.mp4</code> dans <code>public/</code>
          <br />3. Placez vos fonds PNG dans <code>public/backgrounds/</code>
          <br />4. Lancez <code>npm run dev</code>
        </div>
      </div>
    );
  }

  const fps = clip.video?.fps || 30;
  const totalFrames = clip.video?.total_frames || 300;
  const vidWidth = clip.video?.width || 1080;
  const vidHeight = clip.video?.height || 1920;

  // ── Helpers session ──
  const updateSession = (section, key, value) => {
    const newSession = {
      ...session,
      [section]: { ...(session[section] || {}), [key]: value },
    };
    setSession(newSession);
  };
  const updateClip = (key, value) => setClip({ ...clip, [key]: value });
  const updateTexts = (key, value) => setClip({ ...clip, texts: { ...(clip.texts || {}), [key]: value } });
  const updateSessionTextsStyle = (key, value) =>
    updateSession('texts_style', key, value);
  const updatePreset = (key, value) => updateSession('presets', key, value);

  const exportCodex = () => {
    // Réintègre le clip édité + la session dans le codex multi-clips
    const merged = {
      ...(codex || {}),
      session,
      clips: codex?.clips
        ? [clip, ...(codex.clips || []).slice(1)]
        : [clip],
    };
    const finalCodex = validated ? { ...merged, validated_by_magos: true } : merged;
    const blob = new Blob([JSON.stringify(finalCodex, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'codex.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const texts = clip.texts || {};
  const textMode = texts.mode || (texts.title ? 'title' : 'none');
  const presets = session.presets || {};
  const background = session.background || {};

  return (
    <div style={styles.app}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '0.05em' }}>
          LACRIMAE — F03 Preview <span style={{ fontSize: 12, color: '#00ff88' }}>v4 session</span>
        </div>
        <div style={{ fontSize: '13px', color: '#888' }}>
          🖼 {background.image ? background.image : background.color || 'fond'}
          {'  |  '}
          📝 {textMode}
          {'  |  '}
          🎨 {presets.color_preset || 'punchy'}
          {'  |  '}
          🔊 {Math.round((clip.volume ?? 1) * 100)}%
          {'  |  '}
          ⏱️ {(totalFrames / fps).toFixed(1)}s
        </div>
      </div>

      {/* Main layout */}
      <div style={styles.mainLayout}>
        {/* Player */}
        <div style={styles.playerContainer}>
          <Player
            ref={playerRef}
            component={OmniComposition}
            inputProps={{ codex: clip, videoSrc, session }}
            durationInFrames={totalFrames}
            fps={fps}
            compositionWidth={vidWidth}
            compositionHeight={vidHeight}
            style={{
              width: '100%',
              maxWidth: '300px',
              aspectRatio: '9 / 16',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
            controls
            loop
          />
        </div>

        {/* Right panel */}
        <div style={styles.panel}>
          <div style={styles.tabs}>
            <button style={activeTab === 'text' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('text')}>
              📝 Texte
            </button>
            <button style={activeTab === 'fond' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('fond')}>
              🖼 Fond & Logo
            </button>
            <button style={activeTab === 'effects' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('effects')}>
              🎨 Effets
            </button>
            <button style={activeTab === 'sharp' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('sharp')}>
              🔍 Netteté
            </button>
          </div>

          {/* ══════════ TEXTE : mode titre / titre+paragraphe ══════════ */}
          {activeTab === 'text' && (
            <div style={styles.panelContent}>
              <label style={styles.label}>Mode texte</label>
              <select
                style={styles.select}
                value={textMode}
                onChange={(e) => updateTexts('mode', e.target.value)}
              >
                <option value="title">Titre seul</option>
                <option value="title+paragraph">Titre + paragraphe</option>
                <option value="none">Aucun texte</option>
              </select>

              <label style={styles.label}>Titre (haut)</label>
              <input
                style={styles.input}
                type="text"
                value={texts.title || ''}
                onChange={(e) => updateTexts('title', e.target.value)}
              />
              <label style={styles.label}>
                Position titre (haut): {(texts.title_offset_pct ?? 8)}%
              </label>
              <input
                style={styles.slider}
                type="range"
                min="2"
                max="30"
                value={texts.title_offset_pct ?? 8}
                onChange={(e) => updateTexts('title_offset_pct', parseInt(e.target.value))}
              />

              {(textMode === 'title+paragraph') && (
                <>
                  <label style={styles.label}>Paragraphe (bas, 4 lignes max)</label>
                  <textarea
                    style={{ ...styles.input, minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }}
                    value={texts.paragraph || ''}
                    onChange={(e) => updateTexts('paragraph', e.target.value)}
                  />
                  <label style={styles.label}>
                    Position paragraphe (bas): {(texts.paragraph_offset_pct ?? 8)}%
                  </label>
                  <input
                    style={styles.slider}
                    type="range"
                    min="2"
                    max="30"
                    value={texts.paragraph_offset_pct ?? 8}
                    onChange={(e) => updateTexts('paragraph_offset_pct', parseInt(e.target.value))}
                  />
                </>
              )}

              {/* Style global des textes (session) */}
              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #333' }}>
                <label style={{ ...styles.label, color: '#00ff88', fontSize: '14px' }}>
                  🎨 Style global des textes (tous les clips)
                </label>

                <label style={styles.label}>Police</label>
                <select
                  style={styles.select}
                  value={(session.texts_style || {}).font || 'Impact, Arial Black, sans-serif'}
                  onChange={(e) => updateSessionTextsStyle('font', e.target.value)}
                >
                  <option value="Impact, Arial Black, sans-serif">Impact</option>
                  <option value="Arial Black, sans-serif">Arial Black</option>
                  <option value="Bebas Neue, sans-serif">Bebas Neue</option>
                  <option value="Helvetica, sans-serif">Helvetica</option>
                </select>

                <label style={styles.label}>
                  Taille titre: {(session.texts_style || {}).size_title || 96}px
                </label>
                <input
                  style={styles.slider}
                  type="range"
                  min="40"
                  max="180"
                  value={(session.texts_style || {}).size_title || 96}
                  onChange={(e) => updateSessionTextsStyle('size_title', parseInt(e.target.value))}
                />

                <label style={styles.label}>
                  Taille paragraphe: {(session.texts_style || {}).size_paragraph || 44}px
                </label>
                <input
                  style={styles.slider}
                  type="range"
                  min="20"
                  max="80"
                  value={(session.texts_style || {}).size_paragraph || 44}
                  onChange={(e) => updateSessionTextsStyle('size_paragraph', parseInt(e.target.value))}
                />

                <label style={styles.label}>Couleur texte</label>
                <input
                  style={styles.colorPicker}
                  type="color"
                  value={(session.texts_style || {}).color || '#FFFFFF'}
                  onChange={(e) => updateSessionTextsStyle('color', e.target.value)}
                />

                <label style={styles.label}>Contour</label>
                <input
                  style={styles.slider}
                  type="range"
                  min="0"
                  max="8"
                  value={(session.texts_style || {}).stroke_width || 4}
                  onChange={(e) => updateSessionTextsStyle('stroke_width', parseInt(e.target.value))}
                />
              </div>
            </div>
          )}

          {/* ══════════ FOND & LOGO : menu déroulant des PNG + taille logo ══════════ */}
          {activeTab === 'fond' && (
            <div style={styles.panelContent}>
              <label style={{ ...styles.label, color: '#00ff88', fontSize: '14px' }}>
                🖼 FOND (dossier public/backgrounds/)
              </label>
              <select
                style={styles.select}
                value={background.image || 'solid'}
                onChange={(e) => {
                  const v = e.target.value;
                  updateSession('background', 'image', v === 'solid' ? null : v);
                }}
              >
                <option value="solid">Couleur unie</option>
                {backgrounds.map((bg) => (
                  <option key={bg} value={bg}>🖼 {bg}</option>
                ))}
              </select>
              {backgrounds.length === 0 && (
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Aucun PNG trouvé — déposez vos fonds dans <code>public/backgrounds/</code>
                </div>
              )}

              {background.image ? (
                <>
                  <label style={styles.label}>
                    Échelle du fond: {(background.scale ?? 1).toFixed(2)}x
                  </label>
                  <input
                    style={styles.slider}
                    type="range"
                    min="0.8"
                    max="2"
                    step="0.05"
                    value={background.scale ?? 1}
                    onChange={(e) => updateSession('background', 'scale', parseFloat(e.target.value))}
                  />
                </>
              ) : (
                <>
                  <label style={styles.label}>Couleur de fond</label>
                  <input
                    style={styles.colorPicker}
                    type="color"
                    value={background.color || '#0a0a0a'}
                    onChange={(e) => updateSession('background', 'color', e.target.value)}
                  />
                </>
              )}

              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #333' }}>
                <label style={{ ...styles.label, color: '#00ff88', fontSize: '14px' }}>
                  🏷 LOGO (en bas du cadre — taille ajustable, placement fixe)
                </label>
                <label style={styles.label}>
                  Taille du logo: {(session.logo || {}).width_pct || 20}%
                </label>
                <input
                  style={styles.slider}
                  type="range"
                  min="5"
                  max="60"
                  value={(session.logo || {}).width_pct || 20}
                  onChange={(e) => updateSession('logo', 'width_pct', parseInt(e.target.value))}
                />
                <label style={styles.label}>
                  Opacité: {Math.round(((session.logo || {}).opacity ?? 1) * 100)}%
                </label>
                <input
                  style={styles.slider}
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(((session.logo || {}).opacity ?? 1) * 100)}
                  onChange={(e) => updateSession('logo', 'opacity', parseInt(e.target.value) / 100)}
                />
                <div style={{ marginTop: '8px', padding: '8px', background: '#1a1a1a', borderRadius: '8px', fontSize: '12px', color: '#888' }}>
                  Placez <code>logo.png</code> dans <code>public/</code>. Le placement
                  (bas) est imposé — seule la taille est réglable, comme décidé.
                </div>
              </div>
            </div>
          )}

          {/* ══════════ EFFETS : presets globaux (session) ══════════ */}
          {activeTab === 'effects' && (
            <div style={styles.panelContent}>
              <label style={styles.label}>Color preset (global)</label>
              <select
                style={styles.select}
                value={presets.color_preset || 'punchy'}
                onChange={(e) => {
                  const preset = e.target.value;
                  const filters = {
                    warm_vibrant: 'contrast(1.2) saturate(1.15) brightness(1.05) hue-rotate(3deg)',
                    cold_desaturated: 'contrast(1.1) saturate(0.6) brightness(0.95) hue-rotate(-10deg)',
                    high_contrast: 'contrast(1.5) saturate(1.3) brightness(1.0)',
                    punchy: 'contrast(1.3) saturate(1.5) brightness(1.1)',
                    sepia_soft: 'sepia(0.3) contrast(1.1) saturate(0.9) brightness(1.05)',
                  };
                  updatePreset('color_preset', preset);
                  updatePreset('color_css_filter', filters[preset] || '');
                }}
              >
                <option value="warm_vibrant">Warm Vibrant</option>
                <option value="cold_desaturated">Cold Desaturated</option>
                <option value="high_contrast">High Contrast</option>
                <option value="punchy">Punchy</option>
                <option value="sepia_soft">Sepia Soft</option>
              </select>

              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #333' }}>
                <label style={{ ...styles.label, color: '#00ff88', fontSize: '14px' }}>
                  🔊 Audio + Coup brutal
                </label>
                <label style={styles.label}>
                  Volume: {Math.round((clip.volume ?? 1) * 100)}%
                </label>
                <input
                  style={styles.slider}
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round((clip.volume ?? 1) * 100)}
                  onChange={(e) => updateClip('volume', parseInt(e.target.value) / 100)}
                />
                <label style={styles.label}>
                  Coup brutal toutes les:{' '}
                  {clip.brutal_cut_interval_frames ? (clip.brutal_cut_interval_frames / fps).toFixed(1) + 's' : 'désactivé'}
                </label>
                <input
                  style={styles.slider}
                  type="range"
                  min="0"
                  max="12"
                  step="0.5"
                  value={(clip.brutal_cut_interval_frames || 0) / fps}
                  onChange={(e) => updateClip('brutal_cut_interval_frames', Math.round(parseFloat(e.target.value) * fps))}
                />
              </div>

              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #333' }}>
                <label style={{ ...styles.label, color: '#00ff88', fontSize: '14px' }}>
                  ⏩ Slow Motion + Shake
                </label>
                <label style={styles.label}>
                  Cut start: {((clip.slowmo_start_frame || 0) / fps).toFixed(1)}s
                </label>
                <input
                  style={styles.slider}
                  type="range"
                  min="0"
                  max={totalFrames}
                  step={fps}
                  value={clip.slowmo_start_frame || 0}
                  onChange={(e) => updateClip('slowmo_start_frame', parseInt(e.target.value))}
                />
                <label style={styles.label}>
                  Vitesse: {Math.round((clip.slowmo_speed || 1) * 100)}%
                </label>
                <input
                  style={styles.slider}
                  type="range"
                  min="10"
                  max="100"
                  value={Math.round((clip.slowmo_speed || 1) * 100)}
                  onChange={(e) => updateClip('slowmo_speed', parseInt(e.target.value) / 100)}
                />
                <label style={styles.label}>
                  Puissance du shake: {clip.shake_power || 0}%
                </label>
                <input
                  style={styles.slider}
                  type="range"
                  min="0"
                  max="100"
                  value={clip.shake_power || 0}
                  onChange={(e) => updateClip('shake_power', parseInt(e.target.value))}
                />
              </div>

              <label style={styles.label}>
                <input
                  type="checkbox"
                  checked={presets.enhance_4k || false}
                  onChange={(e) => updatePreset('enhance_4k', e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                Enhance 4K (global)
              </label>
            </div>
          )}

          {/* ══════════ NETTETÉ : sharpening, grain, vignette (session) ══════════ */}
          {activeTab === 'sharp' && (
            <div style={styles.panelContent}>
              <label style={styles.label}>
                Sharpening: {presets.sharpening || 0}%
              </label>
              <input
                style={styles.slider}
                type="range"
                min="0"
                max="100"
                value={presets.sharpening || 0}
                onChange={(e) => updatePreset('sharpening', parseInt(e.target.value))}
              />
              <label style={styles.label}>
                Débruitage: {presets.denoising || 0}%
              </label>
              <input
                style={styles.slider}
                type="range"
                min="0"
                max="100"
                value={presets.denoising || 0}
                onChange={(e) => updatePreset('denoising', parseInt(e.target.value))}
              />
              <label style={styles.label}>
                Grain: {Math.round((presets.grain_intensity || 0) * 100)}%
              </label>
              <input
                style={styles.slider}
                type="range"
                min="0"
                max="100"
                value={Math.round((presets.grain_intensity || 0) * 100)}
                onChange={(e) => updatePreset('grain_intensity', parseInt(e.target.value) / 100)}
              />
              <label style={styles.label}>
                Vignette: {Math.round((presets.vignette || 0) * 100)}%
              </label>
              <input
                style={styles.slider}
                type="range"
                min="0"
                max="100"
                value={Math.round((presets.vignette || 0) * 100)}
                onChange={(e) => updatePreset('vignette', parseInt(e.target.value) / 100)}
              />
              <div style={{ marginTop: '12px', padding: '10px', background: '#1a1a1a', borderRadius: '8px', fontSize: '12px', color: '#888' }}>
                <strong style={{ color: '#00ff88' }}>Global :</strong>
                <br />Ces effets s'appliquent à TOUTE la scène (fond + vidéo + textes + logo)
                — c'est le calque presets au-dessus de tout.
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={styles.actions}>
            <button style={styles.exportBtn} onClick={exportCodex}>
              ⬇ Télécharger codex.json
            </button>
            <button
              style={validated ? styles.validatedBtn : styles.validateBtn}
              onClick={() => {
                setValidated(true);
                setClip({ ...clip, validated_by_magos: true });
              }}
            >
              {validated ? '✓ Validé — codex.json prêt (bouton export)' : '✓ Valider le montage'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Styles ── */
const styles = {
  app: { background: '#0a0a0a', color: '#e0e0e0', fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  loading: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a', color: '#888', fontFamily: 'system-ui, sans-serif' },
  header: { padding: '12px 20px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' },
  mainLayout: { display: 'flex', flexDirection: 'row', flex: 1, gap: '20px', padding: '20px', alignItems: 'flex-start' },
  playerContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 },
  panel: { width: '340px', minWidth: '300px', maxHeight: '85vh', overflowY: 'auto', background: '#141414', borderRadius: '12px', border: '1px solid #222', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' },
  tabs: { display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' },
  tab: { flex: 1, padding: '8px 12px', background: '#1a1a1a', border: '1px solid #222', borderRadius: '8px', color: '#888', cursor: 'pointer', fontSize: '13px', fontWeight: 600, minWidth: '70px' },
  tabActive: { flex: 1, padding: '8px 12px', background: '#2a2a2a', border: '1px solid #00ff88', borderRadius: '8px', color: '#00ff88', cursor: 'pointer', fontSize: '13px', fontWeight: 600, minWidth: '70px' },
  panelContent: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', color: '#aaa', fontWeight: 600, marginTop: '4px' },
  input: { padding: '8px 10px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', color: '#e0e0e0', fontSize: '14px', outline: 'none' },
  select: { padding: '8px 10px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', color: '#e0e0e0', fontSize: '14px', outline: 'none', cursor: 'pointer' },
  slider: { width: '100%', accentColor: '#00ff88', cursor: 'pointer' },
  colorPicker: { width: '100%', height: '36px', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer', background: '#1a1a1a' },
  actions: { marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' },
  exportBtn: { padding: '10px 16px', background: '#1a1a2a', border: '1px solid #2a2a4a', borderRadius: '8px', color: '#88aaff', cursor: 'pointer', fontSize: '14px', fontWeight: 600 },
  validateBtn: { padding: '10px 16px', background: '#1a2a1a', border: '1px solid #2a4a2a', borderRadius: '8px', color: '#88ff88', cursor: 'pointer', fontSize: '14px', fontWeight: 700 },
  validatedBtn: { padding: '10px 16px', background: '#2a4a2a', border: '1px solid #4a8a4a', borderRadius: '8px', color: '#aaffaa', cursor: 'default', fontSize: '14px', fontWeight: 700 },
};
