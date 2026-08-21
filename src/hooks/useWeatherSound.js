import { useEffect, useRef } from 'react';
import {
  startWind,
  startRain,
  startThunderstorm,
  startCrickets,
  startBlizzardWind,
  startJingleBells,
} from '../utils/weatherSound';

// Cloudy/fog/clear (i.e. no override, before a real weatherMode is loaded)
// get no extra sound — everything else below is a category with a
// distinct-enough real-world sound that's worth playing/synthesizing for.
const STARTERS = {
  sunny: startCrickets,
  windy: startWind,
  rain: startRain,
  thunderstorm: startThunderstorm,
  snow: startJingleBells,
  fog: startJingleBells,
  blizzard: startBlizzardWind,
};

// Same "wait for a real user gesture, browsers block audio before one"
// pattern as useAmbientChirps, generalized to swap between several
// synthesized ambiences (weatherSound.js) instead of one looping file.
export default function useWeatherSound(weather, enabled) {
  const ctxRef = useRef(null);
  const activeRef = useRef(null);
  const unlockedRef = useRef(false);

  useEffect(
    () => () => {
      activeRef.current?.stop();
      ctxRef.current?.close().catch(() => {});
    },
    []
  );

  useEffect(() => {
    activeRef.current?.stop();
    activeRef.current = null;
    if (!enabled) return undefined;
    const starter = STARTERS[weather];
    if (!starter) return undefined;

    const begin = () => {
      ctxRef.current = ctxRef.current || new (window.AudioContext || window.webkitAudioContext)();
      if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
      activeRef.current = starter(ctxRef.current);
    };

    if (unlockedRef.current) {
      begin();
      return undefined;
    }
    const unlock = () => {
      unlockedRef.current = true;
      begin();
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    return () => window.removeEventListener('pointerdown', unlock);
  }, [weather, enabled]);
}
