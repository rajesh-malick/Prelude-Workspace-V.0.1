// Versions store their age as a display string ("3d ago", "Just now") —
// there's no real backend timestamp to sort by. This parses that same
// string back into elapsed minutes so "Recently Updated"/"Recently
// Created" sorting can work off data the app already has.
export function parseElapsedMinutes(text) {
  if (!text) return Infinity;
  if (/just now/i.test(text)) return 0;
  const match = text.match(/(\d+)\s*(m|h|d|w)/i);
  if (!match) return Infinity;
  const n = Number(match[1]);
  const perUnit = { m: 1, h: 60, d: 60 * 24, w: 60 * 24 * 7 };
  return n * (perUnit[match[2].toLowerCase()] ?? 1);
}
