// Every ambience below is synthesized live via the Web Audio API — no
// audio file to source, license, or credit, same reasoning as the
// notification chime (notificationSound.js). Each start* function returns
// { stop() } to tear itself down cleanly when the weather changes.

function makeNoiseBuffer(ctx, seconds = 2) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// A looping filtered-noise bed — the base texture for wind/rain, which are
// both "shaped noise" at heart, just filtered differently. Fades in/out
// rather than snapping, so switching weather doesn't pop.
function startFilteredNoiseLoop(ctx, { type, frequency, Q, gain }) {
  const source = ctx.createBufferSource();
  source.buffer = makeNoiseBuffer(ctx, 2);
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  if (Q != null) filter.Q.value = Q;
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0;
  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);
  source.start();
  gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + 1.2);
  return {
    filter,
    stop() {
      gainNode.gain.cancelScheduledValues(ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
      setTimeout(() => {
        try {
          source.stop();
        } catch {
          // Already stopped — fine.
        }
      }, 700);
    },
  };
}

export function startWind(ctx) {
  const noise = startFilteredNoiseLoop(ctx, { type: 'lowpass', frequency: 500, Q: 0.7, gain: 0.05 });
  // Slowly wanders the filter cutoff so it swells and settles like real
  // gusts, instead of one flat unchanging hiss.
  let timer;
  const gust = () => {
    noise.filter.frequency.linearRampToValueAtTime(280 + Math.random() * 520, ctx.currentTime + 2 + Math.random() * 2);
    timer = setTimeout(gust, 2000 + Math.random() * 2000);
  };
  gust();
  return {
    stop() {
      clearTimeout(timer);
      noise.stop();
    },
  };
}

export function startRain(ctx) {
  const noise = startFilteredNoiseLoop(ctx, { type: 'bandpass', frequency: 3000, Q: 0.6, gain: 0.045 });
  // Sparse high, quiet ticks layered on the noise bed — individually
  // audible "droplets" rather than one undifferentiated hiss.
  let timer;
  const drop = () => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1200 + Math.random() * 1800;
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t = ctx.currentTime;
    gain.gain.linearRampToValueAtTime(0.02, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    osc.start(t);
    osc.stop(t + 0.1);
    timer = setTimeout(drop, 40 + Math.random() * 90);
  };
  drop();
  return {
    stop() {
      clearTimeout(timer);
      noise.stop();
    },
  };
}

export function startThunderstorm(ctx) {
  const rain = startRain(ctx);
  // A low rumble at random intervals — deliberately not synced to the
  // visual lightning flash (WeatherEffects.jsx's Lightning component lives
  // inside the R3F canvas, this hook lives outside it) — both are randomly
  // timed independently, so they'll roughly coincide sometimes but won't
  // click together every time.
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
      rain.stop();
    },
  };
}

export function startCrickets(ctx) {
  let timer;
  const chirpBurst = () => {
    const chirpCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < chirpCount; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 4200 + Math.random() * 300;
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.09;
      gain.gain.linearRampToValueAtTime(0.015, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      osc.start(t);
      osc.stop(t + 0.06);
    }
    timer = setTimeout(chirpBurst, 900 + Math.random() * 1400);
  };
  chirpBurst();
  return {
    stop() {
      clearTimeout(timer);
    },
  };
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
