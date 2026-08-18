// onMouseDown (not onClick) + preventDefault keeps focus on the comment
// input through the click — an onClick here would blur the input first,
// which is exactly the kind of focus-jank that makes combobox-style
// dropdowns feel broken.
export default function SlashTagMenu({ matches, highlighted, onSelect }) {
  return (
    <div className="absolute bottom-full left-0 z-20 mb-1 w-44 overflow-hidden rounded-lg bg-white py-1 shadow-lg">
      {matches.map((opt, i) => (
        <button
          key={opt.value}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(opt);
          }}
          className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] font-medium transition-colors ${
            i === highlighted ? 'bg-black/5 text-stone-900' : 'text-stone-600 hover:bg-black/5'
          }`}
        >
          <opt.Icon size={13} strokeWidth={2.25} />
          {opt.label}
          <span className="ml-auto text-[10.5px] text-stone-400">{opt.slash}</span>
        </button>
      ))}
    </div>
  );
}
