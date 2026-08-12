import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, PartyPopper } from 'lucide-react';

// A one-time congratulations — first project ever planted, first version
// ever published — not shown again after that (see App.jsx's localStorage
// flags). Dismisses itself, or on click.
export default function CelebrationToast({ title, text, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    // Bottom-right, not top-center — the moment this fires (right after
    // creating a project/version) is exactly when the New Version modal
    // auto-opens centered on screen, and the two were overlapping.
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.96 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="glass-surface fixed bottom-24 right-6 z-40 w-[340px] rounded-2xl p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
          <PartyPopper size={16} strokeWidth={2} />
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-semibold text-stone-800">{title}</div>
          <p className="mt-1 text-[12px] leading-snug text-stone-600">{text}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-black/5 hover:text-stone-600"
        >
          <X size={13} strokeWidth={2.5} />
        </button>
      </div>
    </motion.div>
  );
}
