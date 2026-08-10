import { useMemo } from 'react';
import { Plus } from 'lucide-react';
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
  viewingTerritory,
  onChangeTerritory,
}) {
  // Re-picked only when the (finer-grained) greeting bucket actually
  // changes, not every minute tick from useTimeOfDay — keying this off the
  // coarser lighting phase instead would freeze the greeting for its much
  // wider 8-hour "day" span rather than rotating through morning/afternoon/evening.
  const greetingBucket = getGreetingBucket(hour);
  const greeting = useMemo(() => pickGreeting(hour), [greetingBucket]);

  return (
    <div className="fixed inset-x-0 top-0 z-20 flex items-start justify-between px-8 pt-7">
      {/* Legibility over a live 3D backdrop that swings from open sky to
          dense tree canopy isn't a job for text decoration (stroke/shadow
          tuning only ever fights the busiest pixel it happens to land on)
          — it's a job for a controlled surface behind the text. Reusing
          the same glass panel every other overlay in the app sits on means
          contrast is fixed and known (dark text on a light frosted panel)
          regardless of time of day or what's in the scene behind it. */}
      <div className="glass-surface rounded-2xl px-5 py-2.5">
        <BlurText
          text={`${greeting}, ${name}`}
          delay={90}
          animateBy="words"
          direction="top"
          className="text-[32px] font-semibold tracking-tight text-stone-800"
        />
      </div>
      <div className="flex items-center gap-3">
        <TerritorySwitcher viewingTerritory={viewingTerritory} onChange={onChangeTerritory} />
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
