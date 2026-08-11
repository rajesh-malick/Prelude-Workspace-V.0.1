import bcrypt from 'bcryptjs';
import { sql } from '../_lib/db.js';
import { setSessionCookie } from '../_lib/session.js';

const ALLOWED_DOMAIN = 'zuper.co';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // `req.body` is a lazily-parsing getter — malformed JSON throws the
  // moment it's touched, outside any surrounding try/catch, which locally
  // takes the whole dev server down with it. Parsing it defensively here
  // keeps a bad request a 400, not a crash.
  let parsedBody;
  try {
    parsedBody = req.body ?? {};
  } catch {
    return res.status(400).json({ error: 'Malformed request body.' });
  }

  const { name, email, password, confirmPassword } = parsedBody;
  const trimmedName = (name ?? '').trim();
  const trimmedEmail = (email ?? '').trim().toLowerCase();

  if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
    return res.status(400).json({ error: 'Name, email, password, and confirm password are all required.' });
  }
  if (!trimmedEmail.endsWith(`@${ALLOWED_DOMAIN}`)) {
    return res.status(400).json({ error: `Only @${ALLOWED_DOMAIN} email addresses can create an account.` });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  try {
    const existing = await sql`SELECT id FROM users WHERE email = ${trimmedEmail}`;
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists — try signing in instead.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const rows = await sql`
      INSERT INTO users (name, email, password_hash)
      VALUES (${trimmedName}, ${trimmedEmail}, ${passwordHash})
      RETURNING name, email
    `;
    const user = rows[0];
    setSessionCookie(res, user);
    return res.status(201).json({ user, isNewUser: true });
  } catch (err) {
    console.error('signup error', err);
    return res.status(500).json({ error: 'Something went wrong creating your account. Try again.' });
  }
}
