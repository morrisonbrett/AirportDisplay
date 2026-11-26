// local-server.js — run AirportDisplay from any computer, no cloud account needed.
//
//   node local-server.js            → http://localhost:8080/?icao=KSEZ
//   PORT=9000 node local-server.js  → another port
//   CARTO_KEY=your-key node local-server.js  → CARTO's dark map instead of darkened OpenStreetMap
//
// It serves index.html and answers /api/feed with the same code Vercel runs
// (api/feed.js). Requests leave from your own internet connection, which the
// community feeds accept. Other devices on your network (a TV, a phone) can use
// http://<this computer's IP>:8080/?icao=KSEZ while this is running.
//
// Needs Node 18 or newer. No npm install.

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import feed from './api/feed.js';

const PORT = Number(process.env.PORT) || 8080;
const PAGE = fileURLToPath(new URL('./index.html', import.meta.url));

http.createServer(async (req, res) => {
  const path = new URL(req.url || '/', 'http://localhost').pathname;
  try {
    if (path === '/api/feed') return await feed(req, res);
    if (path === '/' || path === '/index.html') {
      const html = await readFile(PAGE);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end(html);
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  } catch (e) {
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Server error');
    console.error(e);
  }
}).listen(PORT, () => {
  console.log(`AirportDisplay running:  http://localhost:${PORT}/?icao=KSEZ`);
  console.log('Stop with Ctrl+C.');
});
