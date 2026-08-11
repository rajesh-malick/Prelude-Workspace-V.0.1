import { neon } from '@neondatabase/serverless';

// One tagged-template query client, reused by every API route. Neon's
// serverless driver is HTTP-based — no connection pooling to manage, safe
// to call fresh per invocation the way serverless functions work.
export const sql = neon(process.env.DATABASE_URL);
