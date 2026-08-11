import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ChevronDown, ArrowUpDown, X } from 'lucide-react';
import { getStatus } from '../utils/commentStatus';
import { parseElapsedMinutes } from '../utils/relativeTime';

const STATUS_LABEL = {
  active: 'Active',
  blocked: 'Blocked',
  'review pending': 'Review pending',
};

// From the Figma design-revamp audit (P2 — Missing Filters / Missing Sort):
// filter row is All / Active / Archived / My Projects / Needs Review /
// Recently Updated; sort is Recently Updated / Recently Created /
// Alphabetical / Most Commented.
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'archived', label: 'Archived' },
  { key: 'mine', label: 'My Projects' },
  { key: 'needs-review', label: 'Needs Review' },
  { key: 'recently-updated', label: 'Recently Updated' },
];

const SORTS = [
  { key: 'updated', label: 'Recently Updated' },
  { key: 'created', label: 'Recently Created' },
  { key: 'alphabetical', label: 'Alphabetical' },
  { key: 'most-commented', label: 'Most Commented' },
];

function commentCount(project) {
  return project.versions.reduce((sum, v) => sum + v.comments.length, 0);
}

// The project's own "creation" and "last updated" times aren't tracked
// directly — the oldest version's age approximates when the project was
// created, and the youngest version's age approximates its last update.
function createdMinutesAgo(project) {
  return parseElapsedMinutes(project.versions[0]?.createdAt);
}
function updatedMinutesAgo(project) {
  return Math.min(...project.versions.map((v) => parseElapsedMinutes(v.createdAt)), Infinity);
}

function applyFilter(projects, filterKey, userName) {
  const notArchived = projects.filter((p) => !p.archived);
  switch (filterKey) {
    case 'archived':
      return projects.filter((p) => p.archived);
    case 'active':
      return notArchived.filter((p) => p.status === 'active');
    case 'mine':
      return notArchived.filter((p) => p.versions[0]?.owner === userName);
    case 'needs-review':
      return notArchived.filter((p) => p.status === 'review pending');
    default:
      return notArchived;
  }
}

function applySort(projects, sortKey) {
  const list = [...projects];
  switch (sortKey) {
    case 'created':
      return list.sort((a, b) => createdMinutesAgo(a) - createdMinutesAgo(b));
    case 'alphabetical':
      return list.sort((a, b) => a.name.localeCompare(b.name));
    case 'most-commented':
      return list.sort((a, b) => commentCount(b) - commentCount(a));
    case 'updated':
    default:
      return list.sort((a, b) => updatedMinutesAgo(a) - updatedMinutesAgo(b));
  }
}

const MENU_WIDTH = 190;

// Same portal-to-<body> pattern as StatusDropdown/AssigneePicker — this
// page lives inside Focus mode's own scroll container, and a plain
// `position: absolute` menu would scroll/clip oddly inside it.
function SortDropdown({ sortKey, onChange }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const left = Math.max(8, Math.min(window.innerWidth - MENU_WIDTH - 8, rect.right - MENU_WIDTH));
    setPos({ left, top: rect.bottom + 6 });
  }, [open]);

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

  const current = SORTS.find((s) => s.key === sortKey) ?? SORTS[0];

  return (
    <div className="relative flex-none">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full bg-white/70 px-3.5 py-2 text-[12.5px] font-medium text-stone-700 ring-1 ring-black/5 transition-colors hover:bg-white"
      >
        <ArrowUpDown size={13} strokeWidth={2.25} />
        {current.label}
        <ChevronDown size={13} strokeWidth={2.25} />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            className="glass-surface fixed z-50 overflow-hidden rounded-xl py-1"
            style={{ left: pos.left, top: pos.top, width: MENU_WIDTH }}
          >
            {SORTS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => {
                  onChange(s.key);
                  setOpen(false);
                }}
                className={`flex w-full items-center px-3 py-2 text-left text-[13px] font-medium transition-colors hover:bg-black/5 ${
                  s.key === sortKey ? 'bg-black/5 text-stone-900' : 'text-stone-600'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}

function getTeamInitials(project) {
  const names = [];
  const seen = new Set();
  const add = (name) => {
    if (!name || seen.has(name)) return;
    seen.add(name);
    names.push(name);
  };
  project.versions.forEach((v) => add(v.owner));
  project.versions.forEach((v) => v.comments.forEach((c) => add(c.author)));
  return names;
}

function ProjectCard({ project, onOpen }) {
  const allComments = project.versions.flatMap((v) => v.comments);
  const resolvedCount = allComments.filter((c) => getStatus(c) === 'resolved').length;
  const team = getTeamInitials(project);

  return (
    <motion.button
      type="button"
      onClick={() => onOpen(project.id)}
      whileHover={{ y: -2 }}
      className="flex flex-col rounded-2xl bg-white/70 p-5 text-left shadow-[0_1px_2px_rgba(120,90,40,0.06)] ring-1 ring-black/5 transition-shadow hover:shadow-[0_8px_24px_rgba(120,90,40,0.12)]"
    >
      <div className="h-1.5 w-10 rounded-full" style={{ backgroundColor: project.color }} />
      <div className="mt-3 flex items-center gap-2">
        <h3 className="text-[16px] font-semibold text-stone-800">{project.name}</h3>
        {project.archived && (
          <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-stone-600">
            Archived
          </span>
        )}
        {project.isSample && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-amber-700">
            Sample
          </span>
        )}
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-[12px] text-stone-500">
        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: project.color }} />
        {STATUS_LABEL[project.status] ?? project.status}
      </div>

      <div className="mt-4 flex items-center gap-4 text-[12px] text-stone-500">
        <div>
          <span className="font-semibold text-stone-800">{project.versions.length}</span> version
          {project.versions.length === 1 ? '' : 's'}
        </div>
        <div>
          <span className="font-semibold text-stone-800">
            {allComments.length === 0 ? '0' : `${resolvedCount}/${allComments.length}`}
          </span>{' '}
          resolved
        </div>
      </div>

      <div className="mt-4 flex -space-x-2">
        {team.slice(0, 5).map((name) => (
          <div
            key={name}
            title={name}
            className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-stone-200 text-[10px] font-semibold text-stone-700"
          >
            {name.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>
    </motion.button>
  );
}

export default function FocusDashboard({ projects, userName, onOpenProject, onRemoveSamples }) {
  const [filterKey, setFilterKey] = useState('all');
  const [sortKey, setSortKey] = useState('updated');

  const visibleProjects = useMemo(() => {
    const filtered = applyFilter(projects, filterKey, userName);
    // The "Recently Updated" chip is both a filter (show everything active)
    // and a shortcut into that same sort — handled by also syncing the sort
    // dropdown itself when it's picked (see handleFilterClick below), so the
    // dropdown's own label never silently disagrees with what's applied.
    return applySort(filtered, sortKey);
  }, [projects, filterKey, sortKey, userName]);

  const handleFilterClick = (key) => {
    setFilterKey(key);
    if (key === 'recently-updated') setSortKey('updated');
  };

  const sampleCount = projects.filter((p) => p.isSample).length;

  return (
    <div className="mx-auto max-w-5xl px-8 pb-28 pt-28">
      <div>
        <h1 className="text-[22px] font-semibold text-stone-800">Projects</h1>
        <p className="mt-1 text-[13px] text-stone-500">
          {visibleProjects.length} project{visibleProjects.length === 1 ? '' : 's'}
        </p>
      </div>

      {sampleCount > 0 && onRemoveSamples && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-2.5 text-[12.5px] text-amber-800 ring-1 ring-amber-200">
          <span>
            Viewing {sampleCount} sample project{sampleCount === 1 ? '' : 's'} — a good way to see how Prelude
            works before planting your own.
          </span>
          <button
            type="button"
            onClick={onRemoveSamples}
            className="flex flex-none items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 font-medium text-amber-800 ring-1 ring-amber-300 transition-colors hover:bg-white"
          >
            <X size={12} strokeWidth={2.5} /> Remove samples
          </button>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => handleFilterClick(f.key)}
              className={`rounded-full px-3.5 py-2 text-[12.5px] font-medium transition-colors ${
                filterKey === f.key ? 'bg-stone-800 text-white' : 'bg-white/70 text-stone-600 ring-1 ring-black/5 hover:bg-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <SortDropdown sortKey={sortKey} onChange={setSortKey} />
      </div>

      {visibleProjects.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-2xl bg-white/60 py-16 text-center ring-1 ring-black/5">
          <div className="text-[15px] font-semibold text-stone-700">
            {projects.length === 0 ? 'No projects yet' : 'No projects match this filter'}
          </div>
          <p className="mt-1 text-[12.5px] text-stone-500">
            {projects.length === 0 ? 'Create your first project to get started.' : 'Try a different filter above.'}
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProjects.map((project) => (
            <ProjectCard key={project.id} project={project} onOpen={onOpenProject} />
          ))}
        </div>
      )}
    </div>
  );
}
