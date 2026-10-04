// Vercel Serverless Function: /api/subtitle
import { proxySubtitle } from '../server/dramaCrawler.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  try {
    const subUrl = req.query.url;
    if (!subUrl) {
      res.status(400).end('Missing url parameter');
      return;
    }
    const data = await proxySubtitle(subUrl);
    if (!data.ok) {
      res.status(data.status || 500).end(data.error || 'Failed to fetch subtitle');
      return;
    }
    res.setHeader('Content-Type', data.contentType || 'text/vtt; charset=utf-8');
    res.end(data.content);
  } catch (e) {
    res.status(500).end(e.message);
  }
}
