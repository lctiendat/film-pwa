// Vercel Serverless Function: /api/translate
import { translateText, translateBatch } from '../server/translateService.js';

export const config = {
  maxDuration: 30,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  try {
    if (req.method === 'POST') {
      const json = req.body || {};
      const to = json.to || 'vi';
      if (Array.isArray(json.texts)) {
        const translated = await translateBatch(json.texts, to);
        res.json({ ok: true, translatedTexts: translated });
      } else {
        const translated = await translateText(json.text || '', to);
        res.json({ ok: true, translatedText: translated });
      }
      return;
    }

    // GET request
    const text = req.query.text || '';
    const to = req.query.to || 'vi';
    const from = req.query.from || null;
    const translatedText = await translateText(text, to, from);
    res.json({ ok: true, originalText: text, translatedText, to });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
