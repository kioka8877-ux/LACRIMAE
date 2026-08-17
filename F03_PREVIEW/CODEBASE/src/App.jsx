import React, { useState, useEffect, useRef } from 'react';
import { Player } from '@remotion/player';
import { OmniComposition } from './preview/OmniComposition';
import { MemeComposition } from './preview/MemeComposition';

/**
 * App — F03 PREVIEW (v4.1 — session + clips, mode meme)
 *
 * Charge le codex.json (bloc session + clips) et le clip 9:16 depuis public/,
 * rend la composition en temps réel via @remotion/player.
 *
 * Deux modes :
 *  - mode "meme" (codex.sub_mode === 'meme') : MemeComposition + onglet MEME
 *    (tweet, texte émotion, watermark, parcours de la méméthèque)
 *  - mode stars (sinon) : OmniComposition + panneaux session classiques
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
  const [logoPending, setLogoPending] = useState(null); // {x_pct, y_pct} balise double-clic
  const [logoFiles, setLogoFiles] = useState([]); // liste des PNG logos disponibles
  const [memes, setMemes] = useState([]); // liste des memes de la méméthèque (mode meme)
  const playerRef = useRef(null);
  const lastClickRef = useRef({ t: 0, x: 0, y: 0, count: 0 });

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
        // Liste des logos PNG (multi-logos — dossier public/logos/)
        try {
          const lgResp = await fetch('./logos/manifest.json');
          if (lgResp.ok) {
            const lg = await lgResp.json();
            setLogoFiles(Array.isArray(lg) ? lg : (lg.files || []));
          }
        } catch (e) {
          setLogoFiles([]); // pas de dossier logos — menu vide
        }
        // Liste des memes de la méméthèque (mode meme — dossier public/memes/)
        try {
          const mResp = await fetch('./memes/manifest.json');
          if (mResp.ok) {
            const m = await mResp.json();
            setMemes(Array.isArray(m) ? m : (m.files || []));
          }
        } catch (e) {
          setMemes([]); // pas de dossier memes — parcours vide
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

  // Mode meme : codex.sub_mode === 'meme' → MemeComposition + panneaux meme
  const isMemeMode = codex?.sub_mode === 'meme' || codex?.mode === 'meme' || !!clip.tweet;
  const PreviewComposition = isMemeMode ? MemeComposition : OmniComposition;

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

  // ── Mode meme : helpers panneaux (tweet / émotion / watermark / meme) ──
  const updateTweet = (key, value) => setClip({ ...clip, tweet: { ...(clip.tweet || {}), [key]: value } });
  const updateTweetKeywords = (group, value) => {
    const kw = { ...((clip.tweet || {}).keywords_style || {}), [group]: value.split(',').map((s) => s.trim()).filter(Boolean) };
    setClip({ ...clip, tweet: { ...(clip.tweet || {}), keywords_style: kw } });
  };
  const updateEmotion = (value) => setClip({ ...clip, text_emotion: value, texts: { ...(clip.texts || {}), emotion: value } });
  const updateWatermark = (key, value) => updateSession('watermark', key, value);
  const selectMeme = (memeName) => {
    const memeFile = memeName.endsWith('.mp4') ? memeName : `${memeName}.mp4`;
    // La preview joue le meme choisi directement depuis la méméthèque ; le
    // codex garde video.source = clip_00X.mp4 (F04 rend le clip stagé).
    setClip({ ...clip, meme: { ...(clip.meme || {}), source: memeFile } });
    setVideoSrc(`./memes/${memeFile}`);
  };
  const watermark = session.watermark || {};

  // ── Balise logo : double-clic → poser ici / triple-clic → dupliquer ──
  const handleLogoClick = (e) => {
    const now = Date.now();
    const last = lastClickRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX, y = e.clientY;
    const isSame = now - last.t < 500 && Math.abs(x - last.x) < 12 && Math.abs(y - last.y) < 12;
    const count = isSame ? last.count + 1 : 1;
    lastClickRef.current = { t: now, x, y, count };
    if (count < 2) return;
    const xPct = Math.round(((x - rect.left) / rect.width) * 1000) / 10;
    const yPct = Math.round(((y - rect.top) / rect.height) * 1000) / 10;
    if (count === 2) {
      // double-clic → proposer de poser le logo ici
      setLogoPending({ x_pct: xPct, y_pct: yPct });
    } else if (count >= 3) {
      // triple-clic → dupliquer le dernier logo à cet endroit (léger décalage)
      setLogoPending(null);
      duplicateLogo({ x_pct: xPct, y_pct: yPct });
      lastClickRef.current = { t: 0, x: 0, y: 0, count: 0 };
    }
  };

  const confirmLogoPlacement = (ok) => {
    if (ok && logoPending) {
      // FIX: update atomique — les 3 updateSession séquentielles lisaient le
      // même `session` obsolète (closure) et React les batchait : seule la
      // dernière (y_pct) survivait, position/custom et x_pct étaient perdus.
      setSession((s) => {
        const hasList = s.logos && s.logos.length;
        const base = hasList ? s.logos[0] : s.logo;
        const placed = {
          ...(base || {}),
          position: 'custom',
          x_pct: logoPending.x_pct,
          y_pct: logoPending.y_pct,
        };
        if (hasList) {
          return { ...s, logos: [placed, ...s.logos.slice(1)] };
        }
        return { ...s, logo: placed };
      });
    }
    setLogoPending(null);
  };

  // ── Multi-logos : session.logos[] (rétro-compat session.logo) ──
  const logosList = () => {
    if (session.logos && session.logos.length) return session.logos;
    if (session.logo) return [session.logo];
    return [];
  };
  const defaultLogo = () => {
    const src = logoFiles.length ? `logos/${logoFiles[0]}` : 'logo.png';
    return { src, width_pct: 20, position: 'top_center', opacity: 1 };
  };
  const updateLogo = (index, key, value) => {
    const current = logosList();
    const next = current.map((lg, i) => (i === index ? { ...lg, [key]: value } : lg));
    setSession((s) => ({ ...s, logos: next }));
  };
  const addLogo = () => {
    const current = logosList();
    setSession((s) => ({ ...s, logos: [...current, defaultLogo()] }));
  };
  const duplicateLogo = (pos) => {
    const current = logosList();
    const base = current[current.length - 1] || defaultLogo();
    const offset = 4; // léger décalage pour éviter une superposition parfaite
    const copy = {
      ...base,
      position: 'custom',
      x_pct: pos.x_pct + offset,
      y_pct: pos.y_pct + offset,
    };
    setSession((s) => ({ ...s, logos: [...current, copy] }));
  };
  const removeLogo = (index) => {
    const current = logosList();
    const next = current.filter((_, i) => i !== index);
    setSession((s) => ({ ...s, logos: next }));
  };

  // ── Helpers panneaux texte (fond/bord/coins) ──
  const updateTextBox = (boxKey, key, value) => {
    const ts = session.texts_style || {};
    const box = ts[boxKey] || {};
    updateSession('texts_style', boxKey, { ...box, [key]: value });
  };

  // Panneau de fond d'un texte : activer, couleur fond, texte, bord, coins, padding
  const renderTextBox = (boxKey) => {
    const ts = session.texts_style || {};
    const box = ts[boxKey] || {};
    return (
      <>
        <label style={styles.label} >
          <input
            type="checkbox"
            style={{ marginRight: '8px', accentColor: '#00ff88' }}
            checked={!!box.enabled}
            onChange={(e) => updateTextBox(boxKey, 'enabled', e.target.checked)}
          />
          Activer le fond du panneau
        </label>
        {box.enabled && (
          <>
            <label style={styles.label}>Couleur du fond</label>
            <input
              style={styles.colorPicker}
              type="color"
              value={hexColor(box.color, '#1a1a1a')}
              onChange={(e) => updateTextBox(boxKey, 'color', e.target.value)}
            />
            <label style={styles.label}>Couleur du texte (dans le panneau)</label>
            <input
              style={styles.colorPicker}
              type="color"
              value={hexColor(box.text_color, '#FFFFFF')}
              onChange={(e) => updateTextBox(boxKey, 'text_color', e.target.value)}
            />
            <label style={styles.label}>Bordure — couleur</label>
            <input
              style={styles.colorPicker}
              type="color"
              value={hexColor(box.border_color, '#FFFFFF')}
              onChange={(e) => updateTextBox(boxKey, 'border_color', e.target.value)}
            />
            <label style={styles.label}>
              Épaisseur bordure: {(box.border_width || 0)}px
            </label>
            <input
              style={styles.slider}
              type="range"
              min="0"
              max="12"
              value={box.border_width || 0}
              onChange={(e) => updateTextBox(boxKey, 'border_width', parseInt(e.target.value))}
            />
            <label style={styles.label}>
              Coins arrondis: {(box.radius || 0)}px
            </label>
            <input
              style={styles.slider}
              type="range"
              min="0"
              max="60"
              value={box.radius || 0}
              onChange={(e) => updateTextBox(boxKey, 'radius', parseInt(e.target.value))}
            />
            <label style={styles.label}>
              Padding: {(box.padding || 0)}px
            </label>
            <input
              style={styles.slider}
              type="range"
              min="0"
              max="40"
              value={box.padding || 0}
              onChange={(e) => updateTextBox(boxKey, 'padding', parseInt(e.target.value))}
            />
          </>
        )}
      </>
    );
  };

  const exportCodex = () => {
    // Le clip édité est le MAÎTRE : ses réglages de style (taille textes,
    // position/taille émotion, hauteur meme) se répercutent à l'identique sur
    // tous les autres clips. Les contenus (texte tweet, émotion, titre)
    // restent propres à chaque clip.
    const propagateStyle = (source) => {
      const srcTweet = source.tweet || {};
      return (target) => {
        const out = { ...target };
        if (source.text_emotion_size != null) out.text_emotion_size = source.text_emotion_size;
        if (source.text_emotion_position_pct != null) out.text_emotion_position_pct = source.text_emotion_position_pct;
        if (source.meme?.height_pct != null) out.meme = { ...(out.meme || {}), height_pct: source.meme.height_pct };
        if (srcTweet.text_size != null) out.tweet = { ...(out.tweet || {}), text_size: srcTweet.text_size };
        return out;
      };
    };
    // Réintègre le clip édité + la session dans le codex multi-clips
    const merged = {
      ...(codex || {}),
      session,
      clips: codex?.clips
        ? [clip, ...(codex.clips || []).slice(1).map(propagateStyle(clip))]
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
        <div style={styles.playerContainer} title="Double-clic : poser le logo. Triple-clic : dupliquer le logo ici">
          <div
            style={{ position: 'relative', width: '100%', maxWidth: '300px' }}
            onClick={handleLogoClick}
          >
            <Player
              ref={playerRef}
              component={PreviewComposition}
              inputProps={{ codex: clip, videoSrc, session, masterClip: codex?.clips?.[0] || clip }}
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
              autoPlay
              muted
              loop
            />

            {/* Repère + modale de confirmation de la balise logo */}
            {logoPending && (
              <div
                style={{
                  position: 'absolute',
                  left: `${logoPending.x_pct}%`,
                  top: `${logoPending.y_pct}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 30,
                }}
              >
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  border: '3px solid #00ff88', backgroundColor: 'rgba(0,0,0,0.4)',
                  boxShadow: '0 0 12px rgba(0,255,136,0.8)',
                  pointerEvents: 'none',
                }} />
              </div>
            )}
            {logoPending && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center', zIndex: 40,
                pointerEvents: 'none',
              }}>
                <div style={{
                  background: '#141414', border: '1px solid #00ff88', borderRadius: '10px',
                  padding: '16px 20px', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
                  maxWidth: '260px', pointerEvents: 'auto',
                }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#e0e0e0', marginBottom: '10px' }}>
                    Poser le logo ici ?
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button
                      style={{ padding: '8px 20px', background: '#1a3a1a', border: '1px solid #2a5a2a', borderRadius: '8px', color: '#88ff88', cursor: 'pointer', fontWeight: 700 }}
                      onClick={() => confirmLogoPlacement(true)}
                    >
                      Oui
                    </button>
                    <button
                      style={{ padding: '8px 20px', background: '#1a1a1a', border: '1px solid #444', borderRadius: '8px', color: '#aaa', cursor: 'pointer', fontWeight: 700 }}
                      onClick={() => confirmLogoPlacement(false)}
                    >
                      Non
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
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
            <button style={activeTab === 'video' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('video')}>
              🎬 Vidéo
            </button>
            <button style={activeTab === 'effects' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('effects')}>
              🎨 Effets
            </button>
            <button style={activeTab === 'sharp' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('sharp')}>
              🔍 Netteté
            </button>
            {isMemeMode && (
              <button style={activeTab === 'meme' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('meme')}>
                🧩 Meme
              </button>
            )}
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

              {/* Panneaux de fond : TITRE et PARAGRAPHE séparés */}
              {textMode !== 'none' && (
                <>
                  {/* ── Panneau TITRE ── */}
                  <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #333' }}>
                    <label style={{ ...styles.label, color: '#00ff88', fontSize: '14px' }}>
                      📦 Panneau du TITRE
                    </label>
                    {renderTextBox('title_box')}
                    <div style={{ marginTop: '6px', fontSize: '11px', color: '#777' }}>
                      Fond actif → les effets texte (contour, ombre) s'annulent automatiquement.
                    </div>
                  </div>

                  {/* ── Panneau PARAGRAPHE ── */}
                  {textMode === 'title+paragraph' && (
                    <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #333' }}>
                      <label style={{ ...styles.label, color: '#00ff88', fontSize: '14px' }}>
                        📦 Panneau du PARAGRAPHE
                      </label>
                      {renderTextBox('paragraph_box')}
                      <div style={{ marginTop: '6px', fontSize: '11px', color: '#777' }}>
                        Fond actif → les effets texte s'annulent automatiquement.
                      </div>
                    </div>
                  )}
                </>
              )}
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
                  🏷 LOGOS (multi — double-clic : poser / triple-clic : dupliquer)
                </label>
                {logosList().length === 0 && (
                  <div style={{ padding: '8px', background: '#1a1a1a', borderRadius: '8px', fontSize: '12px', color: '#888' }}>
                    Aucun logo actif. Cliquez <strong>+ Ajouter un logo</strong> ou
                    double-cliquez sur la vidéo.
                  </div>
                )}
                {logosList().map((logo, index) => (
                  <div
                    key={index}
                    style={{
                      marginTop: '10px',
                      padding: '10px',
                      background: '#181818',
                      border: '1px solid #2a2a2a',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ ...styles.label, color: '#00ff88', margin: 0 }}>
                        LOGO {index + 1}
                      </label>
                      <button
                        style={{
                          background: '#3a1a1a', border: '1px solid #5a2a2a', borderRadius: '6px',
                          color: '#ff8888', cursor: 'pointer', fontSize: '12px', padding: '4px 10px',
                        }}
                        onClick={() => removeLogo(index)}
                      >
                        ✕ Supprimer
                      </button>
                    </div>

                    <label style={styles.label}>Fichier PNG</label>
                    <select
                      style={styles.select}
                      value={logo.src || 'logo.png'}
                      onChange={(e) => updateLogo(index, 'src', e.target.value)}
                    >
                      <option value="logo.png">logo.png (racine)</option>
                      {logoFiles.map((f) => (
                        <option key={f} value={`logos/${f}`}>logos/{f}</option>
                      ))}
                    </select>

                    <label style={styles.label}>Position</label>
                    <select
                      style={styles.select}
                      value={logo.position || 'top_center'}
                      onChange={(e) => updateLogo(index, 'position', e.target.value)}
                    >
                      <option value="top_center">Haut — centré</option>
                      <option value="top_left">Haut — gauche</option>
                      <option value="top_right">Haut — droite</option>
                      <option value="center">Centre</option>
                      <option value="bottom_center">Bas — centré</option>
                      <option value="bottom_left">Bas — gauche</option>
                      <option value="bottom_right">Bas — droite</option>
                      <option value="custom">Personnalisé (double-clic)</option>
                    </select>

                    {logo.position === 'custom' && (
                      <>
                        <label style={styles.label}>
                          X: {(logo.x_pct ?? 50).toFixed(1)}%
                        </label>
                        <input
                          style={styles.slider}
                          type="range"
                          min="0"
                          max="100"
                          step="0.5"
                          value={logo.x_pct ?? 50}
                          onChange={(e) => updateLogo(index, 'x_pct', parseFloat(e.target.value))}
                        />
                        <label style={styles.label}>
                          Y: {(logo.y_pct ?? 50).toFixed(1)}%
                        </label>
                        <input
                          style={styles.slider}
                          type="range"
                          min="0"
                          max="100"
                          step="0.5"
                          value={logo.y_pct ?? 50}
                          onChange={(e) => updateLogo(index, 'y_pct', parseFloat(e.target.value))}
                        />
                      </>
                    )}

                    <label style={styles.label}>
                      Taille: {(logo.width_pct || 20)}%
                    </label>
                    <input
                      style={styles.slider}
                      type="range"
                      min="5"
                      max="90"
                      value={logo.width_pct || 20}
                      onChange={(e) => updateLogo(index, 'width_pct', parseInt(e.target.value))}
                    />
                    <label style={styles.label}>
                      Opacité: {Math.round(((logo.opacity ?? 1) * 100))}%
                    </label>
                    <input
                      style={styles.slider}
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(((logo.opacity ?? 1) * 100))}
                      onChange={(e) => updateLogo(index, 'opacity', parseInt(e.target.value) / 100)}
                    />
                  </div>
                ))}
                <button
                  style={{
                    marginTop: '10px', padding: '8px 16px', background: '#1a3a1a',
                    border: '1px solid #2a5a2a', borderRadius: '8px', color: '#88ff88',
                    cursor: 'pointer', fontWeight: 700,
                  }}
                  onClick={addLogo}
                >
                  + Ajouter un logo
                </button>
                <div style={{ marginTop: '8px', padding: '8px', background: '#0f2a1a', borderRadius: '8px', fontSize: '12px', color: '#88ff88' }}>
                  💡 <strong>Double-clic</strong> sur la vidéo = poser le logo à cet endroit.
                  <strong> Triple-clic</strong> = dupliquer le dernier logo (léger décalage).
                  Les PNG sont listés depuis <code>public/logos/</code> (manifest généré par le staging).
                </div>
              </div>
            </div>
          )}

          {/* ══════════ VIDÉO : centrage vertical (session, tous les clips) ══════════ */}
          {activeTab === 'video' && (
            <div style={styles.panelContent}>
              <label style={{ ...styles.label, color: '#00ff88', fontSize: '14px' }}>
                🎬 VIDÉO — centrage vertical
              </label>
              <label style={styles.label}>
                Position verticale: {((session.video || {}).offset_y ?? 0) > 0 ? '+' : ''}
                {((session.video || {}).offset_y ?? 0)}%
              </label>
              <input
                style={styles.slider}
                type="range"
                min="-20"
                max="20"
                step="0.5"
                value={(session.video || {}).offset_y ?? 0}
                onChange={(e) => updateSession('video', 'offset_y', parseFloat(e.target.value))}
              />
              <div style={{ marginTop: '8px', padding: '8px', background: '#1a1a1a', borderRadius: '8px', fontSize: '12px', color: '#888' }}>
                Réglage appliqué à tous les clips (session). <strong>+</strong> = vers le bas,
                <strong> −</strong> = vers le haut. Les particularités vidéo s'ajouteront ici.
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

              <label style={styles.label}>
                Contraste: {(presets.contrast ?? 1.3).toFixed(2)}x
              </label>
              <input
                style={styles.slider}
                type="range"
                min="0.5"
                max="2"
                step="0.05"
                value={presets.contrast ?? 1.3}
                onChange={(e) => updatePreset('contrast', parseFloat(e.target.value))}
              />
              <label style={styles.label}>
                Luminosité: {(presets.brightness ?? 1.1).toFixed(2)}x
              </label>
              <input
                style={styles.slider}
                type="range"
                min="0.5"
                max="2"
                step="0.05"
                value={presets.brightness ?? 1.1}
                onChange={(e) => updatePreset('brightness', parseFloat(e.target.value))}
              />

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

          {/* ══════════ MEME : tweet, texte émotion, watermark, méméthèque ══════════ */}
          {activeTab === 'meme' && (
            <div style={styles.panelContent}>
              <label style={{ ...styles.label, color: '#00ff88', fontSize: '14px' }}>
                🧩 MODE MEME — panneaux par calque
              </label>

              {/* ── L2 TWEET (card) ── */}
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #333' }}>
                <label style={{ ...styles.label, color: '#00ff88', fontSize: '14px' }}>
                  🐦 L2 — TWEET (texte du pack, card générée par LACRIMAE)
                </label>
                <label style={styles.label}>Texte du tweet</label>
                <textarea
                  style={{ ...styles.input, minHeight: '70px', resize: 'vertical', fontFamily: 'inherit' }}
                  value={(clip.tweet || {}).text || ''}
                  onChange={(e) => updateTweet('text', e.target.value)}
                />
                <label style={styles.label}>
                  Mots en vert (virgules) : {(clip.tweet || {}).keywords_style?.green || []}.join(', ')
                </label>
                <input
                  style={styles.input}
                  type="text"
                  value={((clip.tweet || {}).keywords_style?.green || []).join(', ')}
                  onChange={(e) => updateTweetKeywords('green', e.target.value)}
                />
                <label style={styles.label}>
                  Mots en rouge (virgules) : {(clip.tweet || {}).keywords_style?.red || []}.join(', ')
                </label>
                <input
                  style={styles.input}
                  type="text"
                  value={((clip.tweet || {}).keywords_style?.red || []).join(', ')}
                  onChange={(e) => updateTweetKeywords('red', e.target.value)}
                />
                <label style={styles.label}>
                  Largeur card: {((clip.tweet || {}).width_pct || 82)}%
                </label>
                <input
                  style={styles.slider}
                  type="range"
                  min="60"
                  max="98"
                  value={(clip.tweet || {}).width_pct || 82}
                  onChange={(e) => updateTweet('width_pct', parseInt(e.target.value))}
                />
                <label style={styles.label}>
                  Taille textes tweet: {((clip.tweet || {}).text_size || 17)}px
                </label>
                <input
                  style={styles.slider}
                  type="range"
                  min="12"
                  max="60"
                  value={(clip.tweet || {}).text_size || 17}
                  onChange={(e) => updateTweet('text_size', parseInt(e.target.value))}
                />
                <div style={{ marginTop: '6px', padding: '8px', background: '#1a1a1a', borderRadius: '8px', fontSize: '12px', color: '#888' }}>
                  Persona + likes/partages : générés par le bridge (seed déterministe
                  pack_id + clip) — comme SIGNE, aucun réseau.
                </div>
              </div>

              {/* ── L4 TEXTE ÉMOTION ── */}
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #333' }}>
                <label style={{ ...styles.label, color: '#00ff88', fontSize: '14px' }}>
                  💬 L4 — TEXTE ÉMOTION (milieu)
                </label>
                <input
                  style={styles.input}
                  type="text"
                  value={clip.text_emotion || (clip.texts || {}).emotion || ''}
                  onChange={(e) => updateEmotion(e.target.value)}
                />
                <label style={styles.label}>
                  Position (haut → bas): {(clip.text_emotion_position_pct ?? 43)}%
                </label>
                <input
                  style={styles.slider}
                  type="range"
                  min="10"
                  max="95"
                  value={clip.text_emotion_position_pct ?? 43}
                  onChange={(e) => updateClip('text_emotion_position_pct', parseInt(e.target.value))}
                />
                <label style={styles.label}>
                  Taille: {(clip.text_emotion_size ?? 40)}px
                </label>
                <input
                  style={styles.slider}
                  type="range"
                  min="20"
                  max="140"
                  value={clip.text_emotion_size ?? 40}
                  onChange={(e) => updateClip('text_emotion_size', parseInt(e.target.value))}
                />
              </div>

              {/* ── L6 WATERMARK @chaine ── */}
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #333' }}>
                <label style={{ ...styles.label, color: '#00ff88', fontSize: '14px' }}>
                  💧 L6 — WATERMARK @chaine (sur le meme)
                </label>
                <input
                  style={styles.input}
                  type="text"
                  value={watermark.text || '@lacrimae'}
                  onChange={(e) => updateWatermark('text', e.target.value)}
                />
                <label style={styles.label}>Position</label>
                <select
                  style={styles.select}
                  value={watermark.position || 'bottom_left'}
                  onChange={(e) => updateWatermark('position', e.target.value)}
                >
                  <option value="bottom_left">Bas — gauche</option>
                  <option value="bottom_right">Bas — droite</option>
                  <option value="bottom_center">Bas — centre</option>
                  <option value="top_left">Haut — gauche</option>
                  <option value="top_right">Haut — droite</option>
                </select>
                <label style={styles.label}>
                  Opacité: {Math.round(((watermark.opacity ?? 0.4) * 100))}%
                </label>
                <input
                  style={styles.slider}
                  type="range"
                  min="10"
                  max="90"
                  value={Math.round(((watermark.opacity ?? 0.4) * 100))}
                  onChange={(e) => updateWatermark('opacity', parseInt(e.target.value) / 100)}
                />
                <label style={styles.label}>
                  Taille: {(watermark.font_size || 36)}px
                </label>
                <input
                  style={styles.slider}
                  type="range"
                  min="16"
                  max="64"
                  value={watermark.font_size || 36}
                  onChange={(e) => updateWatermark('font_size', parseInt(e.target.value))}
                />
                <label style={styles.label}>Couleur</label>
                <input
                  style={styles.colorPicker}
                  type="color"
                  value={watermark.color || '#FFFFFF'}
                  onChange={(e) => updateWatermark('color', e.target.value)}
                />
              </div>

              {/* ── L5 MEME : parcours de la méméthèque ── */}
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #333' }}>
                <label style={{ ...styles.label, color: '#00ff88', fontSize: '14px' }}>
                  🎞 L5 — MÉMÉTHÈQUE (public/memes/)
                </label>
                <select
                  style={styles.select}
                  value={(clip.meme || {}).source || ''}
                  onChange={(e) => selectMeme(e.target.value)}
                >
                  <option value="">— choisir un meme —</option>
                  {memes.map((m) => (
                    <option key={m} value={m}>🎞 {m}</option>
                  ))}
                </select>
                {memes.length === 0 && (
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Aucun meme trouvé — déposez vos memes mp4 dans{' '}
                    <code>public/memes/</code>
                  </div>
                )}
                <label style={styles.label}>
                  Durée cible: {(totalFrames / fps).toFixed(1)}s (durée du pack)
                </label>
                <label style={styles.label}>
                  Hauteur du meme: {((clip.meme || {}).height_pct || 48)}%
                </label>
                <input
                  style={styles.slider}
                  type="range"
                  min="30"
                  max="95"
                  value={(clip.meme || {}).height_pct || 48}
                  onChange={(e) => updateClip('meme', { ...(clip.meme || {}), height_pct: parseInt(e.target.value) })}
                />
                <div style={{ marginTop: '6px', padding: '8px', background: '#1a1a1a', borderRadius: '8px', fontSize: '12px', color: '#888' }}>
                  Loop net si le meme est plus court que la durée cible ; trim sinon.
                  La durée est dirigée par le pack (défaut 5-7s), pas par le probe.
                </div>
              </div>

              {/* ── L3 TITRE (optionnel) ── */}
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #333' }}>
                <label style={{ ...styles.label, color: '#00ff88', fontSize: '14px' }}>
                  🏷 L3 — TITRE (optionnel, haut)
                </label>
                <input
                  style={styles.input}
                  type="text"
                  value={(clip.texts || {}).title || ''}
                  onChange={(e) => updateTexts('title', e.target.value)}
                />
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

/* Convertit une couleur (hex ou rgba) en hex pour les <input type=color> */
function hexColor(color, fallback) {
  if (!color) return fallback;
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) {
    const toHex = (n) => parseInt(n, 10).toString(16).padStart(2, '0');
    return `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`;
  }
  return fallback;
}
