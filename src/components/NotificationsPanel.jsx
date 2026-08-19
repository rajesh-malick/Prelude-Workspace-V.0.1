import { motion } from 'framer-motion';
import { MapPin, Leaf } from 'lucide-react';
import { isResolved } from '../utils/commentStatus';
import { formatRelativeTime } from '../utils/relativeTime';
import { TAG_ICON } from '../utils/commentTags';

// Flattens every comment across every project/version into one feed,
// newest-appended-first (comments are pushed to the end of their array,
// so reversing each version's list is the best ordering we have without
// real timestamps).
function collectRecent(projects, limit) {
  const items = [];
  projects.forEach((project) => {
    project.versions.forEach((version) => {
      [...version.comments].reverse().forEach((comment) => {
        items.push({ project, version, comment });
      });
    });
  });
  return items.slice(0, limit);
}

// Anchored directly above the bell icon in NavDock, matching wherever the
// dock currently sits (it shifts left while a Review is open).
export default function NotificationsPanel({ projects, territoryNotices = [], notifications = [], onClose, onOpen, anchorLeft }) {
  const items = collectRecent(projects, 8);
  // Merge the two visit sources (your own local "you entered X" toasts and
  // the real, persisted "X visited you" notifications) into one
  // newest-first list, kept visually and structurally separate from the
  // comment feed below it — mixing them with no way to tell them apart
  // (and no sense of when) was the actual complaint.
  const visits = [...territoryNotices, ...notifications].sort(
    (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
  );
  const hasVisits = visits.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className={`glass-surface fixed bottom-24 z-40 w-[340px] overflow-hidden rounded-2xl ${
        anchorLeft ? 'left-6' : 'left-1/2 -translate-x-1/2'
      }`}
    >
      <div className="border-b border-black/5 px-4 py-3 text-[15px] font-semibold text-stone-800">Activity</div>
      <div className="max-h-[360px] overflow-y-auto p-1.5">
        {items.length === 0 && !hasVisits && (
          <div className="px-3 py-6 text-center text-[13.5px] text-stone-400">No comments yet across any project</div>
        )}
        {hasVisits && (
          <div className="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            Notifications
          </div>
        )}
        {visits.map((v) => (
          <div key={v.id} className="flex items-start justify-between gap-2 rounded-xl px-3 py-2.5 text-[13px] text-stone-700">
            <div className="flex items-start gap-2">
              {v.kind === 'stale-project' ? (
                <Leaf size={14} strokeWidth={2} className="mt-0.5 flex-none text-amber-600" />
              ) : (
                <MapPin size={14} strokeWidth={2} className="mt-0.5 flex-none text-sky-600" />
              )}
              {v.text}
            </div>
            {v.createdAt && (
              <span className="flex-none text-[11px] text-stone-400">{formatRelativeTime(v.createdAt)}</span>
            )}
          </div>
        ))}
        {hasVisits && items.length > 0 && (
          <div className="px-2 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            Comments
          </div>
        )}
        {items.map(({ project, version, comment }) => {
          const TagIcon = comment.tag ? TAG_ICON[comment.tag] : null;
          const resolved = isResolved(comment);
          return (
            <button
              key={comment.id}
              type="button"
              onClick={() => {
                onOpen?.(project.id, version.id);
                onClose?.();
              }}
              className="flex w-full flex-col rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-black/5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[13px] font-medium text-stone-700">
                  <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: project.color }} />
                  {project.name} · {version.label}
                </div>
                {resolved && (
                  <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-600">
                    Resolved
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-1 text-[12px] font-medium text-stone-500">
                {TagIcon && <TagIcon size={10} strokeWidth={2.5} />}
                {comment.author}
              </div>
              <div className="mt-0.5 text-[13.5px] leading-snug text-stone-700">{comment.text}</div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
