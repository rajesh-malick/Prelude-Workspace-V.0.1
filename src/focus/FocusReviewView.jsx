import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Send,
  File as FileIcon,
  PanelRightOpen,
  PanelRightClose,
  ExternalLink,
  MapPin,
} from 'lucide-react';
import { resolvedNote } from '../utils/commentStatus';
import ResolveToggle from '../components/ResolveToggle';
import ReplyThread from '../components/ReplyThread';
import DetailsCommentsSwitch from '../components/DetailsCommentsSwitch';
import SlashTagMenu from '../components/SlashTagMenu';
import useSlashTagPicker from '../hooks/useSlashTagPicker';
import { TAG_OPTIONS, TAG_ICON } from '../utils/commentTags';

const STATUS_LABEL = {
  approved: 'Approved',
  'in review': 'In review',
  draft: 'Draft',
  blocked: 'Blocked',
};

const ASSET_KIND_LABEL = { image: 'Image', video: 'Video', html: 'HTML prototype', file: 'File' };

function CommentRow({ comment, onResolve, onAddReply, readOnly }) {
  const TagIcon = comment.tag ? TAG_ICON[comment.tag] : null;

  return (
    <div className="rounded-lg bg-black/[0.03] p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-stone-800">
          {comment.author}
          {TagIcon && (
            <span className="text-stone-500" title={comment.tag === 'ui' ? 'UI improvement' : 'Improvement'}>
              <TagIcon size={13} strokeWidth={2.5} />
            </span>
          )}
        </div>
        <ResolveToggle
          resolved={Boolean(comment.resolved)}
          resolvedBy={comment.resolvedBy}
          onChange={readOnly ? undefined : onResolve}
          readOnly={readOnly}
        />
      </div>
      <div className="mt-1 text-[13px] leading-snug text-stone-700">{comment.text}</div>
      {resolvedNote(comment) && <div className="mt-1 text-[11px] font-medium text-stone-500">{resolvedNote(comment)}</div>}
      <div className="mt-2 border-t border-black/5 pt-2">
        <ReplyThread replies={comment.replies} onAddReply={readOnly ? undefined : onAddReply} readOnly={readOnly} />
      </div>
    </div>
  );
}

// Full-bleed, same idea as the Grove ReviewOverlay — the prototype gets the
// whole screen, and version details / the comment list live behind a
// toggleable sidebar instead of pushing the preview down the page.
export default function FocusReviewView({
  project,
  version,
  onBack,
  onAddComment,
  onResolveComment,
  onAddReply,
  readOnly,
  visitingOwnerName,
}) {
  const [draft, setDraft] = useState('');
  const [tag, setTag] = useState(null);
  const slashTags = useSlashTagPicker(draft, setDraft, setTag);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('details');

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onAddComment({ text, tag });
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

  // See Grove's ReviewOverlay for the reasoning — a live website brings
  // its own logo/nav into the exact corners our controls used to float
  // over, so instead of overlaying it, a reserved strip renders above it
  // and the site gets 100% of the space below.
  const framed = assetKind === 'html';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="fixed inset-0 z-30 overflow-hidden bg-black"
    >
      <div
        className={`absolute inset-x-0 bottom-0 ${framed ? 'top-12' : 'top-0'}`}
        style={{ background: version.assetUrl ? '#111' : `linear-gradient(135deg, ${project.color}33, ${project.color}11)` }}
      >
        {assetKind === 'image' && (
          <img src={version.assetUrl} alt={version.label} className="absolute inset-0 h-full w-full object-contain" draggable={false} />
        )}
        {assetKind === 'video' && (
          <video src={version.assetUrl} controls className="absolute inset-0 h-full w-full object-contain" />
        )}
        {assetKind === 'html' && (
          <>
            <iframe src={version.assetUrl} title={version.label} className="absolute inset-0 h-full w-full border-0 bg-white" />
            {/* Some sites refuse to be framed at all (X-Frame-Options /
                CSP) and this renders as a silent blank iframe with no error
                — a working link out is the fallback so "no preview" never
                means "no way to actually see it". */}
            <a
              href={version.assetUrl}
              target="_blank"
              rel="noreferrer"
              className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 rounded-full bg-stone-900/85 px-3 py-1.5 text-[12px] font-medium text-white backdrop-blur-md transition-colors hover:bg-stone-900"
            >
              <ExternalLink size={12} strokeWidth={2.25} /> Open in new tab
            </a>
          </>
        )}
        {assetKind === 'file' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-stone-300">
            <FileIcon size={26} strokeWidth={1.75} />
            <div className="text-[14px] font-medium">{version.assetName}</div>
          </div>
        )}
        {!assetKind && (
          <div className="absolute inset-0 flex items-center justify-center text-center">
            <div>
              <div className="text-[14.5px] font-medium text-stone-300">Prototype preview — placeholder</div>
              <div className="mt-1 text-[13px] text-stone-500">No asset uploaded yet for {version.label}</div>
            </div>
          </div>
        )}
      </div>

      {framed ? (
        /* Reserved strip, not an overlay — see Grove's ReviewOverlay. */
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
      ) : (
        /* No competing corner UI on images/video, so these stay floating
            over the content, each its own dark high-contrast pill. */
        <>
          <button
            type="button"
            onClick={onBack}
            title={`Back to ${project.name}`}
            aria-label={`Back to ${project.name}`}
            className="pointer-events-auto absolute left-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-stone-900/85 text-white backdrop-blur-md transition-colors hover:bg-stone-900"
          >
            <ArrowLeft size={16} strokeWidth={2.25} />
          </button>

          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? 'Hide version details' : 'Show version details & comments'}
            aria-label={sidebarOpen ? 'Hide version details' : 'Show version details & comments'}
            aria-pressed={sidebarOpen}
            className={`pointer-events-auto absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md transition-colors ${
              sidebarOpen ? 'bg-white text-stone-900' : 'bg-stone-900/85 text-stone-200 hover:bg-stone-900 hover:text-white'
            }`}
          >
            {sidebarOpen ? <PanelRightClose size={16} strokeWidth={2.25} /> : <PanelRightOpen size={16} strokeWidth={2.25} />}
          </button>
        </>
      )}

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            // bottom-24 (not bottom-4) so this clears the fixed NavDock —
            // the dock sits at bottom-6 and is ~64px tall, and the comment
            // composer lives at the bottom of this very panel, so anything
            // less left the dock overlapping the input on shorter viewports.
            className="glass-surface absolute bottom-24 right-4 top-20 z-20 flex w-[320px] flex-col overflow-hidden rounded-2xl"
          >
            {/* Same sliding-switch pattern as Cursor/Comment mode and
                Grove's ReviewOverlay — one visual language for "pick one of
                two views" everywhere it shows up. */}
            <div className="border-b border-black/5 p-2">
              <DetailsCommentsSwitch
                tab={sidebarTab}
                onChange={setSidebarTab}
                commentsLabel={`Comments · ${version.comments.length}`}
              />
            </div>

            {sidebarTab === 'details' ? (
              <div className="flex-1 overflow-y-auto p-4">
                {visitingOwnerName && (
                  <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[12.5px] font-medium text-amber-700">
                    <MapPin size={13} strokeWidth={2} /> Editing {visitingOwnerName}'s territory
                  </div>
                )}
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
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 space-y-2 overflow-y-auto p-4">
                  {version.comments.length === 0 && (
                    <div className="text-[13px] text-stone-500">No comments on this version yet.</div>
                  )}
                  {version.comments.map((c) => (
                    <CommentRow
                      key={c.id}
                      comment={c}
                      onResolve={readOnly ? undefined : (resolved) => onResolveComment?.(c.id, resolved)}
                      onAddReply={readOnly ? undefined : (path, text) => onAddReply?.(c.id, text, path)}
                      readOnly={readOnly}
                    />
                  ))}
                </div>

                {!readOnly && (
                  <form onSubmit={handleSubmit} className="flex-none border-t border-black/5 p-3">
                    <div className="mb-2 flex items-center gap-1 rounded-full bg-black/5 p-1">
                      {TAG_OPTIONS.map((opt) => (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => setTag(opt.value)}
                          title={opt.label}
                          aria-pressed={tag === opt.value}
                          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                            tag === opt.value ? 'bg-stone-800 text-white' : 'text-stone-500 hover:text-stone-700'
                          }`}
                        >
                          <opt.Icon size={13} strokeWidth={2.5} />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <div className="relative flex items-center gap-1.5">
                      {slashTags.open && (
                        <SlashTagMenu matches={slashTags.matches} highlighted={slashTags.highlighted} onSelect={slashTags.select} />
                      )}
                      <input
                        type="text"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={slashTags.onKeyDown}
                        placeholder="Add a comment… (try /)"
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
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
