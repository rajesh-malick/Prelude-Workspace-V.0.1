import { motion } from 'framer-motion';
import { TreeDeciduous, LayoutGrid } from 'lucide-react';

// Switches the whole app between the 3D Grove ("living workspace") and
// Focus Mode (a flat, normal-website dashboard) — same underlying data
// either way, just a different presentation.
export default function ModeToggle({ mode, onChange }) {
  return (
    <div className="glass-surface relative flex items-center rounded-full p-1 text-[14px] font-medium">
      <motion.div
        className="absolute inset-y-1 w-[92px] rounded-full bg-white shadow-sm"
        animate={{ left: mode === 'grove' ? 4 : 96 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      />
      <button
        type="button"
        onClick={() => onChange('grove')}
        className={`relative z-10 flex w-[92px] items-center justify-center gap-1.5 rounded-full py-2 transition-colors ${
          mode === 'grove' ? 'text-stone-800' : 'text-stone-500 hover:text-stone-700'
        }`}
      >
        <TreeDeciduous size={14} strokeWidth={2} /> Grove
      </button>
      <button
        type="button"
        onClick={() => onChange('focus')}
        className={`relative z-10 flex w-[92px] items-center justify-center gap-1.5 rounded-full py-2 transition-colors ${
          mode === 'focus' ? 'text-stone-800' : 'text-stone-500 hover:text-stone-700'
        }`}
      >
        <LayoutGrid size={14} strokeWidth={2} /> Focus
      </button>
    </div>
  );
}
