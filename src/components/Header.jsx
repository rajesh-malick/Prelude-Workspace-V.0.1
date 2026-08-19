import { useMemo, useState } from 'react';
import { Plus, ChevronUp, ChevronDown } from 'lucide-react';
import BlurText from './BlurText';
import ModeToggle from './ModeToggle';
import TerritorySwitcher from './TerritorySwitcher';
import { getGreetingBucket, pickGreeting } from '../utils/timeOfDay';

export default function Header({
  name = 'Rajesh',
  hour,
  mode,
  onChangeMode,
  onCreateProject,
  territories,
  viewingTerritory,
  onChangeTerritory,
  onOpenVillage,
}) {
  // Re-picked only when the (finer-grained) greeting bucket actually
  // changes, not every minute tick from useTimeOfDay — keying this off the
  // coarser lighting phase instead would freeze the greeting for its much
  // wider 8-hour "day" span rather than rotating through morning/afternoon/evening.
  const greetingBucket = getGreetingBucket(hour);
  const greeting = useMemo(() => pickGreeting(hour), [greetingBucket]);
  // Session-only, not persisted — the greeting rotates through the day, so
  // "collapsed forever" would just mean never seeing that variety again.
  // Collapsing just reclaims the top-left corner for whoever doesn't want
  // it parked there permanently.
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="fixed inset-x-0 top-0 z-20 flex items-start justify-between px-8 pt-7">
      {collapsed ? (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Show greeting"
          aria-label="Show greeting"
          className="glass-surface flex h-11 w-11 items-center justify-center rounded-full text-stone-500 transition-colors hover:text-stone-800"
        >
          <ChevronDown size={16} strokeWidth={2.25} />
        </button>
      ) : (
        // Legibility over a live 3D backdrop that swings from open sky to
        // dense tree canopy isn't a job for text decoration (stroke/shadow
        // tuning only ever fights the busiest pixel it happens to land on)
        // — it's a job for a controlled surface behind the text. Reusing
        // the same glass panel every other overlay in the app sits on means
        // contrast is fixed and known (dark text on a light frosted panel)
        // regardless of time of day or what's in the scene behind it.
        <div className="glass-surface flex items-start gap-2 rounded-2xl px-5 py-2.5">
          <BlurText
            text={`${greeting}, ${name}`}
            delay={90}
            animateBy="words"
            direction="top"
            className="text-[32px] font-semibold tracking-tight text-stone-800"
          />
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            title="Collapse"
            aria-label="Collapse greeting"
            className="mt-2 flex-none text-stone-400 transition-colors hover:text-stone-600"
          >
            <ChevronUp size={15} strokeWidth={2.5} />
          </button>
        </div>
      )}
      <div className="flex items-center gap-3">
        <TerritorySwitcher
          territories={territories}
          viewingTerritory={viewingTerritory}
          onChange={onChangeTerritory}
          onOpenVillage={onOpenVillage}
        />
        <ModeToggle mode={mode} onChange={onChangeMode} />
        {!viewingTerritory && (
          <button
            type="button"
            onClick={onCreateProject}
            className="glass-surface flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[14.5px] font-medium text-stone-700 transition-colors hover:bg-white/50"
          >
            <Plus size={16} strokeWidth={2.25} /> New project
          </button>
        )}
      </div>
    </div>
  );
}
