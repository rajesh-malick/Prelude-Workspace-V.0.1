import { useState } from 'react';
import { Send } from 'lucide-react';
import { avatarColor } from '../utils/avatarColor';

// Genuinely threaded replies under a comment — replaces the old formal
// "assignee" field. "@Aravindan can you take this" as a reply does the same
// delegation job without a separate, redundant assignment control.
export default function ReplyThread({ replies, onAddReply, readOnly, compact }) {
  const [draft, setDraft] = useState('');
  const list = replies ?? [];

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const text = draft.trim();
    if (!text) return;
    onAddReply?.(text);
    setDraft('');
  };

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'} onClick={(e) => e.stopPropagation()}>
      {list.length > 0 && (
        <div className={`space-y-1.5 overflow-y-auto ${compact ? 'max-h-24' : 'max-h-40'}`}>
          {list.map((r) => (
            <div key={r.id} className="flex items-start gap-1.5">
              <div
                style={{ backgroundColor: avatarColor(r.author).bg, color: avatarColor(r.author).fg }}
                className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full text-[9px] font-semibold"
              >
                {r.author.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 text-[12px] leading-snug text-stone-700">
                <span className="font-semibold text-stone-800">{r.author}</span> {r.text}
              </div>
            </div>
          ))}
        </div>
      )}
      {!readOnly && onAddReply && (
        <form onSubmit={handleSubmit} className="flex items-center gap-1">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Reply…"
            className="min-w-0 flex-1 rounded-full bg-black/5 px-2.5 py-1 text-[12px] text-stone-800 outline-none placeholder:text-stone-400"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Send reply"
            className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-stone-800 text-white transition-opacity disabled:opacity-30"
          >
            <Send size={11} strokeWidth={2.5} />
          </button>
        </form>
      )}
    </div>
  );
}
