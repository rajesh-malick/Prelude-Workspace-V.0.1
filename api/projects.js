import { sql } from './_lib/db.js';
import { getSessionUser } from './_lib/session.js';

// One JSON document per account — the whole projects/versions/comments
// tree, read and overwritten as a unit. Every mutation in the app (create
// project, add comment, cycle status, archive, delete...) already just
// calls setProjects(...) client-side; this endpoint is what turns that
// into real, account-scoped persistence instead of a localStorage write.
export default async function handler(req, res) {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Not signed in.' });

  if (req.method === 'GET') {
    try {
      const rows = await sql`SELECT projects_data FROM users WHERE email = ${user.email}`;
      // The JWT session cookie is only a signature check — it never
      // re-verifies the account it names still exists. If the row is
      // gone (account deleted after the cookie was issued), say so
      // explicitly rather than quietly handing back an empty project
      // list that looks identical to "this account genuinely has none".
      if (rows.length === 0) {
        return res.status(401).json({ error: 'Your session refers to an account that no longer exists. Please sign in again.' });
      }
      return res.status(200).json({ projects: rows[0].projects_data ?? [] });
    } catch (err) {
      console.error('GET /api/projects error', err);
      return res.status(500).json({ error: 'Could not load your projects.' });
    }
  }

  if (req.method === 'PUT') {
    let body;
    try {
      body = req.body ?? {};
    } catch {
      return res.status(400).json({ error: 'Malformed request body.' });
    }
    if (!Array.isArray(body.projects)) {
      return res.status(400).json({ error: '`projects` must be an array.' });
    }
    try {
      // Same stale-session concern as GET, but worse if unchecked here —
      // an UPDATE whose WHERE clause matches zero rows still succeeds
      // with no error, so without RETURNING + a length check this would
      // report {ok:true} while silently writing nothing at all.
      const rows = await sql`
        UPDATE users
        SET projects_data = ${JSON.stringify(body.projects)}::jsonb
        WHERE email = ${user.email}
        RETURNING id
      `;
      if (rows.length === 0) {
        return res.status(401).json({ error: 'Your session refers to an account that no longer exists. Please sign in again.' });
      }
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('PUT /api/projects error', err);
      return res.status(500).json({ error: 'Could not save your projects.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
