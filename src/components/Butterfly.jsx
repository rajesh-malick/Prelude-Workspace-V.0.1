import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Paintbrush, Star } from 'lucide-react';
import { isResolved, resolvedNote } from '../utils/commentStatus';
import ResolveToggle from './ResolveToggle';
import ReplyThread from './ReplyThread';

// A "butterfly" is the visual treatment for one comment. Unresolved ones
// flutter gently; resolved ones sit dim and still. Hover to expand.
// `comment.tag` is optional — untagged comments render as a plain
// butterfly with no badge.
const TAG_ICON = { ui: Paintbrush, improvement: Star };
const TAG_LABEL = { ui: 'UI improvement', improvement: 'Improvement' };
const TAG_ACCENT = { ui: 'text-sky-600', improvement: 'text-amber-500' };

export default function Butterfly({ comment, style, onResolve, onAddReply, readOnly }) {
  const [open, setOpen] = useState(false);
  const TagIcon = comment.tag ? TAG_ICON[comment.tag] : null;
  const resolved = isResolved(comment);
  const wingColor = resolved ? '#C9BBAA' : '#FF6FB0';
  const wingColorDark = resolved ? '#B8A98F' : '#FF3D8F';
  // A comment pinned in the lower half of the preview would otherwise
  // expand its card off the bottom edge — flip both upward instead of
  // guessing a fixed direction.
  const dropUp = (comment.y ?? 50) > 55;

  return (
    <div
      className="absolute"
      style={style}
      tabIndex={0}
      role="button"
      aria-label={`Comment by ${comment.author}: ${comment.text}. ${resolved ? 'Resolved.' : 'Not resolved.'}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        // Keep it open while focus moves to something inside it (e.g. the
        // reply input) — only close once focus truly leaves.
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <motion.div
        className="relative cursor-pointer"
        style={{ width: 34, height: 25, filter: resolved ? 'none' : 'drop-shadow(0 0 5px rgba(255,61,143,0.65))' }}
        animate={
          resolved
            ? { opacity: 0.5, scale: 0.85, y: 0 }
            : { opacity: [0.92, 1, 0.92], y: [0, -3, 0] }
        }
        transition={resolved ? { duration: 0.3 } : { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="absolute left-1/2 top-1/2 h-5 w-[4px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-stone-700/70" />
        <motion.svg
          width="34"
          height="25"
          viewBox="0 0 22 16"
          className="absolute inset-0"
          animate={resolved ? {} : { scaleX: [1, 0.82, 1] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '50% 50%' }}
        >
          <path d="M11 8 C8 1 1 0 1 5 C1 9 7 9.5 11 8Z" fill={wingColor} opacity={0.98} />
          <path d="M11 8 C14 1 21 0 21 5 C21 9 15 9.5 11 8Z" fill={wingColor} opacity={0.98} />
          <path d="M11 8 C9 11 4 12 4 14.5 C4 16 8 15.5 11 9.5Z" fill={wingColorDark} opacity={0.95} />
          <path d="M11 8 C13 11 18 12 18 14.5 C18 16 14 15.5 11 9.5Z" fill={wingColorDark} opacity={0.95} />
        </motion.svg>
        {TagIcon && (
          <div className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm">
            <TagIcon size={11} strokeWidth={2.5} className={TAG_ACCENT[comment.tag]} />
          </div>
        )}
      </motion.div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: dropUp ? -6 : 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: dropUp ? -6 : 6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`glass-surface absolute left-1/2 z-30 w-60 -translate-x-1/2 rounded-xl px-3.5 py-3 ${
              dropUp ? 'bottom-6' : 'top-6'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <div className="text-[13.5px] font-semibold text-stone-800">{comment.author}</div>
                {TagIcon && (
                  <div className={`flex items-center gap-1 text-[11.5px] font-medium ${TAG_ACCENT[comment.tag]}`}>
                    <TagIcon size={11} strokeWidth={2.5} />
                    {TAG_LABEL[comment.tag]}
                  </div>
                )}
              </div>
              <ResolveToggle
                resolved={resolved}
                resolvedBy={comment.resolvedBy}
                onChange={readOnly ? undefined : (v) => onResolve?.(v)}
                readOnly={readOnly}
              />
            </div>
            <div className="mt-1 text-[14px] leading-snug text-stone-700">{comment.text}</div>
            {resolvedNote(comment) && (
              <div className="mt-1 text-[11px] font-medium text-stone-500">{resolvedNote(comment)}</div>
            )}
            <div className="mt-2 border-t border-black/5 pt-2">
              <ReplyThread
                replies={comment.replies}
                onAddReply={readOnly ? undefined : (text) => onAddReply?.(text)}
                readOnly={readOnly}
                compact
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
