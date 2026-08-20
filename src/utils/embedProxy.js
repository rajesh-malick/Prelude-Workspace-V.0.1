// Figma's own /embed URLs (see toEmbeddableUrl in CreateVersionModal.jsx)
// already allow third-party framing by design — routing those through our
// own proxy would only break Figma's cross-origin JS/postMessage handshake
// for no benefit. Everything else defaults to going through the proxy,
// since most real sites block being framed outright (see
// api/embed-proxy.js) and there's no way to know in advance which ones do.
export function getEmbedSrc(assetUrl) {
  if (!assetUrl) return assetUrl;
  try {
    const parsed = new URL(assetUrl);
    if (/(^|\.)figma\.com$/.test(parsed.hostname) && parsed.pathname.startsWith('/embed')) {
      return assetUrl;
    }
  } catch {
    // Not a parseable absolute URL — fall through to the proxy like any
    // other webpage link.
  }
  return `/api/embed-proxy?url=${encodeURIComponent(assetUrl)}`;
}
