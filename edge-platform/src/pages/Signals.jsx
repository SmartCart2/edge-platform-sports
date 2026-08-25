import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase.js';
import SignalRow from '../components/SignalRow.jsx';
import ROICurve from '../components/ROICurve.jsx';
import { Link } from 'react-router-dom';

const SPORTS = ['All', 'MLB', 'NFL', 'NBA', 'NHL'];
const RESULTS_F = ['All', 'Win', 'Loss', 'Push', 'Pending'];

export default function Signals({ user }) {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSport, setFilterSport] = useState('All');
  const [filterResult, setFilterResult] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    loadSignals();
  }, [user]);

  async function loadSignals() {
    setLoading(true);
    const { data } = await supabase
      .from('signals')
      .select('*')
      .eq('user_id', user.id)
      .order('game_date', { ascending: false });
    setSignals(data || []);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    return signals.filter(s => {
      if (filterSport !== 'All' && s.sport !== filterSport) return false;
      if (filterResult !== 'All' && s.result !== filterResult) return false;
      if (search) {
        const lo = search.toLowerCase();
        if (!s.game.toLowerCase().includes(lo) && !s.pick.toLowerCase().includes(lo)) return false;
      }
      return true;
    });
  }, [signals, filterSport, filterResult, search]);

  const graded = filtered.filter(s => ['Win', 'Loss', 'Push'].includes(s.result));
  const wins = graded.filter(s => s.result === 'Win').length;
  const losses = graded.filter(s => s.result === 'Loss').length;
  const pushes = graded.filter(s => s.result === 'Push').length;
  const winPct = (wins + losses) > 0 ? Math.round(wins / (wins + losses) * 100) : null;

  let roi = null;
  if (graded.length > 0) {
    let profit = 0;
    graded.forEach(s => {
      if (s.result === 'Win') {
        const odds = s.odds || -110;
        profit += odds > 0 ? odds / 100 : 100 / Math.abs(odds);
      } else if (s.result === 'Loss') profit -= 1;
    });
    roi = Math.round((profit / graded.length) * 100) / 100;
  }

  if (!user) return (
    <div style={{ maxWidth: 500, margin: '80px auto', textAlign: 'center', padding: 24 }}>
      <div style={{ fontSize: 32, marginBottom: 16 }}>📋</div>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Sign in to track signals</h2>
      <p style={{ color: 'var(--dim)', marginBottom: 20, fontSize: 13 }}>
        Log every signal, grade results, and build a verified public track record.
      </p>
      <Link to="/auth" className="btn btn-gold" style={{ justifyContent: 'center' }}>Sign In</Link>
    </div>
  );

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>My Signals</h1>
          <div style={{ fontSize: 11, color: 'var(--dim)' }}>{signals.length} total · {graded.length} graded</div>
        </div>
        <Link to="/" className="btn btn-ghost" style={{ fontSize: 12 }}>+ Log from slate →</Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total', val: signals.length + '', color: 'var(--txt)' },
          { label: 'Wins', val: wins + '', color: 'var(--grn)' },
          { label: 'Losses', val: losses + '', color: 'var(--red)' },
          { label: 'Win Rate', val: winPct != null ? winPct + '%' : '--', color: winPct >= 55 ? 'var(--grn)' : winPct < 50 ? 'var(--red)' : 'var(--txt)' },
          { label: 'ROI/unit', val: roi != null ? (roi >= 0 ? '+' : '') + roi + 'u' : '--', color: roi >= 0 ? 'var(--grn)' : 'var(--red)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: s.color, fontFamily: 'var(--mono)', lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 9, color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ROI Curve */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 9, color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Running ROI · flat 1 unit</div>
        <ROICurve signals={filtered} height={80} />
      </div>

      {/* Filters */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12, padding: '10px 14px' }}>
        {SPORTS.map(s => (
          <button key={s} onClick={() => setFilterSport(s)} style={{
            background: filterSport === s ? 'var(--gold)18' : 'none',
            border: `1px solid ${filterSport === s ? 'var(--gold)44' : 'transparent'}`,
            borderRadius: 5, padding: '3px 10px', fontSize: 10,
            color: filterSport === s ? 'var(--gold)' : 'var(--dim)',
            fontWeight: filterSport === s ? 700 : 400,
          }}>{s}</button>
        ))}
        <div style={{ width: 1, height: 14, background: 'var(--bdr)' }} />
        {RESULTS_F.map(r => {
          const c = r === 'Win' ? 'var(--grn)' : r === 'Loss' ? 'var(--red)' : r === 'Pending' ? 'var(--gold)' : 'var(--dim)';
          return (
            <button key={r} onClick={() => setFilterResult(r)} style={{
              background: filterResult === r ? c + '18' : 'none',
              border: `1px solid ${filterResult === r ? c + '44' : 'transparent'}`,
              borderRadius: 5, padding: '3px 10px', fontSize: 10,
              color: filterResult === r ? c : 'var(--dim)',
              fontWeight: filterResult === r ? 700 : 400,
            }}>{r}</button>
          );
        })}
        <div style={{ flex: 1 }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search game, pick..."
          style={{ background: 'var(--sur)', border: '1px solid var(--bdr2)', borderRadius: 6, padding: '4px 10px', color: 'var(--txt)', fontSize: 11, outline: 'none', width: 180 }} />
      </div>

      {/* Table header */}
      {filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 90px 70px 80px 90px', gap: 10, padding: '4px 14px', marginBottom: 4 }}>
          {['Date', 'Game / Pick', 'Line / Odds', 'Conf', 'Result', ''].map(h => (
            <div key={h} style={{ fontSize: 9, color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: 1 }}>{h}</div>
          ))}
        </div>
      )}

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {loading && <div style={{ color: 'var(--dim)', fontSize: 12, textAlign: 'center', padding: 20 }}>Loading...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--dim)' }}>
            <div style={{ fontSize: 12, marginBottom: 6 }}>No signals yet</div>
            <div style={{ fontSize: 11 }}>Log signals from the game detail page</div>
          </div>
        )}
        {filtered.map(s => (
          <SignalRow key={s.id} signal={s}
            onUpdate={updated => setSignals(prev => prev.map(x => x.id === updated.id ? updated : x))}
            onDelete={id => setSignals(prev => prev.filter(x => x.id !== id))}
          />
        ))}
      </div>
    </div>
  );
}
