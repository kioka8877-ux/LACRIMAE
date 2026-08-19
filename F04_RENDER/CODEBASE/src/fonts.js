import { staticFile, delayRender, continueRender, cancelRender } from 'remotion';

export function initFonts() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('lacrimae-anton')) return;

  const style = document.createElement('style');
  style.id = 'lacrimae-anton';
  style.textContent =
    "@font-face {\n" +
    "  font-family: 'Anton';\n" +
    `  src: url('${staticFile('fonts/Anton-Regular.ttf')}') format('truetype');\n` +
    "  font-weight: 400;\n" +
    "  font-style: normal;\n" +
    "  font-display: block;\n" +
    "}";
  document.head.appendChild(style);
}

export async function waitForFont() {
  if (typeof document === 'undefined' || !document.fonts || !document.fonts.load) {
    throw new Error('Anton indisponible: Font Loading API absente');
  }
  const handle = delayRender('Chargement police Anton');
  try {
    const url = staticFile('fonts/Anton-Regular.ttf');
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Anton introuvable (${response.status})`);
    const loaded = await document.fonts.load('400 64px "Anton"');
    const available = loaded.length > 0 && document.fonts.check('400 64px "Anton"');
    if (!available) throw new Error('Anton non détectée après chargement');
    continueRender(handle);
  } catch (error) {
    cancelRender(error instanceof Error ? error : new Error(String(error)));
  }
}
