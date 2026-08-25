// /api/events — list of upcoming events (free, no quota cost)
// Used to get event IDs for the props endpoint
export default async function handler(req, res) {
  const { sport = 'baseball_mlb' } = req.query;
  const key = process.env.ODDS_API_KEY;
  if (!key) return res.status(500).json({ error: 'API key not configured' });

  const url = `https://api.the-odds-api.com/v4/sports/${sport}/events?apiKey=${key}`;
  try {
    const r = await fetch(url);
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
