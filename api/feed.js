// api/feed.js — live-data relay for AirportDisplay
//
// WHY THIS FILE EXISTS
//   The page used to read aircraft straight from airplanes.live. That free API was
//   closed to non-feeders in August 2026. The remaining free community feeds
//   (adsb.lol, adsb.fi) do not send CORS headers, so a browser refuses to hand
//   their answers to a web page. This relay asks them server-side, merges the two
//   answers, and returns one JSON document the page is allowed to read.
//
// WHERE IT RUNS
//   • Vercel (free Hobby plan): any file in /api becomes a function automatically.
//     Use the default Node.js runtime — NOT the Edge runtime. Both feeds refuse
//     requests that come from Cloudflare's network, which is also why a Cloudflare
//     Worker cannot do this job.
//   • Any machine with Node 18+: `node local-server.js` (see that file).
//
// ENDPOINTS (GET only)
//   /api/feed?lat=34.849&lon=-111.790&r=30   aircraft within r nautical miles
//   /api/feed?metar=KSEZ                      latest raw METAR (aviationweather.gov)
//   /api/feed?airport=KXYZ                    position / name / elevation of an airport
//   /api/feed?config=1                        optional page settings (the CARTO map key)
//
// No dependencies, and nothing to configure for the default setup. One optional
// environment variable: CARTO_KEY, a free key that restores CARTO's dark map tiles.

// The feeds ask every client to identify itself. adsb.lol answers 403 to generic
// User-Agents. If you fork this project, point this at YOUR repo or e-mail.
const USER_AGENT = 'AirportDisplay/2.0 (+https://github.com/morrisonbrett/AirportDisplay)';

// Pages allowed to use this relay from another host. A page served by the same
// host as the relay, a local file, and localhost are always allowed. This is a
// courtesy guard so other sites cannot spend your quota — it is not security.
// Add hosts here, or set the ALLOWED_HOSTS environment variable (comma-separated).
const ALLOWED_HOSTS = ['morrisonbrett.github.io']
  .concat(String(process.env.ALLOWED_HOSTS || '').split(','))
  .map(h => h.trim().toLowerCase())
  .filter(Boolean);

const FEEDS = [
  {
    name: 'adsb.lol',
    home: 'https://adsb.lol',
    url: (lat, lon, r) => `https://api.adsb.lol/v2/point/${lat}/${lon}/${r}`,
  },
  {
    name: 'adsb.fi',
    home: 'https://adsb.fi',
    url: (lat, lon, r) => `https://opendata.adsb.fi/api/v3/lat/${lat}/lon/${lon}/dist/${r}`,
  },
];

const FEED_TIMEOUT_MS = 6000;   // per feed; both are asked at the same time
const MAX_RADIUS_NM   = 250;    // both feeds cap the radius at 250 nm
const FEED_CACHE_S    = 10;     // CDN answers repeat requests for this long (many screens → one upstream call)
const METAR_CACHE_S   = 180;
const AIRPORT_CACHE_S = 86400;

// Only the fields the page uses travel onward — keeps the answer small.
const KEEP = [
  'hex', 'type', 'flight', 'r', 't', 'desc', 'ownOp',
  'alt_baro', 'alt_geom', 'gs', 'track', 'true_heading', 'mag_heading',
  'baro_rate', 'geom_rate', 'squawk', 'category', 'lat', 'lon', 'seen', 'seen_pos',
];

// A feed that says "slow down" (429) or "no" (403) is left alone for a while.
// adsb.fi counts refused requests toward a temporary ban, so hammering makes it worse.
// Module scope survives between requests while the function instance stays warm.
const cooldown = new Map();   // feed name → { until: epoch ms, status }

const isNum = v => typeof v === 'number' && Number.isFinite(v);

function reply(res, status, body, cacheControl) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cacheControl || 'no-store');
  res.end(JSON.stringify(body));
}

function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin || origin === 'null') return true;          // same-origin page, local file, curl
  let host;
  try { host = new URL(origin).host.toLowerCase(); } catch (e) { return false; }
  const self = String(req.headers['x-forwarded-host'] || req.headers.host || '').toLowerCase();
  if (host === self) return true;                         // page served by this same host
  const name = host.replace(/:\d+$/, '');
  if (name === 'localhost' || name === '127.0.0.1' || name === '[::1]') return true;
  return ALLOWED_HOSTS.includes(name);
}

async function upstream(url) {
  return fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
    signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
  });
}

// Ask one feed. Never throws: always resolves to a report, with `ac` on success.
async function askFeed(feed, lat, lon, r) {
  const started = Date.now();
  const report = { name: feed.name, home: feed.home, ok: false, status: 0, count: 0, ms: 0 };

  const hold = cooldown.get(feed.name);
  if (hold && hold.until > started) {
    report.status = hold.status;
    report.note = `backing off for ${Math.ceil((hold.until - started) / 1000)}s after HTTP ${hold.status}`;
    return report;
  }

  try {
    const resp = await upstream(feed.url(lat, lon, r));
    report.status = resp.status;
    if (!resp.ok) {
      if (resp.status === 429) {
        const ra = parseInt(resp.headers.get('retry-after') || '', 10);
        const wait = Math.min(300, Math.max(15, Number.isFinite(ra) ? ra : 60));
        cooldown.set(feed.name, { until: started + wait * 1000, status: 429 });
      } else if (resp.status === 401 || resp.status === 403) {
        cooldown.set(feed.name, { until: started + 300000, status: resp.status });
      }
      // A refusing feed usually explains itself in the body (rate limit, missing contact info…)
      try { report.note = (await resp.text()).replace(/\s+/g, ' ').trim().slice(0, 160); } catch (e) { /* no body */ }
      return report;
    }
    const body = await resp.json();
    const list = Array.isArray(body && body.ac) ? body.ac
               : Array.isArray(body && body.aircraft) ? body.aircraft
               : null;
    if (!list) { report.status = 'bad-data'; report.note = 'answer had no aircraft list'; return report; }
    cooldown.delete(feed.name);
    report.ok = true;
    report.count = list.length;
    report.ac = list;
  } catch (e) {
    const name = e && e.name;
    report.status = (name === 'TimeoutError' || name === 'AbortError') ? 'timeout'
                  : name === 'SyntaxError' ? 'bad-data'      // answered, but not with JSON
                  : 'network';
    report.note = String((e && e.message) || e).slice(0, 160);
  } finally {
    report.ms = Date.now() - started;
  }
  return report;
}

const hasPos = a => isNum(a.lat) && isNum(a.lon);

// True when `a` should win over `b` as the record for one aircraft.
function fresher(a, b) {
  if (hasPos(a) !== hasPos(b)) return hasPos(a);
  const sa = isNum(a.seen_pos) ? a.seen_pos : (isNum(a.seen) ? a.seen : 1e9);
  const sb = isNum(b.seen_pos) ? b.seen_pos : (isNum(b.seen) ? b.seen : 1e9);
  return sa < sb;
}

// One record per aircraft: the freshest position wins, and anything it lacks
// (registration, type, callsign…) is filled in from the other feed.
function mergeFeeds(lists) {
  const byHex = new Map();
  for (const list of lists) {
    for (const a of list) {
      if (!a || typeof a !== 'object') continue;
      const hex = typeof a.hex === 'string' ? a.hex.trim().toLowerCase() : '';
      if (!/^~?[0-9a-f]{6}$/.test(hex)) continue;
      const prev = byHex.get(hex);
      if (!prev) { byHex.set(hex, a); continue; }
      const best = fresher(a, prev) ? a : prev;
      const other = best === a ? prev : a;
      const merged = { ...best };
      for (const k of KEEP) {
        if ((merged[k] == null || merged[k] === '') && other[k] != null && other[k] !== '') merged[k] = other[k];
      }
      byHex.set(hex, merged);
    }
  }
  const out = [];
  for (const [hex, a] of byHex) {
    const slim = { hex };
    for (const k of KEEP) if (k !== 'hex' && a[k] != null && a[k] !== '') slim[k] = a[k];
    out.push(slim);
  }
  return out;
}

async function handleAircraft(res, q) {
  const latS = (q.get('lat') || '').trim();
  const lonS = (q.get('lon') || '').trim();
  const lat = Number(latS);
  const lon = Number(lonS);
  const rad = Number(q.get('r') || q.get('radius') || 30);
  if (!latS || !lonS ||                                    // Number('') is 0 — an empty value is not the equator
      !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return reply(res, 400, { error: 'lat and lon are required, e.g. /api/feed?lat=34.849&lon=-111.790&r=30' });
  }
  if (!Number.isFinite(rad) || rad <= 0) return reply(res, 400, { error: 'r must be a radius in nautical miles' });

  // Rounded so near-identical requests share one cache entry; the radius must be an integer for adsb.lol.
  const la = lat.toFixed(3), lo = lon.toFixed(3);
  const r  = Math.min(MAX_RADIUS_NM, Math.max(1, Math.round(rad)));

  const reports = await Promise.all(FEEDS.map(f => askFeed(f, la, lo, r)));
  const good    = reports.filter(x => x.ok);
  const sources = reports.map(({ ac, ...rest }) => rest);

  if (!good.length) {
    const limited = reports.every(x => x.status === 429);
    return reply(res, limited ? 503 : 502, { error: 'no aircraft feed answered', sources });
  }

  const ac = mergeFeeds(good.map(x => x.ac));
  return reply(res, 200, { now: Date.now(), total: ac.length, ac, sources },
    `public, max-age=0, s-maxage=${FEED_CACHE_S}`);
}

async function awc(path) {
  const resp = await upstream('https://aviationweather.gov/api/data/' + path);
  if (resp.status === 204) return [];                      // "no data" is a valid answer
  if (!resp.ok) throw new Error(`aviationweather.gov HTTP ${resp.status}`);
  const text = await resp.text();
  if (!text.trim()) return [];
  const data = JSON.parse(text);
  return Array.isArray(data) ? data : [];
}

async function handleMetar(res, icao) {
  try {
    const rows = await awc(`metar?ids=${icao}&format=json`);
    const row  = rows.find(x => x && typeof x.rawOb === 'string' && x.rawOb.trim());
    const raw  = row ? row.rawOb.trim().replace(/^(METAR|SPECI)\s+/, '') : null;
    return reply(res, 200, { icao, raw, source: 'aviationweather.gov' },
      `public, max-age=0, s-maxage=${METAR_CACHE_S}`);
  } catch (e) {
    return reply(res, 502, { error: 'weather source did not answer', detail: String(e.message || e).slice(0, 160) });
  }
}

async function handleAirport(res, icao) {
  try {
    const rows = await awc(`airport?ids=${icao}&format=json`);
    const a = rows.find(x => x && Number.isFinite(Number(x.lat)) && Number.isFinite(Number(x.lon)) && x.lat !== null && x.lon !== null);
    if (!a) return reply(res, 404, { error: `airport ${icao} not found` }, 'public, max-age=0, s-maxage=3600');
    const elevM = Number(a.elev);                          // aviationweather.gov reports elevation in METRES
    return reply(res, 200, {
      icao,
      name: typeof a.name === 'string' && a.name.trim() ? a.name.trim() : icao,
      lat: Number(a.lat),
      lon: Number(a.lon),
      elev_ft: (a.elev != null && Number.isFinite(elevM)) ? Math.round(elevM * 3.28084) : null,
      source: 'aviationweather.gov',
    }, `public, max-age=0, s-maxage=${AIRPORT_CACHE_S}`);
  } catch (e) {
    return reply(res, 502, { error: 'airport source did not answer', detail: String(e.message || e).slice(0, 160) });
  }
}

export default async function handler(req, res) {
  // Every answer — errors included — is readable by the page, so it can show what went wrong.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method !== 'GET') return reply(res, 405, { error: 'GET only' });
  if (!originAllowed(req)) {
    return reply(res, 403, {
      error: 'origin not allowed',
      origin: String(req.headers.origin).slice(0, 120),
      fix: 'add this host to ALLOWED_HOSTS in api/feed.js',
    });
  }

  try {
    const q = new URL(req.url || '/', 'http://relay.local').searchParams;
    const code = v => { const s = String(v || '').trim().toUpperCase(); return /^[A-Z0-9]{3,4}$/.test(s) ? s : null; };

    if (q.has('config')) {
      // Settings the page needs but that should not live in the public repo.
      // CARTO_KEY: the free key for CARTO's dark map tiles (https://carto.com/basemaps/apikey).
      // It ends up in tile URLs in the browser anyway, so it is not a secret — keeping it in
      // the environment just means forks and file updates never carry or erase your key.
      const key = String(process.env.CARTO_KEY || '').trim();
      return reply(res, 200, { cartoKey: /^[\w.\-]{8,200}$/.test(key) ? key : null });   // asked once per page load; not cached
    }
    if (q.has('metar')) {
      const icao = code(q.get('metar'));
      return icao ? await handleMetar(res, icao) : reply(res, 400, { error: 'metar must be a 3–4 character station code' });
    }
    if (q.has('airport')) {
      const icao = code(q.get('airport'));
      return icao ? await handleAirport(res, icao) : reply(res, 400, { error: 'airport must be a 3–4 character code' });
    }
    return await handleAircraft(res, q);
  } catch (e) {
    return reply(res, 500, { error: 'relay error', detail: String((e && e.message) || e).slice(0, 160) });
  }
}
