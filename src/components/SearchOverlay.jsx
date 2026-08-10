import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Search as SearchIcon } from 'lucide-react';

const STATUS_LABEL = {
  active: 'Active',
  blocked: 'Blocked',
  'review pending': 'Review pending',
};

// "Type a name, camera flies to it" — a fast path into the Grove that
// doesn't require visually scanning the 3D scene for a specific tree.
// Anchored directly above the Search icon in NavDock — opening it where
// you clicked, not in an unrelated part of the screen.
export default function SearchOverlay({ projects, onSelect, onClose, anchorLeft }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const matches = projects.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-40"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className={`glass-surface fixed bottom-24 z-40 w-[420px] overflow-hidden rounded-2xl ${
          anchorLeft ? 'left-6' : 'left-1/2 -translate-x-1/2'
        }`}
      >
        <div className="flex items-center gap-2.5 border-b border-black/5 px-4 py-3">
          <SearchIcon size={17} strokeWidth={2} className="text-stone-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a project…"
            className="flex-1 bg-transparent text-[15px] text-stone-800 outline-none placeholder:text-stone-400"
          />
        </div>
        <div className="max-h-[280px] overflow-y-auto p-1.5">
          {matches.length === 0 && (
            <div className="px-3 py-4 text-center text-[14px] text-stone-400">No projects match "{query}"</div>
          )}
          {matches.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-black/5"
            >
              <span className="flex items-center gap-2 text-[14.5px] font-medium text-stone-800">
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name}
              </span>
              <span className="text-[13px] text-stone-500">{STATUS_LABEL[p.status] ?? p.status}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
