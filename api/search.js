// Vercel Serverless Function: /api/search
import { searchDramas } from '../server/dramaCrawler.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  try {
    const q = req.query.q || '';
    const lang = req.query.lang || 'vi-VN';
    const data = await searchDramas(q, lang);
    res.json(data);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, items: [] });
  }
}
