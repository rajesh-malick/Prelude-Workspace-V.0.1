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

// Continuous blend driven by `elevation` (-1..1) — no hard cuts between
// phases. `warmth` peaks within ~20° of the horizon (sunrise/sunset) and
// fades out toward both noon and deep night.
export function getSkyColors(elevation) {
  const dayAmount = (elevation + 1) / 2;
  const warmth = Math.max(0, 1 - Math.abs(elevation) / 0.35) * 0.85;
  const keys = Object.keys(NIGHT);
  const out = {};
  keys.forEach((k) => {
    const base = lerpHex(NIGHT[k], DAY[k], dayAmount);
    out[k] = lerpHex(base, HORIZON[k], warmth);
  });
  return out;
}
