import { getSessionUser } from '../_lib/session.js';

export default async function handler(req, res) {
  const user = getSessionUser(req);
  return res.status(200).json({ user });
}
