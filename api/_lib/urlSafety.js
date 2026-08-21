import dns from 'node:dns/promises';

function ipv4ToInt(ip) {
  return ip.split('.').reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function isPrivateIPv4(ip) {
  const n = ipv4ToInt(ip);
  const inRange = (base, bits) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (n & mask) === (ipv4ToInt(base) & mask);
  };
  // Loopback, link-local (incl. the cloud metadata endpoint at
  // 169.254.169.254), and the three private ranges — anywhere a server-
  // side fetch/navigation driven by user input shouldn't be able to reach.
  return (
    inRange('127.0.0.0', 8) ||
    inRange('169.254.0.0', 16) ||
    inRange('10.0.0.0', 8) ||
    inRange('172.16.0.0', 12) ||
    inRange('192.168.0.0', 16) ||
    inRange('0.0.0.0', 8)
  );
}

function isPrivateIPv6(ip) {
  const lower = ip.toLowerCase();
  return lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80');
}

// A signed-in-only endpoint still hands an attacker-controlled URL to a
// server-side fetch or headless-browser navigation — without this, anyone
// signed in could use it to probe internal network addresses or the cloud
// metadata service (SSRF). Shared by api/embed-proxy.js,
// api/screenshot-proxy.js, and api/crawl-preview.js rather than duplicated
// in each.
export async function assertPublicHost(hostname) {
  if (hostname.toLowerCase() === 'localhost') throw new Error('Host not allowed.');
  const { address, family } = await dns.lookup(hostname);
  if (family === 4 ? isPrivateIPv4(address) : isPrivateIPv6(address)) {
    throw new Error('Host not allowed.');
  }
}

// A cheap, no-DNS-lookup string check for the same private-host concern —
// used for per-request interception inside a headless browser session
// (screenshot-proxy.js, crawl-preview.js), where a real DNS lookup on
// every single asset/script/redirect the page makes would be far too slow.
// Less thorough than assertPublicHost (a hostname that only *resolves* to
// a private IP without literally looking like one slips through), but
// catches the obvious/common cases at negligible cost.
export function isObviouslyPrivateHost(hostname) {
  const h = hostname.toLowerCase();
  return (
    h === 'localhost' ||
    /^127\./.test(h) ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    /^169\.254\./.test(h) ||
    h === '::1' ||
    /^f[cd][0-9a-f]{0,2}:/i.test(h) ||
    /^fe80:/i.test(h)
  );
}
