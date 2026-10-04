// Vercel Serverless Function: /api/episode/refresh
import { refreshEpisodeStream } from '../../server/dramaCrawler.js';

export const config = {
  maxDuration: 30,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  try {
    const watch_url = req.query.watch_url || '';
    const slug = req.query.slug || '';
    const ep = req.query.ep || '1';
    const lang = req.query.lang || 'vi-VN';
    const rs_ctx = req.query.rs_ctx || '';
    const data = await refreshEpisodeStream({ watch_url, slug, ep, lang, rs_ctx });
    res.json(data);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
