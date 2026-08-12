import { sql } from './_lib/db.js';
import { getSessionUser } from './_lib/session.js';

const ALLOWED_DOMAIN = 'zuper.co';
const MAX_NOTIFICATIONS = 30;

// Real, persisted notifications — e.g. "so-and-so visited your territory" —
// delivered TO a specific account rather than only ever shown to whoever
// triggered them. Not real-time (no push/websocket); the recipient sees
// them next time they load the app or open the Activity panel.
export default async function handler(req, res) {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Not signed in.' });

  if (req.method === 'GET') {
    try {
      const rows = await sql`SELECT notifications FROM users WHERE email = ${user.email}`;
      if (rows.length === 0) {
        return res.status(401).json({ error: 'Your session refers to an account that no longer exists. Please sign in again.' });
      }
      return res.status(200).json({ notifications: rows[0].notifications ?? [] });
    } catch (err) {
      console.error('GET /api/notifications error', err);
      return res.status(500).json({ error: 'Could not load notifications.' });
    }
  }

  if (req.method === 'POST') {
    let body;
    try {
      body = req.body ?? {};
    } catch {
      return res.status(400).json({ error: 'Malformed request body.' });
    }
    const toEmail = (body.toEmail ?? '').trim().toLowerCase();
    const text = (body.text ?? '').trim();
    if (!toEmail || !text) {
      return res.status(400).json({ error: 'A recipient and text are required.' });
    }
    if (!toEmail.endsWith(`@${ALLOWED_DOMAIN}`)) {
      return res.status(400).json({ error: `Only @${ALLOWED_DOMAIN} accounts can receive notifications.` });
    }
    try {
      const rows = await sql`SELECT notifications FROM users WHERE email = ${toEmail}`;
      if (rows.length === 0) {
        return res.status(404).json({ error: 'That account does not exist.' });
      }
      const notification = {
        id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text,
        fromEmail: user.email,
        fromName: user.name,
        createdAt: new Date().toISOString(),
      };
      // Newest first, capped — this is a lightweight activity ping, not an
      // unbounded audit log.
      const notifications = [notification, ...(rows[0].notifications ?? [])].slice(0, MAX_NOTIFICATIONS);
      await sql`UPDATE users SET notifications = ${JSON.stringify(notifications)}::jsonb WHERE email = ${toEmail}`;
      return res.status(201).json({ ok: true });
    } catch (err) {
      console.error('POST /api/notifications error', err);
      return res.status(500).json({ error: 'Could not send that notification.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
