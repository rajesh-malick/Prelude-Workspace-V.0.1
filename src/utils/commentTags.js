import { MessageSquare, Paintbrush, Bug, Workflow, HelpCircle, Star } from 'lucide-react';

// Selectable when composing a new comment. "improvement" is deliberately
// not offered here anymore — it overlapped too much with "UI polish" for
// anyone to reliably pick the right one — but it stays in the display
// maps below so existing comments already tagged with it still render
// correctly. Each `slash` is what typing "/" in an empty comment box
// matches against (see useSlashTagPicker).
export const TAG_OPTIONS = [
  { value: null, label: 'Note', slash: '/note', Icon: MessageSquare },
  { value: 'bug', label: 'Bug', slash: '/bug', Icon: Bug },
  { value: 'ui', label: 'UI polish', slash: '/ui-polish', Icon: Paintbrush },
  { value: 'ux', label: 'UX/Flow', slash: '/ux-flow', Icon: Workflow },
  { value: 'question', label: 'Question', slash: '/question', Icon: HelpCircle },
];

// Display maps cover every value a comment could actually have, including
// the retired "improvement" — a comment tagged with it years ago should
// still show a real label/icon, not fall through to nothing.
export const TAG_ICON = { bug: Bug, ui: Paintbrush, ux: Workflow, question: HelpCircle, improvement: Star };
export const TAG_LABEL = { bug: 'Bug', ui: 'UI polish', ux: 'UX/Flow', question: 'Question', improvement: 'Improvement' };
export const TAG_ACCENT = {
  bug: 'text-red-600',
  ui: 'text-sky-600',
  ux: 'text-violet-600',
  question: 'text-blue-600',
  improvement: 'text-amber-500',
};

// The slash menu only ever offers a real tag, never "Note" (typing "/"
// and picking nothing is just... not typing "/").
export const SLASH_TAG_OPTIONS = TAG_OPTIONS.filter((t) => t.value);
