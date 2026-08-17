// A comment is either resolved or it isn't — the old open/assigned/reviewed
// staged workflow never actually got used as a workflow; everyone either
// left it "open" or flipped it straight to "resolved". Replies now carry
// the "someone looked at this" / "assigned to you" nuance instead.
export function isResolved(comment) {
  return Boolean(comment.resolved);
}

// A short audit line — who last resolved it. null once reopened.
export function resolvedNote(comment) {
  return comment.resolved && comment.resolvedBy ? `Resolved by ${comment.resolvedBy}` : null;
}
