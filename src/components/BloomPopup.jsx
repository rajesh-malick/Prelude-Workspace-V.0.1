import { motion } from 'framer-motion';

const STATUS_LABEL = {
  approved: 'Approved',
  'in review': 'In review',
  draft: 'Draft',
  blocked: 'Blocked',
};

export default function BloomPopup({ version, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="glass-surface select-none whitespace-nowrap rounded-xl px-3 py-2"
      style={{ pointerEvents: 'none' }}
    >
      <div className="text-[12px] font-semibold text-stone-800">{version.label}</div>
      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-stone-600">
        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        {STATUS_LABEL[version.status] ?? version.status}
        <span className="text-stone-400">·</span>
        {version.owner}
        <span className="text-stone-400">·</span>
        {version.comments.length} comment{version.comments.length === 1 ? '' : 's'}
      </div>
    </motion.div>
  );
}
