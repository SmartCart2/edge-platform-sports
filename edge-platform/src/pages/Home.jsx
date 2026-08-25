import { useState, useEffect, useMemo } from 'react';
import { fetchOdds, fetchScores, buildScoresMap } from '../lib/odds.js';
import { resolveTeam, autoDetectCtx, buildSignals } from '../lib/signals.js';
import { resolveMLB } from '../lib/signals.js';
import GameCard from '../components/GameCard.jsx';

const MARKETS = [
  { key: 'totals', label: 'Totals O/U', color: 'var(--blu)' },
  { key: 'h2h',    label: 'Moneyline',  color: 'var(--pur)' },
  { key: 'spreads',label: 'Run Line',   color: 'var(--gold)' },
];

export default function Home({ sport }) {
  const [games, setGames] = useState([]);
  const [scoresMap, setScoresMap] = useState({});
  const [mkt, setMkt] = useState('totals');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [minSig, setMinSig] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [oddsData, scoresData] = await Promise.all([
          fetchOdds({ sport, markets: 'h2h,spreads,totals' }),
          fetchScores({ sport, daysFrom: 1 }).catch(() => []),
        ]);
        setGames(Array.isArray(oddsData) ? oddsData : []);
        const resolver = name => resolveTeam(name, sport);
        setScoresMap(buildScoresMap(scoresData, resolver));
      } catch (e) {
        setError(e.message.includes('API key') ? 'Add ODDS_API_KEY to your Vercel environment variables.' : e.message);
      }
      setLoading(false);
    }
    load();
  }, [sport]);

  const enriched = useMemo(() => {
    return games.map(g => {
      const resolver = name => resolveTeam(name, sport);
      const ctx = autoDetectCtx(g, scoresMap, resolver);
      const { ak, hk } = ctx;
      const sigs = buildSignals(ak, hk, mkt, null, ctx, sport);
      return { ...g, _ak: ak, _hk: hk, _ctx: ctx, _good: sigs.filter(s => s.good).length };
    }).filter(g => g._good >= minSig).sort((a, b) => b._good - a._good);
  }, [games, mkt, sport, minSig, scoresMap]);

  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 52px)', overflow: 'hidden' }}>
      {/* Left rail — filters */}
      <aside style={{ width: 220, flexShrink: 0, borderRight: '1px solid var(--bdr)', padding: 16, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
        <div>
          <div style={{ fontSize: 9, color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Market</div>
          {MARKETS.map(m => (
            <button key={m.key} onClick={() => setMkt(m.key)} style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: mkt === m.key ? m.color + '18' : 'none',
              border: `1px solid ${mkt === m.key ? m.color + '55' : 'transparent'}`,
              borderRadius: 7, padding: '6px 10px', marginBottom: 4,
              fontSize: 12, fontWeight: mkt === m.key ? 700 : 400,
              color: mkt === m.key ? m.color : 'var(--dim)',
            }}>
              {m.label}
            </button>
          ))}
        </div>

        <div>
          <div style={{ fontSize: 9, color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Min signals</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[0, 1, 2, 3].map(n => (
              <button key={n} onClick={() => setMinSig(n)} style={{
                flex: 1, padding: '5px 0', borderRadius: 6,
                background: minSig === n ? 'var(--gold)22' : 'none',
                border: `1px solid ${minSig === n ? 'var(--gold)55' : 'var(--bdr)'}`,
                color: minSig === n ? 'var(--gold)' : 'var(--dim)',
                fontSize: 11, fontWeight: minSig === n ? 700 : 400,
              }}>
                {n}+
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 'auto', fontSize: 9, color: 'var(--mut)', lineHeight: 1.6 }}>
          <div style={{ fontWeight: 600, color: 'var(--dim)', marginBottom: 4 }}>Data sources</div>
          Odds: The Odds API (live)<br />
          Trends: BetIQ/TeamRankings<br />
          Context: auto-detected
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5 }}>Today's Slate</h1>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>{date} · {enriched.length} games</div>
          </div>
          {loading && <div style={{ fontSize: 11, color: 'var(--dim)' }}>Loading odds...</div>}
        </div>

        {error && (
          <div style={{ background: '#1c0a0a', border: '1px solid var(--red)44', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 12, color: '#fca5a5' }}>
            {error}
          </div>
        )}

        {!loading && !error && enriched.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--dim)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 14, marginBottom: 6 }}>No games on today's slate</div>
            <div style={{ fontSize: 11 }}>Try switching sports or lowering the min signals filter</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {enriched.map(g => (
            <GameCard key={g.id} game={g} ak={g._ak} hk={g._hk} mkt={mkt} ctx={g._ctx} sport={sport} />
          ))}
        </div>
      </main>
    </div>
  );
}
