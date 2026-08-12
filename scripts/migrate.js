// One-time (and safe to re-run) schema setup. Usage:
//   node --env-file=.env.local scripts/migrate.js
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  // One JSON document per account holding their whole projects/versions/
  // comments tree — same shape the app already worked with when it lived
  // in localStorage, just persisted server-side now so it's tied to the
  // account rather than one browser.
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS projects_data JSONB NOT NULL DEFAULT '[]'::jsonb
  `;
  // Who this account has granted access to their territory, and at what
  // level — [{ email, permission: 'view' | 'edit' }, ...]. Lives on the
  // OWNER's row (it's their grant to give), and gets scanned across all
  // rows by /api/territories to answer "whose territory can I see".
  // (Currently unused — this is an internal tool where everyone already
  // has access to everyone, see api/territories.js — but left in place
  // rather than dropped, in case per-person permissions come back.)
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS access_grants JSONB NOT NULL DEFAULT '[]'::jsonb
  `;
  // Real, persisted notifications delivered TO this account — e.g. "so-and-so
  // visited your territory" — capped and trimmed server-side on insert (see
  // api/notifications.js), not an unbounded log.
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications JSONB NOT NULL DEFAULT '[]'::jsonb
  `;
  console.log('Migration complete: users table (with projects_data, access_grants, notifications) is ready.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
