// Vercel Serverless Function: /api/providers
import { getLiveProviders } from '../server/dramaCrawler.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  try {
    const providers = await getLiveProviders();
    res.json({ ok: true, providers });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, providers: [] });
  }
}
