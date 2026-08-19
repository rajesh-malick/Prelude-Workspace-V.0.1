import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'review pending', label: 'Review pending' },
  { value: 'blocked', label: 'Blocked' },
];

const COLOR_OPTIONS = ['#4E9A5C', '#C98A2E', '#3E7FB0', '#8B6FB0', '#C9638A', '#3E9A9A'];

// `project` (optional) switches this into edit mode — same form, prefilled
// with an existing project's current values, calling `onSave` instead of
// `onCreate` and skipping the "a new tree grows" hint that only makes
// sense the first time.
export default function CreateProjectModal({ project, onCreate, onSave, onClose }) {
  const isEditing = Boolean(project);
  const [name, setName] = useState(project?.name ?? '');
  const [status, setStatus] = useState(project?.status ?? 'active');
  const [color, setColor] = useState(project?.color ?? COLOR_OPTIONS[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (isEditing) {
      onSave({ name: name.trim(), status, color });
    } else {
      onCreate({ name: name.trim(), status, color });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/15 p-6"
      onClick={onClose}
    >
      <motion.form
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="glass-surface w-[380px] rounded-2xl p-5"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-semibold text-stone-800">{isEditing ? 'Edit project' : 'New project'}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-black/5 hover:text-stone-700"
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        <label className="mt-4 block text-[11.5px] font-medium text-stone-600">Project name</label>
        <input
          type="text"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Homepage Redesign"
          className="mt-1 w-full rounded-lg bg-black/5 px-3 py-2 text-[13px] text-stone-800 outline-none placeholder:text-stone-500 focus:bg-black/[0.07]"
        />

        <label className="mt-3 block text-[11.5px] font-medium text-stone-600">Status</label>
        <div className="mt-1 flex items-center gap-1 rounded-lg bg-black/5 p-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatus(opt.value)}
              className={`flex-1 rounded-md py-1.5 text-[12px] font-medium transition-colors ${
                status === opt.value ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <label className="mt-3 block text-[11.5px] font-medium text-stone-600">Color</label>
        <div className="mt-1.5 flex items-center gap-2">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="flex h-7 w-7 items-center justify-center rounded-full transition-transform"
              style={{
                backgroundColor: c,
                transform: color === c ? 'scale(1.15)' : 'scale(1)',
                boxShadow: color === c ? `0 0 0 2px white, 0 0 0 3.5px ${c}` : 'none',
              }}
            />
          ))}
        </div>

        {!isEditing && (
          <p className="mt-4 text-[11px] text-stone-500">
            A new tree grows for it right away — you'll add its first version next.
          </p>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3.5 py-1.5 text-[12.5px] font-medium text-stone-600 transition-colors hover:bg-black/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="rounded-full bg-stone-800 px-4 py-1.5 text-[12.5px] font-medium text-white transition-opacity disabled:opacity-40"
          >
            {isEditing ? 'Save changes' : 'Create project'}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
