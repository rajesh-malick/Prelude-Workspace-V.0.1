import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { getSessionUser } from './_lib/session.js';
import { assertPublicHost, isObviouslyPrivateHost } from './_lib/urlSafety.js';
import { parseDisallowedPaths, isPathAllowed } from './_lib/robotsTxt.js';

// Fallback for links the live iframe proxy (embed-proxy.js) genuinely can't
// render — heavy client-side apps whose own API calls get blocked by CORS
// once served from our origin (see useEmbedEmptyCheck.js for how that's
// detected). A real headless browser navigates to the link on its OWN
// real domain, so none of that applies: its JS runs normally and its own
// API calls succeed exactly as they would in a normal tab. The tradeoff is
// this returns a static image, not a live page — there's no way to also
// keep it interactive once we've given up on framing it directly.
//
// Still can't show anything requiring the visitor's own login (a
// logged-in Flipkart cart, a private LinkedIn feed) — this is a fresh,
// signed-out browser session with no cookies for the target site, same
// hard limit as the iframe path. That's not a gap either of these can
// close; there's no session to give it.
//
// Also doubles as Gallery mode's crawler (?mode=crawl) — deliberately kept
// in this SAME function/file rather than a separate one. Two functions
// each importing @sparticuz/chromium bundles the (large) Chromium binary
// into the deployment twice; one function importing it once is
// meaningfully smaller to build and deploy. The two modes share the
// browser-launch/host-checking code below; only what happens after that
// differs.
const NAV_TIMEOUT_MS = 15_000;
const VIEWPORT = { width: 1280, height: 800 };

// Gallery-crawl-only constants — see the mode==='crawl' branch below.
const MAX_PAGES = 8;
const MAX_FULL_PAGE_HEIGHT = 12_000;
const ROBOTS_FETCH_TIMEOUT_MS = 5_000;

function normalizeDomain(hostname) {
  return hostname.replace(/^www\./i, '').toLowerCase();
}

function titleFromUrl(urlString) {
  try {
    const u = new URL(urlString);
    const segment = u.pathname.split('/').filter(Boolean).pop();
    if (!segment) return u.hostname;
    return decodeURIComponent(segment)
      .replace(/\.\w+$/, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return urlString;
  }
}

async function launchBrowser() {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: VIEWPORT,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
  const page = await browser.newPage();
  // A lightweight, no-DNS-lookup second check on every navigation this
  // page makes (redirects, client-side location changes) — cheap enough
  // to run per-request, unlike assertPublicHost's real DNS lookup.
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    try {
      const url = new URL(request.url());
      if (['http:', 'https:'].includes(url.protocol) && isObviouslyPrivateHost(url.hostname)) {
        return request.abort();
      }
    } catch {
      // Malformed request URL — let the browser's own handling deal with
      // it rather than guessing.
    }
    request.continue();
  });
  return { browser, page };
}

async function takeSingleScreenshot(page, target) {
  try {
    await page.goto(target, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT_MS });
  } catch {
    // Timed out waiting for the network to settle — screenshot whatever
    // actually rendered anyway rather than failing outright.
  }
  return page.screenshot({ type: 'jpeg', quality: 72 });
}

// Gallery mode's crawl — a small, capped set of same-domain pages starting
// from the given URL (discovering links off the first page only),
// full-page-screenshotted with the one shared browser session. Scoped
// small on purpose rather than a true background job: each page costs
// roughly 3-9s (navigate + settle + full-page capture), so even 8 pages
// runs close to what one request can do. A genuinely larger crawl (15-20+
// pages) would need real job infrastructure (a status record, incremental
// processing across multiple short invocations, a progress endpoint the UI
// polls) — not built here.
async function crawlPages(page, startUrl) {
  let disallowed = [];
  try {
    const robotsRes = await fetch(`${startUrl.protocol}//${startUrl.host}/robots.txt`, {
      signal: AbortSignal.timeout(ROBOTS_FETCH_TIMEOUT_MS),
    });
    if (robotsRes.ok) disallowed = parseDisallowedPaths(await robotsRes.text());
  } catch {
    // Missing/unreachable/malformed robots.txt — nothing to respect.
  }

  const targetDomain = normalizeDomain(startUrl.hostname);
  const visited = new Set();
  const queue = [startUrl.href];
  const results = [];

  while (queue.length && results.length < MAX_PAGES) {
    const current = queue.shift();
    let currentUrl;
    try {
      currentUrl = new URL(current);
    } catch {
      continue;
    }
    const key = currentUrl.href.split('#')[0];
    if (visited.has(key)) continue;
    visited.add(key);
    if (!isPathAllowed(disallowed, currentUrl.pathname)) continue;

    try {
      await page.goto(currentUrl.href, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT_MS });
    } catch {
      // Settled slower than the timeout — still screenshot whatever
      // actually rendered rather than skipping the page outright.
    }

    const title = await page.title().catch(() => '');
    const scrollHeight = await page.evaluate(() => document.body.scrollHeight).catch(() => 0);
    const fullPage = scrollHeight > 0 && scrollHeight <= MAX_FULL_PAGE_HEIGHT;
    const image = await page.screenshot({ type: 'jpeg', quality: 65, fullPage });

    results.push({
      url: currentUrl.href,
      title: title?.trim() || titleFromUrl(currentUrl.href),
      image: `data:image/jpeg;base64,${image.toString('base64')}`,
    });

    // Only the first page seeds the queue with same-domain links —
    // discovering links from every subsequent page too would let the
    // queue balloon far past MAX_PAGES for no real benefit at this cap.
    if (results.length === 1) {
      const links = await page
        .evaluate(() => Array.from(document.querySelectorAll('a[href]')).map((a) => a.href))
        .catch(() => []);
      for (const link of links) {
        try {
          const linkUrl = new URL(link);
          if (['http:', 'https:'].includes(linkUrl.protocol) && normalizeDomain(linkUrl.hostname) === targetDomain) {
            queue.push(linkUrl.href);
          }
        } catch {
          // Not an absolute http(s) URL (mailto:, javascript:, etc.).
        }
      }
    }
  }

  return results;
}

export default async function handler(req, res) {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Not signed in.' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const target = typeof req.query.url === 'string' ? req.query.url : '';
  if (!target) return res.status(400).json({ error: 'No url given.' });
  const crawlMode = req.query.mode === 'crawl';

  let parsedTarget;
  try {
    parsedTarget = new URL(target);
  } catch {
    return res.status(400).json({ error: 'That link is not a valid URL.' });
  }
  if (!['http:', 'https:'].includes(parsedTarget.protocol)) {
    return res.status(400).json({ error: 'Only http/https links can be captured.' });
  }

  try {
    await assertPublicHost(parsedTarget.hostname);
  } catch {
    return res.status(400).json({ error: 'That host cannot be reached.' });
  }

  let browser;
  try {
    const launched = await launchBrowser();
    browser = launched.browser;

    if (crawlMode) {
      const pages = await crawlPages(launched.page, parsedTarget);
      return res.status(200).json({ pages });
    }

    const image = await takeSingleScreenshot(launched.page, target);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.status(200).send(image);
  } catch (err) {
    console.error('GET /api/screenshot-proxy error', err);
    return res
      .status(502)
      .json({ error: crawlMode ? 'Could not crawl this site.' : 'Could not capture a preview of this link.' });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
