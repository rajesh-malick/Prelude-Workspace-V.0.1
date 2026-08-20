import dns from 'node:dns/promises';
import { getSessionUser } from './_lib/session.js';

// Most real websites send X-Frame-Options / CSP `frame-ancestors` headers
// specifically to stop third-party sites (like this one) from putting them
// in an <iframe> — that's a restriction the TARGET site enforces, and no
// client-side trick can override it. The only real workaround is to fetch
// the page here, on our own server, and re-serve it from our own origin —
// the browser then only ever sees a same-origin response with none of
// those headers, so it never refuses to render.
//
// This is deliberately "best effort", not a general-purpose web proxy:
// - Only the fetched HTML document itself is rewritten. Its own CSS/JS/
//   images keep loading straight from the original site (a <base> tag
//   handles relative URLs) — those aren't blocked by X-Frame-Options
//   anyway, since that header only governs top-level document framing.
// - <a href> links are rewritten to route back through this same proxy,
//   so clicking through to another page on the same site still works.
//   Nothing else (forms, JS-driven navigation, srcset, inline `url()`) is
//   rewritten.
// - No cookies/session from the original site travel with the request, so
//   anything requiring login renders logged-out at best.
// - Sites behind bot protection (Cloudflare/Akamai challenge pages) or
//   built as heavy client-side SPAs that fetch their own content via APIs
//   will often render broken or blank here — there's no way around that
//   without a full headless-browser renderer, which is out of scope for a
//   design-review preview.
const MAX_BYTES = 5_000_000;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;

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
  // side fetch driven by user input shouldn't be able to reach.
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

// A signed-in-only endpoint (see getSessionUser below) still hands an
// attacker-controlled URL to a server-side fetch — without this, anyone
// signed in could use it to probe internal network addresses or the cloud
// metadata service (SSRF). Resolves the hostname and rejects anything that
// lands on a private/loopback/link-local address, on every redirect hop,
// not just the initial URL.
async function assertPublicHost(hostname) {
  if (hostname.toLowerCase() === 'localhost') throw new Error('Host not allowed.');
  const { address, family } = await dns.lookup(hostname);
  if (family === 4 ? isPrivateIPv4(address) : isPrivateIPv6(address)) {
    throw new Error('Host not allowed.');
  }
}

async function fetchFollowingRedirects(startUrl) {
  let current = startUrl;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const parsed = new URL(current);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only http/https links can be previewed.');
    await assertPublicHost(parsed.hostname);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 PreludeWorkspacePreview',
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Redirected with no destination.');
      current = new URL(location, current).href;
      continue;
    }
    return { response, finalUrl: current };
  }
  throw new Error('Too many redirects.');
}

async function readCapped(response) {
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      reader.cancel();
      throw new Error('That page is too large to preview.');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf-8');
}

export default async function handler(req, res) {
  const user = getSessionUser(req);
  if (!user) return res.status(401).send('Not signed in.');
  if (req.method !== 'GET') return res.status(405).send('Method not allowed.');

  const target = typeof req.query.url === 'string' ? req.query.url : '';
  if (!target) return res.status(400).send('No url given.');

  try {
    new URL(target);
  } catch {
    return res.status(400).send('That link is not a valid URL.');
  }

  try {
    const { response, finalUrl } = await fetchFollowingRedirects(target);
    if (!response.ok) {
      return res.status(502).send(`That site returned an error (${response.status}) — try Open in new tab instead.`);
    }
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return res.status(415).send("That link didn't return a webpage — try Open in new tab instead.");
    }

    let html = await readCapped(response);

    // Some sites additionally set framing restrictions via a <meta> tag
    // rather than (or alongside) the HTTP header — the header itself is
    // never forwarded since this response is built fresh below, but a
    // leftover meta tag would still apply to the framed document itself.
    html = html.replace(/<meta[^>]+http-equiv=["']?(x-frame-options|content-security-policy)["']?[^>]*>/gi, '');

    // Resolves every relative CSS/JS/image URL against the real page's
    // directory, so those keep loading straight from the original site —
    // much simpler and more robust than rewriting every individual
    // src/href/srcset attribute by hand.
    const baseHref = new URL('.', finalUrl).href;
    const baseTag = `<base href="${baseHref}">`;
    html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => `${m}${baseTag}`) : baseTag + html;

    // Links, specifically, get routed back through this same proxy so
    // clicking through to another page on the same site still renders
    // instead of hitting the target's framing restriction directly.
    html = html.replace(/(<a\b[^>]*?\shref\s*=\s*)(["'])(.*?)\2/gi, (full, prefix, quote, href) => {
      const trimmed = href.trim();
      if (!trimmed || /^(javascript:|mailto:|tel:|#)/i.test(trimmed)) return full;
      let absolute;
      try {
        absolute = new URL(trimmed, finalUrl).href;
      } catch {
        return full;
      }
      return `${prefix}${quote}/api/embed-proxy?url=${encodeURIComponent(absolute)}${quote}`;
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(html);
  } catch (err) {
    console.error('GET /api/embed-proxy error', err);
    return res.status(502).send('Could not load a preview for this link — try Open in new tab instead.');
  }
}
