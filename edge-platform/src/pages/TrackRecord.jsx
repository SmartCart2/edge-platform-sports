import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import ROICurve from '../components/ROICurve.jsx';
import SignalRow from '../components/SignalRow.jsx';

export default function TrackRecord() {
  const [signals, setSignals] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: sigs }, { data: lb }] = await Promise.all([
        supabase.from('signals').select('*').eq('is_public', true).order('game_date', { ascending: false }).limit(100),
        supabase.from('leaderboard').select('*').limit(20),
      ]);
      setSignals(sigs || []);
      setLeaderboard(lb || []);
      setLoading(false);
    }
    load();
  }, []);

  const graded = signals.filter(s => ['Win', 'Loss', 'Push'].includes(s.result));
  const wins = graded.filter(s => s.result === 'Win').length;
  const losses = graded.filter(s => s.result === 'Loss').length;
  const winPct = (wins + losses) > 0 ? Math.round(wins / (wins + losses) * 100) : null;
  let roi = null;
  if (graded.length > 0) {
    let profit = 0;
    graded.forEach(s => {
      if (s.result === 'Win') { const o = s.odds || -110; profit += o > 0 ? o / 100 : 100 / Math.abs(o); }
      else if (s.result === 'Loss') profit -= 1;
    });
    roi = Math.round(profit / graded.length * 100) / 100;
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>Public Track Record</h1>
        <div style={{ fontSize: 11, color: 'var(--dim)' }}>
          Every signal logged on EDGE, graded and published. No cherry-picking.
        </div>
      </div>

      {/* Platform stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total Signals', val: signals.length + '', c: 'var(--txt)' },
          { label: 'Win Rate', val: winPct != null ? winPct + '%' : '--', c: winPct >= 55 ? 'var(--grn)' : 'var(--red)' },
          { label: 'ROI per Unit', val: roi != null ? (roi >= 0 ? '+' : '') + roi + 'u' : '--', c: roi >= 0 ? 'var(--grn)' : 'var(--red)' },
          { label: 'Graded', val: graded.length + '', c: 'var(--dim)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: 14 }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: s.c, fontFamily: 'var(--mono)', lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 9, color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Platform ROI Curve */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 9, color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: 1 }}>Platform ROI Curve</div>
          <div style={{ fontSize: 9, color: 'var(--dim)' }}>flat 1 unit · all public signals</div>
        </div>
        <ROICurve signals={signals} height={100} />
      </div>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 }}>
            Leaderboard (min 10 graded)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 70px 70px 70px', gap: 10, padding: '4px 8px', marginBottom: 6 }}>
            {['#', 'User', 'Record', 'Win%', 'ROI'].map(h => (
              <div key={h} style={{ fontSize: 9, color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: 0.8 }}>{h}</div>
            ))}
          </div>
          {leaderboard.map((u, i) => (
            <div key={u.username} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 70px 70px 70px', gap: 10, padding: '8px', background: i === 0 ? 'var(--gold)08' : 'none', borderRadius: 7, alignItems: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: i === 0 ? 'var(--gold)' : 'var(--mut)', fontFamily: 'var(--mono)' }}>{i + 1}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)' }}>{u.display_name || u.username}</div>
              <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--dim)' }}>{u.wins}-{u.losses}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: u.win_pct >= 55 ? 'var(--grn)' : u.win_pct < 50 ? 'var(--red)' : 'var(--dim)', fontFamily: 'var(--mono)' }}>{u.win_pct}%</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: u.roi_per_unit >= 0 ? 'var(--grn)' : 'var(--red)', fontFamily: 'var(--mono)' }}>
                {u.roi_per_unit >= 0 ? '+' : ''}{u.roi_per_unit}u
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent public signals */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Recent Signals</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {loading ? <div style={{ color: 'var(--dim)', textAlign: 'center', padding: 20 }}>Loading...</div> :
            signals.slice(0, 30).map(s => <SignalRow key={s.id} signal={s} editable={false} />)
          }
        </div>
      </div>
    </div>
  );
}
