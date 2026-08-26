// /api/grade — auto-grades pending signals against final scores
// Runs nightly via Vercel Cron (configured in vercel.json)
// Also callable manually: GET /api/grade?secret=YOUR_CRON_SECRET

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const SPORTS = [
  'baseball_mlb',
  'americanfootball_nfl',
  'basketball_nba',
  'icehockey_nhl',
];

const SPORT_LABELS = {
  'baseball_mlb': 'MLB',
  'americanfootball_nfl': 'NFL',
  'basketball_nba': 'NBA',
  'icehockey_nhl': 'NHL',
};

// Fetch completed scores for a sport
async function fetchScores(sport) {
  const key = process.env.ODDS_API_KEY;
  const url = `https://api.the-odds-api.com/v4/sports/${sport}/scores?apiKey=${key}&daysFrom=3`;
  const r = await fetch(url);
  if (!r.ok) return [];
  const data = await r.json();
  return (data || []).filter(g => g.completed && g.scores);
}

// Normalize team name for matching
function normalize(name) {
  return (name || '').toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

// Check if a signal's game matches a completed score
function matchGame(signal, score) {
  const sigGame = normalize(signal.game);
  const awayNorm = normalize(score.away_team);
  const homeNorm = normalize(score.home_team);

  // Must contain both team names (or last word of each)
  const awayLast = awayNorm.split(' ').pop();
  const homeLast = homeNorm.split(' ').pop();

  return (sigGame.includes(awayLast) || sigGame.includes(awayNorm)) &&
         (sigGame.includes(homeLast) || sigGame.includes(homeNorm));
}

// Get final score for home and away
function getScores(score) {
  let home = null, away = null;
  (score.scores || []).forEach(s => {
    const lo = normalize(s.name);
    const homeLast = normalize(score.home_team).split(' ').pop();
    if (lo.includes(homeLast)) home = parseInt(s.score);
    else away = parseInt(s.score);
  });
  return { home, away };
}

// Grade a signal based on pick and final score
function gradeSignal(signal, finalHome, finalAway) {
  const pick = (signal.pick || '').toLowerCase().trim();
  const total = finalHome + finalAway;
  const line = parseFloat(signal.line);

  // Totals O/U
  if (signal.market === 'Totals O/U') {
    if (isNaN(line)) return null;
    if (total > line) return pick.startsWith('over') ? 'Win' : 'Loss';
    if (total < line) return pick.startsWith('under') ? 'Win' : 'Loss';
    return 'Push';
  }

  // Moneyline
  if (signal.market === 'Moneyline') {
    const homeWon = finalHome > finalAway;
    const awayWon = finalAway > finalHome;
    // Check if pick contains home or away team name
    const sigGame = normalize(signal.game);
    const teams = sigGame.split('@').map(t => t.trim());
    const awayTeam = teams[0] || '';
    const homeTeam = teams[1] || '';
    const awayLast = awayTeam.split(' ').pop();
    const homeLast = homeTeam.split(' ').pop();
    if (pick.includes(awayLast)) return awayWon ? 'Win' : 'Loss';
    if (pick.includes(homeLast)) return homeWon ? 'Win' : 'Loss';
    return null;
  }

  // Run Line / Spreads
  if (signal.market === 'Run Line' || signal.market === 'Spreads ATS') {
    if (isNaN(line)) return null;
    const sigGame = normalize(signal.game);
    const teams = sigGame.split('@').map(t => t.trim());
    const awayLast = (teams[0] || '').split(' ').pop();
    const homeLast = (teams[1] || '').split(' ').pop();

    let margin = null;
    if (pick.includes(awayLast)) margin = finalAway - finalHome;
    else if (pick.includes(homeLast)) margin = finalHome - finalAway;
    else return null;

    const cover = margin + line;
    if (cover > 0) return 'Win';
    if (cover < 0) return 'Loss';
    return 'Push';
  }

  return null;
}

export default async function handler(req, res) {
  // Verify cron secret to prevent unauthorized calls
  const secret = req.headers['authorization'] || req.query.secret;
  if (secret !== `Bearer ${process.env.CRON_SECRET}` && secret !== process.env.CRON_SECRET) {
    // Still allow Vercel cron (it sends its own auth header)
    const isCron = req.headers['x-vercel-cron'] === '1';
    if (!isCron) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const results = { graded: 0, skipped: 0, errors: [] };

  try {
    // Get all pending signals from last 3 days
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    const { data: pending, error: fetchErr } = await supabase
      .from('signals')
      .select('*')
      .eq('result', 'Pending')
      .gte('game_date', threeDaysAgo);

    if (fetchErr) throw fetchErr;
    if (!pending || pending.length === 0) {
      return res.json({ message: 'No pending signals', ...results });
    }

    // Group pending signals by sport
    const bySport = {};
    pending.forEach(s => {
      const sport = Object.entries(SPORT_LABELS).find(([k, v]) => v === s.sport)?.[0]
        || 'baseball_mlb';
      if (!bySport[sport]) bySport[sport] = [];
      bySport[sport].push(s);
    });

    // Fetch scores and grade for each sport
    for (const [sport, signals] of Object.entries(bySport)) {
      const scores = await fetchScores(sport);
      if (!scores.length) continue;

      for (const signal of signals) {
        // Find matching completed game
        const match = scores.find(score => {
          const scoreDate = score.commence_time.split('T')[0];
          return scoreDate === signal.game_date && matchGame(signal, score);
        });

        if (!match) { results.skipped++; continue; }

        const { home, away } = getScores(match);
        if (home === null || away === null) { results.skipped++; continue; }

        const result = gradeSignal(signal, home, away);
        if (!result) { results.skipped++; continue; }

        const { error: updateErr } = await supabase
          .from('signals')
          .update({ result, graded_at: new Date().toISOString() })
          .eq('id', signal.id);

        if (updateErr) {
          results.errors.push(`${signal.id}: ${updateErr.message}`);
        } else {
          results.graded++;
        }
      }
    }

    res.json({ message: 'Grading complete', ...results });

  } catch (e) {
    res.status(500).json({ error: e.message, ...results });
  }
}
