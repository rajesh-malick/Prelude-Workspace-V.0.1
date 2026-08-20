import { useMemo, useState } from 'react';
import { Map } from 'lucide-react';

// A top-down read of the Grove's spiral tree layout (see
// `nextProjectPosition` in App.jsx) — orbiting around a tree to see it up
// close loses the sense of where it sits relative to everything else
// planted, and there's no other way to tell at a glance. World x/z map
// directly onto the panel; y (height) is dropped since the layout is flat.
// Positions are normalized to the furthest tree from center each render
// rather than a fixed scale, so a Grove with two trees isn't a pair of dots
// lost in a corner while one with twenty still fits.
function useMinimapPoints(projects) {
  return useMemo(() => {
    const maxAbs = Math.max(4, ...projects.flatMap((p) => [Math.abs(p.position[0]), Math.abs(p.position[2])]));
    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      x: (p.position[0] / maxAbs) * 40,
      y: (p.position[2] / maxAbs) * 40,
    }));
  }, [projects]);
}

// Fixed bottom-right — clear of NavDock (bottom-center) and everything
// anchored to the top-right corner (Header's TerritorySwitcher/ModeToggle/
// New project, ProjectOverlay). Only shows during the free Grove overview —
// the same `!destination` moment OrbitControls itself is live for (see
// `allowOrbit` in App.jsx) — since a scripted camera flight into a tree or
// bloom has nowhere left to navigate to.
export default function Minimap({ projects, hoveredId, onSelect }) {
  const [collapsed, setCollapsed] = useState(false);
  const points = useMinimapPoints(projects);

  if (projects.length === 0) return null;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        title="Show map"
        aria-label="Show map"
        className="glass-surface fixed bottom-6 right-6 z-20 flex h-10 w-10 items-center justify-center rounded-full text-stone-500 transition-colors hover:text-stone-800"
      >
        <Map size={16} strokeWidth={2} />
      </button>
    );
  }

  return (
    <div className="glass-surface fixed bottom-6 right-6 z-20 w-[168px] rounded-2xl p-2.5">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Grove map</span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          title="Hide map"
          aria-label="Hide map"
          className="text-stone-400 transition-colors hover:text-stone-700"
        >
          <Map size={12} strokeWidth={2} />
        </button>
      </div>
      <svg viewBox="0 0 100 100" className="mt-1.5 h-[140px] w-[140px]">
        <circle cx="50" cy="50" r="47" fill="#DDD0A8" opacity="0.4" />
        <circle cx="50" cy="50" r="2" fill="#9C8B6B" />
        {points.map((p) => {
          const isHovered = p.id === hoveredId;
          return (
            <circle
              key={p.id}
              cx={50 + p.x}
              cy={50 + p.y}
              r={isHovered ? 5 : 3.4}
              fill={p.color}
              stroke="white"
              strokeWidth={isHovered ? 1.2 : 0.6}
              className="cursor-pointer transition-[r]"
              onClick={() => onSelect(p.id)}
            >
              <title>{p.name}</title>
            </circle>
          );
        })}
      </svg>
    </div>
  );
}
