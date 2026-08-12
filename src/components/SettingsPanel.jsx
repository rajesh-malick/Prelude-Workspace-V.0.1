import { useState } from 'react';
import { motion } from 'framer-motion';
import { LogOut, RotateCcw, MapPin } from 'lucide-react';

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
      <div className="mt-0.5 text-[13px] text-stone-500">Signed in as {userName}</div>

      <div className="mt-3.5 border-t border-black/5 pt-3.5">
        <div className="flex items-center gap-1.5 text-[12.5px] font-semibold uppercase tracking-wide text-stone-400">
          <MapPin size={12} strokeWidth={2.5} /> Collaboration
        </div>
        <p className="mt-1 text-[12.5px] leading-snug text-stone-500">
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

      <p className="mt-3.5 border-t border-black/5 pt-3 text-[12px] leading-snug text-stone-400">
        Your projects are saved to your Zuper account and available wherever you sign in.
      </p>

      <p className="mt-2 text-[11px] leading-snug text-stone-400">
        Ground grass model: "Grass Patches - Circle" by brandon_grey, via
        Sketchfab, licensed CC-BY-4.0. Bird and butterfly models: "Simple_Bird"
        and "BUTTERFLY" (CC-BY-4.0), "Orchard Swallowtail", "Cairn's
        Birdwing", "Clearwing Swallowtail" and "Ulysses Butterfly"
        (CC-BY-SA-4.0), via Sketchfab.
      </p>
    </motion.div>
  );
}
