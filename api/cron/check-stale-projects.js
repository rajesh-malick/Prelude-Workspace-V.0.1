import { sql } from '../_lib/db.js';

const WITHER_AFTER_DAYS = 14;
const RENOTIFY_AFTER_DAYS = 7; // don't nag about the same project more than once a week
const MAX_NOTIFICATIONS = 30; // matches api/notifications.js's cap

function daysSince(iso) {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

// Same threshold as src/utils/staleness.js on the client — duplicated
// rather than shared-imported since this runs as a standalone serverless
// function, not bundled with the frontend build.
function findStaleProjects(projects) {
  return (projects ?? []).filter((p) => {
    const latest = p.versions?.[p.versions.length - 1];
    return latest?.createdAtISO && daysSince(latest.createdAtISO) >= WITHER_AFTER_DAYS;
  });
}

function alreadyNudgedRecently(notifications, projectName) {
  return (notifications ?? []).some(
    (n) => n.kind === 'stale-project' && n.projectName === projectName && daysSince(n.createdAt) < RENOTIFY_AFTER_DAYS
  );
}

// Runs daily via Vercel Cron (see vercel.json). A purely client-side
// staleness check can only ever fire once someone's already back in the
// app — which defeats the point of nudging someone who *isn't* showing
// up. This scans every account server-side and writes a real notification
// for any project that's gone stale, at most once a week per project so
// it doesn't nag daily forever about the same one. Delivered through the
// same notifications pipeline (and the existing chime/live-polling on the
// client) as any other notification — no separate delivery path needed.
export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const users = await sql`SELECT email, projects_data, notifications FROM users`;
    let nudged = 0;

    for (const user of users) {
      const stale = findStaleProjects(user.projects_data);
      if (stale.length === 0) continue;

      const existing = user.notifications ?? [];
      const newOnes = stale
        .filter((p) => !alreadyNudgedRecently(existing, p.name))
        .map((p) => ({
          id: `n-stale-${p.id}-${Date.now()}`,
          kind: 'stale-project',
          projectName: p.name,
          text: `"${p.name}" hasn't grown a new version in a while — might be worth a visit.`,
          createdAt: new Date().toISOString(),
        }));
      if (newOnes.length === 0) continue;

      const merged = [...newOnes, ...existing].slice(0, MAX_NOTIFICATIONS);
      await sql`UPDATE users SET notifications = ${JSON.stringify(merged)}::jsonb WHERE email = ${user.email}`;
      nudged += newOnes.length;
    }

    return res.status(200).json({ ok: true, nudged });
  } catch (err) {
    console.error('cron/check-stale-projects error', err);
    return res.status(500).json({ error: 'Failed to check stale projects.' });
  }
}
