# 🛫 Airport Display

A **gorgeous, real-time airport activity dashboard** built for big TVs, big screens, and big windows. Drop in any ICAO code and instantly see every aircraft in the area — what they're flying, where they came from, where they're going, and what they're doing right now.

Designed to live on a wall-mounted TV with a Fire TV stick. Looks great in landscape on desktop, holds its own in portrait on mobile.

![License](https://img.shields.io/badge/license-MIT-00c8f0?style=flat-square)
![Status](https://img.shields.io/badge/status-live-00e87a?style=flat-square)
![Hosted on](https://img.shields.io/badge/hosted-GitHub_Pages-9060f0?style=flat-square)
![Single file](https://img.shields.io/badge/single_HTML_file-no_build-f0a000?style=flat-square)

---

## ✨ What It Does

🛬 **Live aircraft tracking** — every plane within a configurable radius (default 30 nm), updating every 30 seconds via [airplanes.live](https://airplanes.live)

🌤️ **Live METAR weather** — wind, visibility, sky conditions, temperature, altimeter, and flight rules color-coded for VFR / MVFR / IFR / LIFR

🧭 **Smart flight phase detection** — fuzzy-logic algorithm inspired by [Junzi Sun's TU Delft research](https://github.com/junzis/flight-data-processor) classifies each aircraft as `ARRIVING`, `DEPARTING`, `PATTERN`, `OVERFLY`, `TAXIING`, or `GROUND`

🗺️ **Live radar map** with rotating sweep, distance rings (5/10/20 nm), aircraft headed-arrow icons, and **color-coded flight trails** showing each aircraft's recent path

✈️ **Route enrichment** — pulls origin and destination airports from [adsbdb.com](https://adsbdb.com) for filed flights, and infers routes from observed behavior for GA aircraft (e.g., a plane we watched depart shows `KSEZ → ?`)

🔔 **Audio chimes** — pleasant Web Audio tones when aircraft transition into ARRIVING or PATTERN status

📺 **Keep-awake mode** — opt-in canvas-stream video keeps the browser/TV from sleeping, with no audio interference

🕒 **Dual clocks** — local airport time (with auto-detected timezone) and Zulu (UTC), monospaced and stable

📱 **Mobile-friendly** — full responsive layout for phones in portrait, with the map hidden and the flight table optimized for small screens

---

## 🎨 Design

The aesthetic is meant to evoke a real radar console — deep navy-black background, phosphor cyan accents, color-coded status badges, scanline overlay, edge vignette, and a slowly rotating radar sweep on the map.

| Status      | Color    | Meaning                                          |
| ----------- | -------- | ------------------------------------------------ |
| 🟢 `ARRIVING`  | Green    | Descending toward the airport on glide-slope     |
| 🟠 `DEPARTING` | Amber    | Climbing away from the airport                   |
| 🟣 `PATTERN`   | Purple   | Close, low, slow — flying the traffic pattern    |
| 🔵 `OVERFLY`   | Blue     | Just passing through                             |
| 🩵 `TAXIING`   | Cyan     | On the ground and moving                         |
| ⚪ `GROUND`    | Slate    | Parked / stationary                              |

**Typography:**
- **Orbitron** — ICAO codes and headlines (futuristic, fits the radar feel)
- **Share Tech Mono** — flight data, clocks (truly monospaced, stable)
- **Rajdhani** — UI labels, badges, secondary info

---

## 🚀 Quick Start

### Just want to use it?

Open the live deployment with any ICAO code:

```
https://morrisonbrett.github.io/AirportDisplay/?icao=KSEZ
```

Some examples:
- 🌵 [`KSEZ`](https://morrisonbrett.github.io/AirportDisplay/?icao=KSEZ) — Sedona Airport
- 🌴 [`KCMA`](https://morrisonbrett.github.io/AirportDisplay/?icao=KCMA) — Camarillo Airport
- 🏔️ [`KASE`](https://morrisonbrett.github.io/AirportDisplay/?icao=KASE) — Aspen
- 🌊 [`KSAN`](https://morrisonbrett.github.io/AirportDisplay/?icao=KSAN) — San Diego
- 🌆 [`KLAX`](https://morrisonbrett.github.io/AirportDisplay/?icao=KLAX) — Los Angeles

### URL Parameters

| Param    | Default | Description                                              |
| -------- | ------- | -------------------------------------------------------- |
| `icao`   | `KSEZ`  | 4-letter ICAO airport code                               |
| `radius` | `30`    | Search radius in nautical miles                          |
| `lat`    | —       | Override latitude (for airports not in the built-in DB)  |
| `lon`    | —       | Override longitude                                       |
| `name`   | —       | Override display name                                    |

Example with custom airport: `?icao=K9X9&lat=34.123&lon=-111.456&name=My+Custom+Field`

### Switch airports without editing the URL

There's an ICAO input in the top-right of the header. Type any 3–4 letter code and press **Enter** or tap **Go**. D-pad navigation works too, so you can change airports from a Fire TV remote.

---

## 📺 Run It on a TV

The display is built to live on a wall-mounted TV. Here are two ways to get it there:

### Option A — Silk Browser (easy)

Pre-installed on every Fire TV stick. Navigate to the URL, hit the **menu button (≡)** to hide the toolbar, and you've got a full-screen radar.

### Option B — Fully Kiosk Browser (best)

For a permanent dedicated input that survives reboots:

1. Enable **Apps from Unknown Sources** in Fire TV Developer Options
2. Sideload [Fully Kiosk Browser](https://www.fully-kiosk.com/) via the Downloader app
3. Set your URL as the start URL, enable kiosk mode + start-on-boot
4. Switch to that HDMI input on the TV with the remote — done

### Sleep prevention

If your TV/Fire TV keeps going to sleep, click the **📺 Keep Awake** button in the footer. This starts a tiny invisible muted video stream that signals active media playback to the browser, preventing the display from sleeping. No audio interference with the chime system.

---

## 🧠 How the Status Logic Works

Each aircraft maintains a 10-minute rolling history of position, altitude, speed, heading, and ground state. The algorithm:

1. **Records every sample** with timestamp, lat/lon, altitude, vertical rate, speed, heading, distance, and on-ground flag
2. **Smooths trends** via linear regression on a 90-second window — so banking turns and momentary noise don't flip the classification
3. **Computes fuzzy scores** (0–1) for each piece of evidence: descending, climbing, closing distance, on glide-slope, low AGL, close, heading toward/away
4. **Combines via weighted average** for each status (ARRIVING / DEPARTING / PATTERN), not pure multiplication — so moderate evidence accumulates rather than collapsing to zero
5. **Applies hysteresis** — once classified, the status persists with a 1.5× boost while still consistent, preventing flicker
6. **Decision** — highest-scoring status above a 0.35 confidence threshold wins; otherwise OVERFLY

Critical adaptations for accuracy:
- **AGL not MSL** — uses airport elevation (e.g., KSEZ at 4,827 ft) so a 737 at 8,000 ft MSL there is correctly seen as 3,173 ft AGL, on a real approach slope
- **Glide-slope angle** — `atan2(AGL, distance)` in degrees, with a trapezoid that peaks at 1.5°–5° (real approaches) and rejects flat overflies cleanly
- **On-ground transition** is the strongest departure signal — if we observed it on the ground recently, that's a takeoff

---

## 🔧 Architecture

A single self-contained `index.html` file. No build step, no dependencies to install, no backend (almost). You can open it locally by double-clicking and it works offline-ish (still needs the data APIs).

### Data sources

| Source                                                  | What it provides                            |
| ------------------------------------------------------- | ------------------------------------------- |
| 🛩️ [airplanes.live](https://airplanes.live)             | Live ADS-B aircraft positions and basics    |
| 🌦️ [VATSIM METAR](https://metar.vatsim.net)             | Airport weather (CORS-friendly)             |
| 🌦️ [aviationweather.gov](https://aviationweather.gov)   | Weather + airport DB fallback               |
| 🛬 [adsbdb.com](https://adsbdb.com)                     | Filed flight plan routes (commercial)       |
| 🗺️ [CARTO Dark](https://carto.com)                      | Map tiles (via Leaflet)                     |

### Optional Cloudflare Worker proxy

A simple Cloudflare Worker (free tier) is included for cross-origin proxying when needed. It enforces a domain allowlist for the upstream APIs:

```javascript
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = url.searchParams.get('url');
    const cors = {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (!target) return new Response('Missing url', { status: 400, headers: cors });
    const allowed = ['https://hexdb.io/', 'https://api.adsbdb.com/', 'https://opensky-network.org/', 'https://aviationweather.gov/'];
    if (!allowed.some(p => target.startsWith(p))) return new Response('Not allowed', { status: 403, headers: cors });
    const r = await fetch(target);
    const body = await r.text();
    return new Response(body, {
      status: r.status,
      headers: { ...cors, 'Content-Type': r.headers.get('Content-Type') || 'application/json' },
    });
  },
};
```

---

## 🗺️ Built-in Airport Database

Around 200 airports across the US (and a few in HI/AK) are pre-loaded with coordinates and elevations, including all major hubs and most regional/GA fields in the western states. For anything not in the list, the page falls back to the `aviationweather.gov` API, or you can specify lat/lon/name via URL parameters.

---

## 📜 License

[MIT](LICENSE.md) — do whatever you want with it.
