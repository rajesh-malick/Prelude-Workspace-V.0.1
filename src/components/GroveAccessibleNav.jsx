const STATUS_LABEL = {
  active: 'Active',
  blocked: 'Blocked',
  'review pending': 'Review pending',
};

// The 3D Grove (WebGL canvas) has no accessibility tree of its own — a
// screen reader sees nothing, and there's no way to Tab to a tree. This is
// the real interactive surface for that: same action as clicking a tree
// (onSelect), just reachable by keyboard and announced by name/status
// instead of shape/position. Visually hidden until focus lands inside it
// (see .a11y-reveal in index.css), so mouse users never see it but a
// keyboard-only user gets a real, visible list — not a screen-reader-only
// illusion of one.
export default function GroveAccessibleNav({ projects, onSelect }) {
  if (projects.length === 0) return null;

  return (
    <nav aria-label="Jump to a project" className="a11y-reveal glass-surface fixed left-6 top-24 z-30 w-64 rounded-2xl p-3">
      <p className="px-1 text-[12.5px] font-medium text-stone-500">
        Keyboard alternative to clicking a tree in the Grove:
      </p>
      <ul className="mt-1.5 max-h-[60vh] space-y-1 overflow-y-auto">
        {projects.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onSelect(p.id)}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[14px] font-medium text-stone-800 transition-colors hover:bg-black/5"
            >
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name}
              </span>
              <span className="text-[12.5px] text-stone-500">
                {STATUS_LABEL[p.status] ?? p.status} · {p.versions.length}v
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
