import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';

// Replaces the old open/assigned/reviewed/resolved status cycle with a
// single tick. Marking something resolved asks first (a lightweight inline
// confirm, not a blocking modal) so a stray click can't silently close out
// real feedback; reopening a resolved comment is low-stakes and reversible,
// so that direction is a plain, immediate click.
//
// A short horizontal pill with a label, not a bare square icon button —
// the icon-only circle read as a blank, ambiguous shape (unclear it was
// even a button, let alone what it did) and was prone to rendering as a
// tall, oddly-proportioned pill once wrapped in a border. Text + icon in
// a pill guarantees it's wider than tall and unambiguous about what it does.
export default function ResolveToggle({ resolved, resolvedBy, onChange, readOnly, size = 'sm' }) {
  const [confirming, setConfirming] = useState(false);
  const wrapRef = useRef(null);
  const isSmall = size === 'sm';
  const iconSize = isSmall ? 10 : 11;
  const pillClass = `flex flex-none items-center gap-1 rounded-full border ${
    isSmall ? 'px-2 py-1 text-[10.5px]' : 'px-2.5 py-1 text-[11.5px]'
  } font-medium`;

  useEffect(() => {
    if (!confirming) return;
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setConfirming(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [confirming]);

  const title = resolved ? (resolvedBy ? `Resolved by ${resolvedBy}` : 'Resolved') : 'Not resolved';

  if (readOnly) {
    return (
      <div
        title={title}
        aria-label={title}
        className={`${pillClass} ${resolved ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-stone-300 text-stone-400'}`}
      >
        <Check size={iconSize} strokeWidth={3} /> {resolved ? 'Resolved' : 'Unresolved'}
      </div>
    );
  }

  if (resolved) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onChange?.(false);
        }}
        title={`${title} — click to reopen`}
        aria-label={`${title} — click to reopen`}
        className={`${pillClass} border-emerald-500 bg-emerald-500 text-white transition-opacity hover:opacity-80`}
      >
        <Check size={iconSize} strokeWidth={3} /> Resolved
      </button>
    );
  }

  return (
    <div ref={wrapRef} className="relative flex-none">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setConfirming(true);
        }}
        title="Mark as resolved"
        aria-label="Mark as resolved"
        className={`${pillClass} border-stone-300 text-stone-500 transition-colors hover:border-stone-500 hover:bg-black/5 hover:text-stone-700`}
      >
        <Check size={iconSize} strokeWidth={3} /> Resolve
      </button>
      {confirming && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-[calc(100%+6px)] z-30 w-40 rounded-lg bg-white p-2 text-stone-800 shadow-lg"
        >
          <p className="text-[11.5px] leading-snug">Mark resolved?</p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                onChange?.(true);
                setConfirming(false);
              }}
              className="flex-1 rounded-md bg-emerald-600 py-1 text-[11.5px] font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              Resolve
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="flex-1 rounded-md bg-black/5 py-1 text-[11.5px] font-medium text-stone-600 transition-colors hover:bg-black/10"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
