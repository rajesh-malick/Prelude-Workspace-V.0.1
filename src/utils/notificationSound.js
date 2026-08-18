// A short, synthesized two-note chime via the Web Audio API — no audio
// file to source, license, or credit (see SettingsPanel's now-removed
// asset-credits section for why that matters here). Reuses one
// AudioContext across calls rather than creating a new one each time.
// Silently no-ops on failure (unsupported browser, blocked before any
// user gesture) — this is a nice-to-have, not worth surfacing an error for.
let ctx = null;

export function playNotificationChime() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    // A5 -> E6, a quick ascending fifth — reads as a cheerful "ping",
    // not an alarm.
    [880, 1318.51].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * 0.09;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.16, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.32);
    });
  } catch {
    // ignore
  }
}
