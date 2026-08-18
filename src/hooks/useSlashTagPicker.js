import { useEffect, useState } from 'react';
import { SLASH_TAG_OPTIONS } from '../utils/commentTags';

// Hybrid, not a replacement for the tag buttons — this only ever
// activates when "/" is the very first character of an otherwise-empty
// comment box, so it can never collide with a literal slash typed
// mid-sentence ("and/or"), and tags stay a whole-comment classification
// rather than something you could accidentally trigger partway through
// writing. Picking an option clears the "/text" typed so far and sets
// the tag exactly like clicking a button would — it's just a faster way
// to reach the same state, not a new kind of data.
export default function useSlashTagPicker(draft, setDraft, setTag) {
  const [highlighted, setHighlighted] = useState(0);
  const query = draft.startsWith('/') ? draft.slice(1).toLowerCase() : null;
  const matches =
    query === null
      ? []
      : SLASH_TAG_OPTIONS.filter(
          (t) => t.slash.slice(1).startsWith(query) || t.label.toLowerCase().startsWith(query)
        );
  const open = matches.length > 0;

  useEffect(() => {
    setHighlighted(0);
  }, [draft]);

  const select = (opt) => {
    setTag(opt.value);
    setDraft('');
  };

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => (h + 1) % matches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => (h - 1 + matches.length) % matches.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      select(matches[highlighted]);
    } else if (e.key === 'Escape') {
      setDraft('');
    }
  };

  return { open, matches, highlighted, onKeyDown, select };
}
