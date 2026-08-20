import { getSessionUser } from './_lib/session.js';

// WMO weather codes (used by Open-Meteo, and the standard the aviation/met
// world shares) collapsed down to the handful of moods the Grove sky
// actually renders differently. Anything not listed here (rare/unused
// codes) falls back to 'clear' rather than erroring.
const CODE_TO_CATEGORY = {
  0: 'clear',
  1: 'clear',
  2: 'overcast',
  3: 'overcast',
  45: 'haze',
  48: 'haze',
  51: 'rain',
  53: 'rain',
  55: 'rain',
  56: 'rain',
  57: 'rain',
  61: 'rain',
  63: 'rain',
  65: 'rain',
  66: 'rain',
  67: 'rain',
  71: 'snow',
  73: 'snow',
  75: 'snow',
  77: 'snow',
  80: 'rain',
  81: 'rain',
  82: 'rain',
  85: 'snow',
  86: 'snow',
  95: 'rain',
  96: 'rain',
  99: 'rain',
};

// A free, keyless weather provider (Open-Meteo) — no API key to set up or
// leak, which matters here since this is an internal tool with no ops
// budget for managing third-party credentials. Geocode the city name
// first (Open-Meteo's forecast endpoint only takes lat/lon), then ask for
// current conditions at that point.
export default async function handler(req, res) {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Not signed in.' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
  if (!city) return res.status(400).json({ error: 'No city set.' });

  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(city)}`
    );
    if (!geoRes.ok) throw new Error(`geocoding ${geoRes.status}`);
    const geoData = await geoRes.json();
    const place = geoData.results?.[0];
    if (!place) return res.status(404).json({ error: `Couldn't find "${city}".` });

    const forecastRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=weather_code`
    );
    if (!forecastRes.ok) throw new Error(`forecast ${forecastRes.status}`);
    const forecastData = await forecastRes.json();
    const code = forecastData.current?.weather_code;

    return res.status(200).json({
      category: CODE_TO_CATEGORY[code] ?? 'clear',
      resolvedCity: [place.name, place.admin1, place.country].filter(Boolean).join(', '),
    });
  } catch (err) {
    console.error('GET /api/weather error', err);
    return res.status(502).json({ error: 'Could not reach the weather service.' });
  }
}
