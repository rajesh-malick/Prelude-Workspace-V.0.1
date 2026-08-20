import { useMemo, useState } from 'react';
import { Plus, ChevronUp, ChevronDown, Sunrise, Sun, Sunset, Moon } from 'lucide-react';
import BlurText from './BlurText';
import ModeToggle from './ModeToggle';
import TerritorySwitcher from './TerritorySwitcher';
import { getGreetingBucket, getPhase, pickGreeting } from '../utils/timeOfDay';

// A small badge tying the greeting to the same day/night cycle actually
// driving the Grove's sky (see useTimeOfDay/SkyLighting) — the icon and
// gradient change with it rather than sitting there as a fixed decoration,
// so this reads as part of the Grove rather than a generic UI label.
const PHASE_BADGE = {
  sunrise: { Icon: Sunrise, gradient: 'linear-gradient(135deg, #FFB37A, #FF7A8A)' },
  day: { Icon: Sun, gradient: 'linear-gradient(135deg, #FFD37A, #FFA94D)' },
  sunset: { Icon: Sunset, gradient: 'linear-gradient(135deg, #FF9A5C, #C9638A)' },
  night: { Icon: Moon, gradient: 'linear-gradient(135deg, #7FA8D9, #3E4C7A)' },
};

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
  const phase = getPhase(hour);
  const { Icon: PhaseIcon, gradient } = PHASE_BADGE[phase] ?? PHASE_BADGE.day;
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
        // regardless of time of day or what's in the scene behind it — the
        // phase-tinted wash and icon badge below are what keep it from
        // reading as the exact same neutral panel as Settings/Notifications.
        <div className="glass-surface relative flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-2.5">
          <div className="pointer-events-none absolute inset-0 opacity-[0.16]" style={{ background: gradient }} />
          <div
            className="relative z-10 flex h-10 w-10 flex-none items-center justify-center rounded-full text-white"
            style={{ background: gradient, boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}
          >
            <PhaseIcon size={18} strokeWidth={2.25} />
          </div>
          <div className="relative z-10 min-w-0">
            <div className="text-[12.5px] font-medium leading-tight text-stone-500">{greeting}</div>
            <BlurText
              text={name}
              delay={90}
              animateBy="words"
              direction="top"
              className="text-[21px] font-semibold leading-tight tracking-tight text-stone-800"
            />
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            title="Collapse"
            aria-label="Collapse greeting"
            className="relative z-10 flex-none self-start text-stone-400 transition-colors hover:text-stone-600"
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
