import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Sprout } from 'lucide-react';

// A one-time intro right after sign-in — orients a brand-new visitor
// before dropping them into the Grove. Dismisses itself, or on click.
export default function WelcomeToast({ name, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 7000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.96 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="glass-surface fixed left-1/2 top-24 z-40 w-[360px] -translate-x-1/2 rounded-2xl p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-emerald-700/10 text-emerald-700">
          <Sprout size={16} strokeWidth={2} />
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-semibold text-stone-800">Welcome, {name}</div>
          <p className="mt-1 text-[12px] leading-snug text-stone-600">
            This is your Grove — each tree is a project, each bloom a version. Click a tree to open it, click a
            bloom to review it, and click anywhere on a prototype to leave a comment right there.
          </p>
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
