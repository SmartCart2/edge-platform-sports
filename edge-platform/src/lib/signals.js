import { MLB_STATS } from '../data/mlb.js';
import { NFL_STATS } from '../data/nfl.js';

// ── TEAM RESOLVERS ─────────────────────────────────────────────────────────
const MLB_ALIASES = {
  'dodgers':'LAD','angels':'LAA','padres':'SD','giants':'SF','rockies':'COL',
  'diamondbacks':'AZ','d-backs':'AZ','braves':'ATL','mets':'NYM','phillies':'PHI',
  'marlins':'MIA','nationals':'WAS','brewers':'MIL','cubs':'CHC','cardinals':'STL',
  'pirates':'PIT','reds':'CIN','astros':'HOU','rangers':'TEX','mariners':'SEA',
  'athletics':'ATH','yankees':'NYY','red sox':'BOS','rays':'TB','blue jays':'TOR',
  'orioles':'BAL','white sox':'CHW','guardians':'CLE','twins':'MIN','tigers':'DET',
  'royals':'KC','arizona':'AZ','atlanta':'ATL','baltimore':'BAL','boston':'BOS',
  'chicago cubs':'CHC','chicago white sox':'CHW','cincinnati':'CIN','cleveland':'CLE',
  'colorado':'COL','detroit':'DET','houston':'HOU','kansas city':'KC',
  'la angels':'LAA','la dodgers':'LAD','miami':'MIA','milwaukee':'MIL',
  'minnesota':'MIN','new york mets':'NYM','new york yankees':'NYY',
  'philadelphia':'PHI','pittsburgh':'PIT','san diego':'SD','san francisco':'SF',
  'seattle':'SEA','st. louis':'STL','tampa bay':'TB','texas':'TEX',
  'toronto':'TOR','washington':'WAS','sacramento':'ATH',
};

const NFL_ALIASES = {
  'cardinals':'ARI','falcons':'ATL','ravens':'BAL','bills':'BUF','panthers':'CAR',
  'bears':'CHI','bengals':'CIN','browns':'CLE','cowboys':'DAL','broncos':'DEN',
  'lions':'DET','packers':'GB','texans':'HOU','colts':'IND','jaguars':'JAX',
  'chiefs':'KC','raiders':'LV','chargers':'LAC','rams':'LAR','dolphins':'MIA',
  'vikings':'MIN','patriots':'NE','saints':'NO','giants':'NYG','jets':'NYJ',
  'eagles':'PHI','steelers':'PIT','seahawks':'SEA','49ers':'SF','buccaneers':'TB',
  'titans':'TEN','commanders':'WSH',
};

const MLB_DIVS = {
  'ATH':'AL West','LAA':'AL West','LAD':'NL West','SD':'NL West','SF':'NL West',
  'SEA':'AL West','TEX':'AL West','COL':'NL West','AZ':'NL West',
  'NYY':'AL East','BOS':'AL East','TB':'AL East','TOR':'AL East','BAL':'AL East',
  'CHW':'AL Central','CLE':'AL Central','MIN':'AL Central','DET':'AL Central','KC':'AL Central',
  'HOU':'AL West','ATL':'NL East','NYM':'NL East','PHI':'NL East','MIA':'NL East','WAS':'NL East',
  'MIL':'NL Central','CHC':'NL Central','STL':'NL Central','PIT':'NL Central','CIN':'NL Central',
};

export function resolveMLB(name) {
  if (!name) return null;
  if (MLB_STATS[name.toUpperCase()]) return name.toUpperCase();
  const lo = name.toLowerCase();
  for (const [alias, key] of Object.entries(MLB_ALIASES)) {
    if (lo.includes(alias)) return key;
  }
  for (const [key, data] of Object.entries(MLB_STATS)) {
    if ((data.aliases || []).some(a => lo.includes(a))) return key;
  }
  return null;
}

export function resolveNFL(name) {
  if (!name) return null;
  if (NFL_STATS[name.toUpperCase()]) return name.toUpperCase();
  const lo = name.toLowerCase();
  for (const [alias, key] of Object.entries(NFL_ALIASES)) {
    if (lo.includes(alias)) return key;
  }
  return null;
}

export function resolveTeam(name, sport) {
  return sport === 'americanfootball_nfl' ? resolveNFL(name) : resolveMLB(name);
}

// ── AUTO CONTEXT DETECTION ─────────────────────────────────────────────────
export function autoDetectCtx(game, scoresMap = {}, resolver = resolveMLB) {
  const ak = resolver(game.away_team);
  const hk = resolver(game.home_team);

  // Favorite from moneyline odds
  let awayML = null, homeML = null;
  for (const bk of game.bookmakers || []) {
    const m = (bk.markets || []).find(m => m.key === 'h2h');
    if (!m) continue;
    for (const o of m.outcomes || []) {
      const lo = o.name.toLowerCase();
      const awayLast = (game.away_team || '').toLowerCase().split(' ').pop();
      if (lo.includes(awayLast)) { if (awayML === null) awayML = o.price; }
      else { if (homeML === null) homeML = o.price; }
    }
    if (awayML !== null && homeML !== null) break;
  }
  const awayIsFav = (awayML !== null && homeML !== null) ? awayML < homeML : null;

  // Division game
  const isDiv = (ak && hk && MLB_DIVS[ak] && MLB_DIVS[hk])
    ? MLB_DIVS[ak] === MLB_DIVS[hk] : null;

  return {
    awayIsFav,
    isDiv,
    awayPrev: scoresMap[ak] || null,
    homePrev: scoresMap[hk] || null,
    ak, hk,
  };
}

function parseRecord(rec) {
  if (!rec) return 50;
  const p = rec.split('-');
  if (p.length < 2) return 50;
  const w = parseInt(p[0]); const l = parseInt(p[1]);
  return (w + l) > 0 ? Math.round(w / (w + l) * 100) : 50;
}

// ── BEST BET RECOMMENDER ──────────────────────────────────────────────────
// Runs all three markets and returns the single strongest bet recommendation
export function getBestBet(ak, hk, line, ctx) {
  const markets = ['totals', 'h2h', 'spreads'];
  let best = null;
  markets.forEach(function(mkt) {
    const sigs = buildMLBSignals(ak, hk, mkt, line, ctx);
    const strong = sigs.filter(function(s) { return s.good === true; });
    const topStrength = strong.length > 0 ? strong[0].strength : 0;
    if (!best || topStrength > best.strength) {
      best = {
        mkt: mkt,
        mktLabel: mkt === 'totals' ? 'Totals O/U' : mkt === 'h2h' ? 'Moneyline' : 'Run Line',
        signals: sigs,
        goodSigs: strong,
        strength: topStrength,
        topSig: strong[0] || null,
      };
    }
  });
  return best;
}

// ── MLB SIGNAL ENGINE ──────────────────────────────────────────────────────
export function buildMLBSignals(ak, hk, mkt, line, ctx = {}) {
  const sigs = [];
  const ra = ak ? MLB_STATS[ak] : null;
  const rh = hk ? MLB_STATS[hk] : null;

  // good: true = green (bet under/recommended play)
  // good: false = red (bet over / against lean)
  // good: 'conflict' = yellow (conflicting signal)
  function sig(cat, label, good, strength) {
    sigs.push({ cat, label, good, strength: strength || 10 });
  }

  // Determine overall under lean direction first (for conflict detection)
  let overallLean = null; // 'under' | 'over' | null
  if (mkt === 'totals') {
    let underVotes = 0; let overVotes = 0;
    if (ra && (100 - ra.ou_over_pct) >= 58) underVotes++;
    if (ra && ra.ou_over_pct >= 58) overVotes++;
    if (rh && (100 - rh.ou_over_pct) >= 58) underVotes++;
    if (rh && rh.ou_over_pct >= 58) overVotes++;
    if (rh && (100 - rh.ou_home_pct) >= 65) underVotes++;
    if (rh && rh.ou_home_pct >= 65) overVotes++;
    if (underVotes > overVotes) overallLean = 'under';
    else if (overVotes > underVotes) overallLean = 'over';
  }

  function sitSig(team, tkey, bucket, bucketLabel, threshold) {
    if (!threshold) threshold = 62;
    if (!team || !team.situational) return;
    const entry = team.situational[bucket];
    if (!entry || entry[0] === null) return;
    const overPct = entry[0]; const diff = entry[1];
    const underPct = 100 - overPct;

    // Estimate sample size from ou_record for context
    // situational data from BetIQ doesn't include n directly
    // Flag extreme values (0% or 100%) as small sample
    const isExtreme = overPct === 0 || overPct === 100;
    const sampleNote = isExtreme ? ' (small sample — 2026 season only)' : '';

    if (underPct >= threshold) {
      const isConflict = overallLean === 'over';
      const label = tkey + ' ' + bucketLabel + ' go UNDER ' + underPct + '% (' + overPct + '% over, diff ' + diff + ')' + sampleNote;
      sig('Situational', label, isConflict ? 'conflict' : true, underPct - 50);
    } else if (overPct >= threshold) {
      const isConflict = overallLean === 'under';
      const label = isConflict
        ? 'Conflicting: ' + tkey + ' ' + bucketLabel + ' leans OVER ' + overPct + '% (diff +' + diff + ') — weakens under play' + sampleNote
        : tkey + ' ' + bucketLabel + ' go OVER ' + overPct + '% (diff +' + diff + ') — lean OVER' + sampleNote;
      sig('Situational', label, isConflict ? 'conflict' : true, overPct - 50);
    }
  }

  if (mkt === 'totals') {
    if (ra) {
      const ua = 100 - ra.ou_over_pct;
      if (ra.ou_over_pct >= 58) sig('Overall O/U', ak + ' is an OVER team in 2026 (' + ra.ou_over_pct + '% over, ' + ra.ou_record + ') — lean OVER', true, ra.ou_over_pct - 50);
      if (ua >= 58) sig('Overall O/U', ak + ' is an UNDER team in 2026 (' + ua + '% under, ' + ra.ou_record + ') — lean UNDER', true, ua - 50);
      if ((ra.ou_diff || 0) <= -0.5) sig('Line Gap', ak + ' games avg ' + ra.ou_diff + ' runs vs posted total — line is HIGH, lean UNDER', true, Math.abs(ra.ou_diff) * 8);
      if ((ra.ou_diff || 0) >= 0.8) sig('Line Gap', ak + ' games avg +' + ra.ou_diff + ' runs over line — line is LOW, lean OVER', true, ra.ou_diff * 8);
    }
    if (rh) {
      const uh = 100 - rh.ou_over_pct;
      const uhome = 100 - rh.ou_home_pct;
      if (rh.ou_over_pct >= 58) sig('Overall O/U', hk + ' is an OVER team in 2026 (' + rh.ou_over_pct + '% over, ' + rh.ou_record + ') — lean OVER', true, rh.ou_over_pct - 50);
      if (uh >= 58) sig('Overall O/U', hk + ' is an UNDER team in 2026 (' + uh + '% under, ' + rh.ou_record + ') — lean UNDER', true, uh - 50);
      if (rh.ou_home_pct >= 65) sig('Home O/U', hk + ' home games go OVER ' + rh.ou_home_pct + '% at home — lean OVER', true, rh.ou_home_pct - 50);
      if (uhome >= 65) sig('Home O/U', hk + ' home games go UNDER ' + uhome + '% at home — lean UNDER', true, uhome - 50);
      if ((rh.ou_diff || 0) <= -0.5) sig('Line Gap', hk + ' home games avg ' + rh.ou_diff + ' runs vs line — line is HIGH, lean UNDER', true, Math.abs(rh.ou_diff) * 8);
      if ((rh.ou_diff || 0) >= 0.8) sig('Line Gap', hk + ' home games avg +' + rh.ou_diff + ' runs over line — line is LOW, lean OVER', true, rh.ou_diff * 8);
    }
    // Situational
    const awayBucket = ctx.awayPrev === 'win' ? 'after_win' : ctx.awayPrev === 'loss' ? 'after_loss' : null;
    const homeBucket = ctx.homePrev === 'win' ? 'after_win' : ctx.homePrev === 'loss' ? 'after_loss' : null;
    if (awayBucket) sitSig(ra, ak, awayBucket, 'off a ' + ctx.awayPrev);
    if (homeBucket) sitSig(rh, hk, homeBucket, 'off a ' + ctx.homePrev);
    if (ctx.awayIsFav === true) sitSig(ra, ak, 'as_fav', 'as favorite');
    else if (ctx.awayIsFav === false) sitSig(ra, ak, 'away_dog', 'as away underdog');
    if (ctx.awayIsFav === false) sitSig(rh, hk, 'as_fav', 'as home favorite');
    else if (ctx.awayIsFav === true) sitSig(rh, hk, 'home_dog', 'as home underdog');
    if (ctx.isDiv) {
      sitSig(ra, ak, 'div', 'in division');
      sitSig(rh, hk, 'div', 'in division');
    }
  }

  if (mkt === 'h2h') {
    if (ra) {
      if (ra.ml_units > 500) sig('ML Value', 'BET ' + ak + ' — +' + ra.ml_units + ' ML units as away value team', true, ra.ml_units / 50);
      if (ra.ml_units < -1000) sig('ML Value', 'FADE ' + ak + ' — burns ' + Math.abs(ra.ml_units) + ' ML units as favorite. BET ' + hk, true, Math.abs(ra.ml_units) / 50);
    }
    if (rh) {
      if (rh.ml_units > 500) sig('ML Value', 'BET ' + hk + ' — +' + rh.ml_units + ' ML units as home value team', true, rh.ml_units / 50);
      if (rh.ml_units < -1000) sig('ML Value', 'FADE ' + hk + ' — burns ' + Math.abs(rh.ml_units) + ' ML units at home. BET ' + ak, true, Math.abs(rh.ml_units) / 50);
    }
    if (rh) {
      const hPct = parseRecord(rh.home_record);
      if (hPct >= 60) sig('Home Record', hk + ' wins ' + hPct + '% at home (' + rh.home_record + ') — home edge', true, hPct - 50);
      if (hPct <= 40) sig('Home Record', hk + ' only wins ' + hPct + '% at home (' + rh.home_record + ') — fade home, bet ' + ak, true, 50 - hPct);
    }
    if (ra) {
      const aPct = parseRecord(ra.away_record);
      if (aPct >= 55) sig('Road Record', ak + ' wins ' + aPct + '% on road (' + ra.away_record + ') — road edge', true, aPct - 50);
      if (aPct <= 38) sig('Road Record', ak + ' only wins ' + aPct + '% on road (' + ra.away_record + ') — fade away, bet ' + hk, true, 50 - aPct);
    }
  }

  if (mkt === 'spreads') {
    if (ra && ra.rl_pct) {
      if (ra.rl_pct >= 55) sig('Run Line', ak + ' covers run line ' + ra.rl_pct + '% — BET ' + ak + ' -1.5', true, ra.rl_pct - 50);
      if (ra.rl_pct <= 44) sig('Run Line', ak + ' only covers ' + ra.rl_pct + '% on run line — BET ' + hk + ' -1.5', true, 50 - ra.rl_pct);
    }
    if (rh && rh.rl_pct) {
      if (rh.rl_pct >= 55) sig('Run Line', hk + ' covers run line ' + rh.rl_pct + '% at home — BET ' + hk + ' -1.5', true, rh.rl_pct - 50);
      if (rh.rl_pct <= 44) sig('Run Line', hk + ' only covers ' + rh.rl_pct + '% at home — BET ' + ak + ' -1.5', true, 50 - rh.rl_pct);
    }
  }

  return sigs.sort((a, b) => b.strength - a.strength);
}

// ── NFL SIGNAL ENGINE ──────────────────────────────────────────────────────
export function buildNFLSignals(ak, hk, mkt) {
  const sigs = [];
  const ra = ak ? NFL_STATS[ak] : null;
  const rh = hk ? NFL_STATS[hk] : null;

  function sig(cat, label, good, strength) {
    sigs.push({ cat, label, good, strength: strength || 10 });
  }

  function atsSig(team, tkey, bucket, label, threshold = 60) {
    if (!team) return;
    const b = team[bucket];
    if (!b || b.n < 10) return;
    const p = b.ats_pct;
    if (p === null) return;
    const up = 100 - p;
    if (p >= threshold) sig('ATS Trend', `${tkey} ${label} — ${p}% ATS (${b.ats_w}-${b.ats_l}, n=${b.n})`, true, p - 50);
    if (up >= threshold) sig('ATS Trend', `${tkey} ${label} — ${up}% ATS fade (${b.ats_w}-${b.ats_l}, n=${b.n})`, false, up - 50);
  }

  function ouSig(team, tkey, bucket, label, threshold = 60) {
    if (!team) return;
    const b = team[bucket];
    if (!b || b.n < 10) return;
    const op = b.over_pct;
    const up = op !== null ? 100 - op : null;
    if (op !== null && op >= threshold) sig('O/U Trend', `${tkey} ${label} — ${op}% OVER (${b.ou_o}O-${b.ou_u}U, n=${b.n})`, false, op - 50);
    if (up !== null && up >= threshold) sig('O/U Trend', `${tkey} ${label} — ${up}% UNDER (${b.ou_o}O-${b.ou_u}U, n=${b.n})`, true, up - 50);
  }

  if (mkt === 'totals') {
    ouSig(ra, ak, 'overall', 'overall O/U lean');
    ouSig(ra, ak, 'away', 'away game O/U');
    ouSig(rh, hk, 'overall', 'overall O/U lean');
    ouSig(rh, hk, 'home', 'home game O/U');
    ouSig(rh, hk, 'dome', 'dome game O/U', 65);
    ouSig(ra, ak, 'primetime', 'primetime O/U', 62);
    ouSig(rh, hk, 'primetime', 'primetime O/U', 62);
    ouSig(ra, ak, 'short_rest', 'short rest O/U', 62);
  }

  if (mkt === 'spreads') {
    atsSig(ra, ak, 'away', 'ATS on road');
    atsSig(ra, ak, 'dog', 'ATS as underdog');
    atsSig(ra, ak, 'off_loss', 'ATS off a loss', 62);
    atsSig(ra, ak, 'off_win', 'ATS off a win', 62);
    atsSig(rh, hk, 'home', 'ATS at home');
    atsSig(rh, hk, 'fav', 'ATS as favorite');
    atsSig(rh, hk, 'dome', 'ATS in dome', 65);
    atsSig(rh, hk, 'div', 'ATS in division', 62);
  }

  if (mkt === 'h2h') {
    atsSig(ra, ak, 'dog', 'as underdog', 65);
    atsSig(ra, ak, 'away', 'road record', 65);
    atsSig(rh, hk, 'home', 'home record', 65);
    atsSig(rh, hk, 'fav', 'as favorite', 65);
  }

  return sigs.sort((a, b) => b.strength - a.strength);
}

// Generic dispatcher
export function buildSignals(ak, hk, mkt, line, ctx, sport) {
  if (sport === 'americanfootball_nfl') return buildNFLSignals(ak, hk, mkt);
  return buildMLBSignals(ak, hk, mkt, line, ctx);
}
