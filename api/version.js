// Vercel Serverless Function: /api/version
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  res.json({ ok: true, version: '2.0.0', app: 'FilmDrama PWA' });
}
