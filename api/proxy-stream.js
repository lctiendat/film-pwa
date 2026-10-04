// Vercel Serverless Function: /api/proxy-stream
// Proxies HLS/MP4 streams with CORS headers

export const config = {
  maxDuration: 30,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  try {
    const streamUrl = req.query.url;
    if (!streamUrl) {
      res.status(400).end('Missing url parameter');
      return;
    }

    const range = req.headers.range;
    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://narto-drama.com',
      ...(range ? { 'Range': range } : {}),
    };

    const upstream = await fetch(streamUrl, { headers: fetchHeaders });

    // Forward status code
    res.status(upstream.status);

    // Forward relevant headers
    for (const [k, v] of upstream.headers.entries()) {
      if (!['content-encoding', 'transfer-encoding'].includes(k.toLowerCase())) {
        res.setHeader(k, v);
      }
    }
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Stream the body
    if (upstream.body) {
      const reader = upstream.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      };
      await pump();
    } else {
      res.end();
    }
  } catch (e) {
    res.status(500).end(e.message);
  }
}
