// Same sliding-block switch pattern as the Cursor/Comment mode toggle in
// ReviewOverlay, translated to the light glass-surface sidebar instead of
// the dark header strip — one visual language for "pick one of two views"
// across the app instead of two different-looking controls that do the
// same kind of thing.
export default function DetailsCommentsSwitch({ tab, onChange, commentsLabel = 'Comments' }) {
  const showingComments = tab === 'comments';
  return (
    <div className="relative flex h-8 items-center rounded-lg border border-black/5 bg-black/5 p-1 text-[12.5px] font-semibold">
      <span
        className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-md bg-white shadow-sm transition-transform duration-200 ease-out"
        style={{ transform: showingComments ? 'translateX(100%)' : 'translateX(0%)' }}
      />
      <button
        type="button"
        onClick={() => onChange('details')}
        className={`relative z-10 flex-1 rounded-md py-1 text-center transition-colors ${
          showingComments ? 'text-stone-500 hover:text-stone-700' : 'text-stone-900'
        }`}
      >
        Details
      </button>
      <button
        type="button"
        onClick={() => onChange('comments')}
        className={`relative z-10 flex-1 rounded-md py-1 text-center transition-colors ${
          showingComments ? 'text-stone-900' : 'text-stone-500 hover:text-stone-700'
        }`}
      >
        {commentsLabel}
      </button>
    </div>
  );
}
