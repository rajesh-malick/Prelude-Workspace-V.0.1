import { useEffect, useRef, useState } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { TEAMMATES } from '../data/teammates';

// Browsing into a teammate's territory is a local simulation — there's no
// backend, so "they" don't really know you're there, but Prelude fakes a
// notification for you (see App.jsx) so the idea reads the same way it
// would with real accounts.
export default function TerritorySwitcher({ viewingTerritory, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = TEAMMATES.find((t) => t.id === viewingTerritory);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="glass-surface flex items-center gap-1.5 rounded-full px-3.5 py-2.5 text-[14px] font-medium text-stone-700 transition-colors hover:bg-white/50"
      >
        <MapPin size={15} strokeWidth={2} style={{ color: current?.color }} />
        {current ? `${current.name}'s territory` : 'My Grove'}
        <ChevronDown size={14} strokeWidth={2} />
      </button>
      {open && (
        <div className="glass-surface absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-2xl py-1.5">
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className={`flex w-full items-center gap-2 px-3.5 py-2 text-left text-[14px] font-medium transition-colors hover:bg-black/5 ${
              !viewingTerritory ? 'text-stone-900' : 'text-stone-600'
            }`}
          >
            My Grove
          </button>
          <div className="my-1 border-t border-black/5" />
          <div className="px-3.5 py-1 text-[11.5px] font-semibold uppercase tracking-wide text-stone-400">
            Visit a teammate
          </div>
          {TEAMMATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                onChange(t.id);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3.5 py-2 text-left text-[14px] font-medium transition-colors hover:bg-black/5 ${
                viewingTerritory === t.id ? 'text-stone-900' : 'text-stone-600'
              }`}
            >
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
