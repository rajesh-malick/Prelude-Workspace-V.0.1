// A single source of truth for "what time of day is it" — the greeting,
// the sky/lighting, and the stars/fireflies all derive from this so they
// never disagree with each other.
import { lerpHex } from './colorLerp';

// -1 (deep night) .. 1 (solar noon), 0 at sunrise/sunset. Continuous, not
// bucketed, so lighting eases smoothly through the day instead of
// snapping between fixed states.
export function getSunElevation(hour) {
  const t = (hour - 6) / 12; // 0 at 6am, 1 at 6pm
  return Math.sin(Math.PI * t);
}

export function getPhase(hour) {
  if (hour < 5 || hour >= 21) return 'night';
  if (hour < 8) return 'sunrise';
  if (hour < 16) return 'day';
  if (hour < 19) return 'sunset';
  return 'night';
}

// Deliberately finer-grained than getPhase() above — getPhase's "day"
// bucket alone spans 8am to 4pm, which is fine for lighting (nothing
// snaps mid-bucket, elevation is continuous anyway) but wrong for a
// greeting: "Good morning" has no business showing up at 3pm. This also
// gives Header.jsx something narrower than `phase` to key its memo off of,
// so the greeting actually rotates through the day instead of freezing
// for whatever 8-hour lighting phase it was first picked in.
const GREETINGS = {
  lateNight: ['Hey night owl', 'Still up?', 'Working late?'],
  earlyBird: ['Hey early bird', 'Rise and shine', 'Good morning'],
  morning: ['Good morning', 'Morning'],
  afternoon: ['Good afternoon', 'Hey there'],
  evening: ['Good evening', 'Hey there', 'Golden hour'],
  night: ['Hey night owl', 'Good night', 'Working late?'],
};

export function getGreetingBucket(hour) {
  if (hour < 5) return 'lateNight';
  if (hour < 8) return 'earlyBird';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

export function pickGreeting(hour) {
  const bucket = GREETINGS[getGreetingBucket(hour)];
  return bucket[Math.floor(Math.random() * bucket.length)];
}

// Sky + fog + light color stops for the two anchor states — day and
// night — plus a warm horizon tint blended in near sunrise/sunset.
const NIGHT = { top: '#0B1226', bottom: '#1B2A4A', fog: '#1B2A4A', hemiSky: '#2A3B5C', hemiGround: '#12182B' };
const DAY = { top: '#FDF6EC', bottom: '#F3E9D8', fog: '#F3E9D8', hemiSky: '#FFF3DC', hemiGround: '#C9B89A' };
const HORIZON = { top: '#F7C99A', bottom: '#D97A5C', fog: '#E2926E', hemiSky: '#FFC79A', hemiGround: '#8A5A4E' };

// Weather tints layered on top of the time-of-day blend above — same idea,
// a color-stop set per mood, lerped in at a fixed strength rather than
// replacing the sky outright, so a rainy noon still reads as noon (just a
// flatter, grayer one) instead of jumping to a flat preset color.
const OVERCAST = { top: '#B7B9BD', bottom: '#9AA0A6', fog: '#A9ADB2', hemiSky: '#C7CBCF', hemiGround: '#7D8288' };
const RAIN = { top: '#5C6670', bottom: '#4A535C', fog: '#5C6670', hemiSky: '#6B7480', hemiGround: '#3A4048' };
const SNOW = { top: '#DCE6EC', bottom: '#C7D3DA', fog: '#D8E2E8', hemiSky: '#E8EFF3', hemiGround: '#AEB9C0' };
const HAZE = { top: '#F2D9A8', bottom: '#E8C48A', fog: '#EFCB98', hemiSky: '#F5DDB0', hemiGround: '#C9A96E' };

const WEATHER_TINTS = { overcast: [OVERCAST, 0.55], rain: [RAIN, 0.7], snow: [SNOW, 0.5], haze: [HAZE, 0.45] };

// Continuous blend driven by `elevation` (-1..1) — no hard cuts between
// phases. `warmth` peaks within ~20° of the horizon (sunrise/sunset) and
// fades out toward both noon and deep night. `weather` ('clear' | undefined
// skips the tint entirely) then nudges the whole thing toward one of the
// moods above.
export function getSkyColors(elevation, weather) {
  const dayAmount = (elevation + 1) / 2;
  const warmth = Math.max(0, 1 - Math.abs(elevation) / 0.35) * 0.85;
  const keys = Object.keys(NIGHT);
  const out = {};
  const tint = WEATHER_TINTS[weather];
  keys.forEach((k) => {
    const base = lerpHex(NIGHT[k], DAY[k], dayAmount);
    out[k] = lerpHex(base, HORIZON[k], warmth);
    if (tint) out[k] = lerpHex(out[k], tint[0][k], tint[1]);
  });
  return out;
}
