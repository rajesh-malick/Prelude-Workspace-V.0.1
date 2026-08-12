// A comment's lifecycle: raised, picked up, looked at, done — and back
// again, since a comment can always be reopened (a wrong resolve, or new
// info surfacing on something already reviewed). Legacy/seed comments only
// ever had `resolved: boolean` — getStatus() treats that as the source of
// truth until a real `status` is set on the comment.
export const STATUS_ORDER = ['open', 'assigned', 'reviewed', 'resolved'];

export const STATUS_META = {
  // Darker than the other neutrals on purpose — this is the default status
  // every comment starts in, so it's also the most commonly displayed one,
  // and the original pale grey (#A8A29E) read as barely-there against the
  // app's light glass-surface backgrounds.
  open: { label: 'Open', color: '#57534E' },
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
