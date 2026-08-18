import { useState } from 'react';
import { Send } from 'lucide-react';
import { avatarColor } from '../utils/avatarColor';

function Avatar({ author, small }) {
  return (
    <div
      style={{ backgroundColor: avatarColor(author).bg, color: avatarColor(author).fg }}
      className={`mt-0.5 flex flex-none items-center justify-center rounded-full font-semibold ${
        small ? 'h-4 w-4 text-[9px]' : 'h-5 w-5 text-[10px]'
      }`}
    >
      {author.charAt(0).toUpperCase()}
    </div>
  );
}

// One reply, plus its own "Reply" action and whatever sub-replies it has —
// recurses into itself so a reply chain can go arbitrarily deep, not just
// one level under the comment.
function ReplyNode({ reply, onAddReply, readOnly }) {
  const [replying, setReplying] = useState(false);
  const [draft, setDraft] = useState('');

  const submit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const text = draft.trim();
    if (!text) return;
    onAddReply?.([reply.id], text);
    setDraft('');
    setReplying(false);
  };

  // A reply to THIS reply lands one level under it; anything deeper just
  // keeps prepending this reply's id to the path on the way up.
  const childOnAddReply = onAddReply ? (path, text) => onAddReply([reply.id, ...path], text) : undefined;

  return (
    <div>
      <div className="flex items-start gap-1.5">
        <Avatar author={reply.author} small />
        <div className="min-w-0 flex-1 text-[12px] leading-snug text-stone-700">
          <span className="font-semibold text-stone-800">{reply.author}</span> {reply.text}
        </div>
      </div>
      {!readOnly && onAddReply && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setReplying((v) => !v);
          }}
          className="ml-5 mt-0.5 text-[11px] font-medium text-stone-400 transition-colors hover:text-stone-600"
        >
          Reply
        </button>
      )}
      {replying && (
        <form onSubmit={submit} className="ml-5 mt-1 flex items-center gap-1">
          <input
            type="text"
            autoFocus
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
      {reply.replies?.length > 0 && (
        <div className="ml-5 mt-1.5 space-y-1.5 border-l border-black/10 pl-2.5">
          {reply.replies.map((sub) => (
            <ReplyNode key={sub.id} reply={sub} onAddReply={childOnAddReply} readOnly={readOnly} />
          ))}
        </div>
      )}
    </div>
  );
}

// Genuinely threaded replies under a comment — replaces the old formal
// "assignee" field. "@Aravindan can you take this" as a reply does the same
// delegation job without a separate, redundant assignment control. Any
// reply can itself be replied to (see ReplyNode above), not just the
// top-level comment.
export default function ReplyThread({ replies, onAddReply, readOnly, compact }) {
  const [draft, setDraft] = useState('');
  const list = replies ?? [];

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const text = draft.trim();
    if (!text) return;
    onAddReply?.([], text);
    setDraft('');
  };

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'} onClick={(e) => e.stopPropagation()}>
      {list.length > 0 && (
        <div className={`space-y-1.5 overflow-y-auto ${compact ? 'max-h-28' : 'max-h-48'}`}>
          {list.map((r) => (
            <ReplyNode key={r.id} reply={r} onAddReply={onAddReply} readOnly={readOnly} />
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
