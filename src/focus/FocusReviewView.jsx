import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Paintbrush,
  Star,
  MessageSquare,
  Send,
  File as FileIcon,
  PanelRightOpen,
  PanelRightClose,
  Eye,
} from 'lucide-react';
import { getStatus, getStatusNote } from '../utils/commentStatus';
import StatusDropdown from '../components/StatusDropdown';
import AssigneePicker from '../components/AssigneePicker';

const STATUS_LABEL = {
  approved: 'Approved',
  'in review': 'In review',
  draft: 'Draft',
  blocked: 'Blocked',
};

const ASSET_KIND_LABEL = { image: 'Image', video: 'Video', html: 'HTML prototype', file: 'File' };

const TAG_OPTIONS = [
  { value: null, label: 'Note', Icon: MessageSquare },
  { value: 'ui', label: 'UI improvement', Icon: Paintbrush },
  { value: 'improvement', label: 'Improvement', Icon: Star },
];
const TAG_ICON = { ui: Paintbrush, improvement: Star };

function CommentRow({ comment, onCycleStatus, onAssign, people, dropUp }) {
  const status = getStatus(comment);
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
        <StatusDropdown status={status} onChange={(s) => onCycleStatus?.(comment.id, s)} size="sm" dropUp={dropUp} />
      </div>
      <div className="mt-1 text-[13px] leading-snug text-stone-700">{comment.text}</div>
      {getStatusNote(comment) && <div className="mt-1 text-[11px] font-medium text-stone-600">{getStatusNote(comment)}</div>}
      <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-black/5 pt-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-stone-600">Assigned to</span>
        {onAssign ? (
          <AssigneePicker assignee={comment.assignee ?? null} onChange={onAssign} people={people} size="sm" dropUp={dropUp} />
        ) : (
          <span className="text-[12px] font-medium text-stone-600">{comment.assignee ?? 'Unassigned'}</span>
        )}
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
  onCycleCommentStatus,
  onAssignComment,
  people,
  readOnly,
}) {
  const [draft, setDraft] = useState('');
  const [tag, setTag] = useState(null);
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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="fixed inset-0 z-30 overflow-hidden bg-black"
    >
      <div
        className="absolute inset-0"
        style={{ background: version.assetUrl ? '#111' : `linear-gradient(135deg, ${project.color}33, ${project.color}11)` }}
      >
        {assetKind === 'image' && (
          <img src={version.assetUrl} alt={version.label} className="absolute inset-0 h-full w-full object-contain" draggable={false} />
        )}
        {assetKind === 'video' && (
          <video src={version.assetUrl} controls className="absolute inset-0 h-full w-full object-contain" />
        )}
        {assetKind === 'html' && (
          <iframe src={version.assetUrl} title={version.label} className="absolute inset-0 h-full w-full border-0 bg-white" />
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
            {/* Toggle between the two things that used to compete for space
                on the page — only one is ever on screen at a time. */}
            <div className="flex items-center gap-1 border-b border-black/5 p-2">
              <button
                type="button"
                onClick={() => setSidebarTab('details')}
                className={`flex-1 rounded-lg py-1.5 text-[13px] font-medium transition-colors ${
                  sidebarTab === 'details' ? 'bg-stone-800 text-white' : 'text-stone-600 hover:bg-black/5'
                }`}
              >
                Details
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab('comments')}
                className={`flex-1 rounded-lg py-1.5 text-[13px] font-medium transition-colors ${
                  sidebarTab === 'comments' ? 'bg-stone-800 text-white' : 'text-stone-600 hover:bg-black/5'
                }`}
              >
                Comments · {version.comments.length}
              </button>
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
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 space-y-2 overflow-y-auto p-4">
                  {version.comments.length === 0 && (
                    <div className="text-[13px] text-stone-500">No comments on this version yet.</div>
                  )}
                  {version.comments.map((c, i) => (
                    <CommentRow
                      key={c.id}
                      comment={c}
                      onCycleStatus={readOnly ? undefined : onCycleCommentStatus}
                      onAssign={readOnly ? undefined : (name) => onAssignComment?.(c.id, name)}
                      people={people}
                      dropUp={i === version.comments.length - 1 && version.comments.length > 1}
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
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="Add a comment…"
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
