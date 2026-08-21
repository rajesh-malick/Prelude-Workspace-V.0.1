import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { getSessionUser } from './_lib/session.js';
import { assertPublicHost } from './_lib/urlSafety.js';

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
const NAV_TIMEOUT_MS = 15_000;
const VIEWPORT = { width: 1280, height: 800 };

function isObviouslyPrivateHost(hostname) {
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

export default async function handler(req, res) {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Not signed in.' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const target = typeof req.query.url === 'string' ? req.query.url : '';
  if (!target) return res.status(400).json({ error: 'No url given.' });

  let parsedTarget;
  try {
    parsedTarget = new URL(target);
  } catch {
    return res.status(400).json({ error: 'That link is not a valid URL.' });
  }
  if (!['http:', 'https:'].includes(parsedTarget.protocol)) {
    return res.status(400).json({ error: 'Only http/https links can be screenshotted.' });
  }

  try {
    await assertPublicHost(parsedTarget.hostname);
  } catch {
    return res.status(400).json({ error: 'That host cannot be reached.' });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: VIEWPORT,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
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
        // Malformed request URL — let the browser's own handling deal
        // with it rather than guessing.
      }
      request.continue();
    });

    try {
      await page.goto(target, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT_MS });
    } catch {
      // Timed out waiting for the network to settle — screenshot whatever
      // actually rendered anyway rather than failing outright. A
      // slow-but-mostly-loaded page is still more useful than nothing.
    }

    const image = await page.screenshot({ type: 'jpeg', quality: 72 });

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.status(200).send(image);
  } catch (err) {
    console.error('GET /api/screenshot-proxy error', err);
    return res.status(502).json({ error: 'Could not capture a preview of this link.' });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
