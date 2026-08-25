import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { fetchOdds, fetchProps, fmtOdds } from '../lib/odds.js';
import { resolveTeam } from '../lib/signals.js';

export default function Search({ sport }) {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const [games, setGames] = useState([]);
  const [propsResults, setPropsResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [propsLoading, setPropsLoading] = useState(false);

  useEffect(() => {
    if (!q) return;
    search(q);
  }, [q, sport]);

  async function search(query) {
    setLoading(true);
    try {
      const data = await fetchOdds({ sport, markets: 'h2h,spreads,totals' });
      const all = Array.isArray(data) ? data : [];
      const lo = query.toLowerCase();

      // Match by team name
      const teamMatches = all.filter(g =>
        g.home_team.toLowerCase().includes(lo) ||
        g.away_team.toLowerCase().includes(lo)
      );
      setGames(teamMatches);

      // If no team match, search props across all games (player search)
      if (teamMatches.length === 0) {
        setPropsLoading(true);
        const propResults = [];
        // Search props for first 5 games to keep within credit budget
        for (const game of all.slice(0, 5)) {
          try {
            const propsData = await fetchProps({ eventId: game.id, sport });
            const found = searchPropsForPlayer(propsData, query, game);
            if (found.length > 0) propResults.push({ game, players: found });
          } catch (e) { /* skip */ }
          await new Promise(r => setTimeout(r, 200)); // rate limit
        }
        setPropsResults(propResults);
        setPropsLoading(false);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function searchPropsForPlayer(propsData, query, game) {
    const lo = query.toLowerCase();
    const found = [];
    const playerMap = {};

    (propsData?.bookmakers || []).forEach(bk => {
      (bk.markets || []).forEach(mkt => {
        (mkt.outcomes || []).forEach(o => {
          const name = o.description;
          if (!name || !name.toLowerCase().includes(lo)) return;
          if (!playerMap[name]) playerMap[name] = { name, lines: {} };
          const mktLabel = { pitcher_strikeouts: 'Strikeouts', pitcher_outs: 'Outs', batter_hits: 'Hits', batter_home_runs: 'HR', batter_total_bases: 'Total Bases', batter_rbis: 'RBI' }[mkt.key] || mkt.key;
          if (!playerMap[name].lines[mktLabel]) playerMap[name].lines[mktLabel] = { line: null, bestOver: null, bestUnder: null, bestOverBook: null, bestUnderBook: null };
          const b = playerMap[name].lines[mktLabel];
          if (o.point != null) b.line = o.point;
          if (o.name === 'Over' && (!b.bestOver || o.price > b.bestOver)) { b.bestOver = o.price; b.bestOverBook = bk.title; }
          if (o.name === 'Under' && (!b.bestUnder || o.price > b.bestUnder)) { b.bestUnder = o.price; b.bestUnderBook = bk.title; }
        });
      });
    });

    return Object.values(playerMap);
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 900 }}>Search: "{q}"</h1>
        <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>
          {loading ? 'Searching...' : `${games.length} team matches · ${propsResults.length} player matches`}
        </div>
      </div>

      {/* Team matches */}
      {games.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Team Matches</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {games.map(g => {
              const date = new Date(g.commence_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
              return (
                <Link key={g.id} to={`/game/${g.id}?sport=${sport}`} style={{
                  display: 'block', background: 'var(--card)', border: '1px solid var(--bdr)',
                  borderRadius: 10, padding: '12px 16px', textDecoration: 'none',
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold)55'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--bdr)'}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{g.away_team} @ {g.home_team}</div>
                  <div style={{ fontSize: 11, color: 'var(--dim)' }}>{date}</div>
                  {/* Show odds preview */}
                  <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                    {(g.bookmakers?.[0]?.markets || []).slice(0, 3).map(m => {
                      const oc = m.outcomes || [];
                      return (
                        <div key={m.key} style={{ fontSize: 10 }}>
                          <span style={{ color: 'var(--mut)', marginRight: 4 }}>{m.key.toUpperCase()}:</span>
                          {oc.map(o => <span key={o.name} style={{ color: 'var(--dim)', marginRight: 6 }}>{o.point ? `${o.point} ` : ''}{fmtOdds(o.price)}</span>)}
                        </div>
                      );
                    })}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Player prop matches */}
      {(propsLoading || propsResults.length > 0) && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Player Props {propsLoading && '(searching...)'}
          </div>
          {propsResults.map((r, ri) => (
            <div key={ri} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 10 }}>
                {r.game.away_team} @ {r.game.home_team}
              </div>
              {r.players.map((player, pi) => (
                <div key={pi} className="card" style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{player.name}</div>
                  {Object.entries(player.lines).map(([mktLabel, b]) => (
                    <div key={mktLabel} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 1fr', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                      <div style={{ background: 'var(--grn)0d', borderRadius: 6, padding: '5px 8px', border: '1px solid var(--grn)33', textAlign: 'center' }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--grn)', fontFamily: 'var(--mono)' }}>{b.bestOver ? fmtOdds(b.bestOver) : '--'}</div>
                        <div style={{ fontSize: 8, color: 'var(--mut)' }}>{b.bestOverBook}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 11, fontWeight: 700 }}>{mktLabel}</div>
                        <div style={{ fontSize: 12, color: 'var(--gold)', fontFamily: 'var(--mono)' }}>{b.line}</div>
                      </div>
                      <div style={{ background: 'var(--red)0d', borderRadius: 6, padding: '5px 8px', border: '1px solid var(--red)33', textAlign: 'center' }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--red)', fontFamily: 'var(--mono)' }}>{b.bestUnder ? fmtOdds(b.bestUnder) : '--'}</div>
                        <div style={{ fontSize: 8, color: 'var(--mut)' }}>{b.bestUnderBook}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {!loading && !propsLoading && games.length === 0 && propsResults.length === 0 && q && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--dim)' }}>
          <div style={{ fontSize: 14, marginBottom: 6 }}>No results for "{q}"</div>
          <div style={{ fontSize: 11 }}>Try a team nickname (e.g. "Yankees", "Dodgers") or player last name</div>
        </div>
      )}
    </div>
  );
}
