import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { STATUS_ORDER, STATUS_META } from '../utils/commentStatus';

const MENU_WIDTH = 132;

// A small dropdown to jump straight to any comment status — assigned,
// reviewed, resolved — instead of clicking through them one at a time.
// The open menu is portaled to <body> and positioned in fixed viewport
// coordinates: every call site lives inside at least one `overflow-hidden`
// or scrolling ancestor (the Review preview box, the sidebar comment list,
// a Butterfly popup card), and a plain `position: absolute` menu gets
// clipped or trapped behind those ancestors' own stacking context —
// exactly the "clicking the dropdown does nothing" symptom.
export default function StatusDropdown({ status, onChange, size = 'sm', dropUp = false }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const left = Math.max(8, Math.min(window.innerWidth - MENU_WIDTH - 8, rect.right - MENU_WIDTH));
    if (dropUp) {
      setPos({ left, bottom: window.innerHeight - rect.top + 4 });
    } else {
      setPos({ left, top: rect.bottom + 4 });
    }
  }, [open, dropUp]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onClickOutside = (e) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target) &&
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    // The menu's position is computed once on open — if the page scrolls or
    // resizes while it's open, closing rather than tracking keeps it from
    // drifting away from the button it belongs to.
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const meta = STATUS_META[status];
  const isSmall = size === 'sm';

  return (
    <div className="relative flex-none">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`flex items-center gap-0.5 rounded-full font-semibold transition-opacity hover:opacity-80 ${
          isSmall ? 'px-2 py-1 text-[11.5px]' : 'px-2.5 py-1 text-[13px]'
        }`}
        style={{ color: meta.color, backgroundColor: `${meta.color}1a` }}
      >
        {meta.label}
        <ChevronDown size={isSmall ? 9 : 11} strokeWidth={2.5} />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            className="glass-surface fixed z-[999] overflow-hidden rounded-xl py-1"
            style={{ left: pos.left, top: pos.top, bottom: pos.bottom, width: MENU_WIDTH }}
          >
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange?.(s);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] font-medium transition-colors hover:bg-black/5 ${
                  s === status ? 'bg-black/5' : ''
                }`}
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_META[s].color }} />
                {STATUS_META[s].label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
