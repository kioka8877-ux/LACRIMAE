import { staticFile, delayRender, continueRender } from 'remotion';

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
    "  font-display: swap;\n" +
    "}";
  document.head.appendChild(style);
}

export function waitForFont() {
  if (typeof document === 'undefined' || !document.fonts) return;
  const handle = delayRender('Chargement police Anton');
  document.fonts
    .load('100px Anton')
    .then(() => continueRender(handle))
    .catch(() => continueRender(handle));
}
