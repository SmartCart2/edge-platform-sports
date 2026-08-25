// /api/props — per-event player props (pitcher Ks, batter hits/HR/TB)
// Query params: eventId, sport, markets, regions
export default async function handler(req, res) {
  const {
    eventId,
    sport = 'baseball_mlb',
    markets = 'pitcher_strikeouts,pitcher_outs,batter_hits,batter_home_runs,batter_total_bases,batter_rbis',
    regions = 'us'
  } = req.query;

  if (!eventId) return res.status(400).json({ error: 'eventId required' });
  const key = process.env.ODDS_API_KEY;
  if (!key) return res.status(500).json({ error: 'API key not configured' });

  const url = `https://api.the-odds-api.com/v4/sports/${sport}/events/${eventId}/odds?apiKey=${key}&regions=${regions}&markets=${markets}&oddsFormat=decimal`;
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
