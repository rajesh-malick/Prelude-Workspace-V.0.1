import { motion } from 'framer-motion';
import { getStatus } from '../utils/commentStatus';

const STATUS_LABEL = {
  active: 'Active',
  blocked: 'Blocked',
  'review pending': 'Review pending',
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
      <h3 className="mt-3 text-[16px] font-semibold text-stone-800">{project.name}</h3>
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

export default function FocusDashboard({ projects, onOpenProject }) {
  return (
    <div className="mx-auto max-w-5xl px-8 pb-28 pt-28">
      <div>
        <h1 className="text-[22px] font-semibold text-stone-800">Projects</h1>
        <p className="mt-1 text-[13px] text-stone-500">
          {projects.length} project{projects.length === 1 ? '' : 's'}
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="mt-16 flex flex-col items-center rounded-2xl bg-white/60 py-16 text-center ring-1 ring-black/5">
          <div className="text-[15px] font-semibold text-stone-700">No projects yet</div>
          <p className="mt-1 text-[12.5px] text-stone-500">Create your first project to get started.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} onOpen={onOpenProject} />
          ))}
        </div>
      )}
    </div>
  );
}
