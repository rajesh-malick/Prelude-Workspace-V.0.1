import { getSessionUser } from './_lib/session.js';

// WMO weather codes (used by Open-Meteo, and the standard the aviation/met
// world shares), grouped into the moods the Grove sky actually renders
// differently. No code here means "tornado" or "hurricane" — those are
// large-scale storm systems, not something a point-in-time current-
// conditions reading captures, so there's nothing to map them from even if
// the Grove had a visual for them.
const THUNDER_CODES = new Set([95, 96, 99]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82]);
const FOG_CODES = new Set([45, 48]);
const OVERCAST_CODES = new Set([2, 3]);

// Open-Meteo's weather_code alone has no concept of "windy" or "blizzard"
// — those need actual wind speed, which is a separate field. Fresh-breeze-
// and-up (~32 km/h, roughly Beaufort 5) is where it starts visually reading
// as windy rather than just a bit breezy.
const WINDY_THRESHOLD_KMH = 32;

function resolveCategory(code, windKmh) {
  if (THUNDER_CODES.has(code)) return 'thunderstorm';
  if (SNOW_CODES.has(code)) return windKmh >= WINDY_THRESHOLD_KMH ? 'blizzard' : 'snow';
  if (RAIN_CODES.has(code)) return 'rain';
  if (FOG_CODES.has(code)) return 'fog';
  if (windKmh >= WINDY_THRESHOLD_KMH) return 'windy';
  if (OVERCAST_CODES.has(code)) return 'overcast';
  return 'clear';
}

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
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=weather_code,wind_speed_10m&wind_speed_unit=kmh`
    );
    if (!forecastRes.ok) throw new Error(`forecast ${forecastRes.status}`);
    const forecastData = await forecastRes.json();
    const code = forecastData.current?.weather_code;
    const windKmh = forecastData.current?.wind_speed_10m ?? 0;

    return res.status(200).json({
      category: resolveCategory(code, windKmh),
      resolvedCity: [place.name, place.admin1, place.country].filter(Boolean).join(', '),
    });
  } catch (err) {
    console.error('GET /api/weather error', err);
    return res.status(502).json({ error: 'Could not reach the weather service.' });
  }
}
