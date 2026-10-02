// Standalone HTTP server using native Node.js (Zero external dependencies)
// Serves /api/* endpoints and static dist/ directory

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import {
  getHeaders,
  getLiveProviders,
  fetchSections,
  searchDramas,
  resolveDrama,
  refreshEpisodeStream,
} from './dramaCrawler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, '..', 'dist');
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.m3u8': 'application/vnd.apple.mpegurl',
};

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // 1. API Version
  if (pathname === '/api/version') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, version: '2.0.0', app: 'FilmDrama PWA' }));
    return;
  }

  // 2. Providers
  if (pathname === '/api/providers') {
    try {
      const providers = await getLiveProviders();
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true, providers }));
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: e.message, providers: [] }));
    }
    return;
  }

  // 3. Sections
  if (pathname === '/api/sections') {
    try {
      const provider = urlObj.searchParams.get('provider') || 'anyreel';
      const page = parseInt(urlObj.searchParams.get('page') || '1', 10);
      const q = urlObj.searchParams.get('q') || '';
      const lang = urlObj.searchParams.get('lang') || 'vi-VN';
      const data = await fetchSections(provider, page, q, lang);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  // 4. Search
  if (pathname === '/api/search') {
    try {
      const q = urlObj.searchParams.get('q') || '';
      const lang = urlObj.searchParams.get('lang') || 'vi-VN';
      const data = await searchDramas(q, lang);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: e.message, items: [] }));
    }
    return;
  }

  // 5. Drama Detail & Episodes Resolver
  if (pathname === '/api/drama') {
    try {
      const watch_url = urlObj.searchParams.get('watch_url') || '';
      const slug = urlObj.searchParams.get('slug') || '';
      const ep = urlObj.searchParams.get('ep') || '1';
      const lang = urlObj.searchParams.get('lang') || 'vi-VN';
      const data = await resolveDrama({ watch_url, slug, ep, lang });
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: e.message, episodes: [] }));
    }
    return;
  }

  // 6. On-Demand Episode Stream Resolver
  if (pathname === '/api/episode/refresh') {
    try {
      const watch_url = urlObj.searchParams.get('watch_url') || '';
      const slug = urlObj.searchParams.get('slug') || '';
      const ep = urlObj.searchParams.get('ep') || '1';
      const lang = urlObj.searchParams.get('lang') || 'vi-VN';
      const data = await refreshEpisodeStream({ watch_url, slug, ep, lang });
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  // 7. Proxy Stream (CORS & Range streaming)
  if (pathname === '/api/proxy-stream') {
    try {
      const streamUrl = urlObj.searchParams.get('url');
      if (!streamUrl) {
        res.statusCode = 400;
        res.end('Missing url parameter');
        return;
      }
      const range = req.headers.range;
      const fetchHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://narto-drama.com',
        ...(range ? { 'Range': range } : {})
      };
      const upstream = await fetch(streamUrl, { headers: fetchHeaders });
      res.statusCode = upstream.status;
      for (const [k, v] of upstream.headers.entries()) {
        if (!['content-encoding', 'content-length'].includes(k.toLowerCase())) {
          res.setHeader(k, v);
        }
      }
      if (upstream.body) {
        Readable.fromWeb(upstream.body).pipe(res);
      } else {
        res.end();
      }
    } catch (e) {
      res.statusCode = 500;
      res.end(e.message);
    }
    return;
  }

  // 8. Proxy upstream assets
  if (pathname.startsWith('/assets/poster/') || pathname.startsWith('/assets/cover/')) {
    try {
      const upstreamUrl = `https://narto-drama.com${req.url}`;
      const upstream = await fetch(upstreamUrl, { headers: getHeaders() });
      if (!upstream.ok) {
        res.statusCode = upstream.status;
        res.end('Not found');
        return;
      }
      res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      Readable.fromWeb(upstream.body).pipe(res);
    } catch (e) {
      res.statusCode = 500;
      res.end('Error proxying asset');
    }
    return;
  }

  // 9. Static File Serving from dist/
  let filePath = path.join(DIST_DIR, pathname);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // SPA fallback to dist/index.html
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    fs.createReadStream(indexPath).pipe(res);
    return;
  }

  res.statusCode = 404;
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`[FilmDrama Standalone Server] Running at http://localhost:${PORT}`);
});
