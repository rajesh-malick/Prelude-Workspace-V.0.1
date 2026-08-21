import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { getSessionUser } from './_lib/session.js';
import { assertPublicHost, isObviouslyPrivateHost } from './_lib/urlSafety.js';
import { parseDisallowedPaths, isPathAllowed } from './_lib/robotsTxt.js';

// Gallery mode's backend — crawls a small, capped set of same-domain pages
// starting from the given URL (discovering links off the first page only),
// full-page-screenshots each with one shared headless browser session, and
// returns everything in one response. Deliberately scoped small rather
// than a true background job: each page costs roughly 3-9s (navigate +
// settle + full-page capture), so even this modest cap can take the better
// part of a minute — crawling a genuinely large site (15-20+ pages) would
// need real job infrastructure (a status record, incremental processing
// across multiple short invocations, a progress endpoint the UI polls),
// which does not exist here. This trades "handles any size site" for
// "ships without building that."
const MAX_PAGES = 8;
const NAV_TIMEOUT_MS = 15_000;
const VIEWPORT = { width: 1280, height: 800 };
// Past this, a full-page capture risks real time/memory cost for a single
// pathologically long page — falls back to a viewport-only shot instead of
// risking the whole crawl over one outlier page.
const MAX_FULL_PAGE_HEIGHT = 12_000;
const ROBOTS_FETCH_TIMEOUT_MS = 5_000;

function normalizeDomain(hostname) {
  return hostname.replace(/^www\./i, '').toLowerCase();
}

// Falls back to a title derived from the URL path when a page has no
// <title> (or a generic one an SPA leaves in place before hydrating) —
// e.g. ".../about-us" -> "About Us".
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

export default async function handler(req, res) {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Not signed in.' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const target = typeof req.query.url === 'string' ? req.query.url : '';
  if (!target) return res.status(400).json({ error: 'No url given.' });

  let startUrl;
  try {
    startUrl = new URL(target);
  } catch {
    return res.status(400).json({ error: 'That link is not a valid URL.' });
  }
  if (!['http:', 'https:'].includes(startUrl.protocol)) {
    return res.status(400).json({ error: 'Only http/https links can be crawled.' });
  }

  try {
    await assertPublicHost(startUrl.hostname);
  } catch {
    return res.status(400).json({ error: 'That host cannot be reached.' });
  }

  // Best-effort — a missing, unreachable, or malformed robots.txt just
  // means there's nothing to respect, not a reason to fail the crawl.
  let disallowed = [];
  try {
    const robotsRes = await fetch(`${startUrl.protocol}//${startUrl.host}/robots.txt`, {
      signal: AbortSignal.timeout(ROBOTS_FETCH_TIMEOUT_MS),
    });
    if (robotsRes.ok) disallowed = parseDisallowedPaths(await robotsRes.text());
  } catch {
    // Ignore — treat as unrestricted.
  }

  const targetDomain = normalizeDomain(startUrl.hostname);
  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: VIEWPORT,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on('request', (request) => {
      try {
        const u = new URL(request.url());
        if (['http:', 'https:'].includes(u.protocol) && isObviouslyPrivateHost(u.hostname)) {
          return request.abort();
        }
      } catch {
        // Malformed request URL — let the browser's own handling deal
        // with it rather than guessing.
      }
      request.continue();
    });

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

      // Only the first page seeds the crawl queue with same-domain links —
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
            // Not an absolute http(s) URL (mailto:, javascript:, etc.) —
            // nothing to crawl.
          }
        }
      }
    }

    return res.status(200).json({ pages: results });
  } catch (err) {
    console.error('GET /api/crawl-preview error', err);
    return res.status(502).json({ error: 'Could not crawl this site.' });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
