import { useEffect, useRef, useState } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { avatarColor } from '../utils/avatarColor';

// `territories` is the real company directory (fetched from
// /api/territories) — every other @zuper.co account, each one a real
// account you can freely view and edit, not a static mock list.
// `viewingTerritory` is the owner's email, or null for "my own Grove".
export default function TerritorySwitcher({ territories, viewingTerritory, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = territories?.find((t) => t.ownerEmail === viewingTerritory);

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
        <MapPin size={15} strokeWidth={2} style={{ color: current ? avatarColor(current.ownerName).fg : undefined }} />
        {current ? `${current.ownerName}'s territory` : 'My Grove'}
        <ChevronDown size={14} strokeWidth={2} />
      </button>
      {open && (
        <div className="glass-surface absolute right-0 top-full z-30 mt-2 w-60 overflow-hidden rounded-2xl py-1.5">
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
          {!territories?.length && (
            <div className="px-3.5 py-2 text-[12.5px] leading-snug text-stone-400">
              No other teammates yet.
            </div>
          )}
          {territories?.map((t) => (
            <button
              key={t.ownerEmail}
              type="button"
              onClick={() => {
                onChange(t.ownerEmail);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3.5 py-2 text-left text-[14px] font-medium transition-colors hover:bg-black/5 ${
                viewingTerritory === t.ownerEmail ? 'text-stone-900' : 'text-stone-600'
              }`}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: avatarColor(t.ownerName).fg }}
              />
              {t.ownerName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
