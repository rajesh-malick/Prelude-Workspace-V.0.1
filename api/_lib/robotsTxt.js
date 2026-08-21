// Minimal, common-case parser for the User-agent: * group's Disallow
// rules — not a full RFC 9309 implementation (no wildcard/$ path
// matching, no picking a more-specific named-bot group over the wildcard
// one), but covers the vast majority of real robots.txt files well enough
// to respect "please don't crawl this path" for a small, capped preview
// crawl.
export function parseDisallowedPaths(robotsTxt) {
  const lines = robotsTxt.split(/\r?\n/);
  let inWildcardGroup = false;
  let sawUserAgent = false;
  const disallowed = [];
  for (const rawLine of lines) {
    const line = rawLine.split('#')[0].trim();
    if (!line) continue;
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim().toLowerCase();
    const value = line.slice(colonIndex + 1).trim();
    if (key === 'user-agent') {
      sawUserAgent = true;
      inWildcardGroup = value === '*';
    } else if (key === 'disallow' && inWildcardGroup && value) {
      disallowed.push(value);
    }
  }
  // No "User-agent: *" group at all (only named-bot-specific groups) —
  // treated as no blanket restriction for us, rather than guessing which
  // named group might apply.
  return sawUserAgent ? disallowed : [];
}

export function isPathAllowed(disallowedPaths, pathname) {
  return !disallowedPaths.some((rule) => pathname.startsWith(rule));
}
