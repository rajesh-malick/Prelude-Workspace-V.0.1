import { useEffect, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { motion } from 'framer-motion';
import { ArrowLeft, ImageOff, Loader2, X, Send } from 'lucide-react';
import Butterfly from './Butterfly';
import { TAG_OPTIONS } from '../utils/commentTags';

const FALLBACK_SLOTS = [
  { top: '20%', left: '20%' },
  { top: '20%', left: '75%' },
  { top: '65%', left: '20%' },
  { top: '65%', left: '75%' },
];

function positionFor(comment, i) {
  if (comment.x != null && comment.y != null) return { top: `${comment.y}%`, left: `${comment.x}%` };
  return FALLBACK_SLOTS[i % FALLBACK_SLOTS.length];
}

async function fetchCrawlPreview(url) {
  const res = await fetch(`/api/crawl-preview?url=${encodeURIComponent(url)}`, { credentials: 'include' });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Could not crawl this site.');
  return res.json();
}

// One page's full-page screenshot, zoomable/pannable (react-zoom-pan-pinch
// — the only zoom/pan library in this project, added for this), with
// comment pins nested INSIDE the same zoomed/panned transform so they move
// and scale with the image instead of floating over it at a fixed
// viewport position.
function FocusedPage({ page, pins, readOnly, onPickPoint, onResolveComment, onAddReply }) {
  const [pin, setPin] = useState(null);
  const [draft, setDraft] = useState('');
  const [tag, setTag] = useState(null);

  const handleImageClick = (e) => {
    if (readOnly || pin) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(97, Math.max(3, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(97, Math.max(3, ((e.clientY - rect.top) / rect.height) * 100));
    setPin({ x, y });
    setDraft('');
    setTag(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !pin) return;
    onPickPoint({ text, tag, x: pin.x, y: pin.y });
    setPin(null);
    setDraft('');
    setTag(null);
  };

  return (
    <TransformWrapper minScale={1} maxScale={5} doubleClick={{ mode: 'toggle' }}>
      <TransformComponent wrapperClass="!h-full !w-full" contentClass="!h-full !w-full">
        <div className="relative" onClick={handleImageClick}>
          <img src={page.image} alt={page.title} className="block max-w-none" draggable={false} />
          {pins.map((c, i) => (
            <Butterfly
              key={c.id}
              comment={c}
              style={positionFor(c, i)}
              onResolve={readOnly ? undefined : (resolved) => onResolveComment?.(c.id, resolved)}
              onAddReply={readOnly ? undefined : (path, text) => onAddReply?.(c.id, text, path)}
              readOnly={readOnly}
            />
          ))}
          {pin && (
            <div
              className="absolute z-10"
              style={{ top: `${pin.y}%`, left: `${pin.x}%` }}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="absolute -left-1.5 -top-1.5 block h-3 w-3 rounded-full border-2 border-white bg-rose-500" />
              <form
                onSubmit={handleSubmit}
                className="glass-surface absolute top-4 w-72 rounded-xl p-3"
                style={{ left: pin.x > 60 ? 'auto' : 0, right: pin.x > 60 ? 0 : 'auto' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 rounded-full bg-black/5 p-1">
                    {TAG_OPTIONS.map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setTag(opt.value)}
                        title={opt.label}
                        aria-label={opt.label}
                        aria-pressed={tag === opt.value}
                        className={`flex items-center gap-1 rounded-full px-2 py-1.5 text-[12px] font-medium transition-colors ${
                          tag === opt.value ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                        }`}
                      >
                        <opt.Icon size={14} strokeWidth={2.25} />
                        {tag === opt.value && opt.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPin(null)}
                    aria-label="Cancel comment"
                    className="flex h-5 w-5 flex-none items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-black/5 hover:text-stone-600"
                  >
                    <X size={13} strokeWidth={2.5} />
                  </button>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <input
                    autoFocus
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Leave a comment here…"
                    className="min-w-0 flex-1 rounded-full bg-black/5 px-3 py-1.5 text-[13.5px] text-stone-800 outline-none placeholder:text-stone-400"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim()}
                    className="glass-btn-primary flex h-8 w-8 flex-none items-center justify-center rounded-full disabled:opacity-40"
                  >
                    <Send size={13} strokeWidth={2.5} />
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </TransformComponent>
    </TransformWrapper>
  );
}

// Gallery mode's whole surface — fetches a small, capped crawl of the
// version's link (api/crawl-preview.js) once, on first open, shows a grid
// of thumbnails, and lets any one of them open into a full-page, zoomable,
// pin-able view. Deliberately fetched here rather than lifted to
// ReviewOverlay — it's a self-contained view with its own loading/error
// states that only exist while Gallery mode is actually open.
export default function PageGallery({ startUrl, comments, readOnly, onAddComment, onResolveComment, onAddReply }) {
  const [pages, setPages] = useState(null);
  const [error, setError] = useState(null);
  const [focusedUrl, setFocusedUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setPages(null);
    setError(null);
    setFocusedUrl(null);
    fetchCrawlPreview(startUrl)
      .then((data) => {
        if (!cancelled) setPages(data.pages ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [startUrl]);

  const focusedPage = pages?.find((p) => p.url === focusedUrl) ?? null;

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white text-center">
        <div className="max-w-[280px]">
          <ImageOff size={22} strokeWidth={1.75} className="mx-auto text-stone-300" />
          <p className="mt-2 text-[13.5px] leading-snug text-stone-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!pages) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white text-center">
        <div>
          <Loader2 size={22} strokeWidth={2} className="mx-auto animate-spin text-stone-400" />
          <p className="mt-2 text-[13px] text-stone-500">
            Crawling this site's pages — this can take up to a minute…
          </p>
        </div>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white text-center">
        <p className="max-w-[260px] text-[13.5px] leading-snug text-stone-600">
          Couldn't capture any pages from this link.
        </p>
      </div>
    );
  }

  if (focusedPage) {
    const pagePins = comments.filter((c) => c.pageUrl === focusedPage.url);
    return (
      <div className="relative h-full w-full bg-stone-100">
        <FocusedPage
          page={focusedPage}
          pins={pagePins}
          readOnly={readOnly}
          onPickPoint={(payload) =>
            onAddComment?.({ ...payload, pageUrl: focusedPage.url, pageTitle: focusedPage.title })
          }
          onResolveComment={onResolveComment}
          onAddReply={onAddReply}
        />
        <button
          type="button"
          onClick={() => setFocusedUrl(null)}
          className="glass-btn-dark pointer-events-auto absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-white"
        >
          <ArrowLeft size={14} strokeWidth={2.25} /> Back to gallery
        </button>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-white px-8 py-10">
      <div className="mx-auto grid max-w-5xl grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-5">
        {pages.map((page) => (
          <motion.button
            key={page.url}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setFocusedUrl(page.url)}
            className="group text-left"
          >
            <div className="aspect-[4/3] overflow-hidden rounded-xl bg-stone-100 ring-1 ring-black/5 transition-shadow group-hover:ring-2 group-hover:ring-black/10">
              <img src={page.image} alt={page.title} className="h-full w-full object-cover object-top" />
            </div>
            <div className="mt-1.5 truncate text-[13px] font-medium text-stone-700">{page.title}</div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
