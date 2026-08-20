import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Send,
  File as FileIcon,
  X,
  PanelRightOpen,
  PanelRightClose,
  ExternalLink,
  MapPin,
} from 'lucide-react';
import Butterfly from './Butterfly';
import ResolveToggle from './ResolveToggle';
import ReplyThread from './ReplyThread';
import DetailsCommentsSwitch from './DetailsCommentsSwitch';
import SlashTagMenu from './SlashTagMenu';
import useSlashTagPicker from '../hooks/useSlashTagPicker';
import { resolvedNote } from '../utils/commentStatus';
import { TAG_OPTIONS, TAG_ICON, TAG_LABEL } from '../utils/commentTags';
import { getEmbedSrc } from '../utils/embedProxy';

const STATUS_LABEL = {
  approved: 'Approved',
  'in review': 'In review',
  draft: 'Draft',
  blocked: 'Blocked',
};

const ASSET_KIND_LABEL = { image: 'Image', video: 'Video', html: 'HTML prototype', file: 'File' };

// Fallback scatter for legacy/seed comments that predate click-to-pin —
// anything with a real x/y (see below) uses that instead.
const FALLBACK_SLOTS = [
  { top: '18%', left: '22%' },
  { top: '58%', left: '68%' },
  { top: '38%', left: '48%' },
  { top: '72%', left: '30%' },
];

function positionFor(comment, i) {
  if (comment.x != null && comment.y != null) return { top: `${comment.y}%`, left: `${comment.x}%` };
  return FALLBACK_SLOTS[i % FALLBACK_SLOTS.length];
}

// A real two-option switch (both states always visible, a sliding thumb
// shows which is active) rather than one button whose label swapped —
// easier to tell at a glance there even are two modes, and which one
// you're currently in, instead of reading a single word each time.
function ModeSwitch({ interactive, onChange, showHint, onDismissHint }) {
  return (
    <div className="relative">
      {/* Plain CSS transform for the sliding thumb, deliberately not a
          Framer Motion layoutId/shared-layout animation — that pattern can
          leave a lingering full-screen "projection" element behind if the
          component unmounts mid-animation, which is exactly what toggling
          this and then immediately navigating away does. A single
          always-mounted thumb inside this one component can't leak
          anywhere else. */}
      {/* Explicit h-8 rather than letting padding decide the height — this
          sits directly next to the h-8 sidebar-toggle button, and without
          a matching fixed height the two ended up a couple pixels
          different, reading as slightly misaligned next to each other. */}
      {/* Boxier rectangular switch (rounded-lg, not a full pill) with a
          solid sliding block — both labels always visible, the inactive
          one dimmed on the dark track, the active one dark text on the
          light block. Neutral white/light rather than a literal red/green
          on/off treatment: Cursor and Comment are two equally valid modes,
          not a "bad" vs "good" state, so color-coding them like an on/off
          switch would misleadingly imply one is disabled. */}
      <div className="relative flex h-8 w-[168px] items-center rounded-lg border border-white/10 bg-stone-800 p-1 text-[11px] font-semibold">
        <span
          className="absolute inset-y-1 left-1 w-[76px] rounded-md bg-white shadow-sm transition-transform duration-200 ease-out"
          style={{ transform: interactive ? 'translateX(0%)' : 'translateX(100%)' }}
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange(true);
          }}
          className={`relative z-10 flex-1 rounded-md py-1 text-center transition-colors ${
            interactive ? 'text-stone-900' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Cursor
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange(false);
          }}
          className={`relative z-10 flex-1 rounded-md py-1 text-center transition-colors ${
            interactive ? 'text-stone-400 hover:text-stone-200' : 'text-stone-900'
          }`}
        >
          Comment
        </button>
      </div>
      {/* First-time-ever nudge so people discover there's a second mode at
          all. Shown once per account (see App.jsx), dismissed by clicking
          it away or by actually using the switch above. */}
      {showHint && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-[calc(100%+8px)] z-30 w-52 rounded-lg bg-white p-2.5 text-stone-800 shadow-lg"
        >
          <span className="absolute -top-1.5 right-4 block h-3 w-3 rotate-45 bg-white" />
          <div className="flex items-start justify-between gap-2">
            <p className="text-[12px] leading-snug">Switch to Comment to scroll, play, or click the actual content.</p>
            <button
              type="button"
              onClick={onDismissHint}
              aria-label="Dismiss tip"
              className="flex-none text-stone-400 transition-colors hover:text-stone-600"
            >
              <X size={13} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Review is "the center of Prelude" — the prototype dominates, edge to edge,
// with everything else (title, status, version details, the full comment
// list) floating on top of it rather than competing with it for space.
// Comments (butterflies) are pinned by clicking the exact spot on the
// preview, like a real design-review tool — not auto-scattered.
export default function ReviewOverlay({
  project,
  version,
  onBack,
  onAddComment,
  onResolveComment,
  onAddReply,
  readOnly,
  visitingOwnerName,
  initialFocusCommentId,
  showModeHint,
  onDismissModeHint,
}) {
  const [pin, setPin] = useState(null);
  const [draft, setDraft] = useState('');
  const [tag, setTag] = useState(null);
  const slashTags = useSlashTagPicker(draft, setDraft, setTag);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('details');
  const [highlightCommentId, setHighlightCommentId] = useState(null);
  // Both a native <video controls> element and a cross-origin iframe (any
  // pasted external link) have the same either/or: either the element
  // receives clicks itself (so you can hit play/seek, or scroll/click a
  // live page), or clicks pass through to this page's click-to-pin handler
  // — never both for the same click. For the iframe case that's a hard
  // browser security boundary (its content lives in another browsing
  // context this page's JS can never reach into); for video it's just
  // that a disabled control bar can't be clicked either. Comment-anywhere
  // is the default (matching plain image previews, which have no
  // controls to fight over); interacting with the asset itself is the
  // deliberate, explicit toggle instead of the other way around.
  const [assetInteractive, setAssetInteractive] = useState(false);
  const previewRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (pin) inputRef.current?.focus();
  }, [pin]);

  // Arriving here from a "jump to this comment" click (e.g. the Grove
  // sidebar's comment preview) — open the sidebar it lives in, scroll to
  // it once the open animation has had a moment to run, and hold a brief
  // highlight so it's obvious which one you were sent to.
  useEffect(() => {
    if (!initialFocusCommentId) return;
    setSidebarOpen(true);
    setSidebarTab('comments');
    setHighlightCommentId(initialFocusCommentId);
    const scrollTimer = setTimeout(() => {
      document.getElementById(`comment-${initialFocusCommentId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 250);
    const clearTimer = setTimeout(() => setHighlightCommentId(null), 2500);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [initialFocusCommentId]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setPin(null);
        setAssetInteractive(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handlePreviewClick = (e) => {
    if (readOnly || assetInteractive) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = Math.min(96, Math.max(4, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(96, Math.max(4, ((e.clientY - rect.top) / rect.height) * 100));
    setPin({ x, y });
    setDraft('');
    setTag(null);
  };

  // Keyboard equivalent of clicking a spot on the preview — there's no
  // pointer position to derive from a keypress, so this drops the pin
  // dead center instead. Real parity for "can you leave a comment at all
  // without a mouse", not pixel-for-pixel parity with a click.
  // `e.target !== e.currentTarget` guards against this firing on the
  // Space/Enter keydowns that bubble up from the comment text input
  // itself (which lives inside this same div) — without it, hitting the
  // spacebar while typing kept re-centering the pin and wiping the draft.
  const handlePreviewKeyDown = (e) => {
    if (readOnly || assetInteractive || e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    setPin({ x: 50, y: 50 });
    setDraft('');
    setTag(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !pin) return;
    onAddComment?.({ text, tag, x: pin.x, y: pin.y });
    setPin(null);
    setDraft('');
    setTag(null);
  };

  const assetKind = version.assetType?.startsWith('image/')
    ? 'image'
    : version.assetType?.startsWith('video/')
    ? 'video'
    : version.assetType === 'text/html'
    ? 'html'
    : version.assetUrl
    ? 'file'
    : null;

  // Live websites bring their own logo/nav into the exact corners our
  // controls used to float over — there's no corner that's safe for an
  // arbitrary site. So instead of overlaying it, we reserve a strip above
  // it: the website renders in 100% of the space below the strip, never
  // underneath it. Images/video don't have competing corner UI, so they
  // stay full-bleed with the floating controls as before.
  const framed = assetKind === 'html';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="fixed inset-0 z-30 overflow-hidden bg-black"
    >
      {/* Prototype — full-bleed, edge to edge. Click anywhere on it to drop
          a pin and leave a comment right there. */}
      <div
        ref={previewRef}
        onClick={handlePreviewClick}
        onKeyDown={handlePreviewKeyDown}
        role="button"
        tabIndex={0}
        aria-label={
          readOnly || assetInteractive ? 'Prototype preview.' : 'Prototype preview. Press Enter to leave a comment.'
        }
        className={`absolute inset-x-0 bottom-0 ${framed ? 'top-12' : 'top-0'} ${
          readOnly || assetInteractive ? 'cursor-default' : 'cursor-crosshair'
        }`}
        style={{
          background: version.assetUrl ? '#111' : `linear-gradient(135deg, ${project.color}33, ${project.color}11)`,
        }}
      >
        {assetKind === 'image' && (
          <img
            src={version.assetUrl}
            alt={version.label}
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
            draggable={false}
          />
        )}
        {assetKind === 'video' && (
          // pointer-events-none by default, same reasoning as the html case
          // below — a disabled control bar can't be played/seeked/muted
          // either, so that only happens once you deliberately ask to
          // interact with the video itself (toggle lives in the header now).
          <video
            src={version.assetUrl}
            controls
            className={`absolute inset-0 h-full w-full object-contain ${assetInteractive ? '' : 'pointer-events-none'}`}
          />
        )}
        {assetKind === 'html' && (
          <>
            {/* pointer-events-none by default so clicks fall through to
                the outer div's click-to-pin handler above (comment-
                anywhere, same as image previews) — flips to auto only
                while deliberately "browsing" (toggle lives in the header
                now), which is what makes it scrollable/interactive, since
                a disabled iframe can't be scrolled at all either. */}
            <iframe
              src={getEmbedSrc(version.assetUrl)}
              title={version.label}
              className={`absolute inset-0 h-full w-full border-0 bg-white ${assetInteractive ? '' : 'pointer-events-none'}`}
            />
            {/* Routed through /api/embed-proxy (see getEmbedSrc), which
                fetches the page itself and re-serves it same-origin so most
                sites' own X-Frame-Options/CSP framing block never applies
                here. Still not universal — heavy JS apps, bot-protected
                sites, and anything requiring login can still render blank
                or broken — a working link straight to the real site stays
                the fallback either way. */}
            <a
              href={version.assetUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="glass-btn-dark absolute bottom-4 right-4 z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-white"
            >
              <ExternalLink size={12} strokeWidth={2.25} /> Open in new tab
            </a>
          </>
        )}
        {assetKind === 'file' && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-stone-300">
            <FileIcon size={26} strokeWidth={1.75} />
            <div className="text-[14px] font-medium">{version.assetName}</div>
          </div>
        )}
        {!assetKind && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center">
            <div>
              <div className="text-[14.5px] font-medium text-stone-300">Prototype preview — placeholder</div>
              <div className="mt-1 text-[13px] text-stone-500">No asset uploaded yet for {version.label}</div>
            </div>
          </div>
        )}

        {version.comments.map((c, i) => (
          <Butterfly
            key={c.id}
            comment={c}
            style={positionFor(c, i)}
            onResolve={readOnly ? undefined : (resolved) => onResolveComment?.(c.id, resolved)}
            onAddReply={readOnly ? undefined : (path, text) => onAddReply?.(c.id, text, path)}
            readOnly={readOnly}
          />
        ))}

        <AnimatePresence>
          {pin && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.12 }}
              className="absolute z-10"
              style={{ top: `${pin.y}%`, left: `${pin.x}%` }}
              onClick={(e) => e.stopPropagation()}
            >
              <span
                className="absolute -left-1.5 -top-1.5 block h-3 w-3 rounded-full border-2 border-white"
                style={{ backgroundColor: project.color }}
              />
              <form
                onSubmit={handleSubmit}
                className="glass-surface absolute top-4 w-72 rounded-xl p-3"
                style={{
                  left: pin.x > 60 ? 'auto' : 0,
                  right: pin.x > 60 ? 0 : 'auto',
                  top: pin.y > 65 ? 'auto' : 16,
                  bottom: pin.y > 65 ? 16 : 'auto',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 rounded-full bg-black/5 p-1">
                    {/* Icon-only at 11px with no label (and "Note" had no
                        icon at all, so that button was just... blank) read
                        as barely-there — every option now always shows its
                        icon at a size that actually reads, plus its label
                        once selected so the choice stays visible afterward. */}
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
                <div className="relative mt-1.5 flex items-center gap-1.5">
                  {slashTags.open && (
                    <SlashTagMenu matches={slashTags.matches} highlighted={slashTags.highlighted} onSelect={slashTags.select} />
                  )}
                  <input
                    ref={inputRef}
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={slashTags.onKeyDown}
                    placeholder="Leave a comment here… (try /)"
                    className="min-w-0 flex-1 rounded-full bg-black/5 px-3 py-1.5 text-[13.5px] text-stone-800 outline-none placeholder:text-stone-400"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim()}
                    className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40"
                    style={{ backgroundColor: project.color }}
                  >
                    <Send size={13} strokeWidth={2.5} />
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {!pin && !readOnly && (
          <div className="pointer-events-none absolute bottom-24 right-6 text-[12.5px] text-stone-300">
            Click the preview to pin a comment
          </div>
        )}
      </div>

      {framed ? (
        /* Reserved strip, not an overlay — the website renders in the
            space below this bar rather than underneath it, so its own
            logo/nav in the corners is never covered no matter what a
            given site puts there. Solid, not translucent: we own this
            pixel row outright now, so there's no more guessing at
            contrast against arbitrary content underneath it. */
        <div className="pointer-events-auto absolute inset-x-0 top-0 z-20 flex h-12 items-center justify-between bg-stone-950 px-3">
          <button
            type="button"
            onClick={onBack}
            title={`Back to ${project.name}`}
            aria-label={`Back to ${project.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={16} strokeWidth={2.25} />
          </button>
          <div className="flex items-center gap-1.5">
            {!readOnly && (
              <ModeSwitch
                interactive={assetInteractive}
                onChange={(v) => {
                  setAssetInteractive(v);
                  onDismissModeHint?.();
                }}
                showHint={showModeHint}
                onDismissHint={() => onDismissModeHint?.()}
              />
            )}
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              title={sidebarOpen ? 'Hide version details' : 'Show version details & comments'}
              aria-label={sidebarOpen ? 'Hide version details' : 'Show version details & comments'}
              aria-pressed={sidebarOpen}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                sidebarOpen ? 'bg-white text-stone-900' : 'text-stone-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {sidebarOpen ? <PanelRightClose size={16} strokeWidth={2.25} /> : <PanelRightOpen size={16} strokeWidth={2.25} />}
            </button>
          </div>
        </div>
      ) : (
        /* Images/video: no competing corner UI to protect, so these stay
            floating over the content — each its own dark high-contrast
            pill (not one shared bar) since it can be light-colored just
            as easily as dark. */
        <>
          <button
            type="button"
            onClick={onBack}
            title={`Back to ${project.name}`}
            aria-label={`Back to ${project.name}`}
            className="glass-btn-dark pointer-events-auto absolute left-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full text-white"
          >
            <ArrowLeft size={16} strokeWidth={2.25} />
          </button>

          <div className="pointer-events-auto absolute right-3 top-3 z-20 flex items-center gap-1.5">
            {!readOnly && assetKind === 'video' && (
              <ModeSwitch
                interactive={assetInteractive}
                onChange={(v) => {
                  setAssetInteractive(v);
                  onDismissModeHint?.();
                }}
                showHint={showModeHint}
                onDismissHint={() => onDismissModeHint?.()}
              />
            )}
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              title={sidebarOpen ? 'Hide version details' : 'Show version details & comments'}
              aria-label={sidebarOpen ? 'Hide version details' : 'Show version details & comments'}
              aria-pressed={sidebarOpen}
              className={`flex h-9 w-9 flex-none items-center justify-center rounded-full transition-colors ${
                sidebarOpen ? 'glass-btn-primary' : 'glass-btn-dark text-stone-200 hover:text-white'
              }`}
            >
              {sidebarOpen ? <PanelRightClose size={16} strokeWidth={2.25} /> : <PanelRightOpen size={16} strokeWidth={2.25} />}
            </button>
          </div>
        </>
      )}

      {/* Version details + full comment list — off by default so the
          prototype gets the room, one click away when you want it. Shows
          everything filled in when this version was created. */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="glass-surface absolute bottom-24 right-4 top-20 z-20 flex w-[300px] flex-col overflow-hidden rounded-2xl"
          >
            {/* Moved down from the header when it went minimal — still a
                persistent reminder you're editing someone else's territory.
                Sits above the switch, not inside either tab, since it's
                relevant no matter which one you're looking at. */}
            {visitingOwnerName && (
              <div className="mx-3 mt-3 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[12.5px] font-medium text-amber-700">
                <MapPin size={13} strokeWidth={2} /> Editing {visitingOwnerName}'s territory
              </div>
            )}

            {/* Same sliding-switch pattern as Cursor/Comment mode — Details
                and Comments used to be stacked in one long scroll, which
                meant scrolling past all the version metadata just to reach
                the comments (or vice versa). Splitting them into two
                explicit views made either one reachable in one click. */}
            <div className="flex-none p-3 pb-0">
              <DetailsCommentsSwitch
                tab={sidebarTab}
                onChange={setSidebarTab}
                commentsLabel={`Comments · ${version.comments.length}`}
              />
            </div>

            {sidebarTab === 'details' ? (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2 text-[13.5px]">
                <div className="flex justify-between gap-2">
                  <span className="text-stone-500">Version name</span>
                  <span className="font-medium text-stone-800">{version.label}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-stone-500">Owner</span>
                  <span className="font-medium text-stone-800">{version.owner}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-stone-500">Created</span>
                  <span className="font-medium text-stone-800">{version.createdAt}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-stone-500">Status</span>
                  <span className="font-medium text-stone-800">{STATUS_LABEL[version.status] ?? version.status}</span>
                </div>
                {assetKind && (
                  <div className="flex justify-between gap-2">
                    <span className="text-stone-500">Asset type</span>
                    <span className="font-medium text-stone-800">{ASSET_KIND_LABEL[assetKind]}</span>
                  </div>
                )}
                {version.assetName && (
                  <div className="flex justify-between gap-2">
                    <span className="text-stone-500">Asset</span>
                    <span className="max-w-[170px] truncate font-medium text-stone-800" title={version.assetName}>
                      {version.assetName}
                    </span>
                  </div>
                )}
              </div>

              {version.description && (
                <div className="mt-3">
                  <div className="text-[11.5px] font-semibold uppercase tracking-wide text-stone-600">Description</div>
                  <p className="mt-1 text-[13px] leading-snug text-stone-600">{version.description}</p>
                </div>
              )}

              {version.changelog && (
                <div className="mt-3">
                  <div className="text-[11.5px] font-semibold uppercase tracking-wide text-stone-600">What changed</div>
                  <p className="mt-1 text-[13px] leading-snug text-stone-600">{version.changelog}</p>
                </div>
              )}
            </div>
            ) : (
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {version.comments.length === 0 && (
                <div className="text-[13px] text-stone-500">No comments on this version yet.</div>
              )}
              {version.comments.map((c) => {
                const CommentTagIcon = c.tag ? TAG_ICON[c.tag] : null;
                return (
                  <div
                    key={c.id}
                    id={`comment-${c.id}`}
                    className="rounded-lg bg-black/[0.03] p-2.5 transition-shadow"
                    style={c.id === highlightCommentId ? { boxShadow: `0 0 0 2px ${project.color}` } : undefined}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-stone-800">
                        {c.author}
                        {CommentTagIcon && (
                          <span className="text-stone-500" title={TAG_LABEL[c.tag]}>
                            <CommentTagIcon size={13} strokeWidth={2.5} />
                          </span>
                        )}
                      </div>
                      <ResolveToggle
                        resolved={Boolean(c.resolved)}
                        resolvedBy={c.resolvedBy}
                        onChange={readOnly ? undefined : (v) => onResolveComment?.(c.id, v)}
                        readOnly={readOnly}
                      />
                    </div>
                    <div className="mt-1 text-[13px] leading-snug text-stone-700">{c.text}</div>
                    {resolvedNote(c) && <div className="mt-1 text-[11px] font-medium text-stone-500">{resolvedNote(c)}</div>}
                    <div className="mt-2 border-t border-black/5 pt-2">
                      <ReplyThread
                        replies={c.replies}
                        onAddReply={readOnly ? undefined : (path, text) => onAddReply?.(c.id, text, path)}
                        readOnly={readOnly}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
