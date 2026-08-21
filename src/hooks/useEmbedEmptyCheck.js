import { useEffect, useRef, useState } from 'react';

// Whether an iframed page (served through /api/embed-proxy, which makes it
// same-origin with the app — its contentDocument is readable, no
// cross-origin SecurityError) still has next to no visible text a couple
// seconds after its initial load, long enough for any client-side JS to
// have hydrated it. This is deliberately a client-side, post-JS check —
// the proxy itself only ever sees the raw pre-JS HTML, which is an
// almost-empty shell for huge numbers of perfectly fine modern sites
// (Figma Sites, Webflow, Framer...), not just the ones that are actually
// broken (Airbnb/Sketchfab, whose own API calls get blocked by ordinary
// CORS once served from our origin). Judging "broken" from that raw HTML
// alone false-flags the fine ones — this waits and checks what actually
// rendered instead.
const SETTLE_MS = 2500;
const MIN_CHARS = 40;

export default function useEmbedEmptyCheck(assetUrl) {
  const [embedEmpty, setEmbedEmpty] = useState(false);
  const iframeRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    setEmbedEmpty(false);
    return () => clearTimeout(timeoutRef.current);
  }, [assetUrl]);

  const handleEmbedLoad = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      try {
        const text = iframeRef.current?.contentDocument?.body?.innerText ?? '';
        setEmbedEmpty(text.trim().length < MIN_CHARS);
      } catch {
        // Genuinely cross-origin at this point — the page itself must have
        // navigated to an absolute external URL rather than staying on
        // relative/proxied links. Can't inspect it, so don't second-guess
        // what's actually showing.
        setEmbedEmpty(false);
      }
    }, SETTLE_MS);
  };

  return { iframeRef, embedEmpty, handleEmbedLoad };
}
