import { motion } from 'framer-motion';
import { Paintbrush, Star, MapPin } from 'lucide-react';
import { getStatus, STATUS_META } from '../utils/commentStatus';

const TAG_ICON = { ui: Paintbrush, improvement: Star };

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
  const hasNotices = territoryNotices.length > 0 || notifications.length > 0;

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
        {items.length === 0 && !hasNotices && (
          <div className="px-3 py-6 text-center text-[13.5px] text-stone-400">No comments yet across any project</div>
        )}
        {territoryNotices.map((notice) => (
          <div key={notice.id} className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-[13px] text-stone-700">
            <MapPin size={14} strokeWidth={2} className="mt-0.5 flex-none text-emerald-600" />
            {notice.text}
          </div>
        ))}
        {/* Real, persisted notifications — someone else really did visit
            your territory, this isn't simulated on your behalf. */}
        {notifications.map((n) => (
          <div key={n.id} className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-[13px] text-stone-700">
            <MapPin size={14} strokeWidth={2} className="mt-0.5 flex-none text-sky-600" />
            {n.text}
          </div>
        ))}
        {hasNotices && items.length > 0 && <div className="my-1 border-t border-black/5" />}
        {items.map(({ project, version, comment }) => {
          const TagIcon = comment.tag ? TAG_ICON[comment.tag] : null;
          const status = getStatus(comment);
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
                <span
                  className="rounded-full px-1.5 py-0.5 text-[11px] font-semibold"
                  style={{ color: STATUS_META[status].color, backgroundColor: `${STATUS_META[status].color}1a` }}
                >
                  {STATUS_META[status].label}
                </span>
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
