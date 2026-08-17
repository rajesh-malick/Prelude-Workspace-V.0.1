// Team avatars only ever show one initial, so two people with the same
// first letter (e.g. two "Rajesh"es) render as visually identical circles —
// a hover tooltip disambiguates them, but that requires noticing there's
// something to hover. A stable per-name color closes that gap at a glance,
// the same way Slack/GitHub avatars do.
const PALETTE = [
  { bg: '#DCE9FB', fg: '#2C5A8C' },
  { bg: '#FBE3D6', fg: '#9A4A1F' },
  { bg: '#E3E0FB', fg: '#5B4A9E' },
  { bg: '#DCF3E4', fg: '#2E7D4F' },
  { bg: '#FCE4EF', fg: '#A13D6E' },
  { bg: '#FDF0C7', fg: '#8A6A12' },
];

export function avatarColor(name) {
  const safeName = name || '?';
  let hash = 0;
  for (let i = 0; i < safeName.length; i++) {
    hash = (hash * 31 + safeName.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
