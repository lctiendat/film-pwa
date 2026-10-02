import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { Readable } from 'node:stream'
import {
  getHeaders,
  getLiveProviders,
  fetchSections,
  searchDramas,
  resolveDrama,
  refreshEpisodeStream,
  proxySubtitle,
} from './server/dramaCrawler.js'
import { translateText, translateBatch, translateSubtitleCues, generateAutoCaptions } from './server/translateService.js'


// Full Vite middleware plugin implementing all DramaFlow PRO crawl & streaming API endpoints
function dramaCrawlerServerPlugin() {
  return {
    name: 'drama-crawler-server-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const urlObj = new URL(req.url, 'http://localhost');
        const pathname = urlObj.pathname;

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
            const rs_ctx = urlObj.searchParams.get('rs_ctx') || '';
            const data = await refreshEpisodeStream({ watch_url, slug, ep, lang, rs_ctx });
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
            res.setHeader('Access-Control-Allow-Origin', '*');
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

        // 9. Subtitle Proxy (VTT / SRT)
        if (pathname === '/api/subtitle') {
          try {
            const subUrl = urlObj.searchParams.get('url');
            if (!subUrl) {
              res.statusCode = 400;
              res.end('Missing url parameter');
              return;
            }
            const data = await proxySubtitle(subUrl);
            if (!data.ok) {
              res.statusCode = data.status || 500;
              res.end(data.error || 'Failed to fetch subtitle');
              return;
            }
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', data.contentType || 'text/vtt; charset=utf-8');
            res.end(data.content);
          } catch (e) {
            res.statusCode = 500;
            res.end(e.message);
          }
          return;
        }

        // 9b. Subtitle Translate (Preserving cue timings)
        if (pathname === '/api/subtitle/translate') {
          try {
            if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const json = JSON.parse(body || '{}');
                  const cues = json.cues || [];
                  const to = json.to || 'vi';
                  const translatedCues = await translateSubtitleCues(cues, to);
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ ok: true, cues: translatedCues }));
                } catch (pe) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ ok: false, error: pe.message }));
                }
              });
              return;
            }
          } catch (e) {
            res.statusCode = 500;
            res.end(e.message);
          }
          return;
        }

        // 9c. Subtitle Auto-Generate (AI Narrative & Dialogue Subtitles)
        if (pathname === '/api/subtitle/auto-generate') {
          try {
            if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const json = JSON.parse(body || '{}');
                  const cues = await generateAutoCaptions(json);
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ ok: true, cues }));
                } catch (pe) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ ok: false, error: pe.message }));
                }
              });
              return;
            }
          } catch (e) {
            res.statusCode = 500;
            res.end(e.message);
          }
          return;
        }

        // 10. Translation API (Auto-translate)
        if (pathname === '/api/translate') {
          try {
            if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const json = JSON.parse(body || '{}');
                  const to = json.to || 'vi';
                  if (Array.isArray(json.texts)) {
                    const translated = await translateBatch(json.texts, to);
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ ok: true, translatedTexts: translated }));
                  } else {
                    const translated = await translateText(json.text || '', to);
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ ok: true, translatedText: translated }));
                  }
                } catch (pe) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ ok: false, error: pe.message }));
                }
              });
              return;
            }

            const text = urlObj.searchParams.get('text') || '';
            const to = urlObj.searchParams.get('to') || 'vi';
            const from = urlObj.searchParams.get('from') || null;
            const translatedText = await translateText(text, to, from);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, originalText: text, translatedText, to }));
          } catch (e) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: e.message }));
          }
          return;
        }

        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dramaCrawlerServerPlugin(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'icons/apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'FilmDrama PWA - Phim Ngắn Đỉnh Cao',
        short_name: 'FilmDrama',
        description: 'Ứng dụng xem phim ngắn, drama mini đa nền tảng PWA tốc độ cao',
        theme_color: '#090d16',
        background_color: '#090d16',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icons/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      '/api-drama': {
        target: 'https://narto-drama.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-drama/, '')
      }
    }
  }
})
