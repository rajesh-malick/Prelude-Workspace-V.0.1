import { useEffect, useState } from 'react';
import { getPhase, getSkyColors, getSunElevation } from '../utils/timeOfDay';

function readHour() {
  return new Date().getHours() + new Date().getMinutes() / 60;
}

// Refreshes once a minute — plenty for a light that's supposed to drift
// like a real sky, not a clock anyone is staring at. `weather` ('clear' |
// 'overcast' | 'rain' | 'snow' | 'haze') tints the resulting sky on top of
// the time-of-day gradient — see getSkyColors.
export default function useTimeOfDay(weather) {
  const [hour, setHour] = useState(() => readHour());

  useEffect(() => {
    const id = setInterval(() => setHour(readHour()), 60_000);
    return () => clearInterval(id);
  }, []);

  const elevation = getSunElevation(hour);
  return { hour, elevation, phase: getPhase(hour), sky: getSkyColors(elevation, weather) };
}
