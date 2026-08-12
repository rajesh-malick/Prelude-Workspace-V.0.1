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

// The inverse — a real ISO timestamp (notifications are the one place with
// an actual backend-stamped createdAt) into the same short display style
// ("Just now", "5m ago") everything else in the app already uses.
export function formatRelativeTime(isoString) {
  if (!isoString) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}
