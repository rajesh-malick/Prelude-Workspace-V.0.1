import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';

// Replaces the old open/assigned/reviewed/resolved status cycle with a
// single tick. Marking something resolved asks first (a lightweight inline
// confirm, not a blocking modal) so a stray click can't silently close out
// real feedback; reopening a resolved comment is low-stakes and reversible,
// so that direction is a plain, immediate click.
export default function ResolveToggle({ resolved, resolvedBy, onChange, readOnly, size = 'sm' }) {
  const [confirming, setConfirming] = useState(false);
  const wrapRef = useRef(null);
  const dim = size === 'sm' ? 18 : 20;
  const iconSize = size === 'sm' ? 11 : 12;

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
        className={`flex flex-none items-center justify-center rounded-full border ${
          resolved ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-stone-300 text-stone-300'
        }`}
        style={{ width: dim, height: dim }}
      >
        <Check size={iconSize} strokeWidth={3} />
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
        className="flex flex-none items-center justify-center rounded-full border border-emerald-500 bg-emerald-500 text-white transition-opacity hover:opacity-80"
        style={{ width: dim, height: dim }}
      >
        <Check size={iconSize} strokeWidth={3} />
      </button>
    );
  }

  return (
    <div ref={wrapRef} className="relative flex-none">
      {/* Was a literally blank circle before — nothing hinted it was
          clickable at all, let alone that it was the "mark resolved"
          control. A visible (if muted) check outline reads as a checkbox
          waiting to be ticked, the same convention as GitHub/Linear/Asana
          task checkboxes. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setConfirming(true);
        }}
        title="Mark as resolved"
        aria-label="Mark as resolved"
        className="flex items-center justify-center rounded-full border border-stone-300 text-stone-300 transition-colors hover:border-stone-500 hover:bg-black/5 hover:text-stone-500"
        style={{ width: dim, height: dim }}
      >
        <Check size={iconSize} strokeWidth={3} />
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
