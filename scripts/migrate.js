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
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS access_grants JSONB NOT NULL DEFAULT '[]'::jsonb
  `;
  console.log('Migration complete: users table (with projects_data, access_grants) is ready.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
