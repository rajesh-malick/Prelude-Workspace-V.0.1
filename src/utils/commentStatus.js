// A comment's lifecycle: raised, picked up, looked at, done. Legacy/seed
// comments only ever had `resolved: boolean` — getStatus() treats that as
// the source of truth until a real `status` is set on the comment.
// "Open" is the implicit starting state every comment is born into — it's
// not offered in the dropdown below since there's nothing useful about
// re-selecting the state you're already leaving.
export const STATUS_ORDER = ['assigned', 'reviewed', 'resolved'];

export const STATUS_META = {
  open: { label: 'Open', color: '#A8A29E' },
  assigned: { label: 'Assigned', color: '#3E7FB0' },
  reviewed: { label: 'Reviewed', color: '#8B6FB0' },
  resolved: { label: 'Resolved', color: '#4E9A5C' },
};

export function getStatus(comment) {
  return comment.status ?? (comment.resolved ? 'resolved' : 'open');
}

export function nextStatus(status) {
  const i = STATUS_ORDER.indexOf(status);
  return STATUS_ORDER[(i + 1) % STATUS_ORDER.length];
}

// A short audit line — who assigned it to whom, or who last reviewed/
// resolved it. null for a comment nobody's touched the status of yet.
export function getStatusNote(comment) {
  const status = getStatus(comment);
  if (status === 'assigned' && comment.assignee) {
    return comment.assignedBy && comment.assignedBy !== comment.assignee
      ? `Assigned to ${comment.assignee} by ${comment.assignedBy}`
      : `Assigned to ${comment.assignee}`;
  }
  if (comment.statusBy) {
    return `${STATUS_META[status].label} by ${comment.statusBy}`;
  }
  return null;
}
