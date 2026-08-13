import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, ChevronRight, Archive, ArchiveRestore, MapPin } from 'lucide-react';
import { getStatus } from '../utils/commentStatus';
import { avatarColor } from '../utils/avatarColor';

const STATUS_LABEL = {
  active: 'Active',
  blocked: 'Blocked',
  'review pending': 'Review pending',
};

const VERSION_STATUS_LABEL = {
  approved: 'Approved',
  'in review': 'In review',
  draft: 'Draft',
  blocked: 'Blocked',
};

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

export default function FocusProjectView({
  project,
  onBack,
  onOpenVersion,
  onRequestNewVersion,
  onDeleteVersion,
  onToggleArchive,
  onDeleteProject,
  visitingOwnerName,
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(null);
  const [confirmingDeleteProject, setConfirmingDeleteProject] = useState(false);
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const team = getTeamInitials(project);
  const allComments = project.versions.flatMap((v) => v.comments);
  const resolvedCount = allComments.filter((c) => getStatus(c) === 'resolved').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25 }}
      className="mx-auto max-w-4xl px-8 pb-40 pt-28"
    >
      {/* Persistent reminder you're not in your own Grove — every control
          on this page has full edit rights on someone else's data, and
          it's easy to forget that a few clicks deep. */}
      {visitingOwnerName && (
        <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] font-medium text-amber-700">
          <MapPin size={13} strokeWidth={2} /> Editing {visitingOwnerName}'s territory
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-stone-600 transition-colors hover:text-stone-900"
        >
          <ArrowLeft size={14} strokeWidth={2} /> Projects
        </button>
        {onDeleteProject && (
          <button
            type="button"
            onClick={() => setConfirmingDeleteProject(true)}
            title="Delete project"
            aria-label="Delete project"
            className="flex h-7 w-7 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={14} strokeWidth={2} />
          </button>
        )}
      </div>

      {confirmingDeleteProject && (
        <div className="mt-3 rounded-xl bg-red-50 px-4 py-3">
          <div className="text-[13px] font-medium text-red-700">
            Delete {visitingOwnerName ? `${visitingOwnerName}'s` : ''} "{project.name}" and all{' '}
            {project.versions.length} version{project.versions.length === 1 ? '' : 's'}? This can't be undone.
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onDeleteProject(project.id);
                setConfirmingDeleteProject(false);
              }}
              className="text-[12.5px] font-semibold text-red-700 hover:underline"
            >
              Delete project
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDeleteProject(false)}
              className="text-[12.5px] font-medium text-stone-500 hover:text-stone-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[24px] font-semibold text-stone-800">{project.name}</h1>
            {project.archived && (
              <span className="rounded-full bg-stone-200 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                Archived
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[13px] text-stone-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: project.color }} />
            {STATUS_LABEL[project.status] ?? project.status}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {team.map((name) => (
              <div
                key={name}
                title={name}
                style={{ backgroundColor: avatarColor(name).bg, color: avatarColor(name).fg }}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[12px] font-semibold"
              >
                {name.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
          {onToggleArchive && (
            <button
              type="button"
              onClick={() => {
                // Only confirm when it's not your own project — archiving
                // your own is low-stakes and already reversible, but doing
                // it to someone else's by mistake a few clicks into their
                // territory is exactly the slip this is meant to catch.
                if (visitingOwnerName) {
                  setConfirmingArchive(true);
                } else {
                  onToggleArchive(project.id);
                }
              }}
              title={project.archived ? 'Restore from archive' : 'Archive project'}
              className="flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-2 text-[12.5px] font-medium text-stone-600 ring-1 ring-black/5 transition-colors hover:bg-white"
            >
              {project.archived ? (
                <ArchiveRestore size={14} strokeWidth={2} />
              ) : (
                <Archive size={14} strokeWidth={2} />
              )}
              {project.archived ? 'Restore' : 'Archive'}
            </button>
          )}
        </div>
      </div>

      {confirmingArchive && (
        <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3">
          <div className="text-[13px] font-medium text-amber-800">
            {project.archived ? 'Restore' : 'Archive'} {visitingOwnerName}'s "{project.name}"?
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onToggleArchive(project.id);
                setConfirmingArchive(false);
              }}
              className="text-[12.5px] font-semibold text-amber-800 hover:underline"
            >
              {project.archived ? 'Restore' : 'Archive'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingArchive(false)}
              className="text-[12.5px] font-medium text-stone-500 hover:text-stone-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center gap-8 rounded-2xl bg-white/70 px-6 py-4 text-[13px] ring-1 ring-black/5">
        <div>
          <div className="font-medium text-stone-500">Versions</div>
          <div className="mt-0.5 text-[16px] font-semibold text-stone-800">{project.versions.length}</div>
        </div>
        <div>
          <div className="font-medium text-stone-500">Comments</div>
          <div className="mt-0.5 text-[16px] font-semibold text-stone-800">
            {allComments.length === 0 ? 'None yet' : `${resolvedCount}/${allComments.length} resolved`}
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-stone-800">Versions</h2>
        {onRequestNewVersion && (
          <button
            type="button"
            onClick={onRequestNewVersion}
            className="flex items-center gap-1.5 rounded-full bg-stone-800 px-3.5 py-2 text-[12.5px] font-medium text-white transition-opacity hover:opacity-90"
          >
            <Plus size={13} strokeWidth={2.5} /> New version
          </button>
        )}
      </div>

      {/* A grid of vertical cards, not one long column of thin horizontal
          rows — a single-column list only ever showed one version at a
          time per screenful; a project with a dozen versions meant a lot
          of scrolling just to see what exists. Cards let several versions
          be visible at once, at any width. */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {project.versions.length === 0 && (
          <div className="col-span-full rounded-2xl bg-white/70 px-5 py-8 text-center text-[13px] text-stone-400 ring-1 ring-black/5">
            No versions yet
          </div>
        )}
        {project.versions.map((v) =>
          confirmingDelete === v.id ? (
            <div key={v.id} className="rounded-2xl bg-red-50 p-4 ring-1 ring-red-100">
              <div className="text-[13px] font-medium text-red-700">
                {project.versions.length === 1
                  ? `Delete ${v.label}? The whole project goes with it.`
                  : `Delete ${v.label}? This can't be undone.`}
              </div>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onDeleteVersion?.(v.id);
                    setConfirmingDelete(null);
                  }}
                  className="text-[12.5px] font-semibold text-red-700 hover:underline"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(null)}
                  className="text-[12.5px] font-medium text-stone-500 hover:text-stone-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              key={v.id}
              className="group relative rounded-2xl bg-white/70 ring-1 ring-black/5 transition-colors hover:bg-white"
            >
              {onDeleteVersion && (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(v.id)}
                  title="Delete version"
                  aria-label={`Delete ${v.label}`}
                  className="absolute right-2.5 top-2.5 z-10 flex h-7 w-7 flex-none items-center justify-center rounded-lg text-stone-300 opacity-0 transition-opacity hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 size={13} strokeWidth={2} />
                </button>
              )}
              <button type="button" onClick={() => onOpenVersion(v.id)} className="flex w-full flex-col p-4 text-left">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 flex-none rounded-full"
                    style={{ backgroundColor: v.status === 'blocked' ? '#C2410C' : project.color }}
                  />
                  <span className="truncate text-[14px] font-medium text-stone-800">{v.label}</span>
                </div>
                <div className="mt-1 text-[12px] text-stone-400">
                  {v.owner} · {v.createdAt}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-2.5 text-[12.5px] text-stone-500">
                  <span>{VERSION_STATUS_LABEL[v.status] ?? v.status}</span>
                  <span className="flex items-center gap-1">
                    {v.comments.length > 0 && <span className="text-stone-400">{v.comments.length} comments</span>}
                    <ChevronRight size={15} strokeWidth={2} className="text-stone-300" />
                  </span>
                </div>
              </button>
            </div>
          )
        )}
      </div>
    </motion.div>
  );
}
