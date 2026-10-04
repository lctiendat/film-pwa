// Vercel Serverless Function: /api/subtitle/auto-generate
import { generateAutoCaptions } from '../../server/translateService.js';

export const config = {
  maxDuration: 30,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    const json = req.body || {};
    const cues = await generateAutoCaptions(json);
    res.json({ ok: true, cues });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
}
