import { motion } from 'framer-motion';
import { isResolved } from '../utils/commentStatus';
import { TAG_ICON } from '../utils/commentTags';

// Walks versions newest-first and returns the latest comment found, so a
// quick hover surfaces feedback without drilling into Project -> Review.
function getLatestComment(project) {
  for (let i = project.versions.length - 1; i >= 0; i--) {
    const v = project.versions[i];
    if (v.comments.length > 0) {
      return { comment: v.comments[v.comments.length - 1], version: v };
    }
  }
  return null;
}

function truncate(text, max = 64) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export default function HoverPanel({ project }) {
  const latest = getLatestComment(project);
  const TagIcon = latest?.comment.tag ? TAG_ICON[latest.comment.tag] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="glass-surface select-none rounded-2xl px-4 py-3 whitespace-nowrap"
      style={{ pointerEvents: 'none' }}
    >
      <div className="text-[15px] font-semibold text-stone-800">{project.name}</div>
      <div className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-stone-600">
        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: project.color }} />
        {project.versionCount} version{project.versionCount === 1 ? '' : 's'}
      </div>

      {latest ? (
        <div className="mt-2 max-w-[220px] whitespace-normal border-t border-black/5 pt-2">
          <div className="flex items-center gap-1 text-[12px] font-medium text-stone-500">
            {TagIcon && <TagIcon size={10} strokeWidth={2.5} />}
            {latest.comment.author} · {latest.version.label}
            {isResolved(latest.comment) && <span className="text-emerald-600"> · resolved</span>}
          </div>
          <div className="mt-0.5 text-[13px] leading-snug text-stone-700">{truncate(latest.comment.text)}</div>
        </div>
      ) : (
        <div className="mt-2 border-t border-black/5 pt-2 text-[12px] text-stone-400">No comments yet</div>
      )}

      <div className="mt-2 border-t border-black/5 pt-2 text-[10.5px] text-stone-400">
        Click to fly in · Shift-click to jump instantly
      </div>
    </motion.div>
  );
}
