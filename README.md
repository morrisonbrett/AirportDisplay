# 🛫 Airport Display

A **gorgeous, real-time airport activity dashboard** built for big TVs, big screens, and big windows. Drop in any ICAO code and instantly see every aircraft in the area — what they're flying, where they came from, where they're going, and what they're doing right now.

Designed to live on a wall-mounted TV with a Fire TV stick. Looks great in landscape on desktop, holds its own in portrait on mobile.

![License](https://img.shields.io/badge/license-MIT-00c8f0?style=flat-square)
![Status](https://img.shields.io/badge/status-live-00e87a?style=flat-square)
![Data](https://img.shields.io/badge/data-adsb.lol_%2B_adsb.fi-9060f0?style=flat-square)
![No build](https://img.shields.io/badge/one_page_%2B_one_relay-no_build-f0a000?style=flat-square)

---

## ✨ What It Does

🛬 **Live aircraft tracking** — every plane within a configurable radius (default 30 nm), updating every 30 seconds from the community ADS-B network [adsb.fi](https://adsb.fi), merged with [adsb.lol](https://adsb.lol) once you add its free feeder key

🌤️ **Live METAR weather** — wind, visibility, sky conditions, temperature, altimeter, and flight rules color-coded for VFR / MVFR / IFR / LIFR

🧭 **Conservative flight phase detection** — inspired by [Fala et al.'s peer-reviewed work](https://journals.vilniustech.lt/index.php/Aviation/article/view/18025) on ADS-B airport operation counts, classifies each aircraft as `ARRIVING`, `DEPARTING`, `PATTERN`, `OVERFLY`, `TAXIING`, or `GROUND`

🗺️ **Live radar map** with rotating sweep, distance rings (5/10/20 nm), aircraft headed-arrow icons, and **color-coded flight trails** showing each aircraft's recent path

✈️ **Route enrichment** — pulls origin and destination airports from [adsbdb.com](https://adsbdb.com) for filed flights, and infers routes from observed behavior for GA aircraft (e.g., a plane we watched depart shows `KSEZ → ?`)

🔔 **Audio chimes** — pleasant Web Audio tones when aircraft transition into ARRIVING or PATTERN status

📺 **Keep-awake mode** — opt-in canvas-stream video keeps the browser/TV from sleeping, with no audio interference

🕒 **Dual clocks** — local airport time (with auto-detected timezone) and Zulu (UTC), monospaced and stable

📱 **Mobile-friendly** — full responsive layout for phones in portrait, with the map hidden and the flight table optimized for small screens

🚦 **Honest when data stops** — if the feeds go quiet the screen says so in plain words, keeps the last picture for two minutes at most, and recovers by itself

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

The display is two pieces: the page (`index.html`) and a tiny **relay** (`api/feed.js`) that fetches the aircraft data for it. The relay is required — see [📡 Live Data Relay](#-live-data-relay) for the two-minute setup. Once it is running, open the page with any ICAO code:

```
https://YOUR-PROJECT.vercel.app/?icao=KSEZ
```

Some examples (add them after your own address):
- 🌵 `?icao=KSEZ` — Sedona Airport
- 🌴 `?icao=KCMA` — Camarillo Airport
- 🏔️ `?icao=KASE` — Aspen
- 🌊 `?icao=KSAN` — San Diego
- 🌆 `?icao=KLAX` — Los Angeles

The GitHub Pages copy at `https://morrisonbrett.github.io/AirportDisplay/` works too, once it knows where the relay lives: set `RELAY_URL` near the top of the script in `index.html`, or add `&relay=https://YOUR-PROJECT.vercel.app` to the address.

### URL Parameters

| Param    | Default | Description                                              |
| -------- | ------- | -------------------------------------------------------- |
| `icao`   | `KSEZ`  | 4-letter ICAO airport code                               |
| `radius` | `30`    | Search radius in nautical miles (max 250)                |
| `lat`    | —       | Override latitude (for airports the lookup cannot find)  |
| `lon`    | —       | Override longitude                                       |
| `name`   | —       | Override display name                                    |
| `relay`  | —       | Address of the relay, when the page is hosted elsewhere  |

Example with custom airport: `?icao=K9X9&lat=34.123&lon=-111.456&name=My+Custom+Field`

### Switch airports without editing the URL

There's an ICAO input in the top-right of the header. Type any 3–4 letter code and press **Enter** or tap **Go**. D-pad navigation works too, so you can change airports from a Fire TV remote.

---

## 📡 Live Data Relay

### Why there is a relay

Until August 2026 this page read aircraft straight from airplanes.live. That free API was then closed to everyone except people who run a receiver for them. The remaining free community feeds — [adsb.lol](https://adsb.lol) and [adsb.fi](https://adsb.fi) — do not send the CORS headers a browser needs, so **a web page cannot read them directly**, from any host. Something has to fetch them server-side.

`api/feed.js` is that something: about 300 lines, no dependencies, and no key needed to get going. It asks adsb.fi on every poll and hands the page one clean answer. With an adsb.lol key it asks both feeds at once, keeps the freshest position for each aircraft and fills gaps from the other feed (see [adsb.lol key](#adsblol-key-optional)). It also relays METAR and airport lookups from aviationweather.gov, which has the same CORS limitation.

### Set it up on Vercel (free, about two minutes)

1. Sign in at [vercel.com](https://vercel.com) with your GitHub account.
2. **Add New → Project**, import this repository, leave every setting as it is (Framework Preset: *Other*), and press **Deploy**.
3. Open `https://YOUR-PROJECT.vercel.app/?icao=KSEZ` — use the short address listed under **Domains**, not the long per-deployment one.

That's all. Vercel turns any file in `/api` into a function by itself, serves `index.html` from the same address, and redeploys on every push — the same zero-touch cycle as GitHub Pages.

To check the relay on its own, open:

```
https://YOUR-PROJECT.vercel.app/api/feed?lat=34.849&lon=-111.790&r=30
```

You should see JSON with `"ok": true` next to each feed under `sources`.

> **Not a Cloudflare Worker, and not Vercel's Edge runtime.** Both feeds refuse requests that arrive from Cloudflare's network (403 / 429), and Vercel's Edge runtime runs there too. The default Node.js runtime — what you get without configuring anything — is the one that works.

### Or run it on any computer (no account at all)

```
node local-server.js
```

Then open `http://localhost:8080/?icao=KSEZ`. It serves the page and the same relay code from your own internet connection. Other devices on your network can use `http://<that computer's IP>:8080/?icao=KSEZ` while it runs. Needs Node 18 or newer, nothing to install. This is also the fallback if a hosted relay ever gets rate-limited: home connections are not shared with thousands of other apps.

### Being a good guest

These feeds are run by volunteers and funded by donations. The relay is built to be light on them:

- the page polls every 30 seconds, and each poll is one request to adsb.fi
- adsb.lol allows only 500 requests a day per address without a key — one screen makes 2,880 — so without a key it is held in reserve and asked only when adsb.fi fails
- answers are cached for 12 seconds at the CDN, so however many screens are running there is at most one upstream request per 12 seconds (7,200 a day, exactly adsb.lol's feeder allowance)
- a feed that answers "slow down" (429) or "no" (403) is left alone for as long as it asks — up to a day when a daily quota is used up — instead of being retried
- every request identifies itself with a `User-Agent` naming this project — **if you fork it, change `USER_AGENT` in `api/feed.js` to your own repo or e-mail**
- both feeds are credited, with links, in the page footer (their terms require it: adsb.lol data is ODbL; adsb.fi is for personal, non-commercial use)
- route lookups are made only for real flight numbers; a callsign that is just a tail number (`N770CC`) has no scheduled route, and the database's stale guesses for those were wrong

One screen running around the clock makes roughly 90,000 relay requests a month — well inside Vercel's free Hobby allowance.

The best way to say thanks, and to improve what this display can see near your own airport, is to feed them from a small receiver (an RTL-SDR dongle and a Raspberry Pi). A receiver that already feeds another network can feed these as well, without disturbing its existing setup.

### adsb.lol key (optional)

adsb.lol's [published limits](https://www.adsb.lol/docs/open-data/api): 500 requests a day per address with no key, 7,200 a day with a **feeder key**, which is free to anyone whose receiver feeds their network — anywhere in the world, it does not have to be near the airport you watch.

1. Add adsb.lol to your receiver: [Sharing your data](https://www.adsb.lol/docs/get-started/introduction).
2. Collect your key at [adsb.lol/mmb](https://www.adsb.lol/mmb).
3. In Vercel open your project → **Settings → Environment Variables**, add `ADSBLOL_API_KEY` with the key as its value, save, and **redeploy** when prompted.

From then on every poll asks both networks and merges them, and the footer reads "adsb.lol + adsb.fi". The key stays on the server; it is never sent to the browser. Running locally: `ADSBLOL_API_KEY=your-key node local-server.js`.

### Who may use your relay

A page served by the relay's own address, a page opened as a local file, and `localhost` are always allowed. Pages on other hosts must be listed: add the host to `ALLOWED_HOSTS` at the top of `api/feed.js` (or set an `ALLOWED_HOSTS` environment variable in Vercel, comma-separated). This only keeps other sites from spending your quota; the data itself is public.

### When something is wrong

The screen tells you which piece is failing:

| On screen                          | What it means                                                                 | What to do                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Live feed not connected**        | The page found no relay                                                       | Open the page from the relay's address, or set `RELAY_URL` / `?relay=` |
| **Aircraft feeds not answering**   | The relay works; the feeds refused or timed out (the status of each is shown) | Usually clears by itself — it retries every 30 seconds            |
| **Relay refused this page**        | The page's host is not in `ALLOWED_HOSTS`                                     | Add it and redeploy                                               |
| **Relay unreachable**              | No network path to the relay                                                  | Check the internet connection on the TV                           |
| **Live feed error** … `HTTP 401`   | You opened a protected per-deployment address                                 | Use the short production address under **Domains**                |
| Footer shows e.g. `adsb.fi 429`    | One feed is rate-limiting the relay; the other is still supplying aircraft    | Nothing                                                           |
| Footer shows only `adsb.fi`        | Normal without an adsb.lol key                                                | Optional: add `ADSBLOL_API_KEY` — see adsb.lol key                |
| Map stamped **API KEY REQUIRED**   | `CARTO_KEY` is set but CARTO rejects it (mistyped, deleted, wrong site)       | Fix or remove `CARTO_KEY`, then redeploy — see Map Background     |

---

## 🌍 Map Background

The map needs no setup. Out of the box the page loads OpenStreetMap's standard tiles and turns them into a dark monochrome map in the browser.

For the purpose-built dark map this page was designed around — CARTO "Dark Matter" — add a free CARTO key. (CARTO's tiles needed no key until late August 2026; without one they now come back stamped **API KEY REQUIRED**.)

1. Request a key at [carto.com/basemaps/apikey](https://carto.com/basemaps/apikey). No account; it arrives by e-mail in about a minute. Free for non-commercial use up to 5 million tile requests a month.
2. In Vercel open your project → **Settings → Environment Variables**, add `CARTO_KEY` with the key as its value, save, and **redeploy** when prompted (a new variable only reaches new deployments).
3. Reload the page. The map credit in the corner now reads "© OpenStreetMap contributors, © CARTO".

Running locally instead: `CARTO_KEY=your-key node local-server.js` (PowerShell: `$env:CARTO_KEY="your-key"; node local-server.js`).

**Why the key is not in `index.html`:** the relay hands it to the page, so it never sits in the public repo — forks don't borrow your key, and updating the page never erases it. It is not a secret (any browser showing the map can see it in the tile requests), so restrict it to your site's host in CARTO's key dashboard.

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

The algorithm is **deliberately conservative** — heavily inspired by [Fala, Falas & Falas (Aviation 2022)](https://journals.vilniustech.lt/index.php/Aviation/article/view/18025), a peer-reviewed paper on automatic airport operation counts from crowd-sourced ADS-B data.

**Core principle:** an aircraft is only classified as arriving / departing / pattern if its **current geometry firmly places it at this specific airport**. There is no speculation from cruise behavior. A 737 at 32,000 ft is *always* OVERFLY, regardless of which direction it happens to be heading.

The classifier uses **hard geometric rules**, in order:

1. **`GROUND`** / **`TAXIING`** — trust the ADS-B `on_ground` flag (≤5 kt = GROUND, otherwise TAXIING)
2. **Hard altitude ceiling** — anything above **6,000 ft AGL above airport elevation** is OVERFLY, full stop. This is the safety belt that prevents misclassifying high cruisers.
3. **Hard distance ceiling** — anything beyond 10 nm is OVERFLY (too many other nearby airports to reliably claim it)
4. **Route cache check** — if we know the destination and it's not us, never classify as ARRIVING
5. **`DEPARTING`** — *only* if we directly observed this aircraft on the ground here in the last 5 minutes
6. **`ARRIVING`** — close + low + slow on final (≤3 nm AND ≤2,500 ft AGL AND ≤200 kt), or short final (≤6 nm AND ≤1,500 ft AGL AND descending)
7. **`PATTERN`** — close + low + slow + level (≤4 nm AND ≤2,000 ft AGL AND ≤150 kt AND |vs|<800 fpm)
8. **`OVERFLY`** — everything else

Critical foundation: **AGL not MSL.** Uses airport elevation (e.g., KSEZ at 4,827 ft) so a plane at 7,000 ft over Sedona is correctly seen as 2,173 ft above the field, not "high cruise."

---

## 🔧 Architecture

Two files do the work, and neither needs a build step or a dependency:

| File              | Runs            | Job                                                                 |
| ----------------- | --------------- | ------------------------------------------------------------------- |
| `index.html`      | in the browser  | The whole display: layout, map, status logic, chimes                |
| `api/feed.js`     | on the server   | The relay: fetches and merges the aircraft feeds, weather, airports |
| `local-server.js` | on your machine | Optional: serves both from one computer                             |
| `package.json`    | —               | Only tells Node the relay is an ES module                           |

Nothing has to be configured. Two settings are optional, both environment variables where the relay runs: `ADSBLOL_API_KEY` ([adsb.lol key](#adsblol-key-optional)) and `CARTO_KEY` ([Map Background](#-map-background)).

### Data sources

| Source                                                  | What it provides                            | Reached                |
| ------------------------------------------------------- | ------------------------------------------- | ---------------------- |
| 🛩️ [adsb.fi](https://adsb.fi)                           | Live ADS-B aircraft positions               | via the relay          |
| 🛩️ [adsb.lol](https://adsb.lol)                         | Same (ODbL): backup, or merged with a key   | via the relay          |
| 🌦️ [VATSIM METAR](https://metar.vatsim.net)             | Airport weather                             | directly               |
| 🌦️ [aviationweather.gov](https://aviationweather.gov)   | Weather fallback + airport lookup           | via the relay          |
| 🛬 [adsbdb.com](https://adsbdb.com)                     | Filed flight plan routes (commercial)       | directly               |
| 🗺️ [OpenStreetMap](https://www.openstreetmap.org)       | Map tiles, darkened in the browser (no key) | directly               |
| 🗺️ [CARTO Dark](https://carto.com/basemaps)             | Map tiles, if you add a free key (optional) | directly               |

---

## 🗺️ Built-in Airport Database

Around 200 airports across the US (and a few in HI/AK) are pre-loaded with coordinates and elevations, including all major hubs and most regional/GA fields in the western states. For anything not in the list, the page asks the relay to look the airport up at `aviationweather.gov` (position, name and elevation), or you can specify lat/lon/name via URL parameters.

---

## 📜 License

[MIT](LICENSE.md) — do whatever you want with it.
