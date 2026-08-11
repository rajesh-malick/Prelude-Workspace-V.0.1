import bcrypt from 'bcryptjs';
import { sql } from '../_lib/db.js';
import { setSessionCookie } from '../_lib/session.js';

const ALLOWED_DOMAIN = 'zuper.co';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // See signup.js — req.body throws synchronously on malformed JSON, which
  // would otherwise bypass this handler's own try/catch entirely.
  let parsedBody;
  try {
    parsedBody = req.body ?? {};
  } catch {
    return res.status(400).json({ error: 'Malformed request body.' });
  }

  const { email, password } = parsedBody;
  const trimmedEmail = (email ?? '').trim().toLowerCase();

  if (!trimmedEmail || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  if (!trimmedEmail.endsWith(`@${ALLOWED_DOMAIN}`)) {
    return res.status(400).json({ error: `Only @${ALLOWED_DOMAIN} email addresses can sign in.` });
  }

  try {
    const rows = await sql`SELECT name, email, password_hash FROM users WHERE email = ${trimmedEmail}`;
    const user = rows[0];
    // Same generic message for "no account" and "wrong password" — telling
    // an attacker which one is true would confirm whether an email is
    // registered at all.
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    setSessionCookie(res, user);
    return res.status(200).json({ user: { name: user.name, email: user.email }, isNewUser: false });
  } catch (err) {
    console.error('signin error', err);
    return res.status(500).json({ error: 'Something went wrong signing you in. Try again.' });
  }
}
