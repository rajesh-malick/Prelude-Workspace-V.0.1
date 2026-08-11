import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Eye } from 'lucide-react';
import { getStatus } from '../utils/commentStatus';

// All copy here uses real product terms (Project/Versions/Status) per the
// brief — the nature metaphor is a rendering choice for the 3D layer only.
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

// Real participants — whoever owns a version or has left a comment —
// instead of a fixed placeholder roster. A brand-new solo project just
// shows its one owner, not a fake team of three.
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

export default function ProjectOverlay({
  project,
  onBack,
  onOpenVersion,
  onRequestNewVersion,
  onDeleteVersion,
  onDeleteProject,
  readOnly,
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(null);
  const [confirmingDeleteProject, setConfirmingDeleteProject] = useState(false);
  const team = getTeamInitials(project);
  const allComments = project.versions.flatMap((v) => v.comments);
  const resolvedCount = allComments.filter((c) => getStatus(c) === 'resolved').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="fixed right-6 top-24 z-20 w-[320px]"
    >
      <div className="glass-surface rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-stone-600 transition-colors hover:text-stone-900"
          >
            <ArrowLeft size={15} strokeWidth={2} /> Grove
          </button>
          {!readOnly && onDeleteProject && (
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
          <div className="mb-3 rounded-lg bg-red-50 px-3 py-2.5">
            <div className="text-[13px] font-medium text-red-700">
              Delete "{project.name}" and all {project.versions.length} version
              {project.versions.length === 1 ? '' : 's'}? This can't be undone.
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

        {readOnly && (
          <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-2 text-[12.5px] font-medium text-emerald-700">
            <Eye size={13} strokeWidth={2} /> Read-only — you're visiting this territory
          </div>
        )}

        <h2 className="text-[21px] font-semibold leading-tight text-stone-800">{project.name}</h2>
        <div className="mt-1.5 flex items-center gap-1.5 text-[13.5px] text-stone-600">
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: project.color }} />
          {STATUS_LABEL[project.status] ?? project.status}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-[13.5px]">
          <div>
            <div className="font-medium text-stone-500">Versions</div>
            <div className="mt-0.5 font-medium text-stone-800">{project.versions.length}</div>
          </div>
          <div>
            <div className="font-medium text-stone-500">Comments</div>
            <div className="mt-0.5 font-medium text-stone-800">
              {allComments.length === 0 ? 'None yet' : `${resolvedCount}/${allComments.length} resolved`}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-[13.5px] font-medium text-stone-500">Team</div>
          <div className="mt-1.5 flex -space-x-2">
            {team.map((name) => (
              <div
                key={name}
                title={name}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-stone-200 text-[12.5px] font-semibold text-stone-700"
              >
                {name.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <div className="text-[13.5px] font-medium text-stone-500">Versions</div>
          <div className="mt-1.5 max-h-[220px] space-y-1 overflow-y-auto pr-0.5">
            {project.versions.map((v) =>
              confirmingDelete === v.id ? (
                <div key={v.id} className="flex items-center justify-between gap-2 rounded-lg bg-red-50 px-2 py-1.5">
                  <span className="text-[13px] font-medium text-red-700">
                    {project.versions.length === 1
                      ? `Delete ${v.label}? The whole project goes with it.`
                      : `Delete ${v.label}?`}
                  </span>
                  <div className="flex flex-none items-center gap-2">
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
                <div key={v.id} className="group flex w-full items-center rounded-lg transition-colors hover:bg-black/5">
                  <button
                    type="button"
                    onClick={() => onOpenVersion?.(v.id)}
                    className="flex flex-1 items-center justify-between px-2 py-1.5 text-left"
                  >
                    <span className="flex items-center gap-1.5 text-[14px] font-medium text-stone-800">
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: v.status === 'blocked' ? '#C2410C' : project.color }}
                      />
                      {v.label}
                    </span>
                    <span className="text-[12.5px] text-stone-500">
                      {VERSION_STATUS_LABEL[v.status] ?? v.status}
                      {v.comments.length > 0 && <span className="ml-1.5 text-stone-400">· {v.comments.length}</span>}
                    </span>
                  </button>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(v.id)}
                      title="Delete version"
                      aria-label={`Delete ${v.label}`}
                      className="flex h-6 w-6 flex-none items-center justify-center rounded-md text-stone-300 opacity-0 transition-opacity hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 size={13} strokeWidth={2} />
                    </button>
                  )}
                </div>
              )
            )}
            {project.versions.length === 0 && (
              <div className="px-2 py-1.5 text-[13px] text-stone-400">No versions yet</div>
            )}
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={onRequestNewVersion}
              className="mt-1 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[13.5px] font-medium text-stone-500 transition-colors hover:bg-black/5 hover:text-stone-700"
            >
              <Plus size={14} strokeWidth={2.5} /> New version
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
