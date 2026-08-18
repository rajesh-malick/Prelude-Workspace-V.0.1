import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LogOut, RotateCcw, MapPin, GitCommitHorizontal } from 'lucide-react';

const REPO = 'rajesh-malick/Prelude-Workspace-V.0.1';

// "Version" here just means "how many times this has shipped" — the total
// commit count on main, treated as a deploy counter since every commit to
// main here goes out as a deploy. GitHub doesn't expose a commit count
// directly, but asking for 1 commit per page and reading the `Link`
// response header's rel="last" page number is the standard trick — that
// page number IS the total count. Live (not a build-time stamp) so it
// reflects a direct push to GitHub too, not just this app's own
// build/commit/push flow. Silently hides itself on failure (rate-limited,
// offline) rather than showing a broken/stale-looking error.
function useCommitCount() {
  const [count, setCount] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`https://api.github.com/repos/${REPO}/commits?sha=main&per_page=1`)
      .then((res) => {
        if (!res.ok) throw new Error();
        const match = res.headers.get('Link')?.match(/[?&]page=(\d+)>;\s*rel="last"/);
        return match ? Number(match[1]) : 1;
      })
      .then((n) => !cancelled && setCount(n))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  return failed ? null : count;
}

function DeployInfo() {
  const count = useCommitCount();

  return (
    <a
      href={`https://github.com/${REPO}/commits/main`}
      target="_blank"
      rel="noreferrer"
      className="mt-3.5 flex items-center gap-1.5 border-t border-black/5 pt-3.5 text-[12.5px] font-medium text-stone-600 transition-colors hover:text-stone-800"
    >
      <GitCommitHorizontal size={13} strokeWidth={2.5} className="flex-none text-stone-400" />
      {count != null ? `Prelude Workspace - version 0.0.${count}` : 'Checking version…'}
    </a>
  );
}

// Anchored directly above the gear icon in NavDock, matching wherever the
// dock currently sits (it shifts left while a Review is open).
export default function SettingsPanel({ userName, onSignOut, onResetGrove, onClose, anchorLeft }) {
  const [confirmingReset, setConfirmingReset] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className={`glass-surface fixed bottom-24 z-40 w-[300px] overflow-hidden rounded-2xl p-4 ${
        anchorLeft ? 'left-6' : 'left-1/2 -translate-x-1/2'
      }`}
    >
      <div className="text-[15px] font-semibold text-stone-800">Settings</div>
      <div className="mt-0.5 text-[13px] text-stone-600">Signed in as {userName}</div>

      <div className="mt-3.5 border-t border-black/5 pt-3.5">
        <div className="flex items-center gap-1.5 text-[12.5px] font-semibold uppercase tracking-wide text-stone-600">
          <MapPin size={12} strokeWidth={2.5} /> Collaboration
        </div>
        <p className="mt-1 text-[12.5px] leading-snug text-stone-600">
          Everyone at Zuper can view and edit each other's territory — use the Territory switcher up top to hop
          into a teammate's Grove.
        </p>
      </div>

      <div className="mt-3.5 border-t border-black/5 pt-3.5">
        <button
          type="button"
          onClick={() => {
            onSignOut?.();
            onClose?.();
          }}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[14px] font-medium text-stone-700 transition-colors hover:bg-black/5"
        >
          <LogOut size={15} strokeWidth={2} /> Sign out
        </button>

        {confirmingReset ? (
          <div className="mt-1 rounded-lg bg-red-50 px-2 py-2">
            <div className="text-[13px] font-medium text-red-700">Delete every project? This can't be undone.</div>
            <div className="mt-1.5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  onResetGrove?.();
                  onClose?.();
                }}
                className="text-[13px] font-semibold text-red-700 hover:underline"
              >
                Reset Grove
              </button>
              <button
                type="button"
                onClick={() => setConfirmingReset(false)}
                className="text-[13px] font-medium text-stone-500 hover:text-stone-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingReset(true)}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[14px] font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <RotateCcw size={15} strokeWidth={2} /> Reset Grove
          </button>
        )}
      </div>

      <p className="mt-3.5 border-t border-black/5 pt-3 text-[12px] leading-snug text-stone-500">
        Your projects are saved to your Zuper account and available wherever you sign in.
      </p>

      <DeployInfo />
    </motion.div>
  );
}
