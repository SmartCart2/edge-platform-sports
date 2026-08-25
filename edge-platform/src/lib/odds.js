// All API calls go through our Vercel proxy — key stays server-side

const BASE = '/api';

export async function fetchOdds({ sport = 'baseball_mlb', markets = 'h2h,spreads,totals', regions = 'us' } = {}) {
  const url = `${BASE}/odds?sport=${sport}&markets=${encodeURIComponent(markets)}&regions=${regions}&oddsFormat=decimal`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Odds API error: ${r.status}`);
  return r.json();
}

export async function fetchScores({ sport = 'baseball_mlb', daysFrom = 1 } = {}) {
  const r = await fetch(`${BASE}/scores?sport=${sport}&daysFrom=${daysFrom}`);
  if (!r.ok) throw new Error(`Scores API error: ${r.status}`);
  return r.json();
}

export async function fetchProps({ eventId, sport = 'baseball_mlb', markets }) {
  const mkts = markets || 'pitcher_strikeouts,pitcher_outs,batter_hits,batter_home_runs,batter_total_bases,batter_rbis';
  const r = await fetch(`${BASE}/props?eventId=${eventId}&sport=${sport}&markets=${encodeURIComponent(mkts)}`);
  if (!r.ok) throw new Error(`Props API error: ${r.status}`);
  return r.json();
}

export async function fetchEvents({ sport = 'baseball_mlb' } = {}) {
  const r = await fetch(`${BASE}/events?sport=${sport}`);
  if (!r.ok) throw new Error(`Events API error: ${r.status}`);
  return r.json();
}

// Parse best line per direction across bookmakers
export function getBestLine(game, mkt) {
  let bestOver = null, bestOverBook = null;
  let bestUnder = null, bestUnderBook = null;
  let line = null;
  (game.bookmakers || []).forEach(bk => {
    const m = (bk.markets || []).find(m => m.key === mkt);
    if (!m) return;
    (m.outcomes || []).forEach(o => {
      if (o.name === 'Over' || o.name === 'Home' || o.name === game.home_team) {
        if (o.point != null) line = o.point;
        if (!bestOver || o.price > bestOver) { bestOver = o.price; bestOverBook = bk.title; }
      } else {
        if (!bestUnder || o.price > bestUnder) { bestUnder = o.price; bestUnderBook = bk.title; }
      }
    });
  });
  return { line, bestOver, bestOverBook, bestUnder, bestUnderBook };
}

export function fmtOdds(decimal) {
  if (!decimal) return '--';
  if (decimal >= 2) return `+${Math.round((decimal - 1) * 100)}`;
  return `${Math.round(-100 / (decimal - 1))}`;
}

// Build scoresMap: {teamAbbr: "win"|"loss"} from scores endpoint
export function buildScoresMap(scoresData, resolver) {
  const map = {};
  const completed = (scoresData || [])
    .filter(g => g.completed && g.scores)
    .sort((a, b) => new Date(b.commence_time) - new Date(a.commence_time));
  completed.forEach(g => {
    const hk = resolver(g.home_team);
    const ak = resolver(g.away_team);
    if (!hk || !ak || !g.scores) return;
    let hScore = 0, aScore = 0;
    g.scores.forEach(s => {
      const lo = s.name.toLowerCase();
      const last = g.home_team.toLowerCase().split(' ').slice(-1)[0];
      if (lo.includes(last)) hScore = parseInt(s.score) || 0;
      else aScore = parseInt(s.score) || 0;
    });
    if (!map[hk]) map[hk] = hScore > aScore ? 'win' : 'loss';
    if (!map[ak]) map[ak] = aScore > hScore ? 'win' : 'loss';
  });
  return map;
}
