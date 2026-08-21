// Wind/rain/thunderstorm/crickets/blizzard below all play a real recording
// (Mixkit's sound-effects library — free for commercial and personal use,
// no attribution required) rather than synthesis — real weather sounds
// like real weather in a way oscillators/filtered noise approximate but
// never quite nail. Only the jingle-bell motif (snow/fog) stays synthesized
// — no real recording was sourced for that one, and there's no equivalent
// "real thing" to record anyway. Each start* function returns { stop() }
// to tear itself down cleanly when the weather changes.

function makeNoiseBuffer(ctx, seconds = 2) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// A plain looping <audio> element rather than routing through the shared
// AudioContext — there's no filtering/mixing need for a real recording,
// just "loop this file". `ctx` isn't needed by any of these, but every
// starter here keeps the same (ctx) => ({ stop() }) shape so
// useWeatherSound's STARTERS map can call all of them identically.
function startAudioLoop(src, volume) {
  const audio = new Audio(src);
  audio.loop = true;
  audio.volume = volume;
  audio.play().catch(() => {
    // Autoplay blocked — shouldn't happen here since this only ever runs
    // from useWeatherSound's pointerdown-unlock path, but fail quietly
    // either way rather than throwing.
  });
  return {
    stop() {
      audio.pause();
    },
  };
}

const WIND_SRC = '/audio/mixkit-wind-blowing-ambience-2658.wav';
export function startWind() {
  return startAudioLoop(WIND_SRC, 0.3);
}

// Same recording backs both rain and thunderstorm (it's an actual
// thunderstorm-in-a-forest ambience, so it already carries both) —
// thunderstorm layers an extra low rumble on top so it still reads as the
// more severe of the two despite sharing the bed track.
const RAIN_THUNDER_SRC = '/audio/mixkit-thunderstorm-in-the-forest-2396.wav';
export function startRain() {
  return startAudioLoop(RAIN_THUNDER_SRC, 0.32);
}

export function startThunderstorm(ctx) {
  const bed = startAudioLoop(RAIN_THUNDER_SRC, 0.4);
  // Deliberately not synced to the visual lightning flash
  // (WeatherEffects.jsx's Lightning component lives inside the R3F canvas,
  // this hook lives outside it) — both are randomly timed independently,
  // so they'll roughly coincide sometimes but won't click together every
  // time.
  let timer;
  const rumble = () => {
    const source = ctx.createBufferSource();
    source.buffer = makeNoiseBuffer(ctx, 3);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 90;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    const t = ctx.currentTime;
    gain.gain.linearRampToValueAtTime(0.12, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.5 + Math.random());
    source.start(t);
    source.stop(t + 3);
    timer = setTimeout(rumble, 4000 + Math.random() * 6000);
  };
  timer = setTimeout(rumble, 1500);
  return {
    stop() {
      clearTimeout(timer);
      bed.stop();
    },
  };
}

const CRICKETS_SRC = '/audio/mixkit-summer-crickets-loop-1788.wav';
export function startCrickets() {
  return startAudioLoop(CRICKETS_SRC, 0.35);
}

const BLIZZARD_SRC = '/audio/mixkit-blizzard-cold-winds-1153.wav';
export function startBlizzardWind() {
  return startAudioLoop(BLIZZARD_SRC, 0.35);
}

// A short, repeating jingle-bell-ish motif for snow/fog/blizzard — a few
// slightly-detuned sine partials per note with a fast decay reads as a
// small bell rather than a flat "boop" from a single plain sine.
const BELL_NOTES = [880, 987.77, 880, 659.25, 587.33, 659.25, 880, 987.77];
const BELL_PARTIALS = [1, 2.4, 3.8];

export function startJingleBells(ctx) {
  let noteIndex = 0;
  let timer;
  const playNote = () => {
    const freq = BELL_NOTES[noteIndex % BELL_NOTES.length];
    noteIndex++;
    BELL_PARTIALS.forEach((mult, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * mult;
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = ctx.currentTime;
      const peak = i === 0 ? 0.05 : 0.018;
      gain.gain.linearRampToValueAtTime(peak, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.start(t);
      osc.stop(t + 0.55);
    });
    timer = setTimeout(playNote, 420);
  };
  playNote();
  return {
    stop() {
      clearTimeout(timer);
    },
  };
}
