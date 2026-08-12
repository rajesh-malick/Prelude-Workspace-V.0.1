import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, UserPlus } from 'lucide-react';
import { avatarColor } from '../utils/avatarColor';

const MENU_WIDTH = 168;

// Who a single COMMENT is handed to — distinct from who owns the version
// it's on. Portaled to <body> for the same reason as StatusDropdown: every
// call site (a Butterfly popup, the Review sidebar's comment list) sits
// inside an `overflow-hidden` or scrolling ancestor that would clip or
// swallow a plain `position: absolute` menu.
//
// `people` is the real list of assignable names — every teammate at the
// company, since anyone can view and edit any territory (see
// TerritorySwitcher) so anyone is a legitimate person to hand feedback to.
export default function AssigneePicker({ assignee, onChange, people = [], size = 'sm', dropUp = false }) {
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
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

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
        className={`flex items-center gap-1 rounded-full font-medium transition-colors hover:bg-black/5 ${
          isSmall ? 'px-2 py-1 text-[11.5px]' : 'px-2.5 py-1 text-[13px]'
        } ${assignee ? 'text-stone-700' : 'text-stone-600'}`}
      >
        {assignee ? (
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: avatarColor(assignee).fg }} />
        ) : (
          <UserPlus size={isSmall ? 10 : 12} strokeWidth={2.25} />
        )}
        {assignee ?? 'Assign'}
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
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange?.(null);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] font-medium transition-colors hover:bg-black/5 ${
                !assignee ? 'bg-black/5' : ''
              }`}
            >
              Unassigned
            </button>
            {people.map((name) => (
              <button
                key={name}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange?.(name);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] font-medium transition-colors hover:bg-black/5 ${
                  assignee === name ? 'bg-black/5' : ''
                }`}
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: avatarColor(name).fg }} />
                {name}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
