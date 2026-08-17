import { registerRoot } from 'remotion';
import './fonts.css';
import { Root } from './Root';
import { initFonts, waitForFont } from './fonts';

initFonts();
waitForFont();
registerRoot(Root);
