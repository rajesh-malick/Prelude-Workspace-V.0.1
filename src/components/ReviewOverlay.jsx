import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Paintbrush,
  Star,
  MessageSquare,
  Send,
  File as FileIcon,
  X,
  PanelRightOpen,
  PanelRightClose,
  Eye,
  ExternalLink,
  MessageSquarePlus,
} from 'lucide-react';
import Butterfly from './Butterfly';
import StatusDropdown from './StatusDropdown';
import AssigneePicker from './AssigneePicker';
import { getStatus } from '../utils/commentStatus';

const STATUS_LABEL = {
  approved: 'Approved',
  'in review': 'In review',
  draft: 'Draft',
  blocked: 'Blocked',
};

const TAG_ICON = { ui: Paintbrush, improvement: Star };
const TAG_LABEL = { ui: 'UI improvement', improvement: 'Improvement' };

const ASSET_KIND_LABEL = { image: 'Image', video: 'Video', html: 'HTML prototype', file: 'File' };

// Fallback scatter for legacy/seed comments that predate click-to-pin —
// anything with a real x/y (see below) uses that instead.
const FALLBACK_SLOTS = [
  { top: '18%', left: '22%' },
  { top: '58%', left: '68%' },
  { top: '38%', left: '48%' },
  { top: '72%', left: '30%' },
];

const TAG_OPTIONS = [
  { value: null, label: 'Note', Icon: MessageSquare },
  { value: 'ui', label: 'UI improvement', Icon: Paintbrush },
  { value: 'improvement', label: 'Improvement', Icon: Star },
];

function positionFor(comment, i) {
  if (comment.x != null && comment.y != null) return { top: `${comment.y}%`, left: `${comment.x}%` };
  return FALLBACK_SLOTS[i % FALLBACK_SLOTS.length];
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
  onCycleCommentStatus,
  onAssignComment,
  people,
  readOnly,
}) {
  const [pin, setPin] = useState(null);
  const [draft, setDraft] = useState('');
  const [tag, setTag] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // A live embedded webpage needs real scroll/click access to itself (an
  // iframe with pointer-events disabled can't be scrolled at all) — an
  // iframe also never bubbles its own clicks out to this page's JS, so
  // "click anywhere to pin a comment" can't work directly over it either
  // way. This arms a one-shot transparent overlay on top of the iframe
  // instead: the embed stays fully interactive until you deliberately ask
  // to drop a pin, place it with the next click, then it reverts.
  const [pinArmed, setPinArmed] = useState(false);
  const previewRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (pin) inputRef.current?.focus();
  }, [pin]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setPin(null);
        setPinArmed(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handlePreviewClick = (e) => {
    if (readOnly) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = Math.min(96, Math.max(4, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(96, Math.max(4, ((e.clientY - rect.top) / rect.height) * 100));
    setPin({ x, y });
    setDraft('');
    setTag(null);
    setPinArmed(false);
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
    if (readOnly || e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
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
        aria-label={readOnly ? 'Prototype preview.' : 'Prototype preview. Press Enter to leave a comment.'}
        className={`absolute inset-0 ${readOnly ? 'cursor-default' : 'cursor-crosshair'}`}
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
          <video
            src={version.assetUrl}
            controls
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          />
        )}
        {assetKind === 'html' && (
          <>
            {/* Interactive, not pointer-events-none — a disabled iframe
                can't be scrolled at all, which matters a lot when this is
                a real webpage link rather than a small self-contained
                mockup. Trade-off: its own clicks never bubble out to this
                page's JS (separate browsing context), so "click anywhere
                to pin a comment" happens via the armed overlay below
                instead of directly on the iframe. */}
            <iframe
              src={version.assetUrl}
              title={version.label}
              className="absolute inset-0 h-full w-full border-0 bg-white"
            />
            {!readOnly && pinArmed && (
              <div
                onClick={handlePreviewClick}
                role="button"
                tabIndex={-1}
                aria-label="Click to place your comment"
                className="absolute inset-0 z-10 cursor-crosshair bg-black/10"
              >
                <div className="glass-surface absolute left-1/2 top-4 -translate-x-1/2 rounded-full px-3.5 py-1.5 text-[12px] font-medium text-stone-700">
                  Click anywhere to place your comment
                </div>
              </div>
            )}
            {!readOnly && !pinArmed && (
              <button
                type="button"
                onClick={() => setPinArmed(true)}
                className="glass-surface absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium text-stone-700 transition-colors hover:text-stone-900"
              >
                <MessageSquarePlus size={14} strokeWidth={2.25} /> Add a comment
              </button>
            )}
            {/* Some sites refuse to be framed at all (X-Frame-Options /
                CSP) and this renders as a silent blank iframe with no error
                — a working link out is the fallback so "no preview" never
                means "no way to actually see it". */}
            <a
              href={version.assetUrl}
              target="_blank"
              rel="noreferrer"
              className="glass-surface absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-stone-700 transition-colors hover:text-stone-900"
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
            onCycleStatus={readOnly ? undefined : (newStatus) => onCycleCommentStatus?.(c.id, newStatus)}
            onAssign={readOnly ? undefined : (name) => onAssignComment?.(c.id, name)}
            people={people}
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
                <div className="mt-1.5 flex items-center gap-1.5">
                  <input
                    ref={inputRef}
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Leave a comment here…"
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

      {/* Floating header — title, status, controls. Overlaid on the
          full-bleed preview rather than pushing it down. */}
      <div className="glass-surface pointer-events-auto absolute left-4 right-4 top-4 z-20 flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-stone-600 transition-colors hover:text-stone-900"
        >
          <ArrowLeft size={15} strokeWidth={2} /> {project.name}
        </button>
        <h2 className="min-w-0 flex-1 truncate text-center text-[18px] font-semibold text-stone-800">{version.label}</h2>
        <div className="flex flex-none items-center gap-2.5">
          {readOnly && (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[12.5px] font-medium text-emerald-700">
              <Eye size={13} strokeWidth={2} /> Read-only
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[13px] text-stone-600">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: project.color }} />
            {STATUS_LABEL[version.status] ?? version.status}
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? 'Hide version details' : 'Show version details & comments'}
            aria-label={sidebarOpen ? 'Hide version details' : 'Show version details & comments'}
            aria-pressed={sidebarOpen}
            className={`flex h-9 w-9 flex-none items-center justify-center rounded-full transition-colors ${
              sidebarOpen ? 'bg-stone-800 text-white' : 'text-stone-500 hover:bg-black/5 hover:text-stone-700'
            }`}
          >
            {sidebarOpen ? <PanelRightClose size={17} strokeWidth={2} /> : <PanelRightOpen size={17} strokeWidth={2} />}
          </button>
        </div>
      </div>

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
            <div className="flex-1 overflow-y-auto p-4">
              <div className="text-[12.5px] font-semibold uppercase tracking-wide text-stone-600">Version details</div>
              <div className="mt-2 space-y-2 text-[13.5px]">
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

              <div className="mt-4 border-t border-black/5 pt-3 text-[12.5px] font-semibold uppercase tracking-wide text-stone-600">
                Comments · {version.comments.length}
              </div>
              <div className="mt-2 space-y-2">
                {version.comments.length === 0 && (
                  <div className="text-[13px] text-stone-500">No comments on this version yet.</div>
                )}
                {version.comments.map((c) => {
                  const CommentTagIcon = c.tag ? TAG_ICON[c.tag] : null;
                  return (
                    <div key={c.id} className="rounded-lg bg-black/[0.03] p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-stone-800">
                          {c.author}
                          {CommentTagIcon && (
                            <span className="text-stone-500" title={TAG_LABEL[c.tag]}>
                              <CommentTagIcon size={13} strokeWidth={2.5} />
                            </span>
                          )}
                        </div>
                        <StatusDropdown
                          status={getStatus(c)}
                          onChange={readOnly ? undefined : (s) => onCycleCommentStatus?.(c.id, s)}
                          size="sm"
                        />
                      </div>
                      <div className="mt-1 text-[13px] leading-snug text-stone-700">{c.text}</div>
                      <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-black/5 pt-1.5">
                        <span className="text-[11px] font-medium uppercase tracking-wide text-stone-600">Assigned to</span>
                        <AssigneePickerOrLabel
                          assignee={c.assignee}
                          readOnly={readOnly}
                          people={people}
                          onChange={(name) => onAssignComment?.(c.id, name)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AssigneePickerOrLabel({ assignee, readOnly, people, onChange }) {
  if (readOnly) {
    return <span className="text-[12px] font-medium text-stone-600">{assignee ?? 'Unassigned'}</span>;
  }
  return <AssigneePicker assignee={assignee ?? null} onChange={onChange} people={people} size="sm" />;
}
