import { motion } from 'framer-motion';
import { X, TreePine } from 'lucide-react';
import { avatarColor } from '../utils/avatarColor';

// A single overview of the whole company's Groves at once — deliberately a
// plain 2D grid, not a second 3D scene. Rendering everyone's actual trees
// simultaneously in WebGL would compete for the same GPU budget the Grove
// canvas already fights for against embedded content (see ReviewOverlay's
// frameloop pausing) — multiplied by every teammate instead of just one
// embedded site. Each plot here is a door into that person's real Grove,
// not a render of it — clicking one just runs the same "visit a territory"
// flow the plain dropdown switcher already used.
export default function VillageView({ userName, ownProjectCount, territories, onVisit, onClose }) {
  const people = [
    { ownerName: userName, ownerEmail: null, projectCount: ownProjectCount, isMine: true },
    ...(territories ?? []),
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-40 overflow-y-auto bg-gradient-to-b from-[#FDF6EC] to-[#EDE0C8] p-8"
    >
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[24px] font-semibold text-stone-800">The Village</h2>
            <p className="mt-1 text-[14px] text-stone-600">Everyone's Grove, at a glance. Click a plot to visit.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-black/5 hover:text-stone-800"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {people.length === 1 && (
          <p className="mt-6 text-[13.5px] text-stone-500">No teammates yet — once others sign up, their plots show up here too.</p>
        )}

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {people.map((p) => {
            const color = avatarColor(p.ownerName);
            return (
              <button
                key={p.ownerEmail ?? 'mine'}
                type="button"
                onClick={() => onVisit(p.ownerEmail)}
                className="glass-surface flex flex-col items-center gap-2 rounded-2xl p-5 text-center transition-transform hover:-translate-y-0.5"
              >
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ backgroundColor: color.bg, color: color.fg }}
                >
                  <TreePine size={26} strokeWidth={1.75} />
                </div>
                <div className="text-[14.5px] font-semibold text-stone-800">{p.isMine ? 'My Grove' : p.ownerName}</div>
                <div className="text-[12px] text-stone-500">
                  {p.projectCount} {p.projectCount === 1 ? 'project' : 'projects'}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
