import { sql } from './_lib/db.js';
import { getSessionUser } from './_lib/session.js';

// Every other account at the company — this is an internal tool, so
// there's no invite/grant step: anyone with a real @zuper.co account can
// already view and edit anyone else's territory (see api/projects.js's
// `?as=` handling). This is just the directory to pick a name from.
export default async function handler(req, res) {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Not signed in.' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // jsonb_array_length errors on NULL, hence the COALESCE — a
    // brand-new account with no projects yet has projects_data = NULL,
    // not an empty array.
    const rows = await sql`
      SELECT name, email, COALESCE(jsonb_array_length(projects_data), 0) AS project_count
      FROM users WHERE email != ${user.email} ORDER BY name
    `;
    return res.status(200).json({
      territories: rows.map((r) => ({ ownerName: r.name, ownerEmail: r.email, projectCount: Number(r.project_count) })),
    });
  } catch (err) {
    console.error('GET /api/territories error', err);
    return res.status(500).json({ error: 'Could not load teammates.' });
  }
}
