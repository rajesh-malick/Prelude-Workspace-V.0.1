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
    // Just the project names, not the full projects_data (which carries
    // every version/comment/reply too) — enough for the Village view to
    // label a small tree per project without shipping everyone's entire
    // Grove contents into the directory endpoint. jsonb_array_elements
    // errors on NULL, hence the inner COALESCE — a brand-new account has
    // projects_data = NULL, not an empty array; the outer COALESCE covers
    // jsonb_agg itself returning NULL when there are zero rows to aggregate.
    const rows = await sql`
      SELECT u.name, u.email,
        COALESCE(
          (SELECT jsonb_agg(p->>'name') FROM jsonb_array_elements(COALESCE(u.projects_data, '[]'::jsonb)) p),
          '[]'::jsonb
        ) AS project_names
      FROM users u WHERE u.email != ${user.email} ORDER BY u.name
    `;
    return res.status(200).json({
      territories: rows.map((r) => ({ ownerName: r.name, ownerEmail: r.email, projectNames: r.project_names ?? [] })),
    });
  } catch (err) {
    console.error('GET /api/territories error', err);
    return res.status(500).json({ error: 'Could not load teammates.' });
  }
}
