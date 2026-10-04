// Vercel Serverless Function: /api/sections
import { fetchSections } from '../server/dramaCrawler.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  try {
    const provider = req.query.provider || 'anyreel';
    const page = parseInt(req.query.page || '1', 10);
    const q = req.query.q || '';
    const lang = req.query.lang || 'vi-VN';
    const data = await fetchSections(provider, page, q, lang);
    res.json(data);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
