import { sql } from './_lib/db.js';
import { getSessionUser, setSessionCookie } from './_lib/session.js';

// A data URL, not a real upload service — same tradeoff already made for
// version assets elsewhere in this app. Fine for a small avatar photo,
// not meant to hold anything large.
const MAX_AVATAR_BYTES = 900_000;

export default async function handler(req, res) {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Not signed in.' });

  if (req.method === 'GET') {
    try {
      const rows = await sql`SELECT name, bio, avatar_url, village_color FROM users WHERE email = ${user.email}`;
      if (rows.length === 0) {
        return res.status(401).json({ error: 'Your session refers to an account that no longer exists. Please sign in again.' });
      }
      const row = rows[0];
      return res.status(200).json({
        name: row.name,
        bio: row.bio ?? '',
        avatarUrl: row.avatar_url,
        villageColor: row.village_color,
      });
    } catch (err) {
      console.error('GET /api/profile error', err);
      return res.status(500).json({ error: 'Could not load your profile.' });
    }
  }

  if (req.method === 'PUT') {
    let body;
    try {
      body = req.body ?? {};
    } catch {
      return res.status(400).json({ error: 'Malformed request body.' });
    }
    const name = typeof body.name === 'string' ? body.name.trim() : undefined;
    const bio = typeof body.bio === 'string' ? body.bio.trim().slice(0, 280) : undefined;
    const avatarUrl = typeof body.avatarUrl === 'string' ? body.avatarUrl : undefined;
    const villageColor = typeof body.villageColor === 'string' ? body.villageColor : undefined;

    if (name !== undefined && !name) {
      return res.status(400).json({ error: 'Name cannot be empty.' });
    }
    if (avatarUrl && avatarUrl.length > MAX_AVATAR_BYTES) {
      return res.status(400).json({ error: 'That image is too large — try a smaller photo.' });
    }

    try {
      const rows = await sql`
        UPDATE users
        SET
          name = COALESCE(${name ?? null}, name),
          bio = COALESCE(${bio ?? null}, bio),
          avatar_url = CASE WHEN ${avatarUrl !== undefined} THEN ${avatarUrl ?? null} ELSE avatar_url END,
          village_color = CASE WHEN ${villageColor !== undefined} THEN ${villageColor ?? null} ELSE village_color END
        WHERE email = ${user.email}
        RETURNING name, bio, avatar_url, village_color
      `;
      if (rows.length === 0) {
        return res.status(401).json({ error: 'Your session refers to an account that no longer exists. Please sign in again.' });
      }
      const row = rows[0];
      // The session cookie carries `name` — if it changed, re-issue it so
      // the rest of the app (which reads the name from the session, not
      // a fresh fetch) sees the update without needing to sign in again.
      if (name !== undefined) setSessionCookie(res, { name: row.name, email: user.email });
      return res.status(200).json({
        name: row.name,
        bio: row.bio ?? '',
        avatarUrl: row.avatar_url,
        villageColor: row.village_color,
      });
    } catch (err) {
      console.error('PUT /api/profile error', err);
      return res.status(500).json({ error: 'Could not save your profile.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
