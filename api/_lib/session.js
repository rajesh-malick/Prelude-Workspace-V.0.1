import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'prelude_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('SESSION_SECRET is not set');
  return s;
}

// `Secure` cookies are dropped by browsers over plain http — `vercel dev`
// serves localhost over http, so this only adds it once actually deployed.
function isSecureContext() {
  return process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview';
}

export function setSessionCookie(res, user) {
  const token = jwt.sign({ name: user.name, email: user.email }, secret(), { expiresIn: `${MAX_AGE_SECONDS}s` });
  const attrs = [`${COOKIE_NAME}=${token}`, 'HttpOnly', 'SameSite=Lax', 'Path=/', `Max-Age=${MAX_AGE_SECONDS}`];
  if (isSecureContext()) attrs.push('Secure');
  res.setHeader('Set-Cookie', attrs.join('; '));
}

export function clearSessionCookie(res) {
  const attrs = [`${COOKIE_NAME}=`, 'HttpOnly', 'SameSite=Lax', 'Path=/', 'Max-Age=0'];
  if (isSecureContext()) attrs.push('Secure');
  res.setHeader('Set-Cookie', attrs.join('; '));
}

function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((part) => {
      const idx = part.indexOf('=');
      return [part.slice(0, idx).trim(), decodeURIComponent(part.slice(idx + 1).trim())];
    })
  );
}

export function getSessionUser(req) {
  const token = parseCookies(req)[COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, secret());
    return { name: payload.name, email: payload.email };
  } catch {
    return null;
  }
}
