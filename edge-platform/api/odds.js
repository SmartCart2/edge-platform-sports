// /api/odds — proxies The Odds API, keeps key server-side
// Query params: sport, markets, regions, oddsFormat
export default async function handler(req, res) {
  const { sport = 'baseball_mlb', markets = 'h2h,spreads,totals', regions = 'us', oddsFormat = 'decimal' } = req.query;
  const key = process.env.ODDS_API_KEY;
  if (!key) return res.status(500).json({ error: 'API key not configured' });

  const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds?apiKey=${key}&regions=${regions}&markets=${markets}&oddsFormat=${oddsFormat}`;
  try {
    const r = await fetch(url);
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
