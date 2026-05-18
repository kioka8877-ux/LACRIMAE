/**
 * LACRIMAE — F03 PICTOR
 * Root Remotion — déclare la composition LacrimaeShort
 */

import { Composition } from "remotion";
import { LacrimaeShort } from "./components/LacrimaeShort";
import timingData from "../in/timing.json";

// Résolution vidéo : 1080x1920 (9:16 vertical)
const WIDTH  = 1080;
const HEIGHT = 1920;
const FPS    = timingData.fps || 30;
const TOTAL_FRAMES = timingData.total_frames;

export const LacrimaeRoot = () => {
  return (
    <Composition
      id="LacrimaeShort"
      component={LacrimaeShort}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{
        timing: timingData,
        // creative_config est chargé dynamiquement dans le composant
      }}
    />
  );
};
