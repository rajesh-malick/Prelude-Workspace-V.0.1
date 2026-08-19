// A project's tree withers once nobody's grown a new version on it in a
// while — the same "visual state = real data" principle already used for
// a resolved comment going still and dim, just applied to a whole project.
// Based on the latest version's real timestamp, not the display-only
// "3d ago" string versions also carry (see App.jsx's handleCreateVersion).
const WITHER_AFTER_DAYS = 14;

export function daysSinceLastVersion(project) {
  const latest = project.versions?.[project.versions.length - 1];
  if (!latest?.createdAtISO) return 0; // Legacy/seed data with no real timestamp — never treated as stale.
  return (Date.now() - new Date(latest.createdAtISO).getTime()) / 86_400_000;
}

export function isWithering(project) {
  return daysSinceLastVersion(project) >= WITHER_AFTER_DAYS;
}
