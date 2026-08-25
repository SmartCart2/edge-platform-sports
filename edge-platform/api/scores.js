// /api/scores — proxies scores endpoint (previous results for after-win/loss signals)
export default async function handler(req, res) {
  const { sport = 'baseball_mlb', daysFrom = '1' } = req.query;
  const key = process.env.ODDS_API_KEY;
  if (!key) return res.status(500).json({ error: 'API key not configured' });

  const url = `https://api.the-odds-api.com/v4/sports/${sport}/scores?apiKey=${key}&daysFrom=${daysFrom}`;
  try {
    const r = await fetch(url);
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=240');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
